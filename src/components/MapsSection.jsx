import { useState } from "react";
import ChinaTopographicMap from "./ChinaTopographicMap";
import JapanTopographicMap from "./JapanTopographicMap";
import JapanTravelTrackerMap from "./JapanTravelTrackerMap";
import MapCollectionGallery from "./MapCollectionGallery";

export default function MapsSection() {
  const [mapsSubTab, setMapsSubTab] = useState("japan");

  return (
    <section className="mx-auto max-w-6xl space-y-3 px-2 pb-8">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setMapsSubTab("japan")}
          className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
            mapsSubTab === "japan"
              ? "bg-teal-400 text-slate-950 shadow-[0_0_14px_rgba(45,212,191,0.45)]"
              : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/85"
          }`}
        >
          Japan
        </button>
        <button
          type="button"
          onClick={() => setMapsSubTab("china")}
          className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
            mapsSubTab === "china"
              ? "bg-amber-400 text-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.45)]"
              : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/85"
          }`}
        >
          China
        </button>
        <button
          type="button"
          onClick={() => setMapsSubTab("japan-docs")}
          className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
            mapsSubTab === "japan-docs"
              ? "bg-fuchsia-400 text-slate-950 shadow-[0_0_14px_rgba(232,121,249,0.45)]"
              : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/85"
          }`}
        >
          Japan Documentation
        </button>
        <button
          type="button"
          onClick={() => setMapsSubTab("map-collection")}
          className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
            mapsSubTab === "map-collection"
              ? "bg-violet-400 text-slate-950 shadow-[0_0_14px_rgba(167,139,250,0.5)]"
              : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/85"
          }`}
        >
          Map Collection
        </button>
      </div>

      {mapsSubTab === "japan" && <JapanTopographicMap />}
      {mapsSubTab === "china" && <ChinaTopographicMap />}
      {mapsSubTab === "japan-docs" && <JapanTravelTrackerMap />}
      {mapsSubTab === "map-collection" && <MapCollectionGallery />}
    </section>
  );
}
