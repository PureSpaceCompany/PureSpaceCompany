"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Inbox, Mail, MailOpen, CheckCircle2, Archive, Trash2,
  Plus, Phone, Clock, ChevronRight, X, CalendarPlus, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ContactStatus = "NEW" | "READ" | "CONVERTED" | "ARCHIVED";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: ContactStatus;
  notes?: string | null;
  jobId?: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string; icon: any }> = {
  NEW:       { label: "New",       color: "bg-blue-100 text-blue-700",     icon: Mail },
  READ:      { label: "Read",      color: "bg-gray-100 text-gray-600",     icon: MailOpen },
  CONVERTED: { label: "Converted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  ARCHIVED:  { label: "Archived",  color: "bg-amber-100 text-amber-700",   icon: Archive },
};

const FILTERS: { label: string; value: string }[] = [
  { label: "All",       value: "" },
  { label: "New",       value: "NEW" },
  { label: "Read",      value: "READ" },
  { label: "Converted", value: "CONVERTED" },
  { label: "Archived",  value: "ARCHIVED" },
];

async function fetchContacts(status: string): Promise<ContactRequest[]> {
  const url = status ? `/api/contact?status=${status}` : "/api/contact";
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export default function InboxPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "", serviceType: "STANDARD", scheduledStart: "", scheduledEnd: "", flatRate: "",
  });
  const [jobError, setJobError] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", filter],
    queryFn: () => fetchContacts(filter),
    refetchInterval: 30000,
  });

  const patch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      if (selected?.id === updated.id) setSelected(updated);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/contact/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setSelected(null);
    },
  });

  const createJob = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create job");
      return json.data;
    },
    onSuccess: async (job) => {
      await patch.mutateAsync({ id: selected!.id, data: { status: "CONVERTED", jobId: job.id } });
      setShowJobModal(false);
      setJobError("");
    },
    onError: (err: any) => setJobError(err.message),
  });

  function openContact(c: ContactRequest) {
    setSelected(c);
    setNotes(c.notes ?? "");
    if (c.status === "NEW") {
      patch.mutate({ id: c.id, data: { status: "READ" } });
    }
  }

  async function openJobModal() {
    setJobForm({
      title: selected?.name ? `Cleaning – ${selected.name}` : "",
      serviceType: "STANDARD",
      scheduledStart: "",
      scheduledEnd: "",
      flatRate: "",
    });
    setSelectedClientId("");
    setJobError("");
    const res = await fetch("/api/clients");
    const json = await res.json();
    setClients(json.data ?? []);
    setShowJobModal(true);
  }

  function saveNotes() {
    if (!selected) return;
    patch.mutate({ id: selected.id, data: { notes } });
  }

  function submitJob() {
    if (!selectedClientId) { setJobError("Please select a client"); return; }
    if (!jobForm.scheduledStart || !jobForm.scheduledEnd) { setJobError("Start and end times are required"); return; }
    createJob.mutate({
      clientId: selectedClientId,
      title: jobForm.title,
      serviceType: jobForm.serviceType,
      scheduledStart: new Date(jobForm.scheduledStart).toISOString(),
      scheduledEnd: new Date(jobForm.scheduledEnd).toISOString(),
      flatRate: jobForm.flatRate ? parseFloat(jobForm.flatRate) : undefined,
      recurrence: "ONCE",
    });
  }

  const newCount = contacts.filter((c) => c.status === "NEW").length;

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── Left panel: list ── */}
      <div className={`flex flex-col border-r border-gray-200 bg-white ${selected ? "hidden md:flex w-80 shrink-0" : "flex-1 md:w-80 md:shrink-0 md:flex-none"}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-gray-700" />
              <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
              {newCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">{newCount}</span>
              )}
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.value ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Inbox className="w-8 h-8 opacity-30" />
              <p className="text-sm">No messages</p>
            </div>
          ) : (
            contacts.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const isNew = c.status === "NEW";
              return (
                <button key={c.id} onClick={() => openContact(c)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${selected?.id === c.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isNew ? "text-gray-900" : "text-gray-600"}`}>{c.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.message}</p>
                  <p className="text-xs text-gray-300 mt-1">{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: detail ── */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Detail header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div>
                <h2 className="font-bold text-gray-900">{selected.name}</h2>
                <p className="text-xs text-gray-400">{new Date(selected.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.status !== "CONVERTED" && (
                <Button size="sm" onClick={openJobModal} className="gap-1.5">
                  <CalendarPlus className="w-3.5 h-3.5" /> Create Job
                </Button>
              )}
              {selected.status !== "ARCHIVED" && selected.status !== "CONVERTED" && (
                <button onClick={() => patch.mutate({ id: selected.id, data: { status: "ARCHIVED" } })}
                  title="Archive" className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                  <Archive className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => { if (confirm("Delete this message?")) remove.mutate(selected.id); }}
                title="Delete" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Contact info */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact Info</h3>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a>
              </div>
              {selected.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">{selected.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                {new Date(selected.createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
              </div>
              {selected.status === "CONVERTED" && selected.jobId && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Converted — Job created
                </div>
              )}
            </div>

            {/* Message */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Message</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {(["NEW", "READ", "CONVERTED", "ARCHIVED"] as ContactStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button key={s} onClick={() => patch.mutate({ id: selected.id, data: { status: s } })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selected.status === s ? `${cfg.color} border-transparent shadow-sm` : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}>
                      <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" /> Internal Notes
              </h3>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Add notes visible only to your team…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
              <div className="flex justify-end mt-2">
                <Button size="sm" variant="outline" onClick={saveNotes} loading={patch.isPending}>Save Notes</Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-300 flex-col gap-3">
          <Inbox className="w-12 h-12 opacity-40" />
          <p className="text-sm">Select a message to view</p>
        </div>
      )}

      {/* ── Create Job Modal ── */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Job from Message
              </h2>
              <button onClick={() => setShowJobModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* From info */}
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-800">
                <span className="font-medium">{selected?.name}</span> · {selected?.email}
                {selected?.phone && ` · ${selected.phone}`}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Assign to Client</label>
                <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  <option value="">Select existing client…</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.company || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">If this is a new client, add them in Clients first, then come back.</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Job Title</label>
                <input value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Service Type</label>
                <select value={jobForm.serviceType} onChange={(e) => setJobForm((f) => ({ ...f, serviceType: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                  {["STANDARD","DEEP_CLEAN","MOVE_IN_OUT","POST_CONSTRUCTION","RECURRING","COMMERCIAL"].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g," ")}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Start</label>
                  <input type="datetime-local" value={jobForm.scheduledStart}
                    onChange={(e) => setJobForm((f) => ({ ...f, scheduledStart: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">End</label>
                  <input type="datetime-local" value={jobForm.scheduledEnd}
                    onChange={(e) => setJobForm((f) => ({ ...f, scheduledEnd: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Flat Rate ($) <span className="text-gray-400 font-normal">optional</span></label>
                <input type="number" min="0" step="0.01" value={jobForm.flatRate}
                  onChange={(e) => setJobForm((f) => ({ ...f, flatRate: e.target.value }))}
                  placeholder="e.g. 150.00"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
              </div>

              {jobError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{jobError}</p>}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setShowJobModal(false)}>Cancel</Button>
              <Button size="sm" loading={createJob.isPending} onClick={submitJob} className="gap-1.5">
                <CalendarPlus className="w-3.5 h-3.5" /> Create Job
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
