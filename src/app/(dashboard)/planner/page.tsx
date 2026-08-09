import { Metadata } from "next";
import DayPlanner from "@/components/planner/day-planner";

export const metadata: Metadata = { title: "Day Planner – PureSpace" };

export default function PlannerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Day Planner</h1>
        <p className="text-sm text-gray-500 mt-1">Staffing recommendations based on the day's jobs and pay rates.</p>
      </div>
      <DayPlanner />
    </div>
  );
}
