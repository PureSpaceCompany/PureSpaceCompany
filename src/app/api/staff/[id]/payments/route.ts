import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/staff/:id/payments — list completed jobs with pay info
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await prisma.job.findMany({
      where: {
        assignments: { some: { staffId: params.id } },
        status: "COMPLETED",
      },
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        cleanerPay: true,
        cleanerPaidAt: true,
        client: { select: { firstName: true, lastName: true, company: true } },
        property: { select: { name: true, city: true } },
      },
      orderBy: { scheduledStart: "desc" },
    });

    const totalEarned = jobs.reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);
    const totalPaid   = jobs.filter((j) => j.cleanerPaidAt).reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);
    const totalOwed   = jobs.filter((j) => !j.cleanerPaidAt).reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);

    return NextResponse.json({ data: { jobs, totalEarned, totalPaid, totalOwed } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

// POST /api/staff/:id/payments — mark jobs as paid
// body: { jobIds: string[] }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobIds } = await req.json();
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds required" }, { status: 400 });
    }

    await prisma.job.updateMany({
      where: {
        id: { in: jobIds },
        assignments: { some: { staffId: params.id } },
      },
      data: { cleanerPaidAt: new Date() },
    });

    return NextResponse.json({ data: { success: true, count: jobIds.length } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/staff/:id/payments — mark jobs as unpaid (revert)
// body: { jobIds: string[] }
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobIds } = await req.json();
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds required" }, { status: 400 });
    }

    await prisma.job.updateMany({
      where: { id: { in: jobIds }, assignments: { some: { staffId: params.id } } },
      data: { cleanerPaidAt: null },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
