import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Job, ChecklistItem } from "@/types";

interface JobFilters {
  status?: string;
  staffId?: string;
  from?: string;
  to?: string;
  clientId?: string;
}

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

// ── Job list ──────────────────────────────────────────────────
export function useJobs(filters: JobFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));

  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => fetchJSON<Job[]>(`/api/jobs?${params}`),
  });
}

// ── Single job ────────────────────────────────────────────────
export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => fetchJSON<Job>(`/api/jobs/${id}`),
    enabled: !!id,
  });
}

// ── Update job (status, schedule, assignments) ────────────────
export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Job> & { id: string }) =>
      fetchJSON<Job>(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.setQueryData(["jobs", updated.id], updated);
    },
  });
}

// ── Toggle checklist item ─────────────────────────────────────
export function useToggleChecklistItem(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { itemId: string; isCompleted: boolean; notes?: string }) =>
      fetchJSON<ChecklistItem>(`/api/jobs/${jobId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    // Optimistic update so the UI feels instant
    onMutate: async ({ itemId, isCompleted }) => {
      await qc.cancelQueries({ queryKey: ["jobs", jobId] });
      const prev = qc.getQueryData<Job>(["jobs", jobId]);

      qc.setQueryData<Job>(["jobs", jobId], (old) => {
        if (!old) return old;
        return {
          ...old,
          checklist: old.checklist.map((item) =>
            item.id === itemId ? { ...item, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null } : item
          ),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back on error
      if (ctx?.prev) qc.setQueryData(["jobs", jobId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}

// ── Add checklist item ────────────────────────────────────────
export function useAddChecklistItem(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      fetchJSON<ChecklistItem>(`/api/jobs/${jobId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", jobId] }),
  });
}

// ── Create job ────────────────────────────────────────────────
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchJSON<Job>("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}
