import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getResend } from "@/lib/resend";
import { InvoiceEmail } from "@/components/emails/invoice-email";
import * as React from "react";

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
      return NextResponse.json({ error: "No email address found for this client. Provide one in the request body as 'email'." }, { status: 400 });
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const companyName = appSettings?.companyName ?? "StayShine";

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    // Create Stripe Checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(invoice.total) * 100),
            product_data: {
              name: invoice.job.title,
              description: `Invoice ${invoice.invoiceNumber} — ${companyName}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
      success_url: `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}&invoice=${invoice.invoiceNumber}`,
      cancel_url: `${appUrl}/pay/cancelled?invoice=${invoice.invoiceNumber}`,
      customer_email: recipientEmail,
    });

    // Save the session ID on the invoice so the webhook can find it
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { stripeSessionId: checkoutSession.id, status: "PENDING" },
    });

    // Format dates
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

    // Send email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@resend.dev";

    await getResend().emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} — ${amount} due ${dueDate}`,
      react: React.createElement(InvoiceEmail, {
        clientName,
        invoiceNumber: invoice.invoiceNumber,
        jobTitle: invoice.job.title,
        serviceDate,
        amount,
        dueDate,
        paymentUrl: checkoutSession.url!,
        companyName,
      }),
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
