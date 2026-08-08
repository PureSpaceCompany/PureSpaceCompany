"use client";

import { useState, useRef } from "react";
import { Eye, EyeOff, CheckCircle2, DollarSign, TrendingUp, BarChart2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface MonthBar {
  label: string;
  year: number;
  month: number;
  completed: number;
  completedRevenue: number;
  currentYear: number;
  currentMonth: number;
}

export interface PropRow {
  name: string;
  address: string;
  total: number;
  completed: number;
  revenue: number;
}

export interface CleanerRow {
  name: string;
  count: number;
  revenue: number;
}

interface Props {
  completedJobsCount: number;
  completedRevenue: number;
  paidInvoiceTotal: number;
  projectedRevenue: number;
  avgBilledJob: number;
  billedJobsCount: number;
  scheduledJobsCount: number;
  reportYear: number;
  propRows: PropRow[];
  cleanerRows: CleanerRow[];
  monthBars: MonthBar[];
  trendPoints: string;
  chartW: number;
  chartH: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  n: number;
  yTicks: number[];
  maxCompleted: number;
}

const NAVY = "#163A70";

function Masked() {
  return <span className="tracking-widest text-gray-300 select-none">••••••</span>;
}

export default function ReportsRevenue({
  completedJobsCount,
  completedRevenue,
  paidInvoiceTotal,
  projectedRevenue,
  avgBilledJob,
  billedJobsCount,
  scheduledJobsCount,
  reportYear,
  propRows,
  cleanerRows,
  monthBars,
  trendPoints,
  chartW,
  chartH,
  padLeft,
  padRight,
  padTop,
  padBottom,
  n,
  yTicks,
  maxCompleted,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toggle = (
    <button
      onClick={() => setRevealed((r) => !r)}
      className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      title={revealed ? "Hide amount" : "Show amount"}
    >
      {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
    </button>
  );

  const kpis = [
    {
      label: "Jobs Completed",
      sensitive: false,
      value: <span>{completedJobsCount}</span>,
      sub: `${reportYear} year-to-date`,
      icon: CheckCircle2,
      color: "border-t-emerald-500",
      iconBg: "bg-emerald-500",
    },
    {
      label: "Completed Revenue",
      sensitive: true,
      value: revealed ? <span>{formatCurrency(completedRevenue)}</span> : <Masked />,
      sub: "From completed jobs",
      icon: DollarSign,
      color: "border-t-blue-500",
      iconBg: "bg-blue-500",
    },
    {
      label: "Invoices Paid",
      sensitive: true,
      value: revealed ? <span>{formatCurrency(paidInvoiceTotal)}</span> : <Masked />,
      sub: "Cash collected this year",
      icon: Receipt,
      color: "border-t-violet-500",
      iconBg: "bg-violet-500",
    },
    {
      label: "Projected Total",
      sensitive: true,
      value: revealed ? <span>{formatCurrency(projectedRevenue)}</span> : <Masked />,
      sub: `Completed + ${scheduledJobsCount} scheduled`,
      icon: TrendingUp,
      color: "border-t-amber-400",
      iconBg: "bg-amber-400",
    },
    {
      label: "Avg Billed Job",
      sensitive: true,
      value: revealed ? <span>{formatCurrency(avgBilledJob)}</span> : <Masked />,
      sub: `Over ${billedJobsCount} billed job${billedJobsCount !== 1 ? "s" : ""}`,
      icon: BarChart2,
      color: "border-t-rose-500",
      iconBg: "bg-rose-500",
    },
  ];

  const medalColors = ["bg-amber-400", "bg-gray-300", "bg-orange-300"];

  const NAVY = "#163A70";
  const GOLD = "#C8A46A";

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;
  const barW  = n > 0 ? Math.max(plotW / n - 4, 6) : 20;
  const colW  = n > 0 ? plotW / n : plotW;
  function barX(i: number) { return padLeft + i * colW + (colW - barW) / 2; }
  function barY(val: number) { return padTop + plotH - Math.round((val / maxCompleted) * plotH); }
  function barH(val: number) { return Math.round((val / maxCompleted) * plotH); }

  return (
    <>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(({ label, sensitive, value, sub, icon: Icon, color, iconBg }) => (
          <div key={label} className={`bg-white rounded-xl shadow-sm p-5 border-t-4 ${color}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
                  {sensitive && toggle}
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-snug">{sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${iconBg} shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">Jobs Completed by Month</h2>
            <p className="text-xs text-gray-400 mt-0.5">July 2025 → present · trend line overlay</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: NAVY }} />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 inline-block" style={{ backgroundColor: GOLD }} />
              Trend
            </span>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full cursor-crosshair"
              style={{ minWidth: `${Math.max(300, n * 40)}px`, height: "auto" }}
              aria-label="Jobs completed by month"
              onMouseLeave={() => setHoveredBar(null)}
              onMouseMove={(e) => {
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const xRatio = chartW / rect.width;
                const mx = (e.clientX - rect.left) * xRatio;
                const i = Math.floor((mx - padLeft) / colW);
                if (i >= 0 && i < n) setHoveredBar(i);
                else setHoveredBar(null);
              }}
            >
              {yTicks.map((tick) => {
                const y = padTop + plotH - Math.round((tick / maxCompleted) * plotH);
                return (
                  <g key={tick}>
                    <line x1={padLeft - 4} y1={y} x2={padLeft + plotW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{tick}</text>
                  </g>
                );
              })}
              {monthBars.map((m, i) => {
                const x = barX(i);
                const bh = barH(m.completed);
                const by = barY(m.completed);
                const isCurrentMonth = m.year === m.currentYear && m.month === m.currentMonth;
                const isHovered = hoveredBar === i;
                const colCenterX = padLeft + i * colW + colW / 2;

                return (
                  <g key={i}>
                    {/* Hover highlight column */}
                    {isHovered && (
                      <rect x={padLeft + i * colW} y={padTop} width={colW} height={plotH}
                        fill="#f9fafb" />
                    )}

                    {m.completed > 0 && (
                      <rect x={x} y={by} width={barW} height={bh} rx="3" ry="3"
                        fill={isCurrentMonth ? GOLD : NAVY}
                        opacity={isHovered ? 1 : isCurrentMonth ? 1 : 0.85} />
                    )}
                    {m.completed === 0 && (
                      <rect x={x} y={padTop + plotH - 2} width={barW} height={2} rx="1" fill="#e5e7eb" />
                    )}
                    {m.completed > 0 && (
                      <text x={x + barW / 2} y={by - 3} textAnchor="middle" fontSize="9"
                        fill={isCurrentMonth ? GOLD : NAVY} fontWeight="600">
                        {m.completed}
                      </text>
                    )}
                    <text x={colCenterX} y={chartH - 4} textAnchor="middle" fontSize="9"
                      fill={isCurrentMonth ? GOLD : "#6b7280"} fontWeight={isCurrentMonth ? "700" : "400"}>
                      {m.label}
                    </text>

                    {/* Hover vertical line */}
                    {isHovered && (
                      <line x1={colCenterX} y1={padTop} x2={colCenterX} y2={padTop + plotH}
                        stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 2" />
                    )}
                  </g>
                );
              })}
              {n > 1 && (
                <polyline points={trendPoints} fill="none" stroke={GOLD}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3" />
              )}
            </svg>

            {/* HTML tooltip overlay — matches dashboard style */}
            {hoveredBar !== null && (() => {
              const m = monthBars[hoveredBar];
              if (!m || m.completed === 0) return null;
              const svg = svgRef.current;
              if (!svg) return null;
              const rect = svg.getBoundingClientRect();
              const colCenterX = padLeft + hoveredBar * colW + colW / 2;
              const xFrac = (colCenterX - padLeft) / (chartW - padLeft - padRight);
              const leftPx = xFrac * rect.width;
              const onRight = xFrac < 0.6;
              return (
                <div
                  className="absolute top-0 pointer-events-none z-20"
                  style={{ left: `${leftPx}px`, transform: onRight ? "translateX(8px)" : "translateX(calc(-100% - 8px))" }}
                >
                  <div className="bg-gray-900 text-white text-[11px] rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap">
                    <p className="font-semibold text-white mb-1">{m.label}</p>
                    <p className="text-emerald-400">
                      Completed: {m.completed} job{m.completed !== 1 ? "s" : ""}
                    </p>
                    <div className="border-t border-gray-700 mt-1 pt-1">
                      {revealed ? (
                        <p style={{ color: "#C8A46A" }} className="font-semibold">
                          {m.completedRevenue > 0 ? formatCurrency(m.completedRevenue) : "No rate set"}
                        </p>
                      ) : (
                        <p className="text-gray-500">Revenue: ••••••</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Two tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Jobs by property */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Jobs by Property</h2>
            <p className="text-xs text-gray-400 mt-0.5">All non-cancelled jobs · descending</p>
          </div>
          {propRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No property data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Done</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <span className="flex items-center justify-end gap-1.5">Revenue {toggle}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {propRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">{row.name}</p>
                        {row.address && (
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{row.address}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: NAVY }}>
                          {row.total}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-emerald-600 font-semibold">{row.completed}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        {row.revenue > 0
                          ? revealed ? formatCurrency(row.revenue) : <Masked />
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Jobs by cleaner */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Jobs by Cleaner</h2>
            <p className="text-xs text-gray-400 mt-0.5">Completed jobs assigned · year-to-date</p>
          </div>
          {cleanerRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No completed assignments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cleaner</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jobs</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <span className="flex items-center justify-end gap-1.5">Job Value {toggle}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cleanerRows.map((row, i) => {
                    const initials = row.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i < 3 ? medalColors[i] : "bg-blue-100"}`}
                              style={i >= 3 ? { color: NAVY } : {}}
                            >
                              {i < 3 ? (i + 1) : initials}
                            </div>
                            <span className="font-medium text-gray-900">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: "#7c3aed" }}>
                            {row.count}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">
                          {row.revenue > 0
                            ? revealed ? formatCurrency(row.revenue) : <Masked />
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
