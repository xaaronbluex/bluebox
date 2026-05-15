import { useEffect, useState } from "react";
import * as L from "leaflet";
import { MapContainer, ScaleControl, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const TOPO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '<a href="https://viewfinderpanoramas.org/">SRTM</a> | ' +
  'Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>';

/** Natural Earth 110m admin-0 (public domain) — merged country units for masking */
const NATURAL_EARTH_COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

/** PRC boundary + Taiwan + Hong Kong + Macau geometries (ADM0 codes in Natural Earth). */
const CHINA_REGION_ADM0 = new Set(["CHN", "TWN", "HKG", "MAC"]);

const CHINA_CENTER = [33.8, 105.8];
const CHINA_ZOOM = 4;
const CHINA_MAX_BOUNDS = [
  [15.5, 72],
  [54.8, 136],
];


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
          map.fitBounds(b, { padding: [28, 28], maxZoom: 6 });
          map.invalidateSize({ animate: false });
        });
      }
    } catch {
      /* ignore */
    }
  }, [data, map]);

  return null;
}

function extractChinaIncludingTaiwan(features) {
  return features.filter((f) => {
    const adm = f.properties?.ADM0_A3 ?? f.properties?.ISO_A3;
    return adm && CHINA_REGION_ADM0.has(adm);
  });
}

export default function ChinaTopographicMap() {
  const [boundary, setBoundary] = useState(null);
  const [boundaryError, setBoundaryError] = useState(null);
  const [boundaryLoading, setBoundaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setBoundaryLoading(true);
      setBoundaryError(null);
      try {
        const res = await fetch(NATURAL_EARTH_COUNTRIES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const world = await res.json();
        const picked = extractChinaIncludingTaiwan(world.features ?? []);
        if (picked.length === 0) throw new Error("No boundary features matched");
        if (!cancelled) {
          setBoundary({ type: "FeatureCollection", features: picked });
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
      className="relative z-0 min-h-[420px] w-full overflow-hidden rounded-xl border border-amber-900/45 bg-slate-900 shadow-inner"
      style={{ height: "min(72vh, 720px)" }}
    >
      {(boundaryLoading || boundaryError) && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-md bg-slate-950/90 px-3 py-1.5 text-xs text-amber-100 shadow-lg">
          {boundaryLoading ? "Loading China boundary…" : `Boundary: ${boundaryError}`}
        </div>
      )}
      <MapContainer
        center={CHINA_CENTER}
        zoom={CHINA_ZOOM}
        minZoom={3}
        maxZoom={17}
        maxBounds={CHINA_MAX_BOUNDS}
        maxBoundsViscosity={0.92}
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
