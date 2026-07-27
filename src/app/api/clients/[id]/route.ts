import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const updateSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  entryInstructions: z.string().optional().nullable(),
  gateCode: z.string().optional().nullable(),
  petNotes: z.string().optional().nullable(),
  specialNotes: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await prisma.clientProfile.findUnique({
      where: { id: params.id },
      include: { user: { select: { email: true } }, _count: { select: { jobs: true } } },
    });

    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: client });
  } catch (err: any) {
    console.error("[GET /api/clients/:id]", err);
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

    const updated = await prisma.clientProfile.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error("[PATCH /api/clients/:id]", err);
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

    const activeJobs = await prisma.job.count({
      where: { clientId: params.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    });
    if (activeJobs > 0) {
      return NextResponse.json({ error: "Cannot delete client with active jobs" }, { status: 409 });
    }

    if (permanent) {
      // Hard delete — cascades properties, jobs (and their children), invoices
      const client = await prisma.clientProfile.findUnique({ where: { id: params.id }, select: { userId: true } });
      if (client?.userId) {
        await prisma.user.delete({ where: { id: client.userId } });
      } else {
        await prisma.clientProfile.delete({ where: { id: params.id } });
      }
    } else {
      // Soft: just delete the profile (no isActive flag on client, so this is always real)
      await prisma.clientProfile.delete({ where: { id: params.id } });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error("[DELETE /api/clients/:id]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
