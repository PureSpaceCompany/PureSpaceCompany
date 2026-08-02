"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffModal } from "@/components/modals/staff-modal";
import {
  Plus, Phone, DollarSign, Loader2, CheckCircle, XCircle,
  Pencil, Trash2, ChevronRight, X, Check, RotateCcw,
} from "lucide-react";
import { formatCurrency, clientDisplayName } from "@/lib/utils";

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PaymentPanel({ staffId, staffName, onClose }: { staffId: string; staffName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewPaid, setViewPaid] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-payments", staffId],
    queryFn: () => fetchPayments(staffId),
  });

  const markPaid = useMutation({
    mutationFn: (jobIds: string[]) =>
      fetch(`/api/staff/${staffId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-payments", staffId] });
      setSelected(new Set());
    },
  });

  const markUnpaid = useMutation({
    mutationFn: (jobIds: string[]) =>
      fetch(`/api/staff/${staffId}/payments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-payments", staffId] });
      setSelected(new Set());
    },
  });

  const visibleJobs = (data?.jobs ?? []).filter((j) => viewPaid ? !!j.cleanerPaidAt : !j.cleanerPaidAt);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === visibleJobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleJobs.map((j) => j.id)));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payments — {staffName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Track cleaner pay per completed job</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* KPI row */}
        {data && (
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Total Earned</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(data.totalEarned)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Paid Out</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatCurrency(data.totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Owed</p>
              <p className={`text-xl font-bold mt-0.5 ${data.totalOwed > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {formatCurrency(data.totalOwed)}
              </p>
            </div>
          </div>
        )}

        {/* Toggle + actions */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 gap-3 flex-wrap">
          <div className="flex gap-1">
            <button onClick={() => { setViewPaid(false); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!viewPaid ? "bg-[#163A70] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Unpaid
            </button>
            <button onClick={() => { setViewPaid(true); setSelected(new Set()); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${viewPaid ? "bg-[#163A70] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              Paid
            </button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{selected.size} selected</span>
              {!viewPaid ? (
                <Button size="sm" loading={markPaid.isPending}
                  onClick={() => markPaid.mutate(Array.from(selected))}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  <Check className="w-3.5 h-3.5" /> Mark Paid
                </Button>
              ) : (
                <Button size="sm" variant="outline" loading={markUnpaid.isPending}
                  onClick={() => markUnpaid.mutate(Array.from(selected))}
                  className="text-xs">
                  <RotateCcw className="w-3.5 h-3.5" /> Mark Unpaid
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <p className="text-sm">{viewPaid ? "No paid jobs yet" : "No unpaid jobs — all caught up!"}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-6 py-2 w-8">
                    <input type="checkbox" checked={selected.size === visibleJobs.length && visibleJobs.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-[#163A70]" />
                  </th>
                  <th className="text-left px-3 py-2 font-medium">Job</th>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-right px-6 py-2 font-medium">Pay</th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map((job) => (
                  <tr key={job.id} className={`border-b border-gray-50 transition-colors ${selected.has(job.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-3">
                      <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)}
                        className="rounded border-gray-300 text-[#163A70]" />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[180px]">{job.title}</p>
                      <p className="text-xs text-gray-400">
                        {job.client.company ?? [job.client.firstName, job.client.lastName].filter(Boolean).join(" ") ?? ""}
                        {job.property ? ` · ${job.property.city}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(job.scheduledStart)}</td>
                    <td className="px-6 py-3 text-right">
                      {job.cleanerPay != null
                        ? <span className="font-semibold text-gray-900">{formatCurrency(Number(job.cleanerPay))}</span>
                        : <span className="text-gray-400 text-xs italic">No rate</span>}
                      {job.cleanerPaidAt && (
                        <p className="text-xs text-emerald-600 mt-0.5">{fmtDate(job.cleanerPaidAt)}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default function StaffPage() {
  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });

  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permanent, setPermanent] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ id: string; name: string } | null>(null);

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
    <div className="p-6 space-y-5">
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
          {staff.map((member: any) => (
            <Card key={member.id} className="p-5 hover:shadow-md transition-shadow">
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
                <div className="flex items-center gap-1">
                  {member.isActive
                    ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                {member.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /><span>{member.phone}</span></div>
                )}
                <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-gray-400" /><span>${Number(member.hourlyRate).toFixed(2)}/hr</span></div>
              </div>

              {member.skills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {member.skills.map((skill: string) => (
                    <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {skill.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                <button
                  onClick={() => setPaymentTarget({ id: member.id, name: `${member.firstName} ${member.lastName}` })}
                  className="flex items-center gap-1.5 text-xs text-[#163A70] hover:text-[#163A70] transition-colors px-2 py-1 rounded-lg hover:bg-[#FAF8F3] font-medium"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Payments <ChevronRight className="w-3 h-3" />
                </button>
                <button onClick={() => { setEditMember(member); setModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setDeleteTarget(member); setPermanent(false); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StaffModal open={modalOpen} onClose={() => { setModalOpen(false); setEditMember(null); }} staff={editMember} />

      {paymentTarget && (
        <PaymentPanel
          staffId={paymentTarget.id}
          staffName={paymentTarget.name}
          onClose={() => setPaymentTarget(null)}
        />
      )}

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
