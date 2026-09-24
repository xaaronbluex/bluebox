import WordSphereNav from "./WordSphereNav";

export default function GachaHeroLanding({ onNavigate }) {
  return (
    <div className="glass-hero relative grid h-screen grid-rows-[auto_1fr] overflow-hidden bg-[#030812] text-slate-100">
      <div className="glass-hero-bg" aria-hidden />
      <div className="glass-hero-grid" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-a" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-b" aria-hidden />

      <header className="relative z-50 px-6 pt-8 text-center sm:px-10 sm:pt-10">
        <h1 className="bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-4xl font-black tracking-[0.12em] text-transparent sm:text-5xl">
          EARTH&apos;S DOCUMENTATION
        </h1>
      </header>

      {/* Anchor sphere center higher under the title (~32% of content row) */}
      <div className="relative z-10 min-h-0 overflow-hidden">
        <div className="absolute left-1/2 top-[32%] w-full -translate-x-1/2 -translate-y-1/2 px-3">
          <WordSphereNav onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}
