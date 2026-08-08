"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffModal } from "@/components/modals/staff-modal";
import {
  Plus, Phone, Loader2, CheckCircle, XCircle,
  Pencil, Trash2, ChevronDown, ChevronUp,
  Check, RotateCcw, AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const NAVY = "#163A70";
const GOLD = "#C8A46A";

async function fetchStaff() {
  const res = await fetch("/api/staff?active=false");
  if (!res.ok) throw new Error("Failed to fetch staff");
  return (await res.json()).data;
}

async function fetchPayments(staffId: string) {
  const res = await fetch(`/api/staff/${staffId}/payments`);
  if (!res.ok) throw new Error("Failed to fetch payments");
  return (await res.json()).data as {
    jobs: {
      id: string; title: string; scheduledStart: string;
      cleanerPay: number | null; cleanerPaidAt: string | null;
      client: { firstName?: string | null; lastName?: string | null; company?: string | null };
      property?: { name: string; city: string } | null;
    }[];
    totalEarned: number; totalPaid: number; totalOwed: number;
  };
}

async function fetchExpenses() {
  const res = await fetch("/api/staff/expenses");
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return (await res.json()).data as {
    months: { key: string; label: string; jobs: number; paid: number; owed: number }[];
    staffOwed: { id: string; name: string; owed: number; paid: number }[];
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Inline payment panel (expands inside the card) ──────────────────────────

function PaymentSection({ staffId }: { staffId: string }) {
  const qc = useQueryClient();
  const [viewPaid, setViewPaid] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["staff-payments", staffId],
    queryFn: () => fetchPayments(staffId),
  });

  const markPaid = useMutation({
    mutationFn: (jobIds: string[]) =>
      fetch(`/api/staff/${staffId}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-payments", staffId] });
      qc.invalidateQueries({ queryKey: ["staff-expenses"] });
      setSelected(new Set());
    },
  });

  const markUnpaid = useMutation({
    mutationFn: (jobIds: string[]) =>
      fetch(`/api/staff/${staffId}/payments`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-payments", staffId] });
      qc.invalidateQueries({ queryKey: ["staff-expenses"] });
      setSelected(new Set());
    },
  });

  const visibleJobs = (data?.jobs ?? []).filter((j) => viewPaid ? !!j.cleanerPaidAt : !j.cleanerPaidAt);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === visibleJobs.length ? new Set() : new Set(visibleJobs.map((j) => j.id)));
  }

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg py-2 px-1">
            <p className="text-[10px] text-gray-400 font-medium">Earned</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(data.totalEarned)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg py-2 px-1">
            <p className="text-[10px] text-emerald-600 font-medium">Paid</p>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(data.totalPaid)}</p>
          </div>
          <div className={`rounded-lg py-2 px-1 ${data.totalOwed > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <p className={`text-[10px] font-medium ${data.totalOwed > 0 ? "text-amber-600" : "text-gray-400"}`}>Owed</p>
            <p className={`text-sm font-bold ${data.totalOwed > 0 ? "text-amber-700" : "text-gray-400"}`}>
              {formatCurrency(data.totalOwed)}
            </p>
          </div>
        </div>
      )}

      {/* Tab + bulk action */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => { setViewPaid(false); setSelected(new Set()); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${!viewPaid ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            style={!viewPaid ? { backgroundColor: NAVY } : {}}>
            Unpaid
          </button>
          <button onClick={() => { setViewPaid(true); setSelected(new Set()); }}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${viewPaid ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            style={viewPaid ? { backgroundColor: NAVY } : {}}>
            Paid
          </button>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            {!viewPaid ? (
              <Button size="sm" loading={markPaid.isPending}
                onClick={() => markPaid.mutate(Array.from(selected))}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2">
                <Check className="w-3 h-3" /> Mark Paid
              </Button>
            ) : (
              <Button size="sm" variant="outline" loading={markUnpaid.isPending}
                onClick={() => markUnpaid.mutate(Array.from(selected))}
                className="text-xs h-7 px-2">
                <RotateCcw className="w-3 h-3" /> Unpaid
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Job list */}
      {visibleJobs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">
          {viewPaid ? "No paid jobs yet" : "All caught up — nothing owed!"}
        </p>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="px-3 py-2 w-6">
                  <input type="checkbox"
                    checked={selected.size === visibleJobs.length && visibleJobs.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-[#163A70] w-3 h-3" />
                </th>
                <th className="text-left px-2 py-2 font-medium">Job</th>
                <th className="text-left px-2 py-2 font-medium hidden sm:table-cell">Date</th>
                <th className="text-right px-3 py-2 font-medium">Pay</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((job) => (
                <tr key={job.id}
                  className={`border-b border-gray-50 last:border-0 transition-colors ${selected.has(job.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)}
                      className="rounded border-gray-300 text-[#163A70] w-3 h-3" />
                  </td>
                  <td className="px-2 py-2">
                    <p className="font-medium text-gray-800 truncate max-w-[130px]">{job.title}</p>
                    <p className="text-gray-400 truncate max-w-[130px]">
                      {job.property?.city ?? (job.client.company ?? [job.client.firstName, job.client.lastName].filter(Boolean).join(" "))}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-gray-500 whitespace-nowrap hidden sm:table-cell">{fmtDate(job.scheduledStart)}</td>
                  <td className="px-3 py-2 text-right">
                    {job.cleanerPay != null
                      ? <span className="font-semibold text-gray-900">{formatCurrency(Number(job.cleanerPay))}</span>
                      : <span className="text-gray-400 italic">—</span>}
                    {job.cleanerPaidAt && (
                      <p className="text-emerald-600 mt-0.5">{fmtDate(job.cleanerPaidAt)}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Monthly expenses report ──────────────────────────────────────────────────

function ExpensesReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["staff-expenses"],
    queryFn: fetchExpenses,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const months = data?.months ?? [];
  const staffOwed = data?.staffOwed ?? [];
  const maxTotal = Math.max(...months.map((m) => m.paid + m.owed), 1);

  const totalPaid = months.reduce((s, m) => s + m.paid, 0);
  const totalOwed = months.reduce((s, m) => s + m.owed, 0);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Total Paid Out</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3">
          <p className="text-xs font-medium mb-1" style={{ color: totalOwed > 0 ? "#b45309" : "#9ca3af" }}>Total Owed</p>
          <p className={`text-2xl font-bold ${totalOwed > 0 ? "text-amber-600" : "text-gray-400"}`}>
            {formatCurrency(totalOwed)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-4 py-3 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 font-medium mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid + totalOwed)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly breakdown table + bars */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Monthly Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">Cleaner pay across all completed jobs</p>
          </div>
          {months.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No expense data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium">Month</th>
                    <th className="text-center px-3 py-3 font-medium">Jobs</th>
                    <th className="text-right px-3 py-3 font-medium">Paid</th>
                    <th className="text-right px-3 py-3 font-medium">Owed</th>
                    <th className="px-5 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...months].reverse().map((m) => {
                    const total = m.paid + m.owed;
                    const paidW = total > 0 ? (m.paid / maxTotal) * 100 : 0;
                    const owedW = total > 0 ? (m.owed / maxTotal) * 100 : 0;
                    return (
                      <tr key={m.key} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{m.label}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: NAVY }}>
                            {m.jobs}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-emerald-600 font-semibold">
                          {m.paid > 0 ? formatCurrency(m.paid) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {m.owed > 0
                            ? <span className="text-amber-600">{formatCurrency(m.owed)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          {total > 0 && (
                            <div className="flex items-center gap-0.5 h-3">
                              {paidW > 0 && (
                                <div className="h-full rounded-l-sm" style={{ width: `${paidW}%`, backgroundColor: "#10b981" }} />
                              )}
                              {owedW > 0 && (
                                <div className="h-full rounded-r-sm" style={{ width: `${owedW}%`, backgroundColor: GOLD }} />
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Per-staff owed */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Outstanding by Cleaner</h3>
            <p className="text-xs text-gray-400 mt-0.5">Currently unpaid amounts</p>
          </div>
          {staffOwed.filter((s) => s.owed > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <CheckCircle className="w-7 h-7 opacity-30" />
              <p className="text-xs">All cleaners are paid up</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {staffOwed
                .filter((s) => s.owed > 0)
                .sort((a, b) => b.owed - a.owed)
                .map((s) => {
                  const pct = s.paid + s.owed > 0 ? (s.paid / (s.paid + s.owed)) * 100 : 0;
                  const initials = s.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div key={s.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                        </div>
                        <span className="text-sm font-bold text-amber-600 shrink-0">{formatCurrency(s.owed)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{formatCurrency(s.paid)} paid of {formatCurrency(s.paid + s.owed)}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });

  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permanent, setPermanent] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: ({ id, perm }: { id: string; perm: boolean }) =>
      fetch(`/api/staff/${id}?permanent=${perm}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { alert(data.error); return; }
      qc.invalidateQueries({ queryKey: ["staff"] });
      setDeleteTarget(null);
      setPermanent(false);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditMember(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="font-medium">No staff members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member: any) => {
            const isExpanded = expandedId === member.id;
            return (
              <Card key={member.id} className="p-5 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.user?.role?.toLowerCase() ?? "staff"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {member.isActive
                      ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                      : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>}
                  </div>
                </div>

                {/* Contact */}
                {member.phone && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /><span>{member.phone}</span>
                  </div>
                )}

                {/* Skills */}
                {member.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {member.skills.map((skill: string) => (
                      <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {skill.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : member.id)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:bg-[#FAF8F3]"
                    style={{ color: NAVY }}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Expenses
                  </button>
                  <button onClick={() => { setEditMember(member); setModalOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setDeleteTarget(member); setPermanent(false); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                {/* Inline payment section */}
                {isExpanded && <PaymentSection staffId={member.id} />}
              </Card>
            );
          })}
        </div>
      )}

      {/* Monthly expenses report */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">Expenses Report</h2>
          <p className="text-sm text-gray-500 mt-0.5">Cleaner pay totals by month — all time</p>
        </div>
        <ExpensesReport />
      </div>

      <StaffModal open={modalOpen} onClose={() => { setModalOpen(false); setEditMember(null); }} staff={editMember} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Remove Staff Member</h2>
            <p className="text-sm text-gray-600">
              What would you like to do with <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            </p>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)}
                className="rounded border-gray-300 text-red-600" />
              <span>Permanently delete (removes login account and all records)</span>
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setPermanent(false); }}>Cancel</Button>
              <Button
                className={permanent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, perm: permanent })}
              >
                {permanent ? "Permanently Delete" : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
