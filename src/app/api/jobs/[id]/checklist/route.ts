import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const addItemSchema = z.object({
  label: z.string().min(1),
  sortOrder: z.number().int().optional(),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  itemId: z.string(),
  isCompleted: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  label: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.checklistItem.findMany({
      where: { jobId: params.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: items });
  } catch (err: any) {
    console.error("[GET /api/jobs/:id/checklist]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    let { sortOrder } = parsed.data;
    if (!sortOrder) {
      const last = await prisma.checklistItem.findFirst({
        where: { jobId: params.id },
        orderBy: { sortOrder: "desc" },
      });
      sortOrder = (last?.sortOrder ?? 0) + 1;
    }

    const item = await prisma.checklistItem.create({
      data: { jobId: params.id, label: parsed.data.label, sortOrder, notes: parsed.data.notes },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/jobs/:id/checklist]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { itemId, isCompleted, notes, label } = parsed.data;
    const profileId = (session.user as any).profileId;

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          completedBy: isCompleted ? profileId : null,
        }),
        ...(notes !== undefined && { notes }),
        ...(label !== undefined && { label }),
      },
    });

    const remaining = await prisma.checklistItem.count({
      where: { jobId: params.id, isCompleted: false },
    });
    if (remaining === 0) {
      await prisma.job.updateMany({
        where: { id: params.id, status: "IN_PROGRESS" },
        data: { status: "COMPLETED", actualEnd: new Date() },
      });
      await prisma.invoice.updateMany({
        where: { jobId: params.id, status: "DRAFT" },
        data: { status: "PENDING", issuedAt: new Date(), dueAt: new Date(Date.now() + 14 * 86400 * 1000) },
      });
    }

    return NextResponse.json({ data: updatedItem });
  } catch (err: any) {
    console.error("[PATCH /api/jobs/:id/checklist]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
