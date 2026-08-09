import { Suspense } from "react";
import { CalendarBoard } from "@/components/schedule/calendar-board";

export const metadata = { title: "Schedule – PureSpace" };

export default function SchedulePage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500 mt-0.5">Drag jobs to reschedule. Click to open details.</p>
      </div>
      <Suspense>
        <CalendarBoard />
      </Suspense>
    </div>
  );
}
