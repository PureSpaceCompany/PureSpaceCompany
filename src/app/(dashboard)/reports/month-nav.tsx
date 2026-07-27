"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthNav({ year, month }: { year: number; month: number }) {
  const router = useRouter();

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    router.push(`/reports?month=${y}-${m}`);
  }

  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
        title="Previous month"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrent}
        className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        title="Next month"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>
      {!isCurrent && (
        <button
          onClick={() => router.push("/reports")}
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Current Month
        </button>
      )}
    </div>
  );
}
