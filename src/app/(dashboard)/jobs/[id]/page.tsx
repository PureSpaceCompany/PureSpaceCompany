"use client";

/**
 * Job Detail Page – used by both Admin and Cleaner.
 *
 * - Admins/Managers: see all sections, can update status, manage checklist.
 * - Cleaners: mobile-optimised, see clock-in/out buttons, checklist, photo upload section.
 */

import { useJob, useUpdateJob } from "@/lib/hooks/use-jobs";
import { JobChecklist } from "@/components/jobs/job-checklist";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { MapPin, Clock, User, AlertCircle, Loader2 } from "lucide-react";
import { JobStatus } from "@/types";

interface JobDetailPageProps {
  params: { id: string };
}

const NEXT_STATUS: Partial<Record<JobStatus, JobStatus>> = {
  ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

const STATUS_ACTION_LABEL: Partial<Record<JobStatus, string>> = {
  ASSIGNED: "Clock In & Start Job",
  IN_PROGRESS: "Mark Job Complete",
};

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { data: job, isLoading, isError } = useJob(params.id);
  const updateJob = useUpdateJob();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isCleanerView = role === "CLEANER";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex items-center gap-2 text-red-600 p-6">
        <AlertCircle className="w-5 h-5" />
        Job not found or you don't have access.
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[job.status];

  function handleStatusAdvance() {
    if (!nextStatus) return;
    const patch: Record<string, unknown> = { id: job!.id, status: nextStatus };
    if (nextStatus === "IN_PROGRESS") patch.actualStart = new Date().toISOString();
    if (nextStatus === "COMPLETED") patch.actualEnd = new Date().toISOString();
    updateJob.mutate(patch as any);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-gray-500">
          {formatDateTime(job.scheduledStart)} – {formatDateTime(job.scheduledEnd)}
        </p>
      </div>

      {/* Primary action (cleaner clock-in / completion) */}
      {nextStatus && (
        <Button
          size="lg"
          className="w-full"
          onClick={handleStatusAdvance}
          loading={updateJob.isPending}
          variant={nextStatus === "COMPLETED" ? "secondary" : "primary"}
        >
          <Clock className="w-5 h-5" />
          {STATUS_ACTION_LABEL[job.status]}
        </Button>
      )}

      {/* Client / location card */}
      <Card>
        <CardHeader><CardTitle>Location & Client</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <span className="font-medium text-gray-800">
              {job.client.company || [job.client.firstName, job.client.lastName].filter(Boolean).join(" ") || "Unnamed Client"}
              {job.client.company && (job.client.firstName || job.client.lastName) && (
                <span className="text-gray-500"> · {[job.client.firstName, job.client.lastName].filter(Boolean).join(" ")}</span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p>{job.client.addressLine1}{job.client.addressLine2 && `, ${job.client.addressLine2}`}</p>
              <p>{job.client.city}, {job.client.state} {job.client.zip}</p>
            </div>
          </div>
          {job.client.entryInstructions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <span className="font-medium">Entry: </span>{job.client.entryInstructions}
            </div>
          )}
          {job.client.petNotes && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <span className="font-medium">Pets: </span>{job.client.petNotes}
            </div>
          )}
          {job.client.specialNotes && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              <span className="font-medium">Notes: </span>{job.client.specialNotes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned cleaners */}
      {job.assignments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Assigned Cleaners</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {job.assignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium text-xs">
                    {a.staff.firstName[0]}{a.staff.lastName[0]}
                  </div>
                  <span className="font-medium text-gray-800">
                    {a.staff.firstName} {a.staff.lastName}
                  </span>
                  {a.isLead && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Lead</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Checklist – the core engine */}
      <Card>
        <CardHeader><CardTitle>Task Checklist</CardTitle></CardHeader>
        <CardContent>
          {job.checklist.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No checklist items yet.</p>
          ) : (
            <JobChecklist
              jobId={job.id}
              items={job.checklist}
              jobStatus={job.status}
              readOnly={isCleanerView ? job.status !== "IN_PROGRESS" : false}
            />
          )}
        </CardContent>
      </Card>

      {/* Billing summary (hidden from cleaners) */}
      {!isCleanerView && job.flatRate && (
        <Card>
          <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Flat rate</dt>
                <dd className="font-medium">{formatCurrency(job.flatRate)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
