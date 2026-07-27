"use client";

/**
 * JobChecklist – the core real-time checklist component.
 *
 * Works for both the Admin detail view and the Cleaner mobile view.
 * Uses optimistic updates (via useToggleChecklistItem) so tapping a
 * checkbox feels instant even on a slow mobile network.
 */

import { useState } from "react";
import { ChecklistItem, JobStatus } from "@/types";
import { useToggleChecklistItem, useAddChecklistItem } from "@/lib/hooks/use-jobs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Plus, Loader2 } from "lucide-react";

interface JobChecklistProps {
  jobId: string;
  items: ChecklistItem[];
  jobStatus: JobStatus;
  readOnly?: boolean;
}

export function JobChecklist({ jobId, items, jobStatus, readOnly = false }: JobChecklistProps) {
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const toggleItem = useToggleChecklistItem(jobId);
  const addItem = useAddChecklistItem(jobId);

  const completed = items.filter((i) => i.isCompleted).length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;
  const canEdit = !readOnly && jobStatus !== "COMPLETED" && jobStatus !== "CANCELLED";

  function handleToggle(item: ChecklistItem) {
    if (!canEdit) return;
    toggleItem.mutate({ itemId: item.id, isCompleted: !item.isCompleted });
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await addItem.mutateAsync(newLabel.trim());
    setNewLabel("");
    setShowAdd(false);
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span className="font-medium">{completed}/{items.length} tasks ({pct}%)</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Item list */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => handleToggle(item)}
              disabled={!canEdit || toggleItem.isPending}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                item.isCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200 hover:bg-gray-50",
                (!canEdit) && "cursor-default"
              )}
            >
              {/* Custom checkbox */}
              <div
                className={cn(
                  "mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  item.isCompleted
                    ? "bg-green-500 border-green-500"
                    : "border-gray-300"
                )}
              >
                {item.isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium block",
                    item.isCompleted ? "line-through text-gray-400" : "text-gray-800"
                  )}
                >
                  {item.label}
                </span>
                {item.completedAt && (
                  <span className="text-xs text-gray-400">
                    Completed {new Date(item.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {item.notes && (
                  <span className="text-xs text-gray-500 block mt-0.5 italic">{item.notes}</span>
                )}
              </div>

              {/* Loading spinner for this specific item */}
              {toggleItem.isPending && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Add item (managers/admins only) */}
      {canEdit && !readOnly && (
        <div>
          {showAdd ? (
            <form onSubmit={handleAddItem} className="flex gap-2">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New checklist item..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="submit" size="sm" loading={addItem.isPending}>Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)} className="text-gray-500">
              <Plus className="w-4 h-4" /> Add item
            </Button>
          )}
        </div>
      )}

      {/* Completion banner */}
      {pct === 100 && items.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="p-1 bg-green-500 rounded-full">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <span className="text-sm font-medium text-green-700">All tasks complete!</span>
        </div>
      )}
    </div>
  );
}
