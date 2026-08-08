"use client";

import { useState, useRef } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export interface DayData {
  date: string;       // "YYYY-MM-DD" in Central time
  label: string;      // "Jul 1"
  dayNum: number;
  completed: number;
  scheduled: number;  // non-cancelled, non-completed
  revenue: number;    // flatRate sum of completed jobs
  projected: number;  // flatRate sum of scheduled (non-completed) jobs
}

interface Props {
  days: DayData[];
  defaultRange: number;   // 7 | 14 | 30
  monthLabel: string;
  monthJobs: number;
  monthCompleted: number;
  monthRevenue: number;
  monthProjected: number;
  avgPerJob: number;
  todayDate: string;  // "YYYY-MM-DD"
}

// Range options are built dynamically from the days array length in the component

const NAVY = "#163A70";
const GOLD = "#C8A46A";
const EMERALD = "#10b981";

export default function ThisMonthChart({
  days,
  defaultRange,
  monthLabel,
  monthJobs,
  monthCompleted,
  monthRevenue,
  monthProjected,
  avgPerJob,
  todayDate,
}: Props) {
  const totalDays = days.length;
  const RANGES = [
    { label: "Week",  value: Math.min(7, totalDays) },
    { label: "2 Wks", value: Math.min(14, totalDays) },
    { label: "Month", value: totalDays },
  ];
  const [range, setRange] = useState(Math.min(defaultRange, totalDays));
  const [revealed, setRevealed] = useState(false);
  const [tooltip, setTooltip] = useState<{
    i: number;
    x: number;
    y: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const visible = days.slice(0, range);
  const maxTotal = Math.max(...visible.map((d) => d.completed + d.scheduled), 1);

  // SVG dimensions
  const W = 540; const H = 120;
  const PL = 0; const PR = 4; const PT = 16; const PB = 20;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const colW  = plotW / visible.length;
  const barW  = Math.max(colW - 3, 4);

  function bx(i: number) { return PL + i * colW + (colW - barW) / 2; }
  function totalH(d: DayData) {
    return Math.round(((d.completed + d.scheduled) / maxTotal) * plotH);
  }
  function completedH(d: DayData) {
    return Math.round((d.completed / maxTotal) * plotH);
  }

  const tooltipDay = tooltip !== null ? visible[tooltip.i] : null;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">This Month</h2>
          <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
        </div>
        <Link href="/reports" className="text-xs text-[#163A70] hover:underline flex items-center gap-1">
          Full report <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-1">Jobs</p>
          <p className="text-xl font-bold text-gray-900 leading-none">{monthJobs}</p>
          <p className="text-[10px] text-gray-400 mt-1">scheduled</p>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-1">Completed</p>
          <p className="text-xl font-bold text-emerald-600 leading-none">{monthCompleted}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {monthJobs > 0 ? `${Math.round((monthCompleted / monthJobs) * 100)}% rate` : "—"}
          </p>
        </div>

        {/* Revenue — hidden by default */}
        <div className="bg-[#FAF8F3] rounded-lg px-3 py-2.5 relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium" style={{ color: GOLD }}>Revenue</p>
            <button
              onClick={() => setRevealed((r) => !r)}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
              title={revealed ? "Hide revenue" : "Show revenue"}
            >
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
          {revealed ? (
            <p className="text-xl font-bold leading-none" style={{ color: NAVY }}>
              {formatCurrency(monthRevenue)}
            </p>
          ) : (
            <p className="text-xl font-bold leading-none tracking-widest text-gray-300 select-none">
              ••••••
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1">invoiced</p>
        </div>

        {/* Projected revenue */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-medium">Projected</p>
            <button
              onClick={() => setRevealed((r) => !r)}
              className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
              title={revealed ? "Hide revenue" : "Show revenue"}
            >
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
          {revealed ? (
            <p className="text-xl font-bold text-gray-900 leading-none">
              {formatCurrency(monthProjected)}
            </p>
          ) : (
            <p className="text-xl font-bold leading-none tracking-widest text-gray-300 select-none">
              ••••••
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1">completed + sched.</p>
        </div>
      </div>

      {/* Chart header: label + range picker */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: EMERALD }} />
              Completed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: NAVY, opacity: 0.35 }} />
              Scheduled
            </span>
          </div>
          {/* Range buttons */}
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  range === r.value
                    ? "text-white"
                    : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                }`}
                style={range === r.value ? { backgroundColor: NAVY } : {}}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG chart */}
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full cursor-crosshair"
            style={{ height: "auto" }}
            onMouseLeave={() => setTooltip(null)}
            onMouseMove={(e) => {
              const svg = svgRef.current;
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const xRatio = W / rect.width;
              const mx = (e.clientX - rect.left) * xRatio;
              const i = Math.floor((mx - PL) / colW);
              if (i >= 0 && i < visible.length) {
                setTooltip({ i, x: PL + i * colW + colW / 2, y: 0 });
              } else {
                setTooltip(null);
              }
            }}
          >
            {visible.map((d, i) => {
              const th = totalH(d);
              const ch = completedH(d);
              const ty = PT + plotH - th;
              const cy = PT + plotH - ch;
              const isToday = d.date === todayDate;
              const bxVal = bx(i);
              const showLabel = visible.length <= 14
                ? true
                : i === 0 || (i + 1) % 7 === 0 || isToday;
              const isHovered = tooltip?.i === i;

              return (
                <g key={d.date}>
                  {/* Hover highlight column */}
                  {isHovered && (
                    <rect
                      x={PL + i * colW} y={PT}
                      width={colW} height={plotH}
                      fill="#f9fafb" rx="0"
                    />
                  )}

                  {/* Scheduled (navy faint) — full bar background */}
                  {th > 0 && (
                    <rect
                      x={bxVal} y={ty} width={barW} height={th}
                      rx="2" ry="2"
                      fill={NAVY} opacity={isToday ? 0.5 : 0.25}
                    />
                  )}
                  {/* Completed (emerald) — bottom portion */}
                  {ch > 0 && (
                    <rect
                      x={bxVal} y={cy} width={barW} height={ch}
                      rx="2" ry="2"
                      fill={isToday ? GOLD : EMERALD}
                    />
                  )}
                  {/* Zero baseline tick */}
                  {th === 0 && (
                    <rect x={bxVal} y={PT + plotH - 1} width={barW} height={1} rx="0.5" fill="#e5e7eb" />
                  )}

                  {/* Today ring */}
                  {isToday && (
                    <rect
                      x={bxVal - 1} y={ty - 1}
                      width={barW + 2} height={Math.max(th, 3) + 1}
                      rx="3" ry="3"
                      fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.7"
                    />
                  )}

                  {/* X-axis label */}
                  {showLabel && (
                    <text
                      x={bxVal + barW / 2}
                      y={H - 4}
                      textAnchor="middle"
                      fontSize={visible.length <= 14 ? "9" : "8"}
                      fill={isToday ? GOLD : "#9ca3af"}
                      fontWeight={isToday ? "700" : "400"}
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Hover vertical line */}
            {tooltip !== null && (
              <line
                x1={tooltip.x} y1={PT}
                x2={tooltip.x} y2={PT + plotH}
                stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 2"
              />
            )}
          </svg>

          {/* Tooltip — rendered as HTML overlay for clean text */}
          {tooltip !== null && tooltipDay && (() => {
            const svg = svgRef.current;
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            const xFrac = (tooltip.x - PL) / W;
            const leftPx = xFrac * rect.width;
            const onRight = xFrac < 0.6;
            return (
              <div
                className="absolute top-0 pointer-events-none z-20"
                style={{ left: `${leftPx}px`, transform: onRight ? "translateX(8px)" : "translateX(calc(-100% - 8px))" }}
              >
                <div className="bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap">
                  <p className="font-semibold text-white mb-1">{tooltipDay.label}</p>
                  <p className="text-emerald-400">
                    Completed: {tooltipDay.completed}
                  </p>
                  <p style={{ color: "rgba(147,197,253,0.9)" }}>
                    Scheduled: {tooltipDay.scheduled}
                  </p>
                  <p className="text-gray-400">
                    Total: {tooltipDay.completed + tooltipDay.scheduled}
                  </p>
                  {(() => {
                    const dayTotal = tooltipDay.revenue + tooltipDay.projected;
                    if (dayTotal <= 0) return null;
                    return (
                      <div className="border-t border-gray-700 mt-1 pt-1 space-y-0.5">
                        {revealed ? (
                          <>
                            {tooltipDay.revenue > 0 && (
                              <p className="text-emerald-400">Earned: {formatCurrency(tooltipDay.revenue)}</p>
                            )}
                            {tooltipDay.projected > 0 && (
                              <p style={{ color: "rgba(147,197,253,0.9)" }}>Projected: {formatCurrency(tooltipDay.projected)}</p>
                            )}
                            <p className="text-amber-300 font-semibold">Total: {formatCurrency(dayTotal)}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Total: ••••••</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
