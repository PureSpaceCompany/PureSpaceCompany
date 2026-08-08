import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateJobSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["UNASSIGNED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  actualStart: z.string().datetime().optional().nullable(),
  actualEnd: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  flatRate: z.number().optional().nullable(),
  extraItems: z.array(z.object({ description: z.string(), unitPrice: z.number() })).optional(),
  cleanerPay: z.number().min(0).optional().nullable(),
  staffIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        property: true,
        assignments: { include: { staff: true } },
        checklist: { orderBy: { sortOrder: "asc" } },
        photos: { orderBy: { uploadedAt: "asc" } },
        invoice: true,
        timesheets: { include: { staff: true } },
      },
    });

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userRole = (session.user as any).role;
    const profileId = (session.user as any).profileId;
    if (userRole === "CLEANER" && !job.assignments.some((a) => a.staffId === profileId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: job });
  } catch (err: any) {
    console.error("[GET /api/jobs/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any).role;
    const profileId = (session.user as any).profileId;

    const body = await req.json();
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.job.findUnique({
      where: { id: params.id },
      include: { assignments: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (userRole === "CLEANER") {
      const isAssigned = existing.assignments.some((a) => a.staffId === profileId);
      if (!isAssigned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (Object.keys(parsed.data).some((k) => !["status", "actualStart", "actualEnd"].includes(k))) {
        return NextResponse.json({ error: "Forbidden: cleaners may only update status" }, { status: 403 });
      }
    }

    const { staffIds, ...rest } = parsed.data;
    const updateData: any = { ...rest };

    if (staffIds !== undefined) {
      await prisma.jobAssignment.deleteMany({ where: { jobId: params.id } });
      // Only update status for staff changes if the job hasn't already reached a terminal state
      if (!["COMPLETED", "CANCELLED", "NO_SHOW"].includes(existing.status)) {
        updateData.status = staffIds.length ? "ASSIGNED" : "UNASSIGNED";
      }
      if (staffIds.length) {
        await prisma.jobAssignment.createMany({
          data: staffIds.map((sid, i) => ({ jobId: params.id, staffId: sid, isLead: i === 0 })),
        });
      }
    }

    if (rest.status === "COMPLETED") {
      await prisma.invoice.updateMany({
        where: { jobId: params.id, status: "DRAFT" },
        data: { status: "PENDING", issuedAt: new Date(), dueAt: new Date(Date.now() + 14 * 86400 * 1000) },
      });
    }

    const updated = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        assignments: { include: { staff: true } },
        checklist: { orderBy: { sortOrder: "asc" } },
        photos: true,
        invoice: true,
      },
    });

    // When flatRate or extraItems change, auto-update the existing invoice totals and line items
    if ((rest.flatRate !== undefined || rest.extraItems !== undefined) && updated.invoice) {
      const base = Number(updated.flatRate ?? 0);
      const extras = Array.isArray(updated.extraItems) ? (updated.extraItems as any[]) : [];
      const extrasTotal = extras.reduce((s: number, i: any) => s + i.unitPrice, 0);
      const subtotal = base + extrasTotal;
      if (subtotal > 0) {
        const lineItems = [
          { description: updated.title, qty: 1, unitPrice: base, total: base },
          ...extras.map((item: any) => ({ description: item.description, qty: 1, unitPrice: item.unitPrice, total: item.unitPrice })),
        ];
        await prisma.invoice.update({
          where: { id: updated.invoice.id },
          data: { subtotal, taxRate: 0, taxAmount: 0, total: subtotal, lineItems },
        });
      }
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/jobs/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permanent = new URL(req.url).searchParams.get("permanent") === "true";

    if (permanent) {
      if (userRole !== "ADMIN") return NextResponse.json({ error: "Only admins can permanently delete jobs" }, { status: 403 });
      await prisma.job.delete({ where: { id: params.id } });
    } else {
      await prisma.job.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error("[DELETE /api/jobs/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
