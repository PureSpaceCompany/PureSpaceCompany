import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateInvoiceNumber } from "@/lib/utils";

const createJobSchema = z.object({
  clientId: z.string(),
  propertyId: z.string().optional().nullable(),
  title: z.string().min(1),
  serviceType: z.enum(["STANDARD", "DEEP_CLEAN", "MOVE_IN_OUT", "POST_CONSTRUCTION", "RECURRING", "COMMERCIAL"]),
  recurrence: z.enum(["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("ONCE"),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  notes: z.string().optional(),
  flatRate: z.number().positive().optional(),
  cleanerPay: z.number().min(0).optional().nullable(),
  templateId: z.string().optional(),
  checklistItems: z.array(z.string()).optional(),
  staffIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const clientId = searchParams.get("clientId");

    const userRole = (session.user as any).role;
    const profileId = (session.user as any).profileId;
    const where: any = {};

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (from || to) {
      where.scheduledStart = {};
      if (from) where.scheduledStart.gte = new Date(from);
      if (to) where.scheduledStart.lte = new Date(to);
    }
    if (userRole === "CLEANER") {
      where.assignments = { some: { staffId: profileId } };
    } else if (staffId) {
      where.assignments = { some: { staffId } };
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { scheduledStart: "desc" },
      include: {
        client: true,
        property: true,
        assignments: { include: { staff: true } },
        checklist: { orderBy: { sortOrder: "asc" } },
        photos: true,
        invoice: true,
      },
    });

    return NextResponse.json({ data: jobs });
  } catch (err: any) {
    console.error("[GET /api/jobs]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { clientId, propertyId, title, serviceType, recurrence, scheduledStart, scheduledEnd,
      notes, flatRate, cleanerPay, templateId, checklistItems, staffIds } = parsed.data;

    let items: { label: string; sortOrder: number }[] = [];
    if (templateId) {
      const tpl = await prisma.checklistTemplate.findUnique({ where: { id: templateId } });
      if (tpl) items = tpl.items as any;
    } else if (checklistItems?.length) {
      items = checklistItems.map((label, i) => ({ label, sortOrder: i + 1 }));
    }

    const job = await prisma.job.create({
      data: {
        clientId,
        propertyId: propertyId ?? null,
        title,
        serviceType,
        recurrence,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        notes,
        flatRate,
        cleanerPay: cleanerPay ?? null,
        status: staffIds?.length ? "ASSIGNED" : "UNASSIGNED",
        assignments: staffIds?.length
          ? { create: staffIds.map((sid, i) => ({ staffId: sid, isLead: i === 0 })) }
          : undefined,
        checklist: items.length ? { create: items } : undefined,
      },
      include: {
        client: true,
        property: true,
        assignments: { include: { staff: true } },
        checklist: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (flatRate) {
      await prisma.invoice.create({
        data: {
          jobId: job.id,
          clientId,
          invoiceNumber: generateInvoiceNumber(),
          status: "DRAFT",
          subtotal: flatRate,
          taxRate: 0,
          taxAmount: 0,
          total: flatRate,
          lineItems: [{ description: title, qty: 1, unitPrice: flatRate, total: flatRate }],
        },
      });
    }

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
