import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportsRevenue, { type MonthBar } from "@/components/reports/reports-revenue";

export const metadata = { title: "Reports – StayShine" };
export const dynamic = "force-dynamic";

// ── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_START = new Date(2025, 6, 1); // July 2025 (month index 6)

function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1),
    end:   new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function monthsFrom(from: Date, to: Date): { year: number; month: number }[] {
  const list: { year: number; month: number }[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const toMonth = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= toMonth) {
    list.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }
  return list;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "MANAGER"].includes(role)) redirect("/login");

  const now = new Date();
  const reportYear = now.getFullYear();
  const { start: yearStart, end: yearEnd } = yearRange(reportYear);

  // ── All jobs this year (for year KPIs + monthly chart) ───────────────────
  const [
    allJobs,
    paidInvoicesAgg,
    allJobAssignments,
    propertiesWithJobs,
  ] = await Promise.all([
    prisma.job.findMany({
      where: { scheduledStart: { gte: yearStart, lte: yearEnd } },
      select: {
        id: true,
        status: true,
        scheduledStart: true,
        flatRate: true,
        propertyId: true,
        property: { select: { id: true, name: true, addressLine1: true, city: true } },
      },
    }),
    // Invoices paid this year
    prisma.invoice.aggregate({
      where: {
        status: "PAID",
        paidAt: { gte: yearStart, lte: yearEnd },
      },
      _sum: { paidAmount: true, total: true },
    }),
    // All assignments for completed jobs this year — for cleaner table
    prisma.jobAssignment.findMany({
      where: {
        job: {
          scheduledStart: { gte: yearStart, lte: yearEnd },
          status: "COMPLETED",
        },
      },
      select: {
        staffId: true,
        staff: { select: { firstName: true, lastName: true } },
        job: { select: { flatRate: true } },
      },
    }),
    // Properties with job counts for this year (all statuses except cancelled)
    prisma.property.findMany({
      select: {
        id: true,
        name: true,
        addressLine1: true,
        city: true,
        jobs: {
          where: {
            scheduledStart: { gte: yearStart, lte: yearEnd },
            status: { not: "CANCELLED" },
          },
          select: { id: true, status: true, flatRate: true },
        },
      },
    }),
  ]);

  // ── Year KPIs ─────────────────────────────────────────────────────────────
  const completedJobs = allJobs.filter((j) => j.status === "COMPLETED");
  const scheduledJobs = allJobs.filter(
    (j) => !["CANCELLED", "COMPLETED"].includes(j.status),
  );

  const completedJobsCount = completedJobs.length;
  const completedRevenue = completedJobs.reduce((s, j) => s + Number(j.flatRate ?? 0), 0);
  const paidInvoiceTotal = Number(paidInvoicesAgg._sum.paidAmount ?? paidInvoicesAgg._sum.total ?? 0);
  const projectedRevenue =
    completedRevenue +
    scheduledJobs.reduce((s, j) => s + Number(j.flatRate ?? 0), 0);

  const billedJobs = completedJobs.filter((j) => Number(j.flatRate ?? 0) > 0);
  const avgBilledJob = billedJobs.length > 0 ? completedRevenue / billedJobs.length : 0;

  // ── Monthly bar chart data (July 2025 → current month) ────────────────────
  const months = monthsFrom(COMPANY_START, now);
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthBars: MonthBar[] = months.map(({ year, month }) => {
    const mStart = new Date(year, month - 1, 1);
    const mEnd   = new Date(year, month, 0, 23, 59, 59, 999);
    const mJobs  = allJobs.filter((j) => {
      const d = new Date(j.scheduledStart);
      return d >= mStart && d <= mEnd;
    });
    const mCompleted = mJobs.filter((j) => j.status === "COMPLETED");
    return {
      label: monthLabel(year, month),
      year,
      month,
      completed: mCompleted.length,
      completedRevenue: mCompleted.reduce((s, j) => s + Number(j.flatRate ?? 0), 0),
      currentYear,
      currentMonth,
    };
  });

  const maxCompleted = Math.max(...monthBars.map((m) => m.completed), 1);

  // Trend line: linear regression on completed counts
  const n = monthBars.length;
  const xMean = (n - 1) / 2;
  const yMean = monthBars.reduce((s, m) => s + m.completed, 0) / n;
  let num = 0, den = 0;
  monthBars.forEach((m, i) => {
    num += (i - xMean) * (m.completed - yMean);
    den += (i - xMean) ** 2;
  });
  const slope     = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const trendValues = monthBars.map((_, i) => intercept + slope * i);

  // SVG chart dimensions
  const chartW   = 600;
  const chartH   = 160;
  const padLeft  = 32;
  const padRight = 12;
  const padTop   = 12;
  const padBottom = 24;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const barW  = n > 0 ? Math.max(plotW / n - 4, 6) : 20;
  const colW  = n > 0 ? plotW / n : plotW;

  function barX(i: number) { return padLeft + i * colW + (colW - barW) / 2; }
  function barY(val: number) { return padTop + plotH - Math.round((val / maxCompleted) * plotH); }
  function barH(val: number) { return Math.round((val / maxCompleted) * plotH); }

  // Trend line polyline points
  const trendPoints = trendValues
    .map((v, i) => {
      const x = padLeft + i * colW + colW / 2;
      const clamped = Math.max(0, Math.min(v, maxCompleted));
      const y = padTop + plotH - Math.round((clamped / maxCompleted) * plotH);
      return `${x},${y}`;
    })
    .join(" ");

  // Y-axis ticks
  const yTicks = [0, Math.round(maxCompleted / 2), maxCompleted];

  // ── Jobs by property (desc by count, exclude no-property) ─────────────────
  const propRows = propertiesWithJobs
    .filter((p) => p.jobs.length > 0)
    .map((p) => ({
      name: p.name,
      address: [p.addressLine1, p.city].filter(Boolean).join(", "),
      total: p.jobs.length,
      completed: p.jobs.filter((j) => j.status === "COMPLETED").length,
      revenue: p.jobs.reduce((s, j) => s + Number(j.flatRate ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  // ── Jobs by cleaner ────────────────────────────────────────────────────────
  const cleanerMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of allJobAssignments) {
    const key = a.staffId;
    if (!cleanerMap.has(key)) {
      cleanerMap.set(key, {
        name: `${a.staff.firstName} ${a.staff.lastName}`,
        count: 0,
        revenue: 0,
      });
    }
    const entry = cleanerMap.get(key)!;
    entry.count++;
    entry.revenue += Number(a.job.flatRate ?? 0);
  }
  const cleanerRows = Array.from(cleanerMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reportYear} overview — since July 2025</p>
        </div>

        {/* KPI row + chart + tables */}
        <ReportsRevenue
          completedJobsCount={completedJobsCount}
          completedRevenue={completedRevenue}
          paidInvoiceTotal={paidInvoiceTotal}
          projectedRevenue={projectedRevenue}
          avgBilledJob={avgBilledJob}
          billedJobsCount={billedJobs.length}
          scheduledJobsCount={scheduledJobs.length}
          reportYear={reportYear}
          propRows={propRows}
          cleanerRows={cleanerRows}
          monthBars={monthBars}
          trendPoints={trendPoints}
          chartW={chartW}
          chartH={chartH}
          padLeft={padLeft}
          padRight={padRight}
          padTop={padTop}
          padBottom={padBottom}
          n={n}
          yTicks={yTicks}
          maxCompleted={maxCompleted}
        />

      </div>
    </div>
  );
}
