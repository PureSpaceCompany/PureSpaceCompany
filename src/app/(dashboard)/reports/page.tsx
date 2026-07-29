import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, clientDisplayName } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase,
  Users, CheckCircle2, AlertCircle, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import MonthNav from "./month-nav";
import DailyRangePicker from "./daily-range-picker";

export const metadata = { title: "Reports – StayShine" };
export const dynamic = "force-dynamic";

function parseMonth(raw: string | undefined): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function prevMonth(y: number, m: number) {
  const d = new Date(y, m - 2, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function isValidDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string; from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "MANAGER"].includes(role)) redirect("/login");

  const { year, month } = parseMonth(searchParams.month);
  const { start, end } = monthRange(year, month);
  const prev = prevMonth(year, month);
  const { start: prevStart, end: prevEnd } = monthRange(prev.year, prev.month);

  const monthLabel = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthParam = `${year}-${pad2(month)}`;

  // Custom date range for the daily chart (falls back to current month)
  const customFrom = isValidDate(searchParams.from) ? searchParams.from : null;
  const customTo   = isValidDate(searchParams.to)   ? searchParams.to   : null;
  const useCustomRange = !!(customFrom && customTo && customFrom <= customTo);

  const chartStart = useCustomRange ? new Date(`${customFrom}T00:00:00`) : start;
  const chartEnd   = useCustomRange ? new Date(`${customTo}T23:59:59`)   : end;

  // ── parallel queries ────────────────────────────────────────────────────────
  const [
    jobsThisMonth,
    jobsPrevMonth,
    invoicesThisMonth,
    invoicesPrevMonth,
    topClientsThisMonth,
    staffStats,
    serviceTypeCounts,
  ] = await Promise.all([
    // Jobs this month — include flatRate for daily revenue
    prisma.job.findMany({
      where: { scheduledStart: { gte: start, lte: end } },
      select: { status: true, scheduledStart: true, flatRate: true },
    }),
    // Jobs previous month (for comparison)
    prisma.job.count({ where: { scheduledStart: { gte: prevStart, lte: prevEnd } } }),
    // Invoices this month (non-void) — for KPI tiles only
    prisma.invoice.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: "VOID" } },
      select: { total: true, paidAmount: true, status: true },
    }),
    // Invoices previous month
    prisma.invoice.aggregate({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { not: "VOID" } },
      _sum: { total: true },
    }),
    // Top clients this month by job count
    prisma.job.groupBy({
      by: ["clientId"],
      where: { scheduledStart: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { flatRate: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    // Staff performance this month
    prisma.jobAssignment.findMany({
      where: { job: { scheduledStart: { gte: start, lte: end }, status: "COMPLETED" } },
      select: {
        staffId: true,
        staff: { select: { firstName: true, lastName: true } },
      },
    }),
    // Service type breakdown
    prisma.job.groupBy({
      by: ["serviceType"],
      where: { scheduledStart: { gte: start, lte: end } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Chart range query — only needed when custom range differs from month range
  const chartJobs = useCustomRange
    ? await prisma.job.findMany({
        where: { scheduledStart: { gte: chartStart, lte: chartEnd } },
        select: { status: true, scheduledStart: true, flatRate: true },
      })
    : jobsThisMonth;

  // Resolve client names for top clients
  const clientIds = topClientsThisMonth.map((r) => r.clientId);
  const clientProfiles = await prisma.clientProfile.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, firstName: true, lastName: true, company: true },
  });
  const clientMap = Object.fromEntries(clientProfiles.map((c) => [c.id, c]));

  // ── derived numbers ─────────────────────────────────────────────────────────
  const totalJobs     = jobsThisMonth.length;
  const completedJobs = jobsThisMonth.filter((j) => j.status === "COMPLETED").length;
  const cancelledJobs = jobsThisMonth.filter((j) => j.status === "CANCELLED").length;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const totalBilled   = invoicesThisMonth.reduce((s, i) => s + Number(i.total), 0);
  const totalReceived = invoicesThisMonth
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.paidAmount ?? i.total), 0);
  const totalOutstanding = invoicesThisMonth
    .filter((i) => ["PENDING", "OVERDUE"].includes(i.status))
    .reduce((s, i) => s + Number(i.total), 0);
  const overdueAmt = invoicesThisMonth
    .filter((i) => i.status === "OVERDUE")
    .reduce((s, i) => s + Number(i.total), 0);

  const prevBilledAmt = Number(invoicesPrevMonth._sum.total ?? 0);
  const billedDelta   = prevBilledAmt > 0 ? ((totalBilled - prevBilledAmt) / prevBilledAmt) * 100 : null;
  const jobsDelta     = jobsPrevMonth > 0 ? ((totalJobs - jobsPrevMonth) / jobsPrevMonth) * 100 : null;

  // Daily chart — per day: scheduled count, completed count, earned revenue, projected revenue
  interface DayData { scheduled: number; completed: number; revenue: number; projected: number; date: Date }
  const dayMap = new Map<string, DayData>();
  for (let d = new Date(chartStart); d <= chartEnd; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { scheduled: 0, completed: 0, revenue: 0, projected: 0, date: new Date(d) });
  }
  for (const job of chartJobs) {
    const key = new Date(job.scheduledStart).toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (!entry) continue;
    entry.scheduled++;
    if (job.status === "COMPLETED") {
      entry.completed++;
      entry.revenue += Number(job.flatRate ?? 0);
    } else if (job.status !== "CANCELLED" && job.status !== "NO_SHOW") {
      // ASSIGNED / UNASSIGNED / IN_PROGRESS — count toward projected income
      entry.projected += Number(job.flatRate ?? 0);
    }
  }
  const dailyData = Array.from(dayMap.values());
  // Use revenue for bar height; fall back to job count if no flatRates are set
  const hasAnyRevenue = dailyData.some((d) => d.revenue + d.projected > 0);
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue + d.projected), 1);
  const maxScheduled = Math.max(...dailyData.map((d) => d.scheduled), 1);

  const chartLabel = useCustomRange
    ? `${customFrom} → ${customTo}`
    : monthLabel;
  const chartTotalJobs = chartJobs.length;

  // Staff job counts
  const staffCounts = new Map<string, { name: string; count: number }>();
  for (const a of staffStats) {
    const key = a.staffId;
    if (!staffCounts.has(key)) {
      staffCounts.set(key, {
        name: `${a.staff.firstName} ${a.staff.lastName}`,
        count: 0,
      });
    }
    staffCounts.get(key)!.count++;
  }
  const staffLeaderboard = Array.from(staffCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxStaffJobs = staffLeaderboard[0]?.count ?? 1;

  const serviceColors: Record<string, string> = {
    STANDARD:         "bg-blue-500",
    DEEP_CLEAN:       "bg-violet-500",
    MOVE_IN_OUT:      "bg-orange-500",
    POST_CONSTRUCTION:"bg-amber-500",
    RECURRING:        "bg-emerald-500",
    COMMERCIAL:       "bg-cyan-500",
  };
  const maxServiceCount = serviceTypeCounts[0]?._count.id ?? 1;

  // Status distribution for this month's jobs
  const statusDist = [
    { label: "Completed",   count: completedJobs,                     color: "bg-emerald-500" },
    { label: "Cancelled",   count: cancelledJobs,                     color: "bg-red-400" },
    { label: "In Progress", count: jobsThisMonth.filter((j) => j.status === "IN_PROGRESS").length, color: "bg-amber-400" },
    { label: "Assigned",    count: jobsThisMonth.filter((j) => j.status === "ASSIGNED").length,    color: "bg-blue-500" },
    { label: "Unassigned",  count: jobsThisMonth.filter((j) => j.status === "UNASSIGNED").length,  color: "bg-gray-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* Header with month navigator */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">{monthLabel}</p>
          </div>
          <Suspense>
            <MonthNav year={year} month={month} />
          </Suspense>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total jobs */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-t-4 border-t-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{totalJobs}</p>
                {jobsDelta !== null && (
                  <p className={`text-xs mt-1.5 flex items-center gap-0.5 ${jobsDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {jobsDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(jobsDelta).toFixed(0)}% vs last month
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500"><Briefcase className="w-5 h-5 text-white" /></div>
            </div>
          </div>

          {/* Revenue billed */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-t-4 border-t-emerald-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue Billed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{formatCurrency(totalBilled)}</p>
                {billedDelta !== null && (
                  <p className={`text-xs mt-1.5 flex items-center gap-0.5 ${billedDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {billedDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(billedDelta).toFixed(0)}% vs last month
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500"><DollarSign className="w-5 h-5 text-white" /></div>
            </div>
          </div>

          {/* Collected */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-t-4 border-t-violet-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Collected</p>
                <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{formatCurrency(totalReceived)}</p>
                <p className="text-xs mt-1.5 text-gray-400">
                  {totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0}% collection rate
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-500"><CheckCircle2 className="w-5 h-5 text-white" /></div>
            </div>
          </div>

          {/* Outstanding / overdue */}
          <div className={`bg-white rounded-xl shadow-sm p-5 border-t-4 ${overdueAmt > 0 ? "border-t-red-500" : "border-t-amber-400"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Outstanding</p>
                <p className={`text-3xl font-bold mt-1 leading-none ${totalOutstanding > 0 ? "text-amber-600" : "text-gray-400"}`}>
                  {formatCurrency(totalOutstanding)}
                </p>
                {overdueAmt > 0 && (
                  <p className="text-xs mt-1.5 text-red-500 flex items-center gap-0.5">
                    <AlertCircle className="w-3 h-3" /> {formatCurrency(overdueAmt)} overdue
                  </p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl ${overdueAmt > 0 ? "bg-red-500" : "bg-amber-400"}`}>
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Daily activity chart + completion ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Daily chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            {/* Chart header */}
            <div className="flex items-start justify-between gap-4 mb-1">
              <div>
                <h2 className="font-semibold text-gray-900">Daily Activity — {chartLabel}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {chartTotalJobs} job{chartTotalJobs !== 1 ? "s" : ""} · {hasAnyRevenue ? "income per day" : "jobs per day (set flat rates to see income)"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Earned</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block" /> Projected</span>
                </div>
                <Suspense>
                  <DailyRangePicker
                    activeFrom={customFrom}
                    activeTo={customTo}
                    month={monthParam}
                  />
                </Suspense>
              </div>
            </div>

            {chartTotalJobs === 0 ? (
              <div className="flex items-center justify-center h-44 text-gray-300 mt-4">
                <p className="text-sm">No jobs in this range</p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-px h-44 mt-4">
                  {dailyData.map((day, i) => {
                    const totalIncome = day.revenue + day.projected;
                    const hasActivity = day.scheduled > 0;
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const isToday = day.date.toISOString().slice(0, 10) === todayStr;
                    const dayLabel = day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                    // Bar height proportional to income when available, else job count
                    const barPct = hasAnyRevenue
                      ? totalIncome > 0 ? Math.max(Math.round((totalIncome / maxRevenue) * 100), 4) : (hasActivity ? 2 : 0)
                      : hasActivity ? Math.max(Math.round((day.scheduled / maxScheduled) * 100), 4) : 0;

                    // Within the bar: earned (green) at bottom, projected (blue) on top
                    const earnedFrac = totalIncome > 0 ? day.revenue / totalIncome : 0;
                    const projFrac   = totalIncome > 0 ? day.projected / totalIncome : 0;
                    // If no flatRates, show green/blue split by completed vs scheduled count
                    const earnedFracFallback = day.scheduled > 0 ? day.completed / day.scheduled : 0;

                    const earnedPct  = hasAnyRevenue ? Math.round(earnedFrac * 100)  : Math.round(earnedFracFallback * 100);
                    const projPct    = hasAnyRevenue ? Math.round(projFrac * 100)    : Math.round((1 - earnedFracFallback) * 100);

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                        {/* Tooltip */}
                        {hasActivity && (
                          <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                            <p className="font-semibold mb-0.5">{dayLabel}</p>
                            <p className="text-gray-300">{day.completed}/{day.scheduled} job{day.scheduled !== 1 ? "s" : ""} completed</p>
                            {day.revenue > 0 && <p className="text-emerald-400">Earned: {formatCurrency(day.revenue)}</p>}
                            {day.projected > 0 && <p className="text-blue-300">Projected: {formatCurrency(day.projected)}</p>}
                            {totalIncome > 0 && <p className="text-white font-semibold border-t border-gray-700 mt-1 pt-1">Total: {formatCurrency(totalIncome)}</p>}
                          </div>
                        )}

                        {/* Stacked bar: earned (green bottom) + projected (blue top) */}
                        {barPct > 0 && (
                          <div
                            className="w-full relative rounded-t overflow-hidden"
                            style={{ height: `${barPct}%` }}
                          >
                            {/* Projected (blue) — fills the full bar as background */}
                            <div className={`absolute inset-0 rounded-t ${projPct > 0 || !hasAnyRevenue ? "bg-blue-200" : "bg-gray-100"}`} />
                            {/* Earned (green) — sits at the bottom */}
                            {earnedPct > 0 && (
                              <div
                                className="absolute bottom-0 left-0 right-0 bg-emerald-500"
                                style={{ height: `${earnedPct}%` }}
                              />
                            )}
                          </div>
                        )}
                        {barPct === 0 && hasActivity && (
                          <div className="w-full rounded-t bg-gray-100" style={{ height: "2%" }} />
                        )}

                        {/* Today dot */}
                        {isToday && (
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-axis — show date label every ~7 bars, fewer if range is short */}
                {(() => {
                  const total = dailyData.length;
                  const step = total <= 14 ? 2 : total <= 31 ? 7 : 14;
                  return (
                    <div className="flex items-end gap-px mt-2">
                      {dailyData.map((day, i) => (
                        <div key={i} className="flex-1 text-center text-[9px] text-gray-300 leading-none">
                          {i % step === 0
                            ? day.date.toLocaleDateString("en-US", total <= 14 ? { month: "short", day: "numeric" } : { day: "numeric" })
                            : ""}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Job completion ring */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-gray-900 mb-4">Job Breakdown</h2>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10b981" strokeWidth="3.5"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{completionRate}%</span>
                  <span className="text-xs text-gray-400">done</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-auto">
              {statusDist.map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-gray-600">{label}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Three column: service types + top clients + staff */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Service type breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Service Types</h2>
            {serviceTypeCounts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No jobs this month</p>
            ) : (
              <div className="space-y-3">
                {serviceTypeCounts.map(({ serviceType, _count }) => (
                  <div key={serviceType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{serviceType.replace(/_/g, " ").toLowerCase()}</span>
                      <span className="font-semibold text-gray-900">{_count.id}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${serviceColors[serviceType] ?? "bg-gray-400"}`}
                        style={{ width: `${Math.round((_count.id / maxServiceCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Top Clients</h2>
              <Link href="/clients" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {topClientsThisMonth.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No client activity</p>
            ) : (
              <div className="space-y-3">
                {topClientsThisMonth.map((row) => {
                  const c = clientMap[row.clientId];
                  const name = c ? clientDisplayName(c) : "Unknown";
                  const maxCount = topClientsThisMonth[0]._count.id;
                  return (
                    <div key={row.clientId}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 flex-1 truncate">{name}</span>
                        <span className="text-sm font-semibold text-gray-900">{row._count.id}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.round((row._count.id / maxCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Staff leaderboard */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Staff Performance</h2>
              <Link href="/staff" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {staffLeaderboard.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No completed jobs this month</p>
            ) : (
              <div className="space-y-3">
                {staffLeaderboard.map((s, i) => (
                  <div key={s.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"
                      }`}>{i + 1}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{s.name}</span>
                      <span className="text-sm font-semibold text-gray-900">{s.count} job{s.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.round((s.count / maxStaffJobs) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
