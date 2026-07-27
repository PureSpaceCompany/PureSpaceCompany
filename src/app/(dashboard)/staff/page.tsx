"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffModal } from "@/components/modals/staff-modal";
import { Plus, Phone, DollarSign, Loader2, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";

async function fetchStaff() {
  const res = await fetch("/api/staff?active=false");
  if (!res.ok) throw new Error("Failed to fetch staff");
  return (await res.json()).data;
}

export default function StaffPage() {
  const qc = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });

  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permanent, setPermanent] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: ({ id, perm }: { id: string; perm: boolean }) =>
      fetch(`/api/staff/${id}?permanent=${perm}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { alert(data.error); return; }
      qc.invalidateQueries({ queryKey: ["staff"] });
      setDeleteTarget(null);
      setPermanent(false);
    },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} team member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditMember(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="font-medium">No staff members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member: any) => (
            <Card key={member.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.user?.role?.toLowerCase() ?? "staff"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {member.isActive
                    ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                    : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                {member.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /><span>{member.phone}</span></div>
                )}
                <div className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5 text-gray-400" /><span>${Number(member.hourlyRate).toFixed(2)}/hr</span></div>
              </div>

              {member.skills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {member.skills.map((skill: string) => (
                    <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {skill.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setEditMember(member); setModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setDeleteTarget(member); setPermanent(false); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StaffModal open={modalOpen} onClose={() => { setModalOpen(false); setEditMember(null); }} staff={editMember} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Remove Staff Member</h2>
            <p className="text-sm text-gray-600">
              What would you like to do with <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            </p>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)}
                className="rounded border-gray-300 text-red-600" />
              <span>Permanently delete (removes login account and all records)</span>
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setPermanent(false); }}>Cancel</Button>
              <Button
                className={permanent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, perm: permanent })}
              >
                {permanent ? "Permanently Delete" : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
