"use client";

/**
 * Cleaner Mobile View – optimised for phone screens.
 * Shows the job details, clock-in/out, and checklist in a simple card layout.
 */

import { useJob, useUpdateJob } from "@/lib/hooks/use-jobs";
import { JobChecklist } from "@/components/jobs/job-checklist";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { JobStatus } from "@/types";

const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

export default function CleanerJobPage({ params }: { params: { id: string } }) {
  const { data: job, isLoading, isError } = useJob(params.id);
  const updateJob = useUpdateJob();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600">This job isn't available. Check with your manager.</p>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[job.status];
  const isInProgress = job.status === "IN_PROGRESS";
  const isCompleted = job.status === "COMPLETED";

  function handleAction() {
    if (!nextStatus) return;
    updateJob.mutate({
      id: job!.id,
      status: nextStatus,
      ...(nextStatus === "IN_PROGRESS" && { actualStart: new Date().toISOString() }),
      ...(nextStatus === "COMPLETED" && { actualEnd: new Date().toISOString() }),
    } as any);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
        <JobStatusBadge status={job.status} />
        <p className="text-sm text-gray-500">{formatDateTime(job.scheduledStart)}</p>
      </div>

      {/* Location card */}
      {(() => {
        // Use property address if available, otherwise fall back to client address
        const loc = (job as any).property ?? null;
        const addr1   = loc ? loc.addressLine1  : job.client.addressLine1;
        const addr2   = loc ? loc.addressLine2  : job.client.addressLine2;
        const city    = loc ? loc.city          : job.client.city;
        const state   = loc ? loc.state         : job.client.state;
        const zip     = loc ? loc.zip           : job.client.zip;
        const label   = loc ? loc.name          : [job.client.firstName, job.client.lastName].filter(Boolean).join(" ");
        const entry   = loc ? loc.entryInstructions : job.client.entryInstructions;
        const gate    = loc ? loc.gateCode      : null;
        const pets    = loc ? loc.petNotes      : job.client.petNotes;
        const notes   = loc ? loc.specialNotes  : job.client.specialNotes;

        const fullAddress = [addr1, addr2, city, state, zip].filter(Boolean).join(", ");
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                {label && <p className="font-semibold text-gray-900">{label}</p>}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-block"
                >
                  <p className="text-blue-600 group-hover:underline">{addr1}{addr2 ? `, ${addr2}` : ""}</p>
                  <p className="text-blue-600 group-hover:underline">{city}, {state} {zip}</p>
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" /> Open in Maps / GPS
                  </span>
                </a>
              </div>
            </div>
            {gate && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                <span className="font-semibold">Gate code: </span>{gate}
              </div>
            )}
            {entry && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <span className="font-semibold">Entry: </span>{entry}
              </div>
            )}
            {pets && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <span className="font-semibold">Pets: </span>{pets}
              </div>
            )}
            {notes && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-semibold">Notes: </span>{notes}
              </div>
            )}
          </div>
        );
      })()}

      {/* Clock in/out or completion CTA */}
      {nextStatus && (
        <Button
          size="lg"
          className="w-full text-base py-4"
          variant={nextStatus === "COMPLETED" ? "secondary" : "primary"}
          onClick={handleAction}
          loading={updateJob.isPending}
        >
          <Clock className="w-5 h-5" />
          {job.status === "ASSIGNED" ? "Clock In & Start" : "Finish & Complete"}
        </Button>
      )}

      {isCompleted && (
        <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="font-semibold text-green-700">Job Completed!</span>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Checklist</h2>
        {job.checklist.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No tasks assigned.</p>
        ) : (
          <JobChecklist
            jobId={job.id}
            items={job.checklist}
            jobStatus={job.status}
            readOnly={!isInProgress}
          />
        )}
      </div>
    </div>
  );
}
