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
import { Loader2, FileText, CheckCircle, Ban, FilePlus, ChevronDown, ChevronUp, AlertCircle, Send, Mail, Eye } from "lucide-react";
import { InvoicePDFButton, ClientStatementPDFButton, StatementJob } from "@/components/invoices/invoice-pdf";
import { LogoMark } from "@/components/ui/logo";

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
    PAID: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    OVERDUE: "bg-red-100 text-red-700",
    DRAFT: "bg-gray-100 text-gray-600",
    VOID: "bg-gray-100 text-gray-400",
  };

  return (
    <Modal open onClose={onClose} title="Invoice Preview" size="lg">
      <div className="px-6 pb-6 space-y-5">
        {/* Branded header */}
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
            {invoice.client?.city && (
              <p className="text-gray-500">{invoice.client.city}, {invoice.client.state} {invoice.client.zip}</p>
            )}
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

        {/* Line items */}
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
              {lineItems.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">No line items</td></tr>
              ) : lineItems.map((item: any, i: number) => (
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

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            {Number(invoice.taxAmount) > 0 && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({(Number(invoice.taxRate) * 100).toFixed(2)}%)</span>
                  <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
                <div className="border-t border-gray-200 pt-1.5" />
              </>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span><span>{formatCurrency(Number(invoice.total))}</span>
            </div>
            {invoice.status === "PAID" && invoice.paidAmount != null && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Paid</span><span>{formatCurrency(Number(invoice.paidAmount))}</span>
              </div>
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
            <Button size="sm" onClick={onSend} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send Invoice
            </Button>
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          flatRate: flatRate ? parseFloat(flatRate) : undefined,
          dueDate: dueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["completed-jobs"] });
      onClose();
    },
    onError: (err: any) => setError(err.message),
  });

  return (
    <Modal open onClose={onClose} title="Generate Invoice">
      <div className="space-y-4 p-1">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="bg-[#FAF8F3] rounded-lg p-3 text-sm text-[#163A70] space-y-1">
          <p className="font-semibold">{job.title}</p>
          <p className="text-[#163A70]">{clientDisplayName(job.client)}</p>
          {job.property && <p>Property: {job.property.name}</p>}
          <p>Service date: {new Date(job.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
        <FormField label="Amount to Charge ($)" description="Leave blank to use the flat rate on the job">
          <input
            type="number" min="0" step="0.01" className={inputClass}
            value={flatRate} onChange={(e) => setFlatRate(e.target.value)}
            placeholder={job.flatRate ? String(job.flatRate) : "0.00"}
          />
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
  const [result, setResult] = useState<{ paymentUrl: string; to: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      setResult(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Send Invoice by Email" size="sm">
      <div className="space-y-4 p-1">
        {result ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">Invoice sent!</p>
              <p className="text-sm text-emerald-700 mt-1">Email delivered to <strong>{result.to}</strong></p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 font-medium">Payment link (for reference):</p>
              <a href={result.paymentUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#163A70] underline break-all">{result.paymentUrl}</a>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[#FAF8F3] rounded-lg p-3 text-sm text-[#163A70] space-y-0.5">
              <p className="font-semibold">{invoice.invoiceNumber} — {formatCurrency(Number(invoice.total))}</p>
              <p className="text-[#163A70]">{invoice.job?.title}</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
            )}
            <FormField label="Send to email" description="Client will receive the invoice with a Pay Now button">
              <div className="flex gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-2.5 shrink-0" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com" className={inputClass} />
              </div>
            </FormField>
            <p className="text-xs text-gray-400">
              Stripe will securely process the payment. The invoice status will automatically update to Paid when completed.
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={send} loading={loading} disabled={!email.trim()}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Send Invoice
              </Button>
            </div>
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
    const init: Record<string, "pending" | "sending" | "done" | "error"> = {};
    invoices.forEach((inv) => { init[inv.id] = "pending"; });
    setProgress(init);

    for (const inv of invoices) {
      setProgress((p) => ({ ...p, [inv.id]: "sending" }));
      try {
        const res = await fetch(`/api/invoices/${inv.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inv._clientEmail }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed");
        setProgress((p) => ({ ...p, [inv.id]: "done" }));
      } catch (e: any) {
        setProgress((p) => ({ ...p, [inv.id]: "error" }));
        setErrors((prev) => ({ ...prev, [inv.id]: e.message }));
      }
    }
    setRunning(false);
    setDone(true);
  }

  const sent = Object.values(progress).filter((s) => s === "done").length;
  const failed = Object.values(progress).filter((s) => s === "error").length;

  return (
    <Modal open onClose={onClose} title={`Send ${invoices.length} Unpaid Invoice${invoices.length !== 1 ? "s" : ""}`} size="md">
      <div className="space-y-4 px-1 pb-2">
        {!running && !done && (
          <p className="text-sm text-gray-500">
            This will send a payment email to each client for their unpaid invoices. Make sure each client has an email on file.
          </p>
        )}

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
                  {st === "error" && (
                    <span className="text-xs text-red-500" title={errors[inv.id]}>Failed</span>
                  )}
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
          {!done && (
            <Button size="sm" loading={running} onClick={sendAll} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Send All
            </Button>
          )}
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

  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["completed-jobs"],
    queryFn: fetchCompletedJobs,
  });

  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: fetchInvoices,
  });

  const markPaid = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const voidInvoice = useMutation({
    mutationFn: (id: string) => fetch(`/api/invoices/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setVoidTarget(null);
    },
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
        const anyInv = allInvoices.find((i: any) => i.clientId === cid || i.client?.id === cid);
        const clientEmail = anyInv?.client?.user?.email ?? "";
        map.set(cid, { client: { ...job.client, _email: clientEmail }, jobs: [] });
      }
      map.get(cid)!.jobs.push({ ...job, _invoice: invoiceByJobId[job.id] ?? null });
    }
    return Array.from(map.values()).sort((a, b) =>
      clientDisplayName(a.client).localeCompare(clientDisplayName(b.client))
    );
  }, [completedJobs, invoiceByJobId]);

  const filteredGroups = useMemo(() => {
    if (!statusFilter) return clientGroups;
    return clientGroups
      .map((g) => ({
        ...g,
        jobs: g.jobs.filter((job) => {
          const inv = job._invoice;
          if (statusFilter === "UNPAID") return !inv || ["DRAFT", "PENDING"].includes(inv.status);
          if (statusFilter === "OVERDUE") return inv?.status === "OVERDUE";
          if (statusFilter === "PAID") return inv?.status === "PAID";
          return true;
        }),
      }))
      .filter((g) => g.jobs.length > 0);
  }, [clientGroups, statusFilter]);

  // Collect all unpaid invoices (PENDING or OVERDUE with a client email) for bulk send
  const unpaidInvoicesForBulk = useMemo(() =>
    allInvoices
      .filter((inv: any) => ["PENDING", "OVERDUE"].includes(inv.status))
      .map((inv: any) => {
        const clientEmail = clientGroups.find(
          (g) => g.client?.id === inv.clientId
        )?.client?._email ?? "";
        return { ...inv, _clientEmail: clientEmail };
      })
      .filter((inv: any) => inv._clientEmail),
    [allInvoices, clientGroups]
  );

  const totalBilled = useMemo(
    () => allInvoices.filter((i: any) => i.status !== "VOID").reduce((s: number, i: any) => s + Number(i.total), 0),
    [allInvoices]
  );
  const totalPaid = useMemo(
    () => allInvoices.filter((i: any) => i.status === "PAID").reduce((s: number, i: any) => s + Number(i.paidAmount ?? i.total), 0),
    [allInvoices]
  );
  const totalOutstanding = useMemo(
    () => allInvoices.filter((i: any) => ["PENDING", "OVERDUE"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total), 0),
    [allInvoices]
  );
  const noInvoiceCount = useMemo(
    () => completedJobs.filter((j) => !invoiceByJobId[j.id]).length,
    [completedJobs, invoiceByJobId]
  );

  const toggleClient = (id: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isLoading = jobsLoading || invoicesLoading;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px]">
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
              <Send className="w-3.5 h-3.5" />
              Send All Unpaid ({unpaidInvoicesForBulk.length})
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

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {([
          { label: "Unpaid / Draft", value: "UNPAID" },
          { label: "All", value: "" },
          { label: "Paid", value: "PAID" },
          { label: "Overdue", value: "OVERDUE" },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === f.value ? "bg-[#163A70] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Client groups */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-[#163A70]" />
        </div>
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

            const groupTotal = group.jobs.reduce((s: number, j: any) => {
              const inv = j._invoice;
              if (!inv || inv.status === "VOID") return s + Number(j.flatRate ?? 0);
              return s + Number(inv.total);
            }, 0);
            const groupPaid = group.jobs.reduce((s: number, j: any) => {
              const inv = j._invoice;
              if (inv?.status === "PAID") return s + Number(inv.paidAmount ?? inv.total);
              return s;
            }, 0);
            const groupOwed = groupTotal - groupPaid;
            const unpaidCount = group.jobs.filter((j: any) => !j._invoice || ["DRAFT", "PENDING", "OVERDUE"].includes(j._invoice?.status)).length;

            const statementJobs: StatementJob[] = group.jobs.map((j: any) => ({
              title: j.title,
              scheduledStart: j.scheduledStart,
              propertyName: j.property?.name ?? null,
              invoiceNumber: j._invoice?.invoiceNumber ?? null,
              invoiceStatus: j._invoice?.status ?? "NONE",
              amount: Number(j._invoice?.subtotal ?? j.flatRate ?? 0),
              total: Number(j._invoice?.total ?? j.flatRate ?? 0),
            }));

            return (
              <Card key={cid} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggleClient(cid)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#163A70] to-[#C8A46A] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{name}</p>
                      <p className="text-xs text-gray-400">
                        {group.jobs.length} service{group.jobs.length !== 1 ? "s" : ""}
                        {unpaidCount > 0 && (
                          <span className="ml-2 text-amber-600 font-medium">{unpaidCount} unpaid</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-400">Billed / Owed</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(groupTotal)}
                        {groupOwed > 0 && <span className="text-amber-600"> · {formatCurrency(groupOwed)} due</span>}
                        {groupOwed === 0 && groupTotal > 0 && <span className="text-emerald-600"> · Paid</span>}
                      </p>
                    </div>
                    <span className="sm:hidden text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {groupOwed > 0 ? <span className="text-amber-600">{formatCurrency(groupOwed)} due</span> : formatCurrency(groupTotal)}
                    </span>
                    <ClientStatementPDFButton clientName={name} jobs={statementJobs} />
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                          <th className="hidden sm:table-cell text-left px-5 py-2.5 font-medium">Service Date</th>
                          <th className="text-left px-3 sm:px-5 py-2.5 font-medium">Job</th>
                          <th className="hidden md:table-cell text-left px-5 py-2.5 font-medium">Property</th>
                          <th className="hidden lg:table-cell text-left px-5 py-2.5 font-medium">Invoice #</th>
                          <th className="text-right px-3 sm:px-5 py-2.5 font-medium">Amount</th>
                          <th className="text-left px-3 sm:px-5 py-2.5 font-medium">Status</th>
                          <th className="px-3 sm:px-5 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.jobs.map((job: any) => {
                          const inv = job._invoice;
                          const noInv = !inv;
                          const isDraft = inv?.status === "DRAFT";
                          const isPending = inv?.status === "PENDING";
                          const isOverdue = inv?.status === "OVERDUE";
                          const needsAction = noInv || isDraft;
                          const amount = inv ? Number(inv.total) : Number(job.flatRate ?? 0);
                          const invWithEmail = inv ? { ...inv, job, _clientEmail: group.client?._email ?? "" } : null;

                          return (
                            <tr
                              key={job.id}
                              className={`border-t border-gray-50 transition-colors group ${needsAction ? "bg-amber-50/40" : "hover:bg-gray-50"}`}
                            >
                              <td className="hidden sm:table-cell px-5 py-3 text-gray-500 whitespace-nowrap text-xs">
                                {new Date(job.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </td>
                              <td className="px-3 sm:px-5 py-3">
                                <p className="font-medium text-gray-900">{job.title}</p>
                                <p className="text-xs text-gray-400">{job.serviceType?.replace(/_/g, " ")}</p>
                              </td>
                              <td className="hidden md:table-cell px-5 py-3 text-gray-600 text-xs">
                                {job.property
                                  ? <span className="font-medium">{job.property.name}<br /><span className="text-gray-400">{job.property.city}</span></span>
                                  : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="hidden lg:table-cell px-5 py-3 font-mono text-xs text-gray-500">
                                {inv?.invoiceNumber ?? <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 sm:px-5 py-3 text-right font-semibold">
                                {amount > 0
                                  ? <span className={inv?.status === "PAID" ? "text-emerald-600" : "text-gray-900"}>{formatCurrency(amount)}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 sm:px-5 py-3">
                                {noInv ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">No Invoice</span>
                                ) : (
                                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", INVOICE_STATUS_COLOR[inv.status as InvoiceStatus])}>
                                    {inv.status}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 sm:px-5 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  {needsAction && (
                                    <Button size="sm" variant="ghost" onClick={() => setGenerateJob(job)}
                                      className="text-[#163A70] hover:bg-[#FAF8F3] h-7 px-2 text-xs font-medium">
                                      <FilePlus className="w-3.5 h-3.5 mr-1" />
                                      {isDraft ? "Finalize" : "Invoice"}
                                    </Button>
                                  )}
                                  {invWithEmail && (
                                    <>
                                      {/* Preview button — always visible when there's an invoice */}
                                      <Button size="sm" variant="ghost"
                                        onClick={() => setPreviewTarget({ invoice: invWithEmail, job })}
                                        className="text-gray-500 hover:bg-gray-100 h-7 px-2 text-xs font-medium"
                                        title="Preview invoice">
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                      {(isPending || isOverdue || isDraft) && (
                                        <Button size="sm" variant="ghost"
                                          onClick={() => setSendTarget(invWithEmail)}
                                          className="text-[#163A70] hover:bg-[#FAF8F3] h-7 px-2 text-xs font-medium"
                                          title="Send invoice by email">
                                          <Send className="w-3.5 h-3.5 mr-1" /> Send
                                        </Button>
                                      )}
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <InvoicePDFButton invoice={{ ...invWithEmail, job }} />
                                        {(isPending || isOverdue || isDraft) && (
                                          <Button variant="ghost" size="icon"
                                            onClick={() => markPaid.mutate(invWithEmail.id)}
                                            loading={markPaid.isPending} title="Mark as Paid manually"
                                            className="text-green-600 hover:bg-green-50 w-7 h-7">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                        {invWithEmail.status !== "VOID" && (
                                          <Button variant="ghost" size="icon"
                                            onClick={() => setVoidTarget(invWithEmail)}
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
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {generateJob && <QuickGenerateModal job={generateJob} onClose={() => setGenerateJob(null)} />}

      {previewTarget && (
        <InvoicePreviewModal
          invoice={previewTarget.invoice}
          job={previewTarget.job}
          onClose={() => setPreviewTarget(null)}
          onSend={() => { setSendTarget(previewTarget.invoice); setPreviewTarget(null); }}
        />
      )}

      {sendTarget && <SendInvoiceModal invoice={sendTarget} onClose={() => setSendTarget(null)} />}

      {bulkSendOpen && (
        <BulkSendModal
          invoices={unpaidInvoicesForBulk}
          onClose={() => { setBulkSendOpen(false); qc.invalidateQueries({ queryKey: ["invoices"] }); }}
        />
      )}

      <ConfirmDialog
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={() => voidTarget && voidInvoice.mutate(voidTarget.id)}
        loading={voidInvoice.isPending}
        title="Void Invoice"
        message={`Void invoice ${voidTarget?.invoiceNumber}? It will be marked as void and cannot be paid.`}
        confirmLabel="Void"
      />
    </div>
  );
}
