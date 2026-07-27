import dynamicImport from "next/dynamic";

export const dynamic = "force-dynamic";

// Leaflet must never run on the server — dynamic import with ssr:false
const PropertyMap = dynamicImport(
  () => import("@/components/properties/property-map").then((m) => m.PropertyMap),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading map…</div> }
);

export default function PropertiesPage() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <p className="text-sm text-gray-500 mt-0.5">All service locations on an interactive map</p>
      </div>
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 160px)" }}>
        <PropertyMap />
      </div>
    </div>
  );
}
