import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  hourlyRate: z.number().nonnegative().optional(),
  skills: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  availability: z.any().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const staff = await prisma.staffProfile.findUnique({
      where: { id: params.id },
      include: { user: { select: { email: true, role: true } } },
    });

    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: staff });
  } catch (err: any) {
    console.error("[GET /api/staff/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

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

    const updated = await prisma.staffProfile.update({
      where: { id: params.id },
      data: parsed.data,
      include: { user: { select: { email: true, role: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/staff/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permanent = new URL(req.url).searchParams.get("permanent") === "true";

    if (permanent) {
      // Deleting the User cascades to StaffProfile via onDelete: Cascade
      const staff = await prisma.staffProfile.findUnique({ where: { id: params.id }, select: { userId: true } });
      if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.user.delete({ where: { id: staff.userId } });
    } else {
      await prisma.staffProfile.update({ where: { id: params.id }, data: { isActive: false } });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error("[DELETE /api/staff/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
