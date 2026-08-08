"use client";

import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, Users, RotateCcw, Clock, AlertTriangle, Minus, Plus } from "lucide-react";
import { formatCurrency, clientDisplayName } from "@/lib/utils";
import { DayRouteMap } from "@/components/planner/day-route-map";

const NAVY = "#163A70";
const GOLD = "#C8A46A";

// Fallback durations when property has no soloCleanMins set
const FALLBACK_SOLO_HRS = 4;
const HELPER_THRESHOLD = 200; // job value >= this → recommend 1 helper
const BUSY_DAY_HRS = 8;       // total solo-equivalent hours above this → warn

interface PlanJob {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  flatRate: number | null;
  extraItems: { description: string; unitPrice: number }[];
  client: { firstName?: string | null; lastName?: string | null; company?: string | null };
  property: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
    soloCleanMins: number | null;
  } | null;
  status: string;
}

function jobValue(job: PlanJob): number {
  const base = Number(job.flatRate ?? 0);
  const extras = job.extraItems?.reduce((s, i) => s + i.unitPrice, 0) ?? 0;
  return base + extras;
}

// Solo hours for this job: use property's soloCleanMins when set, else fallback
function soloHours(job: PlanJob): number {
  const mins = job.property?.soloCleanMins;
  return mins ? mins / 60 : FALLBACK_SOLO_HRS;
}

// Effective hours with N helpers: time is split across (1 + helpers) people
function effectiveHours(job: PlanJob, helpers: number): number {
  return soloHours(job) / (1 + helpers);
}

function autoHelpers(job: PlanJob, soloHrsBeforeThisJob: number): number {
  const val = jobValue(job);
  if (val >= HELPER_THRESHOLD) return 1;
  if (soloHrsBeforeThisJob + soloHours(job) > BUSY_DAY_HRS) return 1;
  return 0;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtHrs(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
}

function todayLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DayPlanner() {
  const [date, setDate] = useState(todayLocal());
  const [helperPay, setHelperPay] = useState(35);
  const [jobs, setJobs] = useState<PlanJob[]>([]);
  const [loading, setLoading] = useState(false);
  // overrides: jobId → number of helpers (0 = solo)
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setOverrides({});
    setLoading(true);
    const from = encodeURIComponent(`${date}T00:00:00`);
    const to = encodeURIComponent(`${date}T23:59:59`);
    fetch(`/api/jobs?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((res) => {
        const all: PlanJob[] = (res.data ?? []).filter((j: PlanJob) => j.status !== "CANCELLED");
        all.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        setJobs(all);
      })
      .finally(() => setLoading(false));
  }, [date]);

  // Auto-recommendations (sequential: cumulative solo hours influence later jobs)
  const autoRec = useMemo(() => {
    const rec: Record<string, number> = {};
    let soloHrsAcc = 0;
    for (const job of jobs) {
      const h = autoHelpers(job, soloHrsAcc);
      rec[job.id] = h;
      soloHrsAcc += effectiveHours(job, h);
    }
    return rec;
  }, [jobs]);

  function effectiveHelpers(jobId: string): number {
    return overrides[jobId] ?? autoRec[jobId] ?? 0;
  }

  function setHelpers(jobId: string, value: number) {
    const clamped = Math.max(0, Math.min(value, 5));
    const auto = autoRec[jobId] ?? 0;
    if (clamped === auto) {
      setOverrides((o) => { const n = { ...o }; delete n[jobId]; return n; });
    } else {
      setOverrides((o) => ({ ...o, [jobId]: clamped }));
    }
  }

  // Day summary
  const summary = useMemo(() => {
    let totalHrs = 0;
    let totalRevenue = 0;
    let totalHelperCost = 0;
    for (const job of jobs) {
      const h = effectiveHelpers(job.id);
      const val = jobValue(job);
      totalRevenue += val;
      totalHrs += effectiveHours(job, h);
      totalHelperCost += h * helperPay;
    }
    return { totalHrs, totalRevenue, totalHelperCost, netProfit: totalRevenue - totalHelperCost };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, overrides, helperPay, autoRec]);

  const isBusy = summary.totalHrs > BUSY_DAY_HRS;
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#163A70]/30 focus:border-[#163A70]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Helper Pay (per job)</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              min={20}
              max={100}
              step={5}
              value={helperPay}
              onChange={(e) => setHelperPay(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#163A70]/30 focus:border-[#163A70]"
            />
          </div>
        </div>
        {hasOverrides && (
          <button
            onClick={() => setOverrides({})}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset overrides
          </button>
        )}
      </div>

      {/* Summary bar */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-sm px-4 py-3">
            <p className="text-xs text-gray-400 font-medium mb-1">Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
          </div>
          <div className={`rounded-xl shadow-sm px-4 py-3 ${isBusy ? "bg-amber-50" : "bg-white"}`}>
            <p className="text-xs font-medium mb-1" style={{ color: isBusy ? "#b45309" : "#9ca3af" }}>Est. Hours</p>
            <p className={`text-2xl font-bold ${isBusy ? "text-amber-700" : "text-gray-900"}`}>
              {fmtHrs(summary.totalHrs)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 font-medium">Helper Cost</p>
              <button onClick={() => setRevealed((r) => !r)} className="text-gray-400 hover:text-gray-600">
                {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            {revealed
              ? <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalHelperCost)}</p>
              : <p className="text-2xl font-bold tracking-widest text-gray-300 select-none">••••</p>}
          </div>
          <div className="bg-[#FAF8F3] rounded-xl shadow-sm px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium" style={{ color: GOLD }}>Net Profit</p>
              <button onClick={() => setRevealed((r) => !r)} className="text-gray-400 hover:text-gray-600">
                {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            {revealed
              ? <p className="text-2xl font-bold" style={{ color: NAVY }}>{formatCurrency(summary.netProfit)}</p>
              : <p className="text-2xl font-bold tracking-widest text-gray-300 select-none">••••</p>}
          </div>
        </div>
      )}

      {/* Busy day warning */}
      {isBusy && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            <strong>Tight day</strong> — {fmtHrs(summary.totalHrs)} estimated. Consider adding helpers to reduce your time on site.
          </span>
        </div>
      )}

      {/* Job cards */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-16 text-center">
          <p className="text-gray-400 text-sm">No jobs scheduled for this day.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const helpers = effectiveHelpers(job.id);
            const autoH = autoRec[job.id] ?? 0;
            const isOverridden = overrides[job.id] !== undefined;
            const val = jobValue(job);
            const hrs = effectiveHours(job, helpers);
            const helperCostForJob = helpers * helperPay;
            const net = val - helperCostForJob;
            const clientName = clientDisplayName(job.client as any);
            const locationName = job.property?.name ?? clientName;
            const hasSoloTime = job.property?.soloCleanMins != null;

            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Time */}
                <div className="shrink-0 w-28 text-xs text-gray-500">
                  <div className="flex items-center gap-1 font-medium text-gray-700">
                    <Clock className="w-3.5 h-3.5" />
                    {fmtTime(job.scheduledStart)}
                  </div>
                  <div className="mt-0.5 text-gray-400">→ {fmtTime(job.scheduledEnd)}</div>
                </div>

                {/* Job info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{locationName}</p>
                  {hasSoloTime && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {job.property!.soloCleanMins} min solo · {fmtHrs(soloHours(job) / (1 + helpers))} w/ {helpers} helper{helpers !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Job value */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{val > 0 ? formatCurrency(val) : "—"}</p>
                  <p className="text-[10px] text-gray-400">job value</p>
                </div>

                {/* Helpers stepper */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-0 rounded-full border-2 overflow-hidden text-xs font-semibold transition-all ${
                    isOverridden ? "border-dashed" : ""
                  } ${
                    helpers > 0
                      ? "border-[#C8A46A] text-[#a07838] bg-amber-50"
                      : "border-[#163A70] text-[#163A70] bg-blue-50"
                  }`}>
                    <button
                      onClick={() => setHelpers(job.id, helpers - 1)}
                      disabled={helpers === 0}
                      className="px-2 py-1.5 hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Remove helper"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-1 select-none flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {helpers === 0 ? "Solo" : `+${helpers} helper${helpers !== 1 ? "s" : ""}`}
                    </span>
                    <button
                      onClick={() => setHelpers(job.id, helpers + 1)}
                      disabled={helpers >= 5}
                      className="px-2 py-1.5 hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Add helper"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">{fmtHrs(hrs)} est.</p>
                    {revealed
                      ? <p className="text-xs font-medium text-gray-700">Net: {formatCurrency(net)}</p>
                      : <p className="text-xs font-medium text-gray-300 tracking-widest select-none">Net: ••••</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Route map */}
      {!loading && <DayRouteMap jobs={jobs} />}
    </div>
  );
}
