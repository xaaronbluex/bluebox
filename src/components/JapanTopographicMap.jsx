import { useEffect, useState } from "react";
import * as L from "leaflet";
import { MapContainer, ScaleControl, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/** OpenTopoMap — free OSM-based topography (no API token). */
const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '<a href="https://viewfinderpanoramas.org/">SRTM</a> | ' +
  'Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>';

const JAPAN_CENTER = [36.2, 138.25];
const JAPAN_ZOOM = 5;
const JAPAN_MAX_BOUNDS = [
  [23.5, 122.5],
  [46.5, 146.5],
];

const JAPAN_GEOJSON_URL = "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson";


/** After mount / tab switch, Leaflet often needs a size refresh (Tailwind flex parents). */
function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const run = () => {
      map.invalidateSize({ animate: false });
    };
    run();
    const t0 = window.setTimeout(run, 50);
    const t1 = window.setTimeout(run, 300);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.removeEventListener("resize", run);
    };
  }, [map]);

  return null;
}

function FitBoundsToGeoJson({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;
    try {
      const layer = L.geoJSON(data);
      const b = layer.getBounds();
      if (b.isValid()) {
        map.whenReady(() => {
          map.fitBounds(b, { padding: [32, 32], maxZoom: 6.5 });
          map.invalidateSize({ animate: false });
        });
      }
    } catch {
      /* ignore malformed geojson for bounds */
    }
  }, [data, map]);

  return null;
}

export default function JapanTopographicMap() {
  const [boundary, setBoundary] = useState(null);
  const [boundaryError, setBoundaryError] = useState(null);
  const [boundaryLoading, setBoundaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setBoundaryLoading(true);
      setBoundaryError(null);
      try {
        const res = await fetch(JAPAN_GEOJSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setBoundary(json);
        }
      } catch (e) {
        if (!cancelled) {
          setBoundary(null);
          setBoundaryError(e instanceof Error ? e.message : "Failed to load boundary");
        }
      } finally {
        if (!cancelled) setBoundaryLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);


  
  return (
    <div
      className="relative z-0 min-h-[420px] w-full overflow-hidden rounded-xl border border-emerald-800/50 bg-slate-900 shadow-inner"
      style={{ height: "min(72vh, 720px)" }}
    >
      {(boundaryLoading || boundaryError) && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-md bg-slate-950/90 px-3 py-1.5 text-xs text-emerald-100 shadow-lg">
          {boundaryLoading ? "Loading Japan boundary…" : `Boundary: ${boundaryError}`}
        </div>
      )}
      <MapContainer
        center={JAPAN_CENTER}
        zoom={JAPAN_ZOOM}
        minZoom={4}
        maxZoom={17}
        maxBounds={JAPAN_MAX_BOUNDS}
        maxBoundsViscosity={0.9}
        scrollWheelZoom
        className="leaflet-map-root z-0 h-full min-h-[420px] w-full [&_.leaflet-control-attribution]:max-w-[calc(100%-48px)] [&_.leaflet-control-attribution]:whitespace-normal [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:leading-snug"
        style={{ height: "100%", minHeight: "420px" }}
      >
        <MapInvalidateSize />
        <TileLayer
          attribution={TOPO_ATTRIBUTION}
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          subdomains={["a", "b", "c"]}
          maxNativeZoom={17}
        />
        {boundary ? (
          <>
            <FitBoundsToGeoJson data={boundary} />
          </>
        ) : null}
        <ScaleControl position="bottomleft" imperial={false} />
      </MapContainer>
    </div>
  );
}
