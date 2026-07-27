import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarEvent } from "@/types";

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

export function useScheduleEvents(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  return useQuery({
    queryKey: ["schedule", from, to],
    queryFn: () => fetchJSON<CalendarEvent[]>(`/api/schedule?${params}`),
  });
}

// Used by drag-and-drop: reassign staff + reschedule via a single PATCH
export function useRescheduleJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      scheduledStart,
      scheduledEnd,
      staffIds,
    }: {
      jobId: string;
      scheduledStart: string;
      scheduledEnd: string;
      staffIds?: string[];
    }) =>
      fetchJSON(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledStart, scheduledEnd, staffIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
