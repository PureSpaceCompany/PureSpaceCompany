import { JobStatus } from "@/types";
import { JOB_STATUS_COLOR } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<JobStatus, string> = {
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", JOB_STATUS_COLOR[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
