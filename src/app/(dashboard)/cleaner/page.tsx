"use client";

import { useJobs } from "@/lib/hooks/use-jobs";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { formatDateTime } from "@/lib/utils";
import { JobStatus } from "@/types";
import Link from "next/link";
import { Loader2, MapPin, Clock } from "lucide-react";

export default function CleanerHomePage() {
  const { data: jobs = [], isLoading } = useJobs();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 7);

  const upcoming = jobs.filter((j) => {
    const start = new Date(j.scheduledStart);
    return start >= today && start <= tomorrow && j.status !== "CANCELLED";
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>

      {upcoming.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No upcoming jobs this week</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((job) => (
            <Link
              key={job.id}
              href={`/cleaner/job/${job.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(job.scheduledStart)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{job.client.city}, {job.client.state}</span>
                  </div>
                </div>
                <JobStatusBadge status={job.status as JobStatus} />
              </div>
              {job.checklist.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{job.checklist.filter((i) => i.isCompleted).length}/{job.checklist.length} tasks</span>
                    <span>{Math.round((job.checklist.filter((i) => i.isCompleted).length / job.checklist.length) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.round((job.checklist.filter((i) => i.isCompleted).length / job.checklist.length) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
