import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

const schema = z.object({
  jobId: z.string(),
  flatRate: z.number().positive().optional(),
  dueDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { jobId, flatRate, dueDate } = parsed.data;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: true,
        property: true,
        invoice: true,
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.invoice && job.invoice.status !== "DRAFT") {
      return NextResponse.json({ error: "An active invoice already exists for this job" }, { status: 409 });
    }

    const baseAmount = flatRate ?? Number(job.flatRate ?? 0);
    const jobExtraItems: { description: string; unitPrice: number }[] = Array.isArray(job.extraItems) ? job.extraItems as any[] : [];
    const extrasTotal = jobExtraItems.reduce((s, i) => s + i.unitPrice, 0);
    const amount = baseAmount + extrasTotal;

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0. Set a flat rate on the job or provide one here." }, { status: 400 });
    }

    const taxRate = 0;
    const taxAmount = 0;
    const total = amount;

    const lineItems = [
      { description: job.title, qty: 1, unitPrice: baseAmount, total: baseAmount },
      ...jobExtraItems.map((item) => ({ description: item.description, qty: 1, unitPrice: item.unitPrice, total: item.unitPrice })),
    ];

    const invoiceNumber = generateInvoiceNumber();

    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 86400 * 1000);

    let invoice;
    if (job.invoice) {
      invoice = await prisma.invoice.update({
        where: { id: job.invoice.id },
        data: {
          status: "PENDING",
          subtotal: amount,
          taxRate,
          taxAmount,
          total,
          issuedAt: new Date(),
          dueAt: due,
          lineItems,
        },
      });
    } else {
      invoice = await prisma.invoice.create({
        data: {
          jobId,
          clientId: job.clientId,
          invoiceNumber,
          status: "PENDING",
          subtotal: amount,
          taxRate,
          taxAmount,
          total,
          issuedAt: new Date(),
          dueAt: due,
          lineItems,
        },
      });
    }

    // Fetch full invoice for PDF download
    const full = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        client: true,
        job: { include: { property: true } },
      },
    });

    return NextResponse.json({ data: full }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/invoices/generate]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
