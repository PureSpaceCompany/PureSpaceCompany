"use client";

import { useRouter } from "next/navigation";

export type RangePreset = "7d" | "week" | "biweekly" | "month";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "7d",       label: "7 days" },
  { key: "week",     label: "Week" },
  { key: "biweekly", label: "2 Weeks" },
  { key: "month",    label: "Month" },
];

export default function DailyRangePicker({
  activePreset,
  month,
}: {
  activePreset: RangePreset;
  month: string;
}) {
  const router = useRouter();

  function select(preset: RangePreset) {
    router.push(`/reports?month=${month}&range=${preset}`);
  }

  return (
    <div className="flex items-center gap-1">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => select(key)}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
            activePreset === key
              ? "bg-[#163A70] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
