"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { InvoiceStatus } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { FormField, inputClass } from "@/components/ui/form-field";
import { formatCurrency, formatDateTime, INVOICE_STATUS_COLOR, clientDisplayName, cn } from "@/lib/utils";
import {
  Loader2, FileText, CheckCircle, Ban, FilePlus, ChevronDown, ChevronUp,
  AlertCircle, Send, Mail, Eye, CalendarDays, X, ListChecks,
} from "lucide-react";
import { InvoicePDFButton, ClientStatementPDFButton, StatementJob } from "@/components/invoices/invoice-pdf";
import { LogoMark } from "@/components/ui/logo";
import { buildInvoiceEmailHtml, buildStatementEmailHtml, INVOICE_STATUS_LABEL, INVOICE_STATUS_EMAIL_COLOR } from "@/lib/email-templates";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function periodKey(iso: string) {
  const d = new Date(iso);
  const p = d.getDate() <= 15 ? "1" : "2";
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-P${p}`;
}

function periodLabel(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  return d.getDate() <= 15
    ? `${month} · Period 1 (1–15)`
    : `${month} · Period 2 (16–${lastDay})`;
}

function groupByPeriod(jobs: any[]) {
  const periodMap = new Map<string, { label: string; jobs: any[] }>();

  for (const job of [...jobs].sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())) {
    const pk = periodKey(job.scheduledStart);
    const pl = periodLabel(job.scheduledStart);
    if (!periodMap.has(pk)) periodMap.set(pk, { label: pl, jobs: [] });
    periodMap.get(pk)!.jobs.push(job);
  }

  return Array.from(periodMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, { label, jobs }]) => ({ key, label, jobs }));
}

function toStatementJob(job: any): StatementJob {
  return {
    title: job.title,
    scheduledStart: job.scheduledStart,
    propertyName: job.property?.name ?? null,
    invoiceNumber: job._invoice?.invoiceNumber ?? null,
    invoiceStatus: job._invoice?.status ?? "NONE",
    amount: Number(job._invoice?.subtotal ?? job.flatRate ?? 0),
    total: Number(job._invoice?.total ?? job.flatRate ?? 0),
  };
}

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchCompletedJobs() {
  const res = await fetch("/api/jobs?status=COMPLETED");
  return ((await res.json()).data ?? []) as any[];
}
async function fetchInvoices() {
  const res = await fetch("/api/invoices");
  return ((await res.json()).data ?? []) as any[];
}

// ─── invoice preview modal ────────────────────────────────────────────────────

function InvoicePreviewModal({ invoice, job, onClose, onSend }: { invoice: any; job: any; onClose: () => void; onSend: () => void }) {
  const lineItems: any[] = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const clientName = invoice.client?.company
    || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ")
    || "Client";
  const STATUS_COLOR: Record<string, string> = {
    PAID: "bg-emerald-100 text-emerald-700", PENDING: "bg-amber-100 text-amber-700",
    OVERDUE: "bg-red-100 text-red-700", DRAFT: "bg-gray-100 text-gray-600", VOID: "bg-gray-100 text-gray-400",
  };
  return (
    <Modal open onClose={onClose} title="Invoice Preview" size="lg">
      <div className="px-6 pb-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pt-1 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#163A70] to-[#C8A46A] flex items-center justify-center">
              <LogoMark size={22} className="brightness-0 invert" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-tight">StayShine</p>
              <p className="text-xs text-gray-400">Professional Cleaning Services</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-gray-900 tracking-tight">INVOICE</p>
            <p className="text-sm text-gray-500 font-mono mt-0.5">#{invoice.invoiceNumber}</p>
            <span className={cn("mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-semibold", STATUS_COLOR[invoice.status] ?? "bg-gray-100 text-gray-600")}>
              {invoice.status}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900">{clientName}</p>
            {invoice.client?.addressLine1 && <p className="text-gray-500">{invoice.client.addressLine1}</p>}
            {invoice.client?.city && <p className="text-gray-500">{invoice.client.city}, {invoice.client.state} {invoice.client.zip}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div><span className="text-gray-400 text-xs">Issued: </span><span className="text-gray-700">{fmtDate(invoice.issuedAt)}</span></div>
              <div><span className="text-gray-400 text-xs">Due: </span><span className="text-gray-700">{fmtDate(invoice.dueAt)}</span></div>
              {job?.property && (
                <div className="mt-2 text-left">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Service Address</p>
                  <p className="text-gray-700">{job.property.name}</p>
                  <p className="text-gray-500 text-xs">{job.property.addressLine1}, {job.property.city}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.length === 0
                ? <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">No line items</td></tr>
                : lineItems.map((item: any, i: number) => (
                  <tr key={i} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-4 py-3 text-gray-700">{item.description}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between font-bold text-gray-900 text-base"><span>Total</span><span>{formatCurrency(Number(invoice.total))}</span></div>
            {invoice.status === "PAID" && invoice.paidAmount != null && (
              <div className="flex justify-between text-emerald-600 font-medium"><span>Paid</span><span>{formatCurrency(Number(invoice.paidAmount))}</span></div>
            )}
          </div>
        </div>
        {invoice.notes && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            {invoice.notes}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
          <InvoicePDFButton invoice={{ ...invoice, job }} />
          {["PENDING", "OVERDUE", "DRAFT"].includes(invoice.status) && (
            <Button size="sm" onClick={onSend} className="gap-1.5"><Send className="w-3.5 h-3.5" /> Send Invoice</Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── quick generate modal ─────────────────────────────────────────────────────

function QuickGenerateModal({ job, onClose }: { job: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [flatRate, setFlatRate] = useState(job.flatRate ? String(job.flatRate) : "");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/invoices/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, flatRate: flatRate ? parseFloat(flatRate) : undefined, dueDate: dueDate || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); qc.invalidateQueries({ queryKey: ["completed-jobs"] }); onClose(); },
    onError: (err: any) => setError(err.message),
  });
  return (
    <Modal open onClose={onClose} title="Generate Invoice">
      <div className="space-y-4 p-1">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
        <div className="bg-[#FAF8F3] rounded-lg p-3 text-sm text-[#163A70] space-y-1">
          <p className="font-semibold">{job.title}</p>
          <p>{clientDisplayName(job.client)}</p>
          {job.property && <p>Property: {job.property.name}</p>}
          <p>Service date: {new Date(job.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
        <FormField label="Amount to Charge ($)" description="Leave blank to use the flat rate on the job">
          <input type="number" min="0" step="0.01" className={inputClass} value={flatRate}
            onChange={(e) => setFlatRate(e.target.value)} placeholder={job.flatRate ? String(job.flatRate) : "0.00"} />
        </FormField>
        <FormField label="Due Date (optional)">
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => create.mutate()} loading={create.isPending}>Generate Invoice</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── send invoice modal ───────────────────────────────────────────────────────

function SendInvoiceModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const [email, setEmail] = useState(invoice._clientEmail ?? "");
  const [tab, setTab] = useState<"details" | "preview">("details");
  const [result, setResult] = useState<{ paymentUrl: string; to: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clientName = invoice.client?.company
    || [invoice.client?.firstName, invoice.client?.lastName].filter(Boolean).join(" ")
    || "Valued Customer";
  const serviceDate = new Date(invoice.job?.scheduledStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dueDate = invoice.dueAt
    ? new Date(invoice.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Upon receipt";
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(invoice.total));
  const previewHtml = buildInvoiceEmailHtml({
    clientName,
    invoiceNumber: invoice.invoiceNumber,
    jobTitle: invoice.job?.title ?? "",
    serviceDate,
    amount,
    dueDate,
    paymentUrl: "#",
    companyName: "StayShine",
  });

  async function send() {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setResult(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="Send Invoice by Email" size="lg">
      <div className="p-1">
        {result ? (
          <div className="space-y-4 p-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">Invoice sent!</p>
              <p className="text-sm text-emerald-700 mt-1">Email delivered to <strong>{result.to}</strong></p>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={onClose}>Done</Button></div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-100">
              {(["details", "preview"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize -mb-px border-b-2 ${tab === t ? "border-[#163A70] text-[#163A70]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t === "details" ? "Details" : "Preview Email"}
                </button>
              ))}
            </div>

            {tab === "details" && (
              <div className="space-y-4 p-4">
                <div className="bg-[#FAF8F3] rounded-lg p-3 text-sm text-[#163A70] space-y-0.5">
                  <p className="font-semibold">{invoice.invoiceNumber} — {formatCurrency(Number(invoice.total))}</p>
                  <p>{invoice.job?.title}</p>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
                <FormField label="Send to email">
                  <div className="flex gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" className={inputClass} />
                  </div>
                </FormField>
                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button onClick={send} loading={loading} disabled={!email.trim()}><Send className="w-3.5 h-3.5 mr-1.5" /> Send Invoice</Button>
                </div>
              </div>
            )}

            {tab === "preview" && (
              <div className="p-4">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50" style={{ height: 500 }}>
                  <iframe
                    srcDoc={previewHtml}
                    title="Email Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="ghost" onClick={() => setTab("details")}>Back</Button>
                  <Button onClick={send} loading={loading} disabled={!email.trim()}><Send className="w-3.5 h-3.5 mr-1.5" /> Send Invoice</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── send statement modal ─────────────────────────────────────────────────────

function deriveStatementLabel(jobs: any[]): string {
  if (jobs.length === 0) {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  // If all selected jobs fall in the same period, use that period label
  const allKeys = jobs.map((j) => periodKey(j.scheduledStart));
  const keys = allKeys.filter((k, i) => allKeys.indexOf(k) === i);
  if (keys.length === 1) return periodLabel(jobs[0].scheduledStart);
  // Multiple periods: use the month range
  const dates = jobs.map((j) => new Date(j.scheduledStart));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  const startLabel = earliest.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const endLabel = latest.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function SendStatementModal({
  clientName,
  jobs,
  defaultEmail,
  onClose,
}: {
  clientName: string;
  jobs: any[];
  defaultEmail: string;
  onClose: () => void;
}) {
  const defaultLabel = deriveStatementLabel(jobs);
  const [email, setEmail] = useState(defaultEmail);
  const [dateLabel, setDateLabel] = useState(defaultLabel);
  const [tab, setTab] = useState<"details" | "preview">("details");
  const [result, setResult] = useState<{ to: string; invoiceCount: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const invoiceIds = jobs.map((j) => j._invoice?.id).filter(Boolean) as string[];
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const totalBilled = jobs.filter((j) => j._invoice?.status !== "VOID").reduce((s, j) => s + Number(j._invoice?.total ?? 0), 0);
  const totalPaid = jobs.filter((j) => j._invoice?.status === "PAID").reduce((s, j) => s + Number(j._invoice?.paidAmount ?? j._invoice?.total ?? 0), 0);
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  const previewRows = jobs
    .filter((j) => j._invoice)
    .map((j) => ({
      date: new Date(j.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      property: j.property?.name ?? j.title,
      invoiceNumber: j._invoice.invoiceNumber,
      status: j._invoice.status,
      amount: fmt(Number(j._invoice.total)),
    }));

  const previewHtml = buildStatementEmailHtml({
    clientName,
    companyName: "StayShine",
    dateLabel,
    rows: previewRows,
    totalBilled: fmt(totalBilled),
    totalPaid: fmt(totalPaid),
    balanceDue: fmt(balanceDue),
  });

  async function send() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/invoices/statement/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds, email, dateLabel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setResult(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="Email Account Statement" size="lg">
      <div className="p-1">
        {result ? (
          <div className="space-y-4 p-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">Statement sent!</p>
              <p className="text-sm text-emerald-700 mt-1">
                {result.invoiceCount} invoice{result.invoiceCount !== 1 ? "s" : ""} delivered to <strong>{result.to}</strong>
              </p>
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={onClose}>Done</Button></div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-100">
              {(["details", "preview"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${tab === t ? "border-[#163A70] text-[#163A70]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t === "details" ? "Details" : "Preview Email"}
                </button>
              ))}
            </div>

            {tab === "details" && (
              <div className="space-y-4 p-4">
                <div className="bg-[#FAF8F3] rounded-lg p-3 text-sm text-[#163A70] space-y-0.5">
                  <p className="font-semibold">{clientName}</p>
                  <p className="text-gray-500">{invoiceIds.length} invoice{invoiceIds.length !== 1 ? "s" : ""} · {fmt(totalBilled)} total</p>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
                <FormField label="Statement period label">
                  <input
                    type="text"
                    value={dateLabel}
                    onChange={(e) => setDateLabel(e.target.value)}
                    placeholder="e.g. July 2026"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Send to email">
                  <div className="flex gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@example.com"
                      className={inputClass}
                    />
                  </div>
                </FormField>
                <div className="flex justify-end gap-3 pt-1">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button onClick={send} loading={loading} disabled={!email.trim() || invoiceIds.length === 0}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send Statement
                  </Button>
                </div>
              </div>
            )}

            {tab === "preview" && (
              <div className="p-4">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50" style={{ height: 500 }}>
                  <iframe
                    srcDoc={previewHtml}
                    title="Statement Email Preview"
                    className="w-full h-full"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <Button variant="ghost" onClick={() => setTab("details")}>Back</Button>
                  <Button onClick={send} loading={loading} disabled={!email.trim() || invoiceIds.length === 0}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send Statement
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── bulk send modal ──────────────────────────────────────────────────────────

function BulkSendModal({ invoices, onClose }: { invoices: any[]; onClose: () => void }) {
  const [progress, setProgress] = useState<Record<string, "pending" | "sending" | "done" | "error">>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  async function sendAll() {
    setRunning(true);
    const init: Record<string, any> = {};
    invoices.forEach((inv) => { init[inv.id] = "pending"; });
    setProgress(init);
    for (const inv of invoices) {
      setProgress((p) => ({ ...p, [inv.id]: "sending" }));
      try {
        const res = await fetch(`/api/invoices/${inv.id}/send`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inv._clientEmail }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setProgress((p) => ({ ...p, [inv.id]: "done" }));
      } catch (e: any) {
        setProgress((p) => ({ ...p, [inv.id]: "error" }));
        setErrors((prev) => ({ ...prev, [inv.id]: e.message }));
      }
    }
    setRunning(false); setDone(true);
  }
  const sent = Object.values(progress).filter((s) => s === "done").length;
  const failed = Object.values(progress).filter((s) => s === "error").length;
  return (
    <Modal open onClose={onClose} title={`Send ${invoices.length} Unpaid Invoice${invoices.length !== 1 ? "s" : ""}`} size="md">
      <div className="space-y-4 px-1 pb-2">
        {!running && !done && <p className="text-sm text-gray-500">This will send a payment email to each client for their unpaid invoices.</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {invoices.map((inv) => {
            const st = progress[inv.id];
            return (
              <div key={inv.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400 truncate">{inv._clientEmail || "No email"}</p>
                </div>
                <div className="shrink-0 ml-3 flex items-center gap-2">
                  <span className="text-gray-700 font-semibold">{formatCurrency(Number(inv.total))}</span>
                  {!st && <span className="text-xs text-gray-400">{inv.status}</span>}
                  {st === "pending" && <span className="text-xs text-gray-400">Queued</span>}
                  {st === "sending" && <Loader2 className="w-4 h-4 animate-spin text-[#163A70]" />}
                  {st === "done" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {st === "error" && <span className="text-xs text-red-500" title={errors[inv.id]}>Failed</span>}
                </div>
              </div>
            );
          })}
        </div>
        {done && (
          <div className={cn("rounded-lg px-4 py-3 text-sm font-medium", failed === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
            {sent} sent{failed > 0 ? `, ${failed} failed` : " successfully"}.
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>{done ? "Close" : "Cancel"}</Button>
          {!done && <Button size="sm" loading={running} onClick={sendAll} className="gap-1.5"><Send className="w-3.5 h-3.5" /> Send All</Button>}
        </div>
      </div>
    </Modal>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const qc = useQueryClient();
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [generateJob, setGenerateJob] = useState<any>(null);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [sendTarget, setSendTarget] = useState<any>(null);
  const [previewTarget, setPreviewTarget] = useState<{ invoice: any; job: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "UNPAID" | "PAID" | "OVERDUE">("UNPAID");
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [statementSendOpen, setStatementSendOpen] = useState(false);

  // Date range filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Manual selection
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery({ queryKey: ["completed-jobs"], queryFn: fetchCompletedJobs });
  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({ queryKey: ["invoices"], queryFn: fetchInvoices });

  const markPaid = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID" }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const [bulkPaidLoading, setBulkPaidLoading] = useState(false);
  async function bulkMarkPaid(invoiceIds: string[]) {
    setBulkPaidLoading(true);
    try {
      await Promise.all(invoiceIds.map((id) =>
        fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID" }) })
      ));
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedJobIds(new Set());
    } finally { setBulkPaidLoading(false); }
  }
  const voidInvoice = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setVoidTarget(null); },
  });

  const invoiceByJobId = useMemo(
    () => Object.fromEntries(allInvoices.map((inv: any) => [inv.jobId, inv])),
    [allInvoices]
  );

  const clientGroups = useMemo(() => {
    const map = new Map<string, { client: any; jobs: any[] }>();
    for (const job of completedJobs) {
      const cid = job.clientId ?? job.client?.id ?? "unknown";
      if (!map.has(cid)) {
        const anyInv = allInvoices.find((i: any) => i.clientId === cid);
        map.set(cid, { client: { ...job.client, _email: job.client?.contactEmail ?? anyInv?.client?.user?.email ?? "" }, jobs: [] });
      }
      map.get(cid)!.jobs.push({ ...job, _invoice: invoiceByJobId[job.id] ?? null });
    }
    return Array.from(map.values()).sort((a, b) => clientDisplayName(a.client).localeCompare(clientDisplayName(b.client)));
  }, [completedJobs, invoiceByJobId, allInvoices]);

  const filteredGroups = useMemo(() => {
    return clientGroups
      .map((g) => ({
        ...g,
        jobs: g.jobs.filter((job) => {
          const inv = job._invoice;
          if (statusFilter === "UNPAID" && inv && !["DRAFT", "PENDING"].includes(inv.status)) return false;
          if (statusFilter === "OVERDUE" && inv?.status !== "OVERDUE") return false;
          if (statusFilter === "PAID" && inv?.status !== "PAID") return false;
          const ds = toDateStr(job.scheduledStart);
          if (dateFrom && ds < dateFrom) return false;
          if (dateTo && ds > dateTo) return false;
          return true;
        }),
      }))
      .filter((g) => g.jobs.length > 0);
  }, [clientGroups, statusFilter, dateFrom, dateTo]);

  // All jobs flat (for manual selection statement)
  const allJobsFlat = useMemo(
    () => clientGroups.flatMap((g) => g.jobs.map((j: any) => ({ ...j, _clientName: clientDisplayName(g.client) }))),
    [clientGroups]
  );
  const selectedJobs = useMemo(() => allJobsFlat.filter((j) => selectedJobIds.has(j.id)), [allJobsFlat, selectedJobIds]);
  const selectedClientName = useMemo(() => {
    const namesArr = selectedJobs.map((j) => j._clientName);
    const unique = namesArr.filter((n, i) => namesArr.indexOf(n) === i);
    return unique.length === 1 ? unique[0] : "Selected Jobs";
  }, [selectedJobs]);
  const selectedStatementJobs: StatementJob[] = useMemo(() => selectedJobs.map(toStatementJob), [selectedJobs]);
  const selectedClientEmail = useMemo(() => {
    if (selectedJobs.length === 0) return "";
    const clientId = selectedJobs[0].clientId ?? selectedJobs[0].client?.id;
    return clientGroups.find((g) => (g.client?.id ?? g.jobs[0]?.clientId) === clientId)?.client?._email ?? "";
  }, [selectedJobs, clientGroups]);

  const unpaidInvoicesForBulk = useMemo(() =>
    allInvoices
      .filter((inv: any) => ["PENDING", "OVERDUE"].includes(inv.status))
      .map((inv: any) => ({
        ...inv,
        _clientEmail: clientGroups.find((g) => g.client?.id === inv.clientId)?.client?._email ?? "",
      }))
      .filter((inv: any) => inv._clientEmail),
    [allInvoices, clientGroups]
  );

  const totalBilled = useMemo(() => allInvoices.filter((i: any) => i.status !== "VOID").reduce((s: number, i: any) => s + Number(i.total), 0), [allInvoices]);
  const totalPaid   = useMemo(() => allInvoices.filter((i: any) => i.status === "PAID").reduce((s: number, i: any) => s + Number(i.paidAmount ?? i.total), 0), [allInvoices]);
  const totalOutstanding = useMemo(() => allInvoices.filter((i: any) => ["PENDING", "OVERDUE"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0), [allInvoices]);
  const noInvoiceCount = useMemo(() => completedJobs.filter((j) => !invoiceByJobId[j.id]).length, [completedJobs, invoiceByJobId]);

  function toggleClient(id: string) {
    setExpandedClients((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleJobSelect(id: string) {
    setSelectedJobIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const isLoading = jobsLoading || invoicesLoading;
  const hasDateFilter = !!(dateFrom || dateTo);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px] pb-28">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{completedJobs.length} completed job{completedJobs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {noInvoiceCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {noInvoiceCount} job{noInvoiceCount !== 1 ? "s" : ""} without invoice
            </div>
          )}
          {unpaidInvoicesForBulk.length > 0 && (
            <Button size="sm" onClick={() => setBulkSendOpen(true)} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send All Unpaid ({unpaidInvoicesForBulk.length})
            </Button>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-t-4 border-t-gray-400">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Billed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBilled)}</p>
        </Card>
        <Card className="p-4 border-t-4 border-t-emerald-500">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Collected</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-4 border-t-4 border-t-amber-400">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(totalOutstanding)}</p>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Status filters */}
        <div className="flex gap-1 flex-wrap">
          {([
            { label: "Unpaid / Draft", value: "UNPAID" },
            { label: "All", value: "" },
            { label: "Paid", value: "PAID" },
            { label: "Overdue", value: "OVERDUE" },
          ] as const).map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? "bg-[#163A70] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm text-gray-700 outline-none w-32 bg-transparent" />
          <span className="text-gray-400 text-xs">→</span>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="text-sm text-gray-700 outline-none w-32 bg-transparent" />
          {hasDateFilter && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Client groups */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-[#163A70]" /></div>
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FileText className="w-8 h-8 opacity-40" />
          <p className="font-medium">No jobs match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const cid = group.client?.id ?? group.jobs[0]?.clientId ?? "unknown";
            const name = clientDisplayName(group.client);
            const isExpanded = expandedClients.has(cid);

            const groupTotal  = group.jobs.reduce((s: number, j: any) => s + Number(j._invoice?.total ?? j.flatRate ?? 0), 0);
            const groupPaid   = group.jobs.reduce((s: number, j: any) => j._invoice?.status === "PAID" ? s + Number(j._invoice.paidAmount ?? j._invoice.total) : s, 0);
            const groupOwed   = groupTotal - groupPaid;
            const unpaidCount = group.jobs.filter((j: any) => !j._invoice || ["DRAFT","PENDING","OVERDUE"].includes(j._invoice?.status)).length;

            const periodGroups = groupByPeriod(group.jobs);

            return (
              <Card key={cid} className="overflow-hidden">
                {/* Client header row */}
                <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left" onClick={() => toggleClient(cid)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#163A70] to-[#C8A46A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-400">
                        {group.jobs.length} service{group.jobs.length !== 1 ? "s" : ""}
                        {unpaidCount > 0 && <span className="ml-2 text-amber-600 font-medium">{unpaidCount} unpaid</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Billed / Owed</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(groupTotal)}
                        {groupOwed > 0 && <span className="text-amber-600"> · {formatCurrency(groupOwed)} due</span>}
                        {groupOwed === 0 && groupTotal > 0 && <span className="text-emerald-600"> · Paid</span>}
                      </p>
                    </div>
                    <span className="sm:hidden text-sm font-semibold whitespace-nowrap">
                      {groupOwed > 0 ? <span className="text-amber-600">{formatCurrency(groupOwed)} due</span> : formatCurrency(groupTotal)}
                    </span>
                    {/* Full client statement (all jobs) */}
                    <ClientStatementPDFButton clientName={name} jobs={group.jobs.map(toStatementJob)} />
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </div>
                </button>

                {/* Expanded: grouped by period */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {periodGroups.map(({ key, label, jobs: periodJobs }) => {
                          const periodStatementJobs = periodJobs.map(toStatementJob);
                          const periodTotal = periodJobs.reduce((s: number, j: any) => s + Number(j._invoice?.total ?? j.flatRate ?? 0), 0);
                          const periodJobIds = periodJobs.map((j: any) => j.id);
                          const allChecked = periodJobIds.length > 0 && periodJobIds.every((id: string) => selectedJobIds.has(id));
                          const someChecked = !allChecked && periodJobIds.some((id: string) => selectedJobIds.has(id));
                          function togglePeriodAll() {
                            setSelectedJobIds((prev) => {
                              const n = new Set(prev);
                              if (allChecked) { periodJobIds.forEach((id: string) => n.delete(id)); }
                              else { periodJobIds.forEach((id: string) => n.add(id)); }
                              return n;
                            });
                          }
                          const unpaidInPeriod = periodJobs.filter((j: any) => j._invoice && ["PENDING","OVERDUE","DRAFT"].includes(j._invoice.status));

                          return (
                            <div key={key}>
                              {/* Period sub-header */}
                              <div className="px-5 py-2 bg-[#FAF8F3] border-b border-amber-100/60 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={allChecked}
                                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                    onChange={togglePeriodAll}
                                    className="rounded border-gray-300 text-[#163A70] cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-[#163A70]">{label}</span>
                                  <span className="text-xs text-gray-400">
                                    · {periodJobs.length} job{periodJobs.length !== 1 ? "s" : ""}
                                    {periodTotal > 0 && ` · ${formatCurrency(periodTotal)}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {unpaidInPeriod.length > 0 && (
                                    <button
                                      onClick={() => bulkMarkPaid(unpaidInPeriod.map((j: any) => j._invoice.id))}
                                      disabled={bulkPaidLoading}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-medium transition-colors disabled:opacity-60"
                                    >
                                      <CheckCircle className="w-3 h-3" /> Mark Paid ({unpaidInPeriod.length})
                                    </button>
                                  )}
                                  <ClientStatementPDFButton clientName={`${name} — ${label}`} jobs={periodStatementJobs} />
                                </div>
                              </div>

                              {/* Job rows */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <tbody>
                                    {periodJobs.map((job: any) => {
                                      const inv = job._invoice;
                                      const noInv = !inv;
                                      const isDraft = inv?.status === "DRAFT";
                                      const isPending = inv?.status === "PENDING";
                                      const isOverdue = inv?.status === "OVERDUE";
                                      const needsAction = noInv || isDraft;
                                      const amount = inv ? Number(inv.total) : Number(job.flatRate ?? 0);
                                      const invWithEmail = inv ? { ...inv, job, _clientEmail: group.client?._email ?? "" } : null;
                                      const isChecked = selectedJobIds.has(job.id);

                                      return (
                                        <tr key={job.id}
                                          className={cn(
                                            "border-t border-gray-50 transition-colors group",
                                            isChecked ? "bg-blue-50" : needsAction ? "bg-amber-50/40" : "hover:bg-gray-50"
                                          )}
                                        >
                                          {/* Checkbox */}
                                          <td className="pl-5 pr-2 py-3 w-8">
                                            <input type="checkbox" checked={isChecked} onChange={() => toggleJobSelect(job.id)}
                                              className="rounded border-gray-300 text-[#163A70] cursor-pointer" />
                                          </td>
                                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs w-24">
                                            {new Date(job.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </td>
                                          <td className="px-3 py-3">
                                            <p className="font-medium text-gray-900">{job.title}</p>
                                            <p className="text-xs text-gray-400">{job.serviceType?.replace(/_/g, " ")}</p>
                                          </td>
                                          <td className="hidden lg:table-cell px-3 py-3 font-mono text-xs text-gray-400">
                                            {inv?.invoiceNumber ?? <span className="text-gray-300">—</span>}
                                          </td>
                                          <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                                            {amount > 0
                                              ? <span className={inv?.status === "PAID" ? "text-emerald-600" : "text-gray-900"}>{formatCurrency(amount)}</span>
                                              : <span className="text-gray-300">—</span>}
                                          </td>
                                          <td className="px-3 py-3">
                                            {noInv
                                              ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">No Invoice</span>
                                              : <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", INVOICE_STATUS_COLOR[inv.status as InvoiceStatus])}>{inv.status}</span>
                                            }
                                          </td>
                                          <td className="px-3 pr-5 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                              {needsAction && (
                                                <Button size="sm" variant="ghost" onClick={() => setGenerateJob(job)}
                                                  className="text-[#163A70] hover:bg-[#FAF8F3] h-7 px-2 text-xs font-medium">
                                                  <FilePlus className="w-3.5 h-3.5 mr-1" />{isDraft ? "Finalize" : "Invoice"}
                                                </Button>
                                              )}
                                              {invWithEmail && (
                                                <>
                                                  <Button size="sm" variant="ghost" onClick={() => setPreviewTarget({ invoice: invWithEmail, job })}
                                                    className="text-gray-500 hover:bg-gray-100 h-7 px-2" title="Preview">
                                                    <Eye className="w-3.5 h-3.5" />
                                                  </Button>
                                                  {(isPending || isOverdue || isDraft) && (
                                                    <Button size="sm" variant="ghost" onClick={() => setSendTarget(invWithEmail)}
                                                      className="text-[#163A70] hover:bg-[#FAF8F3] h-7 px-2 text-xs font-medium" title="Send">
                                                      <Send className="w-3.5 h-3.5 mr-1" /> Send
                                                    </Button>
                                                  )}
                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                    <InvoicePDFButton invoice={{ ...invWithEmail, job }} />
                                                    {(isPending || isOverdue || isDraft) && (
                                                      <Button variant="ghost" size="icon" onClick={() => markPaid.mutate(invWithEmail.id)}
                                                        loading={markPaid.isPending} title="Mark Paid"
                                                        className="text-green-600 hover:bg-green-50 w-7 h-7">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                      </Button>
                                                    )}
                                                    {invWithEmail.status !== "VOID" && (
                                                      <Button variant="ghost" size="icon" onClick={() => setVoidTarget(invWithEmail)}
                                                        title="Void" className="text-red-500 hover:bg-red-50 w-7 h-7">
                                                        <Ban className="w-3.5 h-3.5" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating manual selection bar */}
      {selectedJobIds.size > 0 && (() => {
        const selectedWithInvoice = selectedJobs.filter((j) => j._invoice && ["PENDING","OVERDUE","DRAFT"].includes(j._invoice.status));
        const invoiceIdsToMark = selectedWithInvoice.map((j) => j._invoice.id);
        return (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#163A70] text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 whitespace-nowrap">
            <ListChecks className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{selectedJobIds.size} job{selectedJobIds.size !== 1 ? "s" : ""} selected</span>
            <div className="flex items-center gap-2">
              <ClientStatementPDFButton clientName={selectedClientName} jobs={selectedStatementJobs} />
              {selectedJobs.some((j) => j._invoice) && (
                <button
                  onClick={() => setStatementSendOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> Email Statement
                </button>
              )}
              {invoiceIdsToMark.length > 0 && (
                <button
                  onClick={() => bulkMarkPaid(invoiceIdsToMark)}
                  disabled={bulkPaidLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {bulkPaidLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Mark Paid ({invoiceIdsToMark.length})
                </button>
              )}
            </div>
            <button onClick={() => setSelectedJobIds(new Set())} className="text-white/60 hover:text-white transition-colors ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Modals */}
      {generateJob && <QuickGenerateModal job={generateJob} onClose={() => setGenerateJob(null)} />}
      {previewTarget && (
        <InvoicePreviewModal invoice={previewTarget.invoice} job={previewTarget.job}
          onClose={() => setPreviewTarget(null)}
          onSend={() => { setSendTarget(previewTarget.invoice); setPreviewTarget(null); }} />
      )}
      {sendTarget && <SendInvoiceModal invoice={sendTarget} onClose={() => setSendTarget(null)} />}
      {bulkSendOpen && (
        <BulkSendModal invoices={unpaidInvoicesForBulk}
          onClose={() => { setBulkSendOpen(false); qc.invalidateQueries({ queryKey: ["invoices"] }); }} />
      )}
      {statementSendOpen && (
        <SendStatementModal
          clientName={selectedClientName}
          jobs={selectedJobs}
          defaultEmail={selectedClientEmail}
          onClose={() => setStatementSendOpen(false)}
        />
      )}
      <ConfirmDialog
        open={!!voidTarget} onClose={() => setVoidTarget(null)}
        onConfirm={() => voidTarget && voidInvoice.mutate(voidTarget.id)}
        loading={voidInvoice.isPending} title="Void Invoice"
        message={`Void invoice ${voidTarget?.invoiceNumber}? It will be marked as void and cannot be paid.`}
        confirmLabel="Void"
      />
    </div>
  );
}
