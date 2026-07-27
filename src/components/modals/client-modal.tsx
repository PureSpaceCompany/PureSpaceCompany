"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-field";

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: any | null;
}

async function apiRequest(url: string, method: string, body: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data;
}

const EMPTY = {
  firstName: "", lastName: "", company: "", phone: "",
  addressLine1: "", addressLine2: "", city: "", state: "", zip: "",
  entryInstructions: "", gateCode: "", petNotes: "", specialNotes: "",
};

export function ClientModal({ open, onClose, client }: ClientModalProps) {
  const isEdit = !!client;
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(client ? { ...EMPTY, ...client } : { ...EMPTY });
    setErrors({});
  }, [open]); // only reset when the modal opens, not on every client re-render

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest(`/api/clients/${client.id}`, "PATCH", data)
      : apiRequest("/api/clients", "POST", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); onClose(); },
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    // Need at least company name OR first name
    if (!form.company.trim() && !form.firstName.trim()) {
      e.company = "Enter a company name or a first name";
    }
    if (!form.addressLine1.trim()) e.addressLine1 = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim()) e.zip = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    // Convert empty strings to null so the API doesn't store ""
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])
    );
    mutation.mutate(payload);
  }

  // Derive a display label for the name section hint
  const isCompanyOnly = !form.firstName && form.company;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Client" : "New Client"} size="lg">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">

        {/* Identity */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Who is this client?</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Company Name" error={errors.company} className="col-span-2">
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Acme Corp (required if no first name)"
                className={inputClass}
              />
            </FormField>
            <FormField label="First Name">
              <input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder={isCompanyOnly ? "Optional" : ""}
                className={inputClass}
              />
            </FormField>
            <FormField label="Last Name">
              <input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField label="Phone" className="col-span-2">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="555-0200"
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        {/* Address */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Service Address</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Address Line 1" required error={errors.addressLine1} className="col-span-2">
              <input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Address Line 2" className="col-span-2">
              <input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Apt, suite, etc." className={inputClass} />
            </FormField>
            <FormField label="City" required error={errors.city}>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="State" required error={errors.state}>
                <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" className={inputClass} />
              </FormField>
              <FormField label="ZIP" required error={errors.zip}>
                <input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="78701" className={inputClass} />
              </FormField>
            </div>
          </div>
        </div>

        {/* Special instructions */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Special Instructions</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Entry Instructions" className="col-span-2">
              <input value={form.entryInstructions} onChange={(e) => set("entryInstructions", e.target.value)}
                placeholder="Key under mat, alarm code 1234" className={inputClass} />
            </FormField>
            <FormField label="Gate Code">
              <input value={form.gateCode} onChange={(e) => set("gateCode", e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Pet Notes">
              <input value={form.petNotes} onChange={(e) => set("petNotes", e.target.value)}
                placeholder="Two cats, keep doors closed" className={inputClass} />
            </FormField>
            <FormField label="Special Notes" className="col-span-2">
              <textarea value={form.specialNotes} onChange={(e) => set("specialNotes", e.target.value)}
                rows={2} placeholder="Eco-friendly products preferred…" className={`${inputClass} resize-none`} />
            </FormField>
          </div>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" size="sm" loading={mutation.isPending}>{isEdit ? "Save Changes" : "Add Client"}</Button>
        </div>
      </form>
    </Modal>
  );
}
