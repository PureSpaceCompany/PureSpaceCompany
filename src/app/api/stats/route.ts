import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      totalJobs,
      completedJobs,
      pendingJobs,
      totalClients,
      activeStaff,
      invoiceAgg,
      paidAgg,
      overdueAgg,
      recentJobs,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { status: "COMPLETED" } }),
      prisma.job.count({ where: { status: { in: ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.clientProfile.count(),
      prisma.staffProfile.count({ where: { isActive: true } }),
      // Total value of all non-void invoices
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { status: { not: "VOID" } },
      }),
      // Revenue actually collected (paid)
      prisma.invoice.aggregate({
        _sum: { paidAmount: true, total: true },
        where: { status: "PAID" },
      }),
      // Outstanding overdue
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { status: "OVERDUE" },
      }),
      // Recent 5 jobs for dashboard list
      prisma.job.findMany({
        take: 5,
        orderBy: { scheduledStart: "desc" },
        include: {
          client: { select: { firstName: true, lastName: true, company: true } },
          property: { select: { name: true } },
          invoice: { select: { total: true, status: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalJobs,
        completedJobs,
        pendingJobs,
        totalClients,
        activeStaff,
        // Total amount charged across all services (non-void invoices)
        totalCharged: Number(invoiceAgg._sum.total ?? 0),
        // Money actually received (paid invoices)
        totalReceived: Number(paidAgg._sum.paidAmount ?? paidAgg._sum.total ?? 0),
        // Outstanding overdue
        totalOverdue: Number(overdueAgg._sum.total ?? 0),
        recentJobs,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/stats]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
