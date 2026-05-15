import { useCallback, useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { worldBilingualPlaces } from "../data/worldBilingualPlaces";

/** Set `VITE_MAPBOX_TOKEN` in `.env` (see `.env.example`). Never commit real tokens. */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const GLOBAL_VIEW_STATE = {
  longitude: 160,
  latitude: 10,
  zoom: 1.5,
  pitch: 25,
  bearing: 0,
};

const GLOBAL_SKY_LAYER = {
  id: "global-sky",
  type: "sky",
  paint: {
    "sky-type": "atmosphere",
    "sky-atmosphere-sun": [90, 30],
    "sky-atmosphere-sun-intensity": 10,
  },
};

/** Mapbox glyphs: DIN + Arial Unicode renders Latin + Traditional Chinese reliably on globe styles */
const LABEL_FONT_STACK = ["DIN Pro Medium", "Arial Unicode MS Regular"];

/** Two-line label: English, then Traditional Chinese */
const LABEL_TEXT_FIELD = ["concat", ["get", "name_en"], "\n", ["get", "name_zh"]];

export default function EarthGlobeMap() {
  const handleGlobalLoad = useCallback((event) => {
    const map = event.target;
    map.setFog({
      color: "rgb(186, 210, 235)",
      "high-color": "rgb(36, 92, 223)",
      "horizon-blend": 0.04,
      "space-color": "rgb(6, 9, 25)",
      "star-intensity": 0.35,
    });
  }, []);

  const labelPaint = useMemo(
    () => ({
      "text-color": "#f8fafc",
      "text-halo-color": "rgba(15, 23, 42, 0.88)",
      "text-halo-width": 2,
      "text-halo-blur": 0.5,
    }),
    [],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full min-h-[480px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-amber-800/50 bg-[#0f172a] px-6 text-center text-slate-200">
        <p className="text-sm font-medium text-amber-100/90">Mapbox token missing</p>
        <p className="max-w-md text-xs text-slate-400">
          Add <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-200">VITE_MAPBOX_TOKEN</code> to a
          local <code className="rounded bg-slate-800 px-1 py-0.5">.env</code> file (copy from{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5">.env.example</code>), then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[480px] overflow-hidden rounded-xl border border-slate-700/50 bg-[#020617]">
      <Map
        key="global-map"
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={GLOBAL_VIEW_STATE}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        projection="globe"
        terrain={{ source: "global-dem", exaggeration: 1.2 }}
        onLoad={handleGlobalLoad}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
      >
        <Layer {...GLOBAL_SKY_LAYER} />
        <Source
          id="global-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        <Layer
          id="global-hillshade"
          type="hillshade"
          source="global-dem"
          paint={{
            "hillshade-shadow-color": "rgba(15, 23, 42, 0.25)",
            "hillshade-highlight-color": "rgba(248, 250, 252, 0.12)",
            "hillshade-accent-color": "rgba(148, 163, 184, 0.1)",
            "hillshade-exaggeration": 0.25,
          }}
        />
        <Source id="bilingual-places" type="geojson" data={worldBilingualPlaces}>
          <Layer
            id="bilingual-country-labels"
            type="symbol"
            filter={["==", ["get", "kind"], "country"]}
            minzoom={1}
            maxzoom={5.5}
            layout={{
              "text-field": LABEL_TEXT_FIELD,
              "text-font": LABEL_FONT_STACK,
              "text-size": ["interpolate", ["linear"], ["zoom"], 1.2, 9, 2.5, 11, 4.5, 13],
              "text-anchor": "center",
              "text-max-width": 14,
              "text-line-height": 1.25,
              "text-allow-overlap": false,
              "text-optional": true,
            }}
            paint={labelPaint}
          />
          <Layer
            id="bilingual-region-labels"
            type="symbol"
            filter={["==", ["get", "kind"], "region"]}
            minzoom={4}
            maxzoom={8.8}
            layout={{
              "text-field": LABEL_TEXT_FIELD,
              "text-font": LABEL_FONT_STACK,
              "text-size": ["interpolate", ["linear"], ["zoom"], 4, 8.5, 6, 10, 8, 11.5],
              "text-anchor": "center",
              "text-max-width": 12,
              "text-line-height": 1.2,
              "text-allow-overlap": false,
              "text-optional": true,
            }}
            paint={{
              ...labelPaint,
              "text-color": "#e2e8f0",
              "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.88, 7.8, 0.95],
            }}
          />
          <Layer
            id="bilingual-city-labels"
            type="symbol"
            filter={["==", ["get", "kind"], "city"]}
            minzoom={3.2}
            maxzoom={16}
            layout={{
              "text-field": LABEL_TEXT_FIELD,
              "text-font": LABEL_FONT_STACK,
              "text-size": ["interpolate", ["linear"], ["zoom"], 3.2, 10, 5.5, 12, 8, 15],
              "text-anchor": "center",
              "text-max-width": 12,
              "text-line-height": 1.25,
              "text-allow-overlap": false,
              "text-optional": true,
            }}
            paint={labelPaint}
          />
          <Layer
            id="bilingual-district-labels"
            type="symbol"
            filter={["==", ["get", "kind"], "district"]}
            minzoom={6}
            maxzoom={13.6}
            layout={{
              "text-field": LABEL_TEXT_FIELD,
              "text-font": LABEL_FONT_STACK,
              "text-size": ["interpolate", ["linear"], ["zoom"], 6, 8, 8.5, 9.5, 11, 10.8],
              "text-anchor": "center",
              "text-max-width": 10,
              "text-line-height": 1.2,
              "text-allow-overlap": false,
              "text-optional": true,
            }}
            paint={{
              ...labelPaint,
              "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.82, 8, 0.92],
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
