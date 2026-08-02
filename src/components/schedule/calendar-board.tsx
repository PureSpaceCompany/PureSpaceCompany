"use client";

/**
 * CalendarBoard – FullCalendar schedule view with drag-and-drop rescheduling.
 *
 * Admin/Manager: can drag events to reassign time slots.
 * Cleaner: read-only view of their own jobs.
 */

import { useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg } from "@fullcalendar/core";
import { useSession } from "next-auth/react";
import { useScheduleEvents, useRescheduleJob } from "@/lib/hooks/use-schedule";
import { useRouter } from "next/navigation";
import type { EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { useState } from "react";

export function CalendarBoard() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role ?? "CLEANER";
  const isEditable = ["ADMIN", "MANAGER"].includes(role);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date().toISOString(),
    to: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
  });

  const { data: events = [], isLoading } = useScheduleEvents(dateRange.from, dateRange.to);
  const reschedule = useRescheduleJob();

  // When the calendar view changes (prev/next/today), update the query range
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({ from: arg.startStr, to: arg.endStr });
  }, []);

  // Navigate to job detail on click
  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      router.push(`/jobs/${arg.event.id}`);
    },
    [router]
  );

  // Drag-drop: update schedule and optionally staff via PATCH
  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      if (!arg.event.start || !arg.event.end) {
        arg.revert();
        return;
      }
      reschedule.mutate(
        {
          jobId: arg.event.id,
          scheduledStart: arg.event.start.toISOString(),
          scheduledEnd: arg.event.end.toISOString(),
        },
        {
          onError: () => arg.revert(), // revert drag if API fails
        }
      );
    },
    [reschedule]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {isLoading && (
        <div className="h-1 bg-blue-100 rounded overflow-hidden mb-2">
          <div className="h-full bg-blue-500 animate-pulse w-1/2" />
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        initialDate={new Date()}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridDay,timeGridWeek,dayGridMonth",
        }}
        events={events}
        editable={isEditable}
        droppable={isEditable}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        eventContent={(arg) => (
          <div className="p-1 overflow-hidden">
            <div className="font-medium text-xs leading-tight truncate">{arg.event.title}</div>
            <div className="text-xs opacity-80 truncate">
              {arg.event.extendedProps.assignees?.[0] ?? "Unassigned"}
            </div>
          </div>
        )}
      />
    </div>
  );
}
