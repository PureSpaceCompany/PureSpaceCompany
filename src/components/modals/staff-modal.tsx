"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormField, inputClass, selectClass } from "@/components/ui/form-field";

interface StaffModalProps {
  open: boolean;
  onClose: () => void;
  staff?: any | null;
}

const SKILL_OPTIONS = [
  "standard_clean", "deep_clean", "carpet_cleaning", "window_washing",
  "post_construction", "commercial", "move_in_out", "scheduling", "client_relations",
];

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

export function StaffModal({ open, onClose, staff }: StaffModalProps) {
  const isEdit = !!staff;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", phone: "",
    role: "CLEANER", hourlyRate: "", skills: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (staff) {
      setForm({
        firstName: staff.firstName, lastName: staff.lastName,
        email: staff.user?.email ?? "", password: "",
        phone: staff.phone ?? "", role: staff.user?.role ?? "CLEANER",
        hourlyRate: String(staff.hourlyRate), skills: staff.skills ?? [],
      });
    } else {
      setForm({ firstName: "", lastName: "", email: "", password: "", phone: "", role: "CLEANER", hourlyRate: "", skills: [] });
    }
    setErrors({});
  }, [staff, open]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit
      ? apiRequest(`/api/staff/${staff.id}`, "PATCH", data)
      : apiRequest("/api/staff", "POST", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); onClose(); },
  });

  function set(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!isEdit && !form.email.trim()) e.email = "Required";
    if (!isEdit && form.password.length < 8) e.password = "Minimum 8 characters";
    if (!form.hourlyRate || isNaN(parseFloat(form.hourlyRate))) e.hourlyRate = "Enter a valid rate";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: any = {
      firstName: form.firstName, lastName: form.lastName,
      phone: form.phone || undefined,
      hourlyRate: parseFloat(form.hourlyRate),
      skills: form.skills,
    };
    if (!isEdit) {
      payload.email = form.email;
      payload.password = form.password;
      payload.role = form.role;
    }
    mutation.mutate(payload);
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Staff Member" : "Add Staff Member"} size="md">
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" required error={errors.firstName}>
            <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputClass} />
          </FormField>
        </div>

        {!isEdit && (
          <>
            <FormField label="Email" required error={errors.email}>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Password" required error={errors.password}>
                <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                  placeholder="Min. 8 characters" className={inputClass} />
              </FormField>
              <FormField label="Role">
                <select value={form.role} onChange={(e) => set("role", e.target.value)} className={selectClass}>
                  <option value="CLEANER">Cleaner</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </FormField>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="555-0100" className={inputClass} />
          </FormField>
          <FormField label="Hourly Rate ($)" required error={errors.hourlyRate}>
            <input type="number" min="0" step="0.01" value={form.hourlyRate}
              onChange={(e) => set("hourlyRate", e.target.value)} placeholder="18.00" className={inputClass} />
          </FormField>
        </div>

        <FormField label="Skills">
          <div className="flex flex-wrap gap-2 mt-1">
            {SKILL_OPTIONS.map((skill) => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.skills.includes(skill)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}>
                {skill.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </FormField>

        {mutation.isError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {(mutation.error as Error).message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" size="sm" loading={mutation.isPending}>{isEdit ? "Save Changes" : "Add Staff"}</Button>
        </div>
      </form>
    </Modal>
  );
}
