"use client";

import { useEffect, useRef } from "react";

const NAVY = "#163A70";
const GOLD = "#C8A46A";

interface RouteJob {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  property: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
  } | null;
  client: { firstName?: string | null; lastName?: string | null; company?: string | null };
}

interface Props {
  jobs: RouteJob[];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function DayRouteMap({ jobs }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const mappableJobs = jobs.filter((j) => j.property?.lat != null && j.property?.lng != null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy previous map instance
    if (leafletMapRef.current) {
      try { leafletMapRef.current.remove(); } catch { /* ignore */ }
      leafletMapRef.current = null;
    }

    if (mappableJobs.length === 0) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([30.267, -97.743], 11);
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const coords: [number, number][] = [];

      mappableJobs.forEach((job, i) => {
        const lat = job.property!.lat!;
        const lng = job.property!.lng!;
        coords.push([lat, lng]);

        const stopNum = i + 1;
        const isLast = i === mappableJobs.length - 1;

        const icon = L.divIcon({
          html: `<div style="
            width:32px;height:32px;
            background:${isLast ? GOLD : NAVY};
            border:2px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            font-family:system-ui,sans-serif;
            font-size:13px;font-weight:700;
            color:#fff;
            cursor:pointer;
          ">${stopNum}</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const addr = job.property
          ? `${job.property.addressLine1}, ${job.property.city}`
          : "";

        L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px;font-family:system-ui,sans-serif">
              <div style="
                display:flex;align-items:center;gap:6px;margin-bottom:4px;
              ">
                <span style="
                  width:20px;height:20px;border-radius:50%;
                  background:${isLast ? GOLD : NAVY};
                  color:#fff;font-size:11px;font-weight:700;
                  display:flex;align-items:center;justify-content:center;
                  flex-shrink:0;
                ">${stopNum}</span>
                <div style="font-weight:700;font-size:13px;color:#1e293b">${job.title}</div>
              </div>
              <div style="font-size:11px;color:#64748b;margin-bottom:3px">${addr}</div>
              <div style="font-size:11px;color:#475569">
                ${fmtTime(job.scheduledStart)} – ${fmtTime(job.scheduledEnd)}
              </div>
            </div>
          `);
      });

      // Draw route polyline
      if (coords.length > 1) {
        L.polyline(coords, {
          color: NAVY,
          weight: 3,
          opacity: 0.75,
          dashArray: "6 6",
        }).addTo(map);
      }

      // Fit to all stops
      if (coords.length === 1) {
        map.setView(coords[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(coords), { padding: [48, 48], animate: false });
      }
    });

    return () => {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch { /* ignore */ }
        leafletMapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  if (mappableJobs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Route Map</p>
          <p className="text-xs text-gray-400 mt-0.5">{mappableJobs.length} stop{mappableJobs.length !== 1 ? "s" : ""} · in scheduled order</p>
        </div>
        {/* Stop legend */}
        <div className="flex items-center gap-3">
          {mappableJobs.map((job, i) => (
            <div key={job.id} className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: i === mappableJobs.length - 1 ? GOLD : NAVY }}
              >
                {i + 1}
              </span>
              <span className="text-[11px] text-gray-500 hidden sm:block truncate max-w-[100px]">
                {job.property?.name ?? job.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 360 }} />
    </div>
  );
}
