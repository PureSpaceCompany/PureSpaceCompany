import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildInvoiceEmailHtml } from "@/lib/email-templates";

export const runtime = "nodejs";

async function createStripeCheckoutSession({
  secretKey,
  unitAmount,
  productName,
  description,
  invoiceId,
  invoiceNumber,
  successUrl,
  cancelUrl,
  customerEmail,
}: {
  secretKey: string;
  unitAmount: number;
  productName: string;
  description: string;
  invoiceId: string;
  invoiceNumber: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
}) {
  const params = new URLSearchParams();
  params.append("payment_method_types[]", "card");
  params.append("mode", "payment");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][unit_amount]", String(unitAmount));
  params.append("line_items[0][price_data][product_data][name]", productName);
  params.append("line_items[0][price_data][product_data][description]", description);
  params.append("line_items[0][quantity]", "1");
  params.append("metadata[invoiceId]", invoiceId);
  params.append("metadata[invoiceNumber]", invoiceNumber);
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);
  params.append("customer_email", customerEmail);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message ?? "Stripe checkout session creation failed");
  }

  return res.json() as Promise<{ id: string; url: string }>;
}

async function sendEmailViaResend({
  apiKey,
  from,
  to,
  replyTo,
  subject,
  html,
}: {
  apiKey: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
}) {
  const body: Record<string, unknown> = { from, to: [to], subject, html };
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.message ?? `Resend error ${res.status}`);
  }

  return res.json();
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        job: { include: { property: true } },
      },
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (invoice.status === "PAID") return NextResponse.json({ error: "Invoice already paid" }, { status: 409 });
    if (invoice.status === "VOID") return NextResponse.json({ error: "Invoice is void" }, { status: 409 });

    const clientEmail = invoice.client.userId
      ? (await prisma.user.findUnique({ where: { id: invoice.client.userId }, select: { email: true } }))?.email ?? null
      : null;

    const body = await req.json().catch(() => ({}));
    const recipientEmail: string = body.email ?? clientEmail ?? "";

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No email address found for this client. Provide one in the request body as 'email'." },
        { status: 400 }
      );
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const companyName = appSettings?.companyName ?? "Pure Space Company";
    const appUrl = process.env.NEXTAUTH_URL ?? "https://www.purespacecompany.com";

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const unitAmount = Math.round(Number(invoice.total) * 100);
    const checkoutSession = await createStripeCheckoutSession({
      secretKey: stripeKey,
      unitAmount,
      productName: invoice.job.title,
      description: `Invoice ${invoice.invoiceNumber} — ${companyName}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      successUrl: `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&invoice=${invoice.invoiceNumber}`,
      cancelUrl: `${appUrl}/pay/cancelled?invoice=${invoice.invoiceNumber}`,
      customerEmail: recipientEmail,
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: checkoutSession.id, status: "PENDING" },
    });

    const serviceDate = new Date(invoice.job.scheduledStart).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    const dueDate = invoice.dueAt
      ? new Date(invoice.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "Upon receipt";
    const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(invoice.total));

    const clientName = invoice.client.company
      ? invoice.client.company
      : [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ") || "Valued Customer";

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@resend.dev";
    const replyTo = appSettings?.supportEmail || undefined;

    const html = buildInvoiceEmailHtml({
      clientName,
      invoiceNumber: invoice.invoiceNumber,
      jobTitle: invoice.job.title,
      serviceDate,
      amount,
      dueDate,
      paymentUrl: checkoutSession.url,
      companyName,
    });

    await sendEmailViaResend({
      apiKey: resendApiKey,
      from: `${companyName} <${fromEmail}>`,
      to: recipientEmail,
      replyTo,
      subject: `Invoice ${invoice.invoiceNumber} — ${amount} due ${dueDate}`,
      html,
    });

    return NextResponse.json({
      data: {
        sent: true,
        to: recipientEmail,
        paymentUrl: checkoutSession.url,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/invoices/:id/send]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
