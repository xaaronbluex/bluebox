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

      {/* Sphere in the mid-gap under the title — not bottom-heavy, not glued to the h1 */}
      <div className="relative z-10 flex min-h-0 items-start justify-center overflow-hidden px-3 pb-8 pt-[min(6vh,3.5rem)]">
        <WordSphereNav onNavigate={onNavigate} />
      </div>
    </div>
  );
}
