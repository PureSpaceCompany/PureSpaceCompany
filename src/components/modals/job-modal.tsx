"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass, selectClass } from "@/components/ui/form-field";
import { useCreateJob, useUpdateJob } from "@/lib/hooks/use-jobs";
import { Job } from "@/types";
import { clientDisplayName } from "@/lib/utils";

interface JobModalProps {
  open: boolean;
  onClose: () => void;
  job?: Job | null;
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

export function JobModal({ open, onClose, job }: JobModalProps) {
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
    scheduledStart: "",
    scheduledEnd: "",
    flatRate: "",
    cleanerPay: "",
    notes: "",
    staffIds: [] as string[],
    checklistItems: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [titleTouched, setTitleTouched] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", form.clientId],
    queryFn: () => fetchProperties(form.clientId),
    enabled: open && !!form.clientId,
  });

  useEffect(() => {
    if (job) {
      setForm({
        clientId: (job as any).client?.id ?? (job as any).clientId ?? "",
        propertyId: (job as any).propertyId ?? "",
        title: job.title,
        serviceType: job.serviceType,
        recurrence: job.recurrence ?? "ONCE",
        scheduledStart: toLocalDatetime(job.scheduledStart),
        scheduledEnd: toLocalDatetime(job.scheduledEnd),
        flatRate: job.flatRate ? String(job.flatRate) : "",
        cleanerPay: (job as any).cleanerPay ? String((job as any).cleanerPay) : "",
        notes: job.notes ?? "",
        staffIds: job.assignments?.map((a) => a.staffId) ?? [],
        checklistItems: job.checklist?.map((i) => i.label).join("\n") ?? "",
      });
      setTitleTouched(true); // editing an existing job — never overwrite its title
    } else {
      setForm({ clientId: "", propertyId: "", title: "", serviceType: "STANDARD", recurrence: "ONCE",
        scheduledStart: "", scheduledEnd: "", flatRate: "", cleanerPay: "", notes: "", staffIds: [], checklistItems: "" });
      setTitleTouched(false);
    }
    setErrors({});
  }, [job, open]);

  function set(key: string, value: any) {
    if (key === "title") setTitleTouched(true);
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "clientId") {
        next.propertyId = "";
        if (!titleTouched) {
          const client = clients.find((c: any) => c.id === value);
          next.title = client?.addressLine1 ?? "";
        }
      }
      if (key === "propertyId") {
        if (value) {
          const prop = properties.find((p: any) => p.id === value);
          if (!titleTouched) next.title = prop?.addressLine1 ?? f.title;
          if (prop?.cleaningFee != null) next.flatRate = String(prop.cleaningFee);
        } else {
          if (!titleTouched) {
            const client = clients.find((c: any) => c.id === f.clientId);
            next.title = client?.addressLine1 ?? "";
          }
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
    if (!form.scheduledStart) e.scheduledStart = "Start time is required";
    if (!form.scheduledEnd) e.scheduledEnd = "End time is required";
    if (form.scheduledStart && form.scheduledEnd && form.scheduledStart >= form.scheduledEnd)
      e.scheduledEnd = "End must be after start";
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
      scheduledStart: new Date(form.scheduledStart).toISOString(),
      scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      notes: form.notes || undefined,
      flatRate: form.flatRate ? parseFloat(form.flatRate) : undefined,
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

          <FormField
            label="Job Title"
            required
            error={errors.title}
            className="sm:col-span-2"
            description={!titleTouched && form.title ? "Auto-filled from address — edit to override" : undefined}
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

          <FormField label="Scheduled Start" required error={errors.scheduledStart}>
            <input type="datetime-local" value={form.scheduledStart} onChange={(e) => set("scheduledStart", e.target.value)} className={inputClass} />
          </FormField>

          <FormField label="Scheduled End" required error={errors.scheduledEnd}>
            <input type="datetime-local" value={form.scheduledEnd} onChange={(e) => set("scheduledEnd", e.target.value)} className={inputClass} />
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
