import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "VOID"]).optional(),
  paidAt: z.string().datetime().optional().nullable(),
  paidAmount: z.number().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: any = { ...parsed.data };
    if (parsed.data.status === "PAID" && !parsed.data.paidAt) {
      data.paidAt = new Date();
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data,
      include: {
        client: { select: { firstName: true, lastName: true, company: true } },
        job: { select: { title: true, scheduledStart: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/invoices/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "VOID" },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error("[DELETE /api/invoices/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
