import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { buildStatementEmailHtml } from "@/lib/email-templates";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { clientId, invoiceIds, email: emailOverride, dateLabel } = body as {
      clientId?: string;
      invoiceIds?: string[];
      email?: string;
      dateLabel?: string;
    };

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ error: "invoiceIds array is required" }, { status: 400 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      include: {
        client: { include: { user: { select: { email: true } } } },
        job: { include: { property: true } },
      },
      orderBy: { job: { scheduledStart: "asc" } },
    });

    if (invoices.length === 0) {
      return NextResponse.json({ error: "No invoices found" }, { status: 404 });
    }

    const firstClient = invoices[0].client;
    const clientName = firstClient.company
      ? firstClient.company
      : [firstClient.firstName, firstClient.lastName].filter(Boolean).join(" ") || "Valued Customer";

    const recipientEmail: string = emailOverride ?? firstClient.user?.email ?? "";
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No email address found for this client. Provide one as 'email' in the request body." },
        { status: 400 }
      );
    }

    const appSettings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const companyName = appSettings?.companyName ?? "Pure Space Company";

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const rows = invoices.map((inv) => ({
      date: new Date(inv.job.scheduledStart).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      }),
      property: inv.job.property?.name ?? inv.job.title,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      amount: fmt(Number(inv.total)),
    }));

    const totalBilled = invoices
      .filter((i) => i.status !== "VOID")
      .reduce((s, i) => s + Number(i.total), 0);
    const totalPaidAmt = invoices
      .filter((i) => i.status === "PAID")
      .reduce((s, i) => s + Number(i.paidAmount ?? i.total), 0);
    const balanceDue = Math.max(0, totalBilled - totalPaidAmt);

    const label = dateLabel ?? new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const html = buildStatementEmailHtml({
      clientName,
      companyName,
      dateLabel: label,
      rows,
      totalBilled: fmt(totalBilled),
      totalPaid: fmt(totalPaidAmt),
      balanceDue: fmt(balanceDue),
    });

    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@resend.dev";
    const replyTo = appSettings?.supportEmail || undefined;

    await sendEmailViaResend({
      apiKey: resendApiKey,
      from: `${companyName} <${fromEmail}>`,
      to: recipientEmail,
      replyTo,
      subject: `Account Statement — ${label} · ${companyName}`,
      html,
    });

    return NextResponse.json({
      data: { sent: true, to: recipientEmail, invoiceCount: invoices.length },
    });
  } catch (err: any) {
    console.error("[POST /api/invoices/statement/send]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
