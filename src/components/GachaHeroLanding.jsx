import WordSphereNav from "./WordSphereNav";

export default function GachaHeroLanding({ onNavigate, onEnter }) {
  return (
    <div className="glass-hero relative min-h-screen overflow-hidden bg-[#030812] text-slate-100">
      <div className="glass-hero-bg" aria-hidden />
      <div className="glass-hero-grid" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-a" aria-hidden />
      <div className="glass-hero-orb glass-hero-orb-b" aria-hidden />

      <header className="relative z-50 px-6 pt-10 text-center sm:px-10">
        <h1 className="bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-4xl font-black tracking-[0.12em] text-transparent sm:text-5xl">
          EARTH&apos;S ARCHIVE
        </h1>
      </header>

      <WordSphereNav onNavigate={onNavigate} className="z-10 mt-2" />

      <footer className="relative z-50 flex flex-col items-center pb-10 pt-4">
        <button type="button" onClick={onEnter} className="glass-enter-btn px-8 py-3">
          Enter Diorama
        </button>
      </footer>
    </div>
  );
}
