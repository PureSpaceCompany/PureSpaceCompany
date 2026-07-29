"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FileText, Save, CheckCircle2, Loader2, Users, Plus, Pencil, Trash2, KeyRound, X, ShieldCheck } from "lucide-react";
import { inputClass, selectClass } from "@/components/ui/form-field";

const ROLES = ["ADMIN", "MANAGER", "CLEANER", "CLIENT"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  CLEANER: "bg-emerald-100 text-emerald-700",
  CLIENT: "bg-gray-100 text-gray-600",
};

interface AppUser {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  staffProfile?: { firstName: string; lastName: string; isActive: boolean } | null;
  clientProfile?: { firstName: string | null; lastName: string | null; company: string | null } | null;
}

async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch("/api/users");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load users");
  return json.data;
}

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

type UserModal =
  | { mode: "create" }
  | { mode: "edit"; user: AppUser }
  | { mode: "password"; user: AppUser }
  | null;

export default function SettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // User management state
  const [userModal, setUserModal] = useState<UserModal>(null);
  const [userForm, setUserForm] = useState({ email: "", password: "", role: "CLEANER" as Role, firstName: "", lastName: "" });
  const [userError, setUserError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<AppUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [form, setForm] = useState({
    companyName: "StayShine",
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

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createUser = useMutation({
    mutationFn: async (data: typeof userForm) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create user");
      return json.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setUserModal(null); setUserError(""); },
    onError: (err: any) => setUserError(err.message),
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ role: Role; email: string; password: string }> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update user");
      return json.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setUserModal(null); setUserError(""); },
    onError: (err: any) => setUserError(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete user");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setDeleteConfirm(null); },
    onError: (err: any) => setUserError(err.message),
  });

  function openCreate() {
    setUserForm({ email: "", password: "", role: "CLEANER", firstName: "", lastName: "" });
    setUserError("");
    setUserModal({ mode: "create" });
  }

  function openEdit(user: AppUser) {
    setUserForm({ email: user.email, password: "", role: user.role, firstName: "", lastName: "" });
    setUserError("");
    setUserModal({ mode: "edit", user });
  }

  function openPassword(user: AppUser) {
    setUserForm({ email: user.email, password: "", role: user.role, firstName: "", lastName: "" });
    setUserError("");
    setUserModal({ mode: "password", user });
  }

  function submitUserModal() {
    if (!userModal) return;
    if (userModal.mode === "create") {
      if (!userForm.email || !userForm.password) { setUserError("Email and password are required"); return; }
      createUser.mutate(userForm);
    } else if (userModal.mode === "edit") {
      updateUser.mutate({ id: userModal.user.id, data: { role: userForm.role, email: userForm.email } });
    } else if (userModal.mode === "password") {
      if (!userForm.password || userForm.password.length < 8) { setUserError("Password must be at least 8 characters"); return; }
      updateUser.mutate({ id: userModal.user.id, data: { password: userForm.password } });
    }
  }

  function userDisplayName(u: AppUser) {
    const profile = u.staffProfile ?? u.clientProfile;
    if (profile) {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      if (name) return name;
      if ("company" in profile && profile.company) return profile.company;
    }
    return u.email;
  }

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
            <input className={inputClass} placeholder="StayShine" {...field("companyName")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Support Email</label>
            <input type="email" className={inputClass} placeholder="support@stayshine.com" {...field("supportEmail")} />
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

      {/* ── User Management ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" /> User Management
            </CardTitle>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New User
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{userDisplayName(u)}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                        <ShieldCheck className="w-3 h-3" /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)} title="Edit role / email"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openPassword(u)} title="Reset password"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(u)} title="Delete user"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── User Modal (create / edit / password) ── */}
      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {userModal.mode === "create" ? "New User" : userModal.mode === "edit" ? "Edit User" : "Reset Password"}
              </h2>
              <button onClick={() => setUserModal(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {userModal.mode !== "password" && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className={inputClass} value={userForm.email}
                      onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <select className={selectClass} value={userForm.role}
                      onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as Role }))}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </>
              )}
              {userModal.mode === "create" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">First Name</label>
                      <input className={inputClass} value={userForm.firstName}
                        onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Last Name</label>
                      <input className={inputClass} value={userForm.lastName}
                        onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <input type="password" className={inputClass} value={userForm.password}
                      onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters" />
                  </div>
                </>
              )}
              {userModal.mode === "password" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <input type="password" className={inputClass} value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters" />
                </div>
              )}
              {userError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{userError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setUserModal(null)}>Cancel</Button>
              <Button size="sm" loading={createUser.isPending || updateUser.isPending} onClick={submitUserModal}>
                {userModal.mode === "create" ? "Create User" : userModal.mode === "edit" ? "Save Changes" : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Delete User</h2>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-medium">{deleteConfirm.email}</span>? This cannot be undone.
            </p>
            {userError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{userError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button size="sm" loading={deleteUser.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteUser.mutate(deleteConfirm.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
