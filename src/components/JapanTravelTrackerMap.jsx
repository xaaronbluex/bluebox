import { useCallback, useEffect, useMemo, useState } from "react";
import { geoBounds, geoCentroid } from "d3-geo";
import {
  Annotation,
  ComposableMap,
  Geographies,
  Geography,
  useMapContext,
  ZoomableGroup,
} from "react-simple-maps";
import {
  getPrefectureAccent,
  JAPAN_PREFECTURES_TOPOJSON_URL,
} from "../data/japanPrefectureMeta";

const UNVISITED_FILL = "#3f3f46";
const UNVISITED_STROKE = "#52525b";

function prefectureId(geo) {
  return Number(geo?.properties?.id) || 0;
}

/** Short label for inside the polygon (Japanese name). */
function prefectureShortLabel(geo) {
  const p = geo?.properties;
  return p?.nam_ja || p?.nam || "";
}

/** Full label when using connector fallback. */
function prefectureFullLabel(geo) {
  const p = geo?.properties;
  if (!p) return "Unknown";
  const ja = p.nam_ja || p.nam;
  const en = p.nam;
  return ja && en && ja !== en ? `${ja} · ${en}` : ja || en || "Unknown";
}

function dropShadowFilter(color) {
  return `drop-shadow(0 2px 4px ${color}99) drop-shadow(0 0 12px ${color}cc)`;
}

function labelOffset(id) {
  const angle = ((id * 37) % 360) * (Math.PI / 180);
  const radius = 36;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
  };
}

function projectedBounds(geo, projection) {
  const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(geo);
  const corners = [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
  ];
  const points = corners.map((c) => projection(c)).filter(Boolean);
  if (points.length === 0) {
    return { width: 0, height: 0, minDim: 0, centroid: null };
  }
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return {
    width,
    height,
    minDim: Math.min(width, height),
    centroid: projection(geoCentroid(geo)),
  };
}

function labelFitsPolygon(geo, projection, label) {
  const { width, height, minDim } = projectedBounds(geo, projection);
  const fontSize = minDim < 22 ? 7 : minDim < 36 ? 8 : minDim < 52 ? 9 : 10;
  const estWidth = label.length * fontSize * 0.62;
  const estHeight = fontSize * 1.35;
  return width >= estWidth * 1.15 && height >= estHeight * 1.4;
}

function labelFontSize(minDim) {
  if (minDim < 22) return 7;
  if (minDim < 36) return 8;
  if (minDim < 52) return 9;
  return 10;
}

function geographyStyle(visited, accent) {
  const base = visited
    ? {
        fill: accent,
        stroke: "#e4e4e7",
        strokeWidth: 0.75,
        outline: "none",
        filter: dropShadowFilter(accent),
      }
    : {
        fill: UNVISITED_FILL,
        stroke: UNVISITED_STROKE,
        strokeWidth: 0.5,
        outline: "none",
      };

  return {
    default: base,
    hover: { ...base, cursor: "pointer" },
    pressed: { ...base, cursor: "pointer" },
  };
}

function InlinePrefectureLabel({ geo, label, fontSize }) {
  const { projection } = useMapContext();
  const { centroid } = projectedBounds(geo, projection);
  if (!centroid) return null;
  const [x, y] = centroid;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#f8fafc"
      fontSize={fontSize}
      fontWeight={700}
      stroke="#0f172a"
      strokeWidth={2.5}
      paintOrder="stroke"
      pointerEvents="none"
      style={{ userSelect: "none" }}
    >
      {label}
    </text>
  );
}

function ConnectorPrefectureLabel({ geo, label }) {
  const id = prefectureId(geo);
  const { dx, dy } = labelOffset(id);
  const subject = geoCentroid(geo);

  return (
    <Annotation
      subject={subject}
      dx={dx}
      dy={dy}
      curve={0}
      connectorProps={{
        stroke: "#94a3b8",
        strokeWidth: 1,
        strokeLinecap: "round",
      }}
    >
      <text
        x={4}
        y={0}
        textAnchor="start"
        dominantBaseline="central"
        fill="#e2e8f0"
        fontSize={10}
        fontWeight={600}
        stroke="#0f172a"
        strokeWidth={2}
        paintOrder="stroke"
        pointerEvents="none"
        style={{ userSelect: "none" }}
      >
        {label}
      </text>
    </Annotation>
  );
}

function VisitedPrefectureLabel({ geo }) {
  const { projection } = useMapContext();
  const shortLabel = prefectureShortLabel(geo);
  const fullLabel = prefectureFullLabel(geo);
  const { minDim } = projectedBounds(geo, projection);

  if (!shortLabel && !fullLabel) return null;

  if (labelFitsPolygon(geo, projection, shortLabel)) {
    return (
      <InlinePrefectureLabel
        geo={geo}
        label={shortLabel}
        fontSize={labelFontSize(minDim)}
      />
    );
  }

  return <ConnectorPrefectureLabel geo={geo} label={fullLabel} />;
}

function VisitedPrefectureLabels({ geographies, visitedPrefectures }) {
  return geographies
    .filter((geo) => visitedPrefectures.has(prefectureId(geo)))
    .map((geo) => (
      <VisitedPrefectureLabel key={`label-${geo.rsmKey}`} geo={geo} />
    ));
}

function PrefectureLayer({ visitedPrefectures, onMarkVisited, onTotalCount }) {
  return (
    <Geographies geography={JAPAN_PREFECTURES_TOPOJSON_URL}>
      {({ geographies }) => (
        <>
          <PrefecturePaths
            geographies={geographies}
            visitedPrefectures={visitedPrefectures}
            onMarkVisited={onMarkVisited}
            onTotalCount={onTotalCount}
          />
          <VisitedPrefectureLabels
            geographies={geographies}
            visitedPrefectures={visitedPrefectures}
          />
        </>
      )}
    </Geographies>
  );
}

function PrefecturePaths({
  geographies,
  visitedPrefectures,
  onMarkVisited,
  onTotalCount,
}) {
  useEffect(() => {
    onTotalCount(geographies.length);
  }, [geographies.length, onTotalCount]);

  return geographies.map((geo) => {
    const id = prefectureId(geo);
    const visited = visitedPrefectures.has(id);
    const accent = getPrefectureAccent(id);
    return (
      <Geography
        key={geo.rsmKey}
        geography={geo}
        onClick={() => onMarkVisited(geo)}
        style={geographyStyle(visited, accent)}
      />
    );
  });
}

export default function JapanTravelTrackerMap() {
  const [visitedPrefectures, setVisitedPrefectures] = useState(() => new Set());
  const [totalCount, setTotalCount] = useState(47);

  const visitedCount = visitedPrefectures.size;
  const progress = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

  const markVisited = useCallback((geo) => {
    const id = prefectureId(geo);
    if (!id) return;
    setVisitedPrefectures((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const resetTracker = useCallback(() => {
    setVisitedPrefectures(new Set());
  }, []);

  const projectionConfig = useMemo(
    () => ({
      center: [138, 38],
      scale: 2400,
    }),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-2 pt-2">
      <header className="text-center">
        <h2 className="text-lg font-bold tracking-wide text-slate-100 sm:text-xl">
          Japan Travel Tracker
        </h2>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <span className="rounded-full border border-slate-600/70 bg-slate-900/80 px-4 py-1.5 text-slate-200">
          <span className="font-semibold text-cyan-300">{visitedCount}</span>
          <span className="text-slate-400"> / {totalCount} prefectures</span>
          <span className="ml-2 text-slate-500">({progress}%)</span>
        </span>
        <button
          type="button"
          onClick={resetTracker}
          disabled={visitedCount === 0}
          className="rounded-full border border-slate-600/70 bg-slate-900/80 px-4 py-1.5 font-medium text-slate-200 transition hover:border-fuchsia-400/50 hover:text-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset tracker
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-600/60 bg-slate-950/40 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={projectionConfig}
          width={900}
          height={720}
          className="mx-auto block h-auto w-full max-w-full"
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup center={[138, 38]} zoom={1} minZoom={0.85} maxZoom={5}>
            <PrefectureLayer
              visitedPrefectures={visitedPrefectures}
              onMarkVisited={markVisited}
              onTotalCount={setTotalCount}
            />
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        Map data:{" "}
        <a
          href="https://github.com/dataofjapan/land"
          className="underline decoration-slate-600 hover:text-slate-400"
          target="_blank"
          rel="noreferrer"
        >
          dataofjapan/land
        </a>
      </p>
    </div>
  );
}
