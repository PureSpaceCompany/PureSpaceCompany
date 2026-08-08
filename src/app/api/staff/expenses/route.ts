import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/staff/expenses
// Returns per-month expense rollup across all staff for the rolling 12 months.
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || !["ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await prisma.job.findMany({
      where: {
        status: "COMPLETED",
        cleanerPay: { not: null },
      },
      select: {
        scheduledStart: true,
        cleanerPay: true,
        cleanerPaidAt: true,
        assignments: { select: { staff: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { scheduledStart: "asc" },
    });

    // Group by YYYY-MM
    const monthMap = new Map<string, { label: string; jobs: number; paid: number; owed: number }>();

    for (const job of jobs) {
      const d = new Date(job.scheduledStart);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!monthMap.has(key)) monthMap.set(key, { label, jobs: 0, paid: 0, owed: 0 });
      const m = monthMap.get(key)!;
      const pay = Number(job.cleanerPay ?? 0);
      m.jobs++;
      if (job.cleanerPaidAt) m.paid += pay;
      else m.owed += pay;
    }

    // Per-staff owed totals for the card badges
    const staffMap = new Map<string, { name: string; owed: number; paid: number }>();
    for (const job of jobs) {
      const pay = Number(job.cleanerPay ?? 0);
      for (const a of job.assignments) {
        const s = a.staff;
        if (!staffMap.has(s.id)) staffMap.set(s.id, { name: `${s.firstName} ${s.lastName}`, owed: 0, paid: 0 });
        const entry = staffMap.get(s.id)!;
        if (job.cleanerPaidAt) entry.paid += pay;
        else entry.owed += pay;
      }
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v }));

    const staffOwed = Array.from(staffMap.entries()).map(([id, v]) => ({ id, ...v }));

    return NextResponse.json({ data: { months, staffOwed } });
  } catch (err: any) {
    console.error("[GET /api/staff/expenses]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
