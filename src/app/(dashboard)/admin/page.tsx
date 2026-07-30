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

export const metadata = { title: "Dashboard – StayShine" };
export const dynamic = "force-dynamic";

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function isToday(d: Date) {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const STATUS_DOT: Record<JobStatus, string> = {
  UNASSIGNED: "bg-gray-400",
  ASSIGNED:   "bg-blue-500",
  IN_PROGRESS:"bg-amber-400",
  COMPLETED:  "bg-emerald-500",
  CANCELLED:  "bg-red-400",
  NO_SHOW:    "bg-[#C8A46A]",
};

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "MANAGER"].includes(role)) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
  const weekEnd    = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    jobCounts,
    staffCount,
    clientCount,
    chargedAgg,
    paidInvoices,
    overdueAgg,
    pendingCount,
    upcomingJobs,
    recentCompleted,
    topClients,
  ] = await Promise.all([
    prisma.job.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.staffProfile.count({ where: { isActive: true } }),
    prisma.clientProfile.count(),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: { not: "VOID" } } }),
    prisma.invoice.findMany({ where: { status: "PAID" }, select: { total: true, paidAmount: true } }),
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
  ]);

  const countByStatus = Object.fromEntries(jobCounts.map((g) => [g.status, g._count.id])) as Record<JobStatus, number>;
  const todayCount   = upcomingJobs.filter(j => isToday(new Date(j.scheduledStart))).length;
  const totalJobs    = jobCounts.reduce((s, g) => s + g._count.id, 0);
  const totalCharged = Number(chargedAgg._sum.total ?? 0);
  const totalReceived= paidInvoices.reduce((s, i) => s + Number(i.paidAmount ?? i.total), 0);
  const totalOverdue = Number(overdueAgg._sum.total ?? 0);
  const outstanding  = totalCharged - totalReceived;
  const collectionPct= totalCharged > 0 ? Math.round((totalReceived / totalCharged) * 100) : 0;
  const completedCount = countByStatus["COMPLETED"] ?? 0;
  const completionPct  = totalJobs > 0 ? Math.round((completedCount / totalJobs) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Link href="/jobs?new=1" className="flex items-center gap-1.5 text-sm font-medium text-[#163A70] hover:text-[#163A70] bg-[#FAF8F3] hover:bg-[#FAF8F3] px-4 py-2 rounded-lg transition-colors">
            New Job <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Today's Jobs",
              value: todayCount,
              sub: `${upcomingJobs.length} this week`,
              icon: CalendarCheck,
              iconBg: "bg-blue-500",
              border: "border-t-4 border-t-blue-500",
            },
            {
              label: "Active Staff",
              value: staffCount,
              sub: "Available for scheduling",
              icon: Users,
              iconBg: "bg-violet-500",
              border: "border-t-4 border-t-violet-500",
            },
            {
              label: "Total Clients",
              value: clientCount,
              sub: `${completedCount} jobs completed`,
              icon: Briefcase,
              iconBg: "bg-[#163A70]",
              border: "border-t-4 border-t-[#C8A46A]",
            },
            {
              label: "Pending Invoices",
              value: pendingCount,
              sub: totalOverdue > 0 ? `${formatCurrency(totalOverdue)} overdue` : "All up to date",
              subColor: totalOverdue > 0 ? "text-red-500" : "text-emerald-600",
              icon: totalOverdue > 0 ? AlertCircle : CheckCircle2,
              iconBg: totalOverdue > 0 ? "bg-red-500" : "bg-emerald-500",
              border: totalOverdue > 0 ? "border-t-4 border-t-red-500" : "border-t-4 border-t-emerald-500",
            },
          ].map(({ label, value, sub, subColor, icon: Icon, iconBg, border }) => (
            <div key={label} className={`bg-white rounded-xl shadow-sm p-5 ${border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
                  <p className={`text-xs mt-1.5 ${subColor ?? "text-gray-400"}`}>{sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${iconBg}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue + Job completion row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue card — wide */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Revenue Overview</h2>
              <Link href="/invoices" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Invoices <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Billed</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(totalCharged)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Collected</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">{formatCurrency(totalReceived)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Outstanding</p>
                <p className={`text-2xl font-bold mt-0.5 ${outstanding > 0 ? "text-amber-600" : "text-gray-400"}`}>
                  {formatCurrency(outstanding)}
                </p>
              </div>
            </div>

            {/* Collection progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Collection rate</span>
                <span className="font-semibold text-gray-700">{collectionPct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
              {totalOverdue > 0 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formatCurrency(totalOverdue)} overdue — action needed
                </p>
              )}
            </div>
          </div>

          {/* Job completion card */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Job Status</h2>
              <Link href="/jobs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Donut-style completion ring via conic-gradient */}
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
                <span className="text-xs font-medium bg-[#FAF8F3] text-[#163A70] px-2 py-0.5 rounded-full">{upcomingJobs.length}</span>
              </div>
              <Link href="/schedule" className="text-xs text-[#163A70] hover:underline flex items-center gap-1">
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
                  const today = isToday(start);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-start gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      {/* Date column */}
                      <div className={`shrink-0 w-12 text-center rounded-lg py-1.5 ${today ? "bg-[#163A70] text-white" : "bg-gray-100 text-gray-600"}`}>
                        <p className="text-xs font-medium">{today ? "TODAY" : start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</p>
                        <p className="text-lg font-bold leading-tight">{start.getDate()}</p>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[job.status as JobStatus]}`} />
                          <p className="font-medium text-gray-900 truncate text-sm">{job.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {clientDisplayName(job.client)}
                          {job.property && <span className="text-gray-400"> · {job.property.name}</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatTime(start)}
                          </span>
                          {job.assignments.length > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <UserCircle2 className="w-3 h-3" />
                              {job.assignments[0].staff.firstName}
                              {job.assignments.length > 1 && ` +${job.assignments.length - 1}`}
                            </span>
                          )}
                          {job.property?.city && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
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

            {/* Recently completed */}
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
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 truncate">{clientDisplayName(job.client)}</p>
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      {job.invoice
                        ? <p className="text-sm font-semibold text-emerald-600">{formatCurrency(Number(job.invoice.total))}</p>
                        : <p className="text-xs text-gray-400">No invoice</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Top clients */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Top Clients</h2>
                <Link href="/clients" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {topClients.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(c.company ?? c.firstName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{clientDisplayName(c)}</p>
                      <p className="text-xs text-gray-400">{c._count.jobs} job{c._count.jobs !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
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
