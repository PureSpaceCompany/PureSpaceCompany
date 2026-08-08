"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass, selectClass } from "@/components/ui/form-field";
import { useCreateJob, useUpdateJob } from "@/lib/hooks/use-jobs";
import { Job } from "@/types";
import { clientDisplayName, formatCurrency } from "@/lib/utils";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

// Build time options: every hour on :00 and :30, formatted 12-hour
const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` });
  }
}

function splitDatetime(dt: string): { date: string; time: string } {
  if (!dt) return { date: "", time: "11:00" };
  const [date, time] = dt.split("T");
  const [h, m] = time.split(":");
  const snapped = Number(m) < 15 ? "00" : Number(m) < 45 ? "30" : "00";
  const hh = snapped === "00" && Number(m) >= 45
    ? String((Number(h) + 1) % 24).padStart(2, "0")
    : h;
  return { date, time: `${hh}:${snapped}` };
}


interface JobModalProps {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
  defaultDate?: string;
}

const SERVICE_TYPES = ["STANDARD", "DEEP_CLEAN", "MOVE_IN_OUT", "POST_CONSTRUCTION", "RECURRING", "COMMERCIAL"];
const RECURRENCE = ["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"];

async function fetchClients() {
  const res = await fetch("/api/clients");
  return ((await res.json()).data as any[]) ?? [];
}

async function fetchStaff() {
  const res = await fetch("/api/staff");
  return ((await res.json()).data as any[]) ?? [];
}

async function fetchProperties(clientId: string) {
  if (!clientId) return [];
  const res = await fetch(`/api/properties?clientId=${clientId}`);
  return ((await res.json()).data as any[]) ?? [];
}

function toLocalDatetime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function JobModal({ open, onClose, job, defaultDate }: JobModalProps) {
  const isEdit = !!job;
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients, enabled: open });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff, enabled: open });

  const [form, setForm] = useState({
    clientId: "",
    propertyId: "",
    title: "",
    serviceType: "STANDARD",
    recurrence: "ONCE",
    scheduledDate: "",
    startTime: "11:00",
    endTime: "13:00",
    flatRate: "",
    cleanerPay: "",
    notes: "",
    staffIds: [] as string[],
    checklistItems: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [titleTouched, setTitleTouched] = useState(false);
  const [extraItems, setExtraItems] = useState<{ description: string; unitPrice: number }[]>([]);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraPrice, setExtraPrice] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", form.clientId],
    queryFn: () => fetchProperties(form.clientId),
    enabled: open && !!form.clientId,
  });

  const selectedDate = form.scheduledDate;

  const { data: dayJobs = [] } = useQuery({
    queryKey: ["jobs-day", selectedDate],
    queryFn: async () => {
      const from = encodeURIComponent(`${selectedDate}T00:00:00`);
      const to = encodeURIComponent(`${selectedDate}T23:59:59`);
      const res = await fetch(`/api/jobs?from=${from}&to=${to}`);
      return ((await res.json()).data as any[]) ?? [];
    },
    enabled: open && !isEdit && !!selectedDate && !!form.propertyId,
    staleTime: 30_000,
  });

  const conflictingJob: any = !isEdit && form.propertyId && selectedDate
    ? dayJobs.find(
        (j: any) =>
          j.propertyId === form.propertyId &&
          j.status !== "CANCELLED"
      )
    : null;

  useEffect(() => {
    if (job) {
      const { date: sDate, time: sTime } = splitDatetime(toLocalDatetime(job.scheduledStart));
      const { time: eTime } = splitDatetime(toLocalDatetime(job.scheduledEnd));
      setForm({
        clientId: (job as any).client?.id ?? (job as any).clientId ?? "",
        propertyId: (job as any).propertyId ?? "",
        title: job.title,
        serviceType: job.serviceType,
        recurrence: job.recurrence ?? "ONCE",
        scheduledDate: sDate,
        startTime: sTime || "11:00",
        endTime: eTime || "13:00",
        flatRate: job.flatRate ? String(job.flatRate) : "",
        cleanerPay: (job as any).cleanerPay ? String((job as any).cleanerPay) : "",
        notes: job.notes ?? "",
        staffIds: job.assignments?.map((a) => a.staffId) ?? [],
        checklistItems: job.checklist?.map((i) => i.label).join("\n") ?? "",
      });
      setTitleTouched(true);
    } else {
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      setForm({ clientId: "", propertyId: "", title: "", serviceType: "STANDARD", recurrence: "ONCE",
        scheduledDate: defaultDate || todayStr, startTime: "11:00", endTime: "13:00",
        flatRate: "", cleanerPay: "", notes: "", staffIds: [], checklistItems: "" });
      setTitleTouched(false);
    }
    setErrors({});
    setExtraItems(Array.isArray((job as any)?.extraItems) ? (job as any).extraItems : []);
    setExtraDesc("");
    setExtraPrice("");
  }, [job, open]);

  function set(key: string, value: any) {
    if (key === "title") setTitleTouched(true);
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "clientId") {
        next.propertyId = "";
        if (!titleTouched) next.title = "";
      }
      if (key === "propertyId") {
        if (value) {
          const prop = properties.find((p: any) => p.id === value);
          if (!titleTouched) next.title = prop?.name ?? f.title;
          if (prop?.cleaningFee != null) next.flatRate = String(prop.cleaningFee);
        } else {
          if (!titleTouched) next.title = "";
          next.flatRate = "";
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function toggleStaff(id: string) {
    setForm((f) => ({
      ...f,
      staffIds: f.staffIds.includes(id) ? f.staffIds.filter((s) => s !== id) : [...f.staffIds, id],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.clientId) e.clientId = "Client is required";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.scheduledDate) e.scheduledDate = "Date is required";
    if (form.startTime >= form.endTime) e.endTime = "End time must be after start";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: any = {
      clientId: form.clientId,
      propertyId: form.propertyId || null,
      title: form.title,
      serviceType: form.serviceType,
      recurrence: form.recurrence,
      scheduledStart: new Date(`${form.scheduledDate}T${form.startTime}`).toISOString(),
      scheduledEnd: new Date(`${form.scheduledDate}T${form.endTime}`).toISOString(),
      notes: form.notes || undefined,
      flatRate: form.flatRate ? parseFloat(form.flatRate) : undefined,
      extraItems,
      cleanerPay: form.cleanerPay ? parseFloat(form.cleanerPay) : null,
      staffIds: form.staffIds,
      checklistItems: form.checklistItems
        ? form.checklistItems.split("\n").map((l) => l.trim()).filter(Boolean)
        : undefined,
    };

    if (isEdit) {
      await updateJob.mutateAsync({ id: job!.id, ...payload });
    } else {
      await createJob.mutateAsync(payload);
    }
    onClose();
  }

  const isPending = createJob.isPending || updateJob.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Job" : "New Job"} size="lg">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Client" required error={errors.clientId} className="sm:col-span-2">
            <select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} className={selectClass}>
              <option value="">Select a client...</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
              ))}
            </select>
          </FormField>

          {form.clientId && (
            <FormField label="Property" className="sm:col-span-2">
              <select value={form.propertyId} onChange={(e) => set("propertyId", e.target.value)} className={selectClass}>
                <option value="">— Client default address —</option>
                {properties.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} – {p.addressLine1}, {p.city}</option>
                ))}
              </select>
              {properties.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No properties added for this client yet. Go to Clients → Manage Properties to add one.</p>
              )}
            </FormField>
          )}

          {conflictingJob && (
            <div className="sm:col-span-2 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <div>
                <span className="font-semibold">Duplicate job detected — </span>
                <span>
                  {properties.find((p: any) => p.id === form.propertyId)?.name ?? "This property"} already has a job scheduled on this day
                  {conflictingJob.title ? ` ("${conflictingJob.title}")` : ""}.
                </span>
              </div>
            </div>
          )}

          <FormField
            label="Job Title"
            required
            error={errors.title}
            className="sm:col-span-2"
            description={!titleTouched && form.title ? "Auto-filled from property name — edit to override" : undefined}
          >
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Select a client or property to auto-fill"
              className={inputClass}
            />
          </FormField>

          <FormField label="Service Type">
            <select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)} className={selectClass}>
              {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </FormField>

          <FormField label="Recurrence">
            <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)} className={selectClass}>
              {RECURRENCE.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>

          <FormField label="Date" required error={errors.scheduledDate} className="sm:col-span-2">
            <div className="flex gap-2">
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => set("scheduledDate", e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <select
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className={`${selectClass} w-32`}
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="flex items-center text-gray-400 text-sm">–</span>
              <select
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className={`${selectClass} w-32`}
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
          </FormField>

          <FormField label="Client Charge ($)" error={errors.flatRate}
            description={form.propertyId && form.flatRate ? "Pre-filled from property default — edit to override" : "Amount billed to the client"}>
            <input type="number" min="0" step="0.01" value={form.flatRate}
              onChange={(e) => set("flatRate", e.target.value)} placeholder="e.g. 200.00" className={inputClass} />
          </FormField>

          <FormField label="Cleaner Pay ($)" description="Amount paid to the cleaner for this job">
            <input type="number" min="0" step="0.01" value={form.cleanerPay}
              onChange={(e) => set("cleanerPay", e.target.value)} placeholder="e.g. 80.00" className={inputClass} />
          </FormField>

          {/* Extra charges */}
          <div className="sm:col-span-2 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extra Charges</p>
            {extraItems.length > 0 && (
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {extraItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-700">{item.description}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{formatCurrency(item.unitPrice)}</span>
                      <button type="button" onClick={() => setExtraItems(extraItems.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input type="text" value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const p = parseFloat(extraPrice); if (extraDesc.trim() && !isNaN(p) && p > 0) { setExtraItems([...extraItems, { description: extraDesc.trim(), unitPrice: p }]); setExtraDesc(""); setExtraPrice(""); } } }}
                  placeholder="Description (e.g. Mattress)" className={inputClass} />
              </div>
              <div className="w-28">
                <input type="number" min="0" step="0.01" value={extraPrice} onChange={(e) => setExtraPrice(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const p = parseFloat(extraPrice); if (extraDesc.trim() && !isNaN(p) && p > 0) { setExtraItems([...extraItems, { description: extraDesc.trim(), unitPrice: p }]); setExtraDesc(""); setExtraPrice(""); } } }}
                  placeholder="Price ($)" className={inputClass} />
              </div>
              <Button type="button" size="sm" variant="outline"
                onClick={() => { const p = parseFloat(extraPrice); if (extraDesc.trim() && !isNaN(p) && p > 0) { setExtraItems([...extraItems, { description: extraDesc.trim(), unitPrice: p }]); setExtraDesc(""); setExtraPrice(""); } }}
                disabled={!extraDesc.trim() || !extraPrice}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <FormField label="Notes" className="sm:col-span-2">
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Any special instructions..." className={inputClass} />
          </FormField>
        </div>

        {/* Assign staff */}
        <FormField label="Assign Staff">
          <div className="grid grid-cols-2 gap-2 mt-1">
            {staff.map((s: any) => (
              <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                form.staffIds.includes(s.id) ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={form.staffIds.includes(s.id)}
                  onChange={() => toggleStaff(s.id)} className="rounded border-gray-300 text-blue-600" />
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium shrink-0">
                  {s.firstName[0]}{s.lastName[0]}
                </div>
                <span className="truncate">{s.firstName} {s.lastName}</span>
              </label>
            ))}
          </div>
        </FormField>

        {!isEdit && (
          <FormField label="Checklist Items" description="One task per line">
            <textarea
              value={form.checklistItems}
              onChange={(e) => set("checklistItems", e.target.value)}
              rows={4}
              placeholder={"Vacuum all floors\nMop hard floors\nClean bathrooms"}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-gray-400 mt-1">One task per line. Leave blank to add tasks later.</p>
          </FormField>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" size="sm" loading={isPending}>{isEdit ? "Save Changes" : "Create Job"}</Button>
        </div>
      </form>
    </Modal>
  );
}
