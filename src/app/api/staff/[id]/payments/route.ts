import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/staff/:id/payments — list completed jobs with this staff's individual pay
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch assignments for this staff on completed jobs, including the per-assignment pay
    const assignments = await prisma.jobAssignment.findMany({
      where: {
        staffId: params.id,
        job: { status: "COMPLETED" },
      },
      select: {
        pay: true,
        job: {
          select: {
            id: true,
            title: true,
            scheduledStart: true,
            cleanerPaidAt: true,
            client: { select: { firstName: true, lastName: true, company: true } },
            property: { select: { name: true, city: true } },
          },
        },
      },
      orderBy: { job: { scheduledStart: "desc" } },
    });

    const jobs = assignments.map((a) => ({
      id: a.job.id,
      title: a.job.title,
      scheduledStart: a.job.scheduledStart,
      cleanerPay: a.pay !== null ? Number(a.pay) : null,
      cleanerPaidAt: a.job.cleanerPaidAt,
      client: a.job.client,
      property: a.job.property,
    }));

    const totalEarned = jobs.reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);
    const totalPaid   = jobs.filter((j) => j.cleanerPaidAt).reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);
    const totalOwed   = jobs.filter((j) => !j.cleanerPaidAt).reduce((s, j) => s + Number(j.cleanerPay ?? 0), 0);

    return NextResponse.json({ data: { jobs, totalEarned, totalPaid, totalOwed } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

// POST /api/staff/:id/payments — mark jobs as paid
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

// DELETE /api/staff/:id/payments — mark jobs as unpaid
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
