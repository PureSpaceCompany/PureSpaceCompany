"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ClientModal } from "@/components/modals/client-modal";
import { PropertyModal } from "@/components/modals/property-modal";
import { clientDisplayName } from "@/lib/utils";
import { Search, Plus, MapPin, Phone, Loader2, Briefcase, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Home } from "lucide-react";

async function fetchClients(search: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(`/api/clients?${params}`);
  return (await res.json()).data as any[];
}

async function fetchProperties(clientId: string) {
  const res = await fetch(`/api/properties?clientId=${clientId}`);
  return (await res.json()).data as any[];
}

function PropertyList({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [propModal, setPropModal] = useState<{ open: boolean; property?: any }>({ open: false });
  const [deleteProp, setDeleteProp] = useState<any>(null);

  const { data: props = [], isLoading } = useQuery({
    queryKey: ["properties", clientId],
    queryFn: () => fetchProperties(clientId),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => fetch(`/api/properties/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties", clientId] }); setDeleteProp(null); },
  });

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
          <Building2 className="w-3 h-3" /> Properties ({props.length})
        </p>
        <button onClick={() => setPropModal({ open: true })}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5 font-medium">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {isLoading ? <div className="h-4 bg-gray-100 rounded animate-pulse" /> : props.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No properties added yet</p>
      ) : (
        <div className="space-y-1.5">
          {props.map((p: any) => (
            <div key={p.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-700 truncate flex items-center gap-1">
                  <Home className="w-3 h-3 text-gray-400 shrink-0" />{p.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{p.addressLine1}, {p.city}</p>
                {p._count?.jobs > 0 && (
                  <p className="text-xs text-gray-400">{p._count.jobs} job{p._count.jobs !== 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setPropModal({ open: true, property: p })}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-0.5">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => setDeleteProp(p)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PropertyModal
        open={propModal.open}
        onClose={() => setPropModal({ open: false })}
        clientId={clientId}
        property={propModal.property}
      />

      <ConfirmDialog
        open={!!deleteProp}
        onClose={() => setDeleteProp(null)}
        onConfirm={() => deleteProp && softDelete.mutate(deleteProp.id)}
        loading={softDelete.isPending}
        title="Remove Property"
        message={`Remove property "${deleteProp?.name}"? Historical jobs will be preserved.`}
        confirmLabel="Remove"
      />
    </div>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permanent, setPermanent] = useState(false);
  const [expandedProps, setExpandedProps] = useState<Set<string>>(new Set());

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", debouncedSearch],
    queryFn: () => fetchClients(debouncedSearch),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, perm }: { id: string; perm: boolean }) =>
      fetch(`/api/clients/${id}?permanent=${perm}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { alert(data.error); return; }
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteTarget(null);
      setPermanent(false);
    },
  });

  let debounceTimer: any;
  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setDebouncedSearch(value), 300);
  }

  function toggleProps(id: string) {
    setExpandedProps((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setEditClient(null); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> New Client
        </Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or company..."
          className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400"><p className="font-medium">No clients found</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client: any) => (
            <Card key={client.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">
                  {client.company ? client.company[0].toUpperCase() : (client.firstName?.[0]?.toUpperCase() ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{clientDisplayName(client)}</p>
                  {client.company && (client.firstName || client.lastName) && (
                    <p className="text-xs text-gray-500 truncate">{[client.firstName, client.lastName].filter(Boolean).join(" ")}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="truncate">{client.addressLine1}, {client.city}</span></div>
                {client.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span>{client.phone}</span></div>}
                {client._count && (
                  <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span>{client._count.jobs} job{client._count.jobs !== 1 ? "s" : ""}</span></div>
                )}
              </div>

              {(client.petNotes || client.entryInstructions) && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                  {client.entryInstructions && <p><span className="font-medium text-gray-600">Entry:</span> {client.entryInstructions}</p>}
                  {client.petNotes && <p><span className="font-medium text-gray-600">Pets:</span> {client.petNotes}</p>}
                </div>
              )}

              {/* Properties toggle */}
              <button
                onClick={() => toggleProps(client.id)}
                className="mt-3 w-full flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
              >
                {expandedProps.has(client.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <Building2 className="w-3.5 h-3.5" /> Manage Properties
              </button>

              {expandedProps.has(client.id) && <PropertyList clientId={client.id} />}

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setEditClient(client); setModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setDeleteTarget(client); setPermanent(false); }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ClientModal open={modalOpen} onClose={() => { setModalOpen(false); setEditClient(null); }} client={editClient} />

      {/* Delete modal with permanent toggle */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Client</h2>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{clientDisplayName(deleteTarget)}</strong>?
              This will fail if they have active jobs.
            </p>
            <label className="flex items-center gap-2 text-sm text-red-700 cursor-pointer">
              <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)}
                className="rounded border-gray-300 text-red-600" />
              <span>Permanently delete (cannot be undone — removes all history)</span>
            </label>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setDeleteTarget(null); setPermanent(false); }}>Cancel</Button>
              <Button
                className={permanent ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteTarget.id, perm: permanent })}
              >
                {permanent ? "Permanently Delete" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
