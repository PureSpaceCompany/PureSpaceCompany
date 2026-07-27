"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, X } from "lucide-react";

export default function DailyRangePicker({
  activeFrom,
  activeTo,
  month,
}: {
  activeFrom: string | null;
  activeTo: string | null;
  month: string; // "YYYY-MM" — kept so the rest of the page doesn't reset
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(activeFrom ?? "");
  const [to, setTo] = useState(activeTo ?? "");

  function apply() {
    if (!from || !to) return;
    router.push(`/reports?month=${month}&from=${from}&to=${to}`);
    setOpen(false);
  }

  function reset() {
    setFrom("");
    setTo("");
    router.push(`/reports?month=${month}`);
    setOpen(false);
  }

  const hasCustom = !!activeFrom && !!activeTo;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {hasCustom && (
          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 flex items-center gap-1">
            {activeFrom} → {activeTo}
            <button onClick={reset} className="hover:text-red-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-sm ${
            hasCustom
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {hasCustom ? "Change range" : "Custom range"}
        </button>
      </div>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select date range</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {hasCustom && (
                <button
                  onClick={reset}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Reset to month
                </button>
              )}
              <button
                onClick={apply}
                disabled={!from || !to}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
