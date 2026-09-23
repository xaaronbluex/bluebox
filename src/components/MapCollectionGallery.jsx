/**
 * Map Collection plates migrated to 2D3DMaps Maps Library.
 * Source rasters remain under public/static/img/maps/ until a later cleanup pass.
 */
export default function MapCollectionGallery() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-2 pt-6 text-center">
      <header>
        <h2 className="text-lg font-bold tracking-wide text-slate-100 sm:text-xl">
          Map Collection
        </h2>
      </header>
      <p className="text-sm leading-relaxed text-slate-300">
        The Map Collection gallery has moved to{" "}
        <span className="font-semibold text-teal-300">2D3DMaps → Maps Library</span>
        .
      </p>
      <p className="text-xs text-slate-500">
        Local path:{" "}
        <code className="text-slate-400">
          SynologyDrive-Projects/HongKong/2D3DMaps
        </code>
        . Run that site and open the{" "}
        <span className="text-slate-300">Maps Library</span> portal section
        (世界地圖檔案館). Plates live under{" "}
        <code className="text-slate-400">public/archive/bluebox-maps/</code>.
      </p>
      <a
        href="http://localhost:5173/?section=maps-library"
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-full border border-teal-400/40 bg-teal-500/15 px-5 py-2 text-sm font-semibold text-teal-100 transition hover:border-teal-300/70 hover:bg-teal-400/25"
      >
        Open Maps Library (localhost:5173)
      </a>
      <p className="text-[11px] text-slate-600">
        Japan / China / Japan Documentation tabs still run here until a later
        migration pass.
      </p>
    </div>
  );
}
