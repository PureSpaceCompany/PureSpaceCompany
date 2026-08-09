"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobs } from "@/lib/hooks/use-jobs";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JobModal } from "@/components/modals/job-modal";
import { formatDateTime, formatCurrency, clientDisplayName } from "@/lib/utils";
import { Job, JobStatus } from "@/types";
import Link from "next/link";
import { Loader2, Plus, Search, Pencil, Trash2, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown, CalendarDays, X } from "lucide-react";

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Unassigned", value: "UNASSIGNED" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
];

type SortField = "title" | "client" | "scheduledStart" | "flatRate" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30 ml-1 inline" />;
  return dir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 ml-1 inline text-[#1A3D2B]" />
    : <ChevronDown className="w-3.5 h-3.5 ml-1 inline text-[#1A3D2B]" />;
}

export default function JobsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [permanent, setPermanent] = useState(false);
  const [sortField, setSortField] = useState<SortField>("scheduledStart");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditJob(null);
      setModalOpen(true);
      router.replace("/jobs");
    }
  }, [searchParams, router]);

  const qc = useQueryClient();
  const { data: jobs = [], isLoading } = useJobs(statusFilter ? { status: statusFilter } : {});

  const deleteJob = useMutation({
    mutationFn: ({ id, perm }: { id: string; perm: boolean }) =>
      fetch(`/api/jobs/${id}?permanent=${perm}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); setDeleteTarget(null); setPermanent(false); },
  });

  const completeJob = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "scheduledStart" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...jobs];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        clientDisplayName(j.client).toLowerCase().includes(q)
      );
    }

    if (dateFilter) {
      list = list.filter((j) => {
        const d = new Date(j.scheduledStart);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        return ds === dateFilter;
      });
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case "title":        va = a.title; vb = b.title; break;
        case "client":       va = clientDisplayName(a.client); vb = clientDisplayName(b.client); break;
        case "scheduledStart": va = new Date(a.scheduledStart).getTime(); vb = new Date(b.scheduledStart).getTime(); break;
        case "flatRate":     va = Number((a as any).flatRate ?? 0); vb = Number((b as any).flatRate ?? 0); break;
        case "status":       va = a.status; vb = b.status; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [jobs, search, dateFilter, sortField, sortDir]);

  const thClass = "text-left px-3 md:px-6 py-3 font-medium cursor-pointer hover:text-[#1A3D2B] select-none whitespace-nowrap";

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} job{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditJob(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> New Job
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or clients..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        {/* Date filter */}
        <div className="relative flex items-center gap-1">
          <CalendarDays className="w-4 h-4 absolute left-3 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="ml-1 p-1 rounded text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value ? "bg-[#1A3D2B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="font-medium">No jobs found</p>
            <p className="text-sm mt-1">Try adjusting the filters or create a new job</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className={thClass} onClick={() => toggleSort("title")}>
                    Job <SortIcon field="title" active={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("client")}>
                    Client / Property <SortIcon field="client" active={sortField} dir={sortDir} />
                  </th>
                  <th className={`hidden sm:table-cell ${thClass}`} onClick={() => toggleSort("scheduledStart")}>
                    Scheduled <SortIcon field="scheduledStart" active={sortField} dir={sortDir} />
                  </th>
                  <th className="hidden lg:table-cell text-left px-3 md:px-6 py-3 font-medium">Assignee</th>
                  <th className={`hidden md:table-cell ${thClass}`} onClick={() => toggleSort("flatRate")}>
                    Charged <SortIcon field="flatRate" active={sortField} dir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("status")}>
                    Status <SortIcon field="status" active={sortField} dir={sortDir} />
                  </th>
                  <th className="px-3 md:px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((job: any) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                    <td className="px-3 md:px-6 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-blue-600">{job.title}</Link>
                      <p className="text-xs text-gray-400 mt-0.5">{job.serviceType.replace(/_/g, " ")}</p>
                    </td>
                    <td className="px-3 md:px-6 py-3">
                      <span className="text-gray-700">{clientDisplayName(job.client)}</span>
                      {job.property && (
                        <p className="text-xs text-gray-400 mt-0.5">{job.property.name} · {job.property.city}</p>
                      )}
                      {!job.property && job.client?.city && (
                        <p className="text-xs text-gray-400">{job.client.city}, {job.client.state}</p>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(job.scheduledStart)}</td>
                    <td className="hidden lg:table-cell px-3 md:px-6 py-3 text-gray-600">
                      {job.assignments.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                            {job.assignments[0].staff.firstName[0]}{job.assignments[0].staff.lastName[0]}
                          </div>
                          <span>{job.assignments[0].staff.firstName} {job.assignments[0].staff.lastName}</span>
                          {job.assignments.length > 1 && <span className="text-xs text-gray-400">+{job.assignments.length - 1}</span>}
                        </div>
                      ) : <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="hidden md:table-cell px-3 md:px-6 py-3 text-gray-700">
                      {(() => {
                        const base = Number(job.flatRate ?? 0);
                        const extras = Array.isArray(job.extraItems) ? (job.extraItems as any[]).reduce((s: number, i: any) => s + i.unitPrice, 0) : 0;
                        const total = base + extras;
                        return total > 0 ? formatCurrency(total) : <span className="text-gray-400">—</span>;
                      })()}
                    </td>
                    <td className="px-3 md:px-6 py-3"><JobStatusBadge status={job.status as JobStatus} /></td>
                    <td className="px-3 md:px-6 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!["COMPLETED", "CANCELLED"].includes(job.status) && (
                          <button
                            onClick={() => completeJob.mutate(job.id)}
                            disabled={completeJob.isPending}
                            title="Mark as Completed"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => { setEditJob(job); setModalOpen(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteTarget(job); setPermanent(false); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <JobModal open={modalOpen} onClose={() => { setModalOpen(false); setEditJob(null); }} job={editJob} defaultDate={editJob ? undefined : dateFilter} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Job</h2>
            <p className="text-sm text-gray-600">
              What would you like to do with <strong>{(deleteTarget as any).title}</strong>?
            </p>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)}
                className="rounded border-gray-300 text-red-600" />
              <span>Permanently delete (removes checklist, invoice, and all records)</span>
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setPermanent(false); }}>Cancel</Button>
              <Button
                className={permanent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                loading={deleteJob.isPending}
                onClick={() => deleteJob.mutate({ id: (deleteTarget as any).id, perm: permanent })}
              >
                {permanent ? "Permanently Delete" : "Cancel Job"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
