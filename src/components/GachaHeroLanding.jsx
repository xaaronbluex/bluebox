import WordSphereNav from "./WordSphereNav";

export default function GachaHeroLanding({ onNavigate }) {
  return (
    <div className="glass-hero relative flex min-h-screen flex-col overflow-hidden bg-[#030812] text-slate-100">
      <div className="glass-hero-bg" aria-hidden />
      <div className="glass-hero-grid" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-a" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-b" aria-hidden />

      <header className="relative z-50 shrink-0 px-6 pt-8 text-center sm:px-10 sm:pt-10">
        <h1 className="bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-4xl font-black tracking-[0.12em] text-transparent sm:text-5xl">
          EARTH&apos;S DOCUMENTATION
        </h1>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:pb-6">
        <WordSphereNav onNavigate={onNavigate} className="w-full" />
      </div>
    </div>
  );
}
