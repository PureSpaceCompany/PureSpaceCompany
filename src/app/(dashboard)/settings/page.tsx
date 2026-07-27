"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Bell, FileText, Save, CheckCircle2, Loader2 } from "lucide-react";
import { inputClass } from "@/components/ui/form-field";

async function fetchSettings() {
  const res = await fetch("/api/settings");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
  return json.data as {
    companyName: string;
    supportEmail: string;
    phone: string;
    invoicePaymentDays: number;
    invoiceNotes: string;
  };
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState({
    companyName: "CleanPro Services",
    supportEmail: "",
    phone: "",
    invoicePaymentDays: 14,
    invoiceNotes: "",
  });

  // Populate form once data loads
  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          invoicePaymentDays: Number(form.invoicePaymentDays),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setError("");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err: any) => setError(err.message),
  });

  function field(key: keyof typeof form) {
    return {
      value: String(form[key]),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Application configuration</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </p>
          )}
          <Button onClick={() => save.mutate()} loading={save.isPending} className="gap-1.5">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Company */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Company
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Company Name</label>
            <input className={inputClass} placeholder="CleanPro Services" {...field("companyName")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Support Email</label>
            <input type="email" className={inputClass} placeholder="support@cleanpro.com" {...field("supportEmail")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input className={inputClass} placeholder="+1 (555) 000-0000" {...field("phone")} />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Invoice Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Payment Terms (days)</label>
            <input
              type="number" min="1" max="365"
              className={`${inputClass} w-40`}
              {...field("invoicePaymentDays")}
            />
            <p className="text-xs text-gray-400">Due date = service date + this many days</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Default Invoice Notes</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="e.g. Thank you for your business. Please pay within the terms stated above."
              {...field("invoiceNotes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button repeated at bottom for long pages */}
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} loading={save.isPending} className="gap-1.5">
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
