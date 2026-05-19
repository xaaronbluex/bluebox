import { useCallback, useEffect, useMemo, useState } from "react";

const mapImageModules = import.meta.glob(
  "../../public/static/img/maps/*.{png,jpg,jpeg,webp,gif}",
  { eager: true, query: "?url", import: "default" },
);

function fileNameToTitle(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function buildMapCollection() {
  return Object.entries(mapImageModules)
    .map(([filePath, src]) => {
      const fileName = filePath.split("/").pop() ?? "";
      const id = fileName.replace(/\.[^.]+$/, "");
      return {
        id,
        title: fileNameToTitle(fileName),
        src,
        fileName,
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function MapArtCard({ map, onOpen }) {
  return (
    <article className="map-art-card group w-full overflow-hidden rounded-2xl border border-slate-600/50 bg-slate-950/55 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition duration-300 hover:border-violet-400/70 hover:shadow-[0_0_28px_rgba(139,92,246,0.35),0_12px_40px_rgba(0,0,0,0.5)]">
      <button
        type="button"
        onClick={() => onOpen(map)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <div className="relative w-full bg-slate-900/80">
          <img
            src={map.src}
            alt={map.title}
            loading="lazy"
            decoding="async"
            className="mx-auto block h-auto w-full max-w-none transition duration-500 ease-out group-hover:brightness-[1.03]"
          />
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-200/90 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
            View native resolution
          </span>
        </div>
      </button>
      <div className="border-t border-slate-700/50 px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="text-sm font-bold tracking-wide text-slate-100 sm:text-base">
          {map.title}
        </h3>
      </div>
    </article>
  );
}

function MapLightbox({ map, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  return (
    <div
      className="map-lightbox fixed inset-0 z-[200] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-lightbox-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        aria-label="Close lightbox"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/60 bg-slate-950/95 px-3 py-2 backdrop-blur-md sm:px-5 sm:py-3">
          <div className="min-w-0 pr-10">
            <h2
              id="map-lightbox-title"
              className="truncate text-sm font-bold text-slate-100 sm:text-base"
            >
              {map.title}
            </h2>
            <p className="truncate text-xs text-slate-500 sm:text-sm">
              Scroll to pan at native size
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-500/60 bg-slate-900/90 text-slate-200 shadow-lg transition hover:border-violet-400/60 hover:bg-slate-800 hover:text-white sm:right-5 sm:top-2.5"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-auto overscroll-contain bg-slate-950/90">
          <img
            src={map.src}
            alt={map.title}
            decoding="async"
            fetchPriority="high"
            className="mx-auto block h-auto w-auto max-w-none"
            style={{ imageRendering: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MapCollectionGallery() {
  const [activeMap, setActiveMap] = useState(null);
  const maps = useMemo(() => buildMapCollection(), []);

  return (
    <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-2 pt-2">
      <header className="text-center">
        <h2 className="text-lg font-bold tracking-wide text-slate-100 sm:text-xl">
          Map Collection
        </h2>
      </header>

      {maps.length === 0 ? (
        <p className="text-center text-sm text-slate-500">
          Add map images to{" "}
          <code className="text-slate-400">public/static/img/maps/</code>
        </p>
      ) : (
        <div className="flex flex-col gap-8 sm:gap-10">
          {maps.map((map) => (
            <MapArtCard key={map.id} map={map} onOpen={setActiveMap} />
          ))}
        </div>
      )}

      {activeMap && (
        <MapLightbox map={activeMap} onClose={() => setActiveMap(null)} />
      )}
    </div>
  );
}
