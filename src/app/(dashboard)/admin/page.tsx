import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatCurrency, clientDisplayName } from "@/lib/utils";
import {
  Briefcase, Users, CalendarCheck,
  AlertCircle, Clock, CheckCircle2,
  ArrowRight, MapPin, UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { JobStatus } from "@/types";
import ThisMonthChart, { type DayData } from "@/components/dashboard/this-month-chart";

export const metadata = { title: "Dashboard – PureSpace" };
export const dynamic = "force-dynamic";

const TZ = "America/Chicago";

// Converts a UTC Date to its Central-time representation as a naive JS Date
// so that .getDate()/.getMonth() etc. return Central values.
function toCentral(d: Date): Date {
  return new Date(d.toLocaleString("en-US", { timeZone: TZ }));
}

// Returns the UTC instant for midnight (start) of d's Central calendar day
function centralDayStart(d: Date, offsetMs: number): Date {
  const c = toCentral(d);
  c.setHours(0, 0, 0, 0);
  return new Date(c.getTime() + offsetMs);
}
function centralDayEnd(d: Date, offsetMs: number): Date {
  const c = toCentral(d);
  c.setHours(23, 59, 59, 999);
  return new Date(c.getTime() + offsetMs);
}
function centralMonthStart(d: Date, offsetMs: number): Date {
  const c = toCentral(d);
  c.setDate(1); c.setHours(0, 0, 0, 0);
  return new Date(c.getTime() + offsetMs);
}
function centralMonthEnd(d: Date, offsetMs: number): Date {
  const c = toCentral(d);
  c.setDate(new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate());
  c.setHours(23, 59, 59, 999);
  return new Date(c.getTime() + offsetMs);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}
function isToday(d: Date, centralNow: Date): boolean {
  const c = toCentral(d);
  return c.getDate() === centralNow.getDate() &&
         c.getMonth() === centralNow.getMonth() &&
         c.getFullYear() === centralNow.getFullYear();
}

const STATUS_DOT: Record<JobStatus, string> = {
  UNASSIGNED: "bg-gray-400",
  ASSIGNED:   "bg-blue-500",
  IN_PROGRESS:"bg-amber-400",
  COMPLETED:  "bg-emerald-500",
  CANCELLED:  "bg-red-400",
  NO_SHOW:    "bg-[#4CAF82]",
};

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "MANAGER"].includes(role)) redirect("/login");

  const now = new Date();
  const centralNow = toCentral(now);

  // Calculate UTC-offset for Central so we can convert naive-Central to UTC
  // We do it by diffing the UTC parse of "midnight Central" from its toLocaleString representation
  const utcOffsetMs = now.getTime() - new Date(now.toLocaleString("en-US", { timeZone: TZ })).getTime();

  const todayStart  = centralDayStart(now, utcOffsetMs);
  const todayEnd    = centralDayEnd(now, utcOffsetMs);
  const weekEnd     = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart  = centralMonthStart(now, utcOffsetMs);
  const monthEnd    = centralMonthEnd(now, utcOffsetMs);
  const daysElapsed = centralNow.getDate();
  // Chart window: today through 29 more days (covers all range options)
  const chartWindowEnd = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000 - 1);

  const [
    jobCounts,
    staffCount,
    clientCount,
    overdueAgg,
    pendingCount,
    upcomingJobs,
    recentCompleted,
    topClients,
    monthJobs,
    monthInvoiceAgg,
    monthBilledCount,
    monthCompletedJobs,
  ] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.staffProfile.count({ where: { isActive: true } }),
    prisma.clientProfile.count(),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "OVERDUE" } }),
    prisma.invoice.count({ where: { status: "PENDING" } }),
    // Next 7 days of jobs
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: todayStart, lte: weekEnd },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      orderBy: { scheduledStart: "asc" },
      take: 8,
      include: {
        client: { select: { firstName: true, lastName: true, company: true } },
        property: { select: { name: true, city: true } },
        assignments: { include: { staff: { select: { firstName: true, lastName: true } } }, take: 2 },
      },
    }),
    // Last 5 completed jobs
    prisma.job.findMany({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        client: { select: { firstName: true, lastName: true, company: true } },
        invoice: { select: { total: true, status: true } },
      },
    }),
    // Top 4 clients by job count
    prisma.clientProfile.findMany({
      take: 4,
      include: { _count: { select: { jobs: true } } },
      orderBy: { jobs: { _count: "desc" } },
    }),
    // This month's jobs
    prisma.job.count({
      where: { scheduledStart: { gte: monthStart, lte: monthEnd } },
    }),
    // This month's invoice totals (completed jobs billed this month)
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: {
        status: { not: "VOID" },
        issuedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    // This month's billed jobs count
    prisma.invoice.count({
      where: {
        status: { not: "VOID" },
        issuedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    // Jobs for the full month + forward chart window (all non-cancelled)
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: monthStart, lte: chartWindowEnd },
        status: { not: "CANCELLED" },
      },
      select: { scheduledStart: true, flatRate: true, extraItems: true, status: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(jobCounts.map((g) => [g.status, g._count.id])) as Record<JobStatus, number>;
  const todayCount     = upcomingJobs.filter(j => isToday(new Date(j.scheduledStart), centralNow)).length;
  const totalJobs      = jobCounts.reduce((s, g) => s + g._count.id, 0);
  const totalOverdue   = Number(overdueAgg._sum.total ?? 0);
  const completedCount = countByStatus["COMPLETED"] ?? 0;
  const completionPct  = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;

  // Month stats
  const monthRevenue   = Number(monthInvoiceAgg._sum.total ?? 0);
  const avgPerJob      = monthBilledCount > 0 ? monthRevenue / monthBilledCount : 0;
  const monthLabel     = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Month completed count (from chart jobs, status = COMPLETED, within month range)
  const monthCompletedCount = monthCompletedJobs.filter(
    (j) => j.status === "COMPLETED" &&
    new Date(j.scheduledStart) >= monthStart &&
    new Date(j.scheduledStart) <= monthEnd,
  ).length;

  // Projected = completed revenue + flatRate on non-completed, non-cancelled month jobs
  const monthProjected = monthRevenue + monthCompletedJobs
    .filter((j) => j.status !== "COMPLETED" &&
      new Date(j.scheduledStart) >= monthStart &&
      new Date(j.scheduledStart) <= monthEnd)
    .reduce((s, j) => s + Number(j.flatRate ?? 0), 0);

  // ── Build DayData array covering the full current month ──────────────────
  const todayDateStr = [
    centralNow.getFullYear(),
    String(centralNow.getMonth() + 1).padStart(2, "0"),
    String(centralNow.getDate()).padStart(2, "0"),
  ].join("-");

  // How many days in this calendar month
  const daysInMonth = new Date(centralNow.getFullYear(), centralNow.getMonth() + 1, 0).getDate();

  const chartDays: DayData[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(monthStart.getTime() + i * 24 * 60 * 60 * 1000);
    const c = toCentral(d);
    const dateStr = [
      c.getFullYear(),
      String(c.getMonth() + 1).padStart(2, "0"),
      String(c.getDate()).padStart(2, "0"),
    ].join("-");
    const label = c.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date: dateStr, label, dayNum: c.getDate(), completed: 0, scheduled: 0, revenue: 0, projected: 0 };
  });

  for (const job of monthCompletedJobs) {
    const c = toCentral(new Date(job.scheduledStart));
    const dateStr = [
      c.getFullYear(),
      String(c.getMonth() + 1).padStart(2, "0"),
      String(c.getDate()).padStart(2, "0"),
    ].join("-");
    const idx = chartDays.findIndex((d) => d.date === dateStr);
    if (idx === -1) continue;
    const extras = Array.isArray((job as any).extraItems)
      ? ((job as any).extraItems as any[]).reduce((s: number, i: any) => s + Number(i.unitPrice ?? 0), 0)
      : 0;
    const jobTotal = Number(job.flatRate ?? 0) + extras;
    if (job.status === "COMPLETED") {
      chartDays[idx].completed++;
      chartDays[idx].revenue += jobTotal;
    } else {
      chartDays[idx].scheduled++;
      chartDays[idx].projected += jobTotal;
    }
  }

  const kpiCards = [
    {
      label: "Today's Jobs",
      value: todayCount,
      sub: `${upcomingJobs.length} this week`,
      icon: CalendarCheck,
      iconBg: "bg-blue-500",
      border: "border-t-4 border-t-blue-500",
      href: "/schedule",
    },
    {
      label: "Active Staff",
      value: staffCount,
      sub: "Available for scheduling",
      icon: Users,
      iconBg: "bg-violet-500",
      border: "border-t-4 border-t-violet-500",
      href: "/staff",
    },
    {
      label: "Total Clients",
      value: clientCount,
      sub: `${completedCount} jobs completed`,
      icon: Briefcase,
      iconBg: "bg-[#1A3D2B]",
      border: "border-t-4 border-t-[#4CAF82]",
      href: "/clients",
    },
    {
      label: "Pending Invoices",
      value: pendingCount,
      sub: totalOverdue > 0 ? `${formatCurrency(totalOverdue)} overdue` : "All up to date",
      subColor: totalOverdue > 0 ? "text-red-500" : "text-emerald-600",
      icon: totalOverdue > 0 ? AlertCircle : CheckCircle2,
      iconBg: totalOverdue > 0 ? "bg-red-500" : "bg-emerald-500",
      border: totalOverdue > 0 ? "border-t-4 border-t-red-500" : "border-t-4 border-t-emerald-500",
      href: "/invoices",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: TZ })}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 sm:hidden">
              {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ })}
            </p>
          </div>
          <Link href="/jobs?new=1" className="flex items-center gap-1.5 text-sm font-medium text-[#1A3D2B] bg-[#F3FAF6] hover:bg-amber-50 px-4 py-2 rounded-lg transition-colors shrink-0">
            New Job <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* KPI row — each card is a link */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, sub, subColor, icon: Icon, iconBg, border, href }) => (
            <Link key={label} href={href}
              className={`bg-white rounded-xl shadow-sm p-4 md:p-5 ${border} hover:shadow-md transition-shadow group`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
                  <p className={`text-xs mt-1.5 truncate ${subColor ?? "text-gray-400"}`}>{sub}</p>
                </div>
                <div className={`p-2 md:p-2.5 rounded-xl shrink-0 ${iconBg}`}>
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-[#1A3D2B] mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
              </p>
            </Link>
          ))}
        </div>

        {/* This Month + Job completion row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <ThisMonthChart
            days={chartDays}
            defaultRange={daysElapsed}
            monthLabel={monthLabel}
            monthJobs={monthJobs}
            monthCompleted={monthCompletedCount}
            monthRevenue={monthRevenue}
            monthProjected={monthProjected}
            avgPerJob={avgPerJob}
            todayDate={todayDateStr}
          />

          {/* Job completion card */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Job Status</h2>
              <Link href="/jobs" className="text-xs text-[#1A3D2B] hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex items-center justify-center mb-5">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#10b981" strokeWidth="3.5"
                    strokeDasharray={`${completionPct} ${100 - completionPct}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{completionPct}%</span>
                  <span className="text-xs text-gray-400">done</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-auto">
              {(["UNASSIGNED","ASSIGNED","IN_PROGRESS","COMPLETED","CANCELLED"] as JobStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="text-gray-600 capitalize">{s.replace(/_/g, " ").toLowerCase()}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{countByStatus[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming jobs + Recent completed side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Upcoming — takes 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Upcoming Jobs</h2>
                <span className="text-xs font-medium bg-[#F3FAF6] text-[#1A3D2B] px-2 py-0.5 rounded-full">{upcomingJobs.length}</span>
              </div>
              <Link href="/schedule" className="text-xs text-[#1A3D2B] hover:underline flex items-center gap-1">
                Schedule <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {upcomingJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <CalendarCheck className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-sm">No upcoming jobs this week</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingJobs.map((job) => {
                  const start = new Date(job.scheduledStart);
                  const today = isToday(start, centralNow);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-start gap-3 px-4 md:px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`shrink-0 w-11 text-center rounded-lg py-1.5 ${today ? "bg-[#1A3D2B] text-white" : "bg-gray-100 text-gray-600"}`}>
                        <p className="text-[10px] font-medium">{today ? "TODAY" : start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</p>
                        <p className="text-base font-bold leading-tight">{start.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[job.status as JobStatus]}`} />
                          <p className="font-medium text-gray-900 truncate text-sm">{job.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {clientDisplayName(job.client)}
                          {job.property && <span className="text-gray-400"> · {job.property.name}</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatTime(start)}
                          </span>
                          {job.assignments.length > 0 && (
                            <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
                              <UserCircle2 className="w-3 h-3" />
                              {job.assignments[0].staff.firstName}
                              {job.assignments.length > 1 && ` +${job.assignments.length - 1}`}
                            </span>
                          )}
                          {job.property?.city && (
                            <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{job.property.city}
                            </span>
                          )}
                        </div>
                      </div>
                      <JobStatusBadge status={job.status as JobStatus} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: recent completed + top clients */}
          <div className="lg:col-span-2 space-y-4">

            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">Recently Completed</h2>
                  <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{recentCompleted.length}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {recentCompleted.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No completed jobs yet</p>
                ) : recentCompleted.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-4 md:px-5 py-3 hover:bg-gray-50 transition-colors gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 truncate">{clientDisplayName(job.client)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {job.invoice
                        ? <p className="text-sm font-semibold text-emerald-600">{formatCurrency(Number(job.invoice.total))}</p>
                        : <p className="text-xs text-gray-400">No invoice</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Top Clients</h2>
                <Link href="/clients" className="text-xs text-[#1A3D2B] hover:underline flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {topClients.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A3D2B] to-[#4CAF82] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(c.company ?? c.firstName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{clientDisplayName(c)}</p>
                      <p className="text-xs text-gray-400">{c._count.jobs} job{c._count.jobs !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A3D2B] rounded-full"
                        style={{ width: `${Math.min(100, (c._count.jobs / (topClients[0]?._count.jobs || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
