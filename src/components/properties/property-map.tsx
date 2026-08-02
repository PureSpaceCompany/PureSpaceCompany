"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Users, Briefcase, Phone, Info, X, Search, History, ChevronRight } from "lucide-react";
import Link from "next/link";

interface MapJob {
  id: string;
  title: string;
  status: string;
  serviceType: string;
  scheduledStart: string;
  scheduledEnd: string;
  flatRate: number | null;
  assignments: { staff: { firstName: string; lastName: string } }[];
  invoice: { total: number; status: string } | null;
}

interface MapProperty {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  gateCode?: string | null;
  petNotes?: string | null;
  entryInstructions?: string | null;
  specialNotes?: string | null;
  client: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    phone?: string | null;
  };
  totalJobs: number;
  completedJobs: number;
  jobs: MapJob[];
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:  "bg-emerald-100 text-emerald-700",
  IN_PROGRESS:"bg-amber-100 text-amber-700",
  ASSIGNED:   "bg-blue-100 text-blue-700",
  UNASSIGNED: "bg-gray-100 text-gray-600",
  CANCELLED:  "bg-red-100 text-red-600",
  NO_SHOW:    "bg-orange-100 text-orange-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function clientName(c: MapProperty["client"]) {
  return c.company || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
}

export function PropertyMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [selected, setSelected] = useState<MapProperty | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "history">("info");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Filtered list for sidebar
  const filtered = properties.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.addressLine1.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      clientName(p.client).toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    fetch("/api/properties/map")
      .then((r) => r.json())
      .then((d) => setProperties(d.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapRef.current || leafletMapRef.current) return;

    // Dynamically import leaflet (no SSR)
    import("leaflet").then((L) => {
      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const validProps = properties.filter((p) => p.lat != null && p.lng != null);
      if (!mapRef.current) return;

      // Center on Austin by default
      const map = L.map(mapRef.current, { zoomControl: true }).setView([30.267, -97.743], 11);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const markers: any[] = [];

      validProps.forEach((prop) => {
        const blueIcon = L.divIcon({
          html: `<div style="
            width:32px;height:32px;
            background:#2563eb;
            border:2px solid #fff;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          "></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([prop.lat!, prop.lng!], { icon: blueIcon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:system-ui,sans-serif">
              <div style="font-weight:700;font-size:13px;margin-bottom:2px;color:#1e293b">${prop.name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:6px">${prop.addressLine1}, ${prop.city}</div>
              <div style="font-size:11px;color:#475569">Client: <b>${clientName(prop.client)}</b></div>
              <div style="font-size:11px;color:#475569;margin-top:2px">Jobs: ${prop.totalJobs} total, ${prop.completedJobs} completed</div>
            </div>
          `);

        marker.on("click", () => setSelected(prop));
        markers.push({ marker, id: prop.id });
      });

      markersRef.current = markers;

      // Fit to bounds if we have markers
      if (validProps.length > 0) {
        const bounds = L.latLngBounds(validProps.map((p) => [p.lat!, p.lng!]));
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      }
    });

    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch { /* ignore */ }
        leafletMapRef.current = null;
      }
    };
  }, [loading, properties]);

  function flyTo(prop: MapProperty) {
    setSelected(prop);
    setDetailTab("info");
    if (leafletMapRef.current && prop.lat && prop.lng) {
      try {
        leafletMapRef.current.setView([prop.lat, prop.lng], 16, { animate: false });
        const entry = markersRef.current.find((m) => m.id === prop.id);
        if (entry) entry.marker.openPopup();
      } catch {
        // ignore stale map errors
      }
    }
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-0.5">
            {loading ? "Loading…" : `${properties.filter(p => p.lat != null).length} of ${properties.length} properties mapped`}
          </p>
        </div>

        {/* Property list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((prop) => {
            const hasCoords = prop.lat != null;
            const isSelected = selected?.id === prop.id;
            return (
              <button
                key={prop.id}
                onClick={() => hasCoords ? flyTo(prop) : setSelected(prop)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 transition-colors hover:bg-gray-50 ${
                  isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${hasCoords ? "text-blue-500" : "text-gray-300"}`} />
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{prop.name}</div>
                    <div className="text-xs text-gray-500 truncate">{prop.addressLine1}, {prop.city}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{clientName(prop.client)}</div>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No properties found</div>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        {/* Leaflet CSS */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

        <div ref={mapRef} className="w-full h-full" style={{ minHeight: 500 }} />

        {/* Detail panel */}
        {selected && (
          <div className="absolute top-3 right-3 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-[1000] flex flex-col" style={{ maxHeight: "calc(100% - 24px)" }}>
            {/* Header */}
            <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-sm text-gray-900 truncate">{selected.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{selected.addressLine1}, {selected.city}, {selected.state} {selected.zip}</div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0">
              <button
                onClick={() => setDetailTab("info")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${detailTab === "info" ? "text-[#163A70] border-b-2 border-[#163A70]" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Info className="w-3.5 h-3.5" /> Info
              </button>
              <button
                onClick={() => setDetailTab("history")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${detailTab === "history" ? "text-[#163A70] border-b-2 border-[#163A70]" : "text-gray-500 hover:text-gray-700"}`}
              >
                <History className="w-3.5 h-3.5" /> Job History
                <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{selected.totalJobs}</span>
              </button>
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto flex-1">
              {detailTab === "info" ? (
                <div className="px-4 py-3 space-y-2.5 text-sm">
                  {/* Client */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium truncate">{clientName(selected.client)}</span>
                    {selected.client.phone && (
                      <a href={`tel:${selected.client.phone}`} className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 shrink-0">
                        <Phone className="w-3 h-3" /> {selected.client.phone}
                      </a>
                    )}
                  </div>

                  {/* Jobs stat */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selected.totalJobs} total · {selected.completedJobs} completed</span>
                  </div>

                  {/* Notes / access */}
                  {(selected.gateCode || selected.entryInstructions || selected.petNotes || selected.specialNotes) && (
                    <div className="space-y-1.5 border-t border-gray-100 pt-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <Info className="w-3 h-3" /> Access & Notes
                      </div>
                      {selected.gateCode && (
                        <div className="text-xs text-gray-600"><span className="font-medium">Gate code:</span> {selected.gateCode}</div>
                      )}
                      {selected.entryInstructions && (
                        <div className="text-xs text-gray-600"><span className="font-medium">Entry:</span> {selected.entryInstructions}</div>
                      )}
                      {selected.petNotes && (
                        <div className="text-xs text-gray-600"><span className="font-medium">Pets:</span> {selected.petNotes}</div>
                      )}
                      {selected.specialNotes && (
                        <div className="text-xs text-gray-600"><span className="font-medium">Notes:</span> {selected.specialNotes}</div>
                      )}
                    </div>
                  )}

                  {selected.lat == null && (
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                      No coordinates — property not shown on map
                    </div>
                  )}
                </div>
              ) : (
                /* Job history tab */
                selected.jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Briefcase className="w-7 h-7 opacity-30 mb-2" />
                    <p className="text-xs">No jobs yet for this property</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {selected.jobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 transition-colors group gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {job.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-900 truncate">{job.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(job.scheduledStart)}</p>
                          {job.assignments.length > 0 && (
                            <p className="text-[11px] text-gray-400">
                              {job.assignments.map((a) => `${a.staff.firstName} ${a.staff.lastName}`).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {job.invoice ? (
                            <p className="text-xs font-semibold text-emerald-600">{fmtCurrency(Number(job.invoice.total))}</p>
                          ) : job.flatRate ? (
                            <p className="text-xs font-semibold text-gray-700">{fmtCurrency(Number(job.flatRate))}</p>
                          ) : null}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 mt-1 ml-auto" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[500]">
            <div className="text-sm text-gray-500">Loading properties…</div>
          </div>
        )}
      </div>
    </div>
  );
}
