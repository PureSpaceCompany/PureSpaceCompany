"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass } from "@/components/ui/form-field";

interface PropertyModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  property?: any;
}

const emptyForm = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  entryInstructions: "",
  gateCode: "",
  petNotes: "",
  specialNotes: "",
};

export function PropertyModal({ open, onClose, clientId, property }: PropertyModalProps) {
  const qc = useQueryClient();
  const isEdit = !!property;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name ?? "",
        addressLine1: property.addressLine1 ?? "",
        addressLine2: property.addressLine2 ?? "",
        city: property.city ?? "",
        state: property.state ?? "",
        zip: property.zip ?? "",
        entryInstructions: property.entryInstructions ?? "",
        gateCode: property.gateCode ?? "",
        petNotes: property.petNotes ?? "",
        specialNotes: property.specialNotes ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [property, open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Property name is required";
    if (!form.addressLine1.trim()) e.addressLine1 = "Street address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim()) e.zip = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, clientId };
      const url = isEdit ? `/api/properties/${property.id}` : "/api/properties";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save property");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties", clientId] });
      onClose();
    },
    onError: (err: any) => {
      setErrors({ _root: err.message });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    save.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Property" : "Add Property"} size="md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {errors._root && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {errors._root}
          </div>
        )}

        {/* Property name */}
        <FormField label="Property Name" required error={errors.name}>
          <input
            className={inputClass}
            placeholder='e.g. "Downtown Office", "Unit 5A", "North Campus"'
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>

        {/* Address */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Address</p>

          <FormField label="Street Address" required error={errors.addressLine1}>
            <input
              className={inputClass}
              placeholder="123 Main Street"
              value={form.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
            />
          </FormField>

          <FormField label="Suite / Unit / Floor">
            <input
              className={inputClass}
              placeholder="Suite 200, Floor 3..."
              value={form.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
            />
          </FormField>

          {/* City takes remaining space, State is narrow, ZIP is medium */}
          <div className="grid grid-cols-[1fr_72px_96px] gap-3">
            <FormField label="City" required error={errors.city}>
              <input
                className={inputClass}
                placeholder="Austin"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </FormField>
            <FormField label="State" required error={errors.state}>
              <input
                className={inputClass}
                placeholder="TX"
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value.toUpperCase())}
              />
            </FormField>
            <FormField label="ZIP" required error={errors.zip}>
              <input
                className={inputClass}
                placeholder="78701"
                maxLength={10}
                value={form.zip}
                onChange={(e) => set("zip", e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Access & notes */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Access & Notes</p>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gate / Door Code">
              <input
                className={inputClass}
                placeholder="e.g. #1234"
                value={form.gateCode}
                onChange={(e) => set("gateCode", e.target.value)}
              />
            </FormField>
            <FormField label="Pet Notes">
              <input
                className={inputClass}
                placeholder="Dog in backyard, cats inside..."
                value={form.petNotes}
                onChange={(e) => set("petNotes", e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Entry Instructions">
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Key under mat, check in at front desk, ring bell..."
              value={form.entryInstructions}
              onChange={(e) => set("entryInstructions", e.target.value)}
            />
          </FormField>

          <FormField label="Special Notes">
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Fragile items, allergies, areas to avoid..."
              value={form.specialNotes}
              onChange={(e) => set("specialNotes", e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? "Save Changes" : "Add Property"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
