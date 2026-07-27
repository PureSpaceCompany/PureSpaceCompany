"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Clock, MapPin, Loader2, CheckCircle2, Calendar,
  ChevronRight, Briefcase, CalendarDays, CalendarRange,
} from "lucide-react";

type JobStatus = "UNASSIGNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface Job {
  id: string;
  title: string;
  status: JobStatus;
  serviceType: string;
  scheduledStart: string;
  scheduledEnd: string;
  flatRate?: number | null;
  client: { firstName?: string | null; lastName?: string | null; company?: string | null; city: string; state: string };
  property?: { name: string; addressLine1: string; city: string; state: string } | null;
  checklist: { isCompleted: boolean }[];
}

const STATUS_STYLES: Record<JobStatus, string> = {
  UNASSIGNED: "bg-gray-100 text-gray-600",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

type Tab = "today" | "week" | "month" | "completed";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "today",     label: "Today",     icon: Calendar },
  { key: "week",      label: "This Week",  icon: CalendarDays },
  { key: "month",     label: "This Month", icon: CalendarRange },
  { key: "completed", label: "Completed",  icon: CheckCircle2 },
];

async function fetchMyJobs(): Promise<Job[]> {
  const res = await fetch("/api/jobs");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data ?? [];
}

function clientName(c: Job["client"]) {
  return c.company || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Client";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function CleanerHomePage() {
  const [tab, setTab] = useState<Tab>("today");

  const { data: allJobs = [], isLoading } = useQuery({
    queryKey: ["my-jobs"],
    queryFn: fetchMyJobs,
    refetchInterval: 60000,
  });

  const now = new Date();

  const filtered = useMemo(() => {
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    switch (tab) {
      case "today":
        return allJobs.filter((j) => {
          const d = new Date(j.scheduledStart);
          return d >= startOfDay && d <= endOfDay && j.status !== "CANCELLED";
        });
      case "week":
        return allJobs.filter((j) => {
          const d = new Date(j.scheduledStart);
          return d >= startOfWeek && d <= endOfWeek && j.status !== "CANCELLED";
        });
      case "month":
        return allJobs.filter((j) => {
          const d = new Date(j.scheduledStart);
          return d >= startOfMonth && d <= endOfMonth && j.status !== "CANCELLED";
        });
      case "completed":
        return allJobs.filter((j) => j.status === "COMPLETED")
          .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime());
    }
  }, [allJobs, tab]);

  // Stats
  const todayJobs = allJobs.filter((j) => {
    const d = new Date(j.scheduledStart);
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return d >= s && d <= e && j.status !== "CANCELLED";
  });
  const completedCount = allJobs.filter((j) => j.status === "COMPLETED").length;
  const inProgressJob = allJobs.find((j) => j.status === "IN_PROGRESS");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-extrabold text-blue-600">{todayJobs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Today</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-extrabold text-amber-500">{inProgressJob ? 1 : 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">In Progress</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-600">{completedCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completed</div>
        </div>
      </div>

      {/* In-progress banner */}
      {inProgressJob && (
        <Link href={`/cleaner/job/${inProgressJob.id}`}
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:bg-amber-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Job in progress</div>
              <div className="text-xs text-amber-600 truncate">{inProgressJob.title}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-300 gap-3">
          <Briefcase className="w-10 h-10 opacity-40" />
          <p className="text-sm text-gray-400">
            {tab === "completed" ? "No completed jobs yet" : "No jobs scheduled"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const loc = job.property ?? job.client;
            const address = job.property ? `${job.property.addressLine1}, ${job.property.city}` : `${job.client.city}, ${job.client.state}`;
            const progress = job.checklist.length > 0
              ? Math.round((job.checklist.filter((i) => i.isCompleted).length / job.checklist.length) * 100)
              : null;

            return (
              <Link key={job.id} href={`/cleaner/job/${job.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{clientName(job.client)}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[job.status]}`}>
                    {job.status.replace("_", " ")}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {tab === "today" ? fmtTime(job.scheduledStart) : `${fmtDate(job.scheduledStart)} ${fmtTime(job.scheduledStart)}`}
                    {" – "}{fmtTime(job.scheduledEnd)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[160px]">{address}</span>
                  </span>
                </div>

                {progress !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{job.checklist.filter((i) => i.isCompleted).length}/{job.checklist.length} tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${progress === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                        style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
