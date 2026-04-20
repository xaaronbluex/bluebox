import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createColorDatabase, createWebSafeRectGrid, manualColorMap } from "./data/colors";
import { createElementDatabase } from "./data/elements";
import { createPlanetDatabase } from "./data/planets";
import SolarSystemThree from "./components/SolarSystemThree";
import { drawFromPool } from "./lib/gacha";

const tabs = [
  { id: "machines", label: "Machines" },
  { id: "colour", label: "Colour" },
  { id: "chemical", label: "Elements" },
  { id: "planets", label: "Planets" },
  { id: "hk", label: "HK 3D Buildings" },
  { id: "heart", label: "心經" },
  { id: "plants", label: "Plants" },
  { id: "mimic", label: "Mimic Insects" },
  { id: "ocean", label: "Ocean Creatures" },
  { id: "music", label: "Music Instrument" },
];

const machineSlots = [
  { id: "colour", title: "Colour", image: "/colour_01.png" },
  { id: "chemical", title: "Elements", image: "/chem_01.png" },
  { id: "planets", title: "Planets", image: "/planets_01.png" },
  { id: "plants", title: "Plants", image: "/plants_01.png" },
  { id: "mimic", title: "Mimic Insects", image: "/mimic_01.png" },
  { id: "ocean", title: "Ocean Creatures", image: "/ocean_01.png" },
  { id: "music", title: "Music Instrument", image: "/music_01.png" },
  { id: "hk", title: "Hong Kong 3D", image: "/hk_01.png" },
  { id: "heart", title: "心經", image: "/heart_01.png" },
];

const rarityColor = {
  EXR: "#ff5ad1",
  UR: "#ffd166",
  SR: "#8ecbff",
  R: "#9dff9d",
  N: "#d5f5ee",
};

function getDropFrameStyle(rarity) {
  if (rarity === "N") {
    return {
      outer: "border-[#6f4a2d] bg-[linear-gradient(180deg,#4b2f1f,#2f1c12)] shadow-[0_0_18px_rgba(74,44,28,0.55)]",
      title: "text-[#d9b18e]",
      text: "text-[#f1d5bf]",
      accent: "text-[#d2a072]",
    };
  }
  if (rarity === "R") {
    return {
      outer: "border-[#8f99a7] bg-[linear-gradient(180deg,#4e5661,#2f343c)] shadow-[0_0_18px_rgba(170,183,199,0.45)]",
      title: "text-[#d4dee8]",
      text: "text-[#f0f6ff]",
      accent: "text-[#b7c7dd]",
    };
  }
  if (rarity === "SR") {
    return {
      outer: "border-[#8fd3ff] bg-[linear-gradient(180deg,#244e72,#18263d)] shadow-[0_0_20px_rgba(112,219,255,0.6)]",
      title: "text-[#b8ecff]",
      text: "text-[#e8f7ff]",
      accent: "text-[#97dcff]",
    };
  }
  if (rarity === "UR") {
    return {
      outer: "border-transparent bg-[linear-gradient(135deg,#ff4ec7,#ffac33,#8cff4f,#33d1ff,#8d4dff)] shadow-[0_0_24px_rgba(255,148,248,0.7)]",
      title: "text-black",
      text: "text-black",
      accent: "text-black",
      inner: "bg-white/80",
    };
  }
  return {
    outer: "border-[#1f1b12] bg-[linear-gradient(180deg,#21160f,#0f0b08)] shadow-[0_0_24px_rgba(0,0,0,0.8)]",
    title: "text-[#d9b35b]",
    text: "text-[#f2de9d]",
    accent: "text-[#c99a2e]",
  };
}

const elementCategoryPalette = {
  "cat-alkali": "#f4ad72",
  "cat-alkaline": "#f2cb78",
  "cat-transition": "#e8e28d",
  "cat-post-transition": "#d8e091",
  "cat-metalloid": "#95cb83",
  "cat-nonmetal": "#9bc7ed",
  "cat-halogen": "#c4a5df",
  "cat-noble": "#8ec3e6",
  "cat-lanthanide": "#72c8c0",
  "cat-actinide": "#9ad8b8",
};

function getContrastColor(hexcolor) {
  const cleaned = hexcolor.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

function FloatingMachine({ image, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <img
        src={image}
        alt={title}
        className="h-48 w-48 object-contain drop-shadow-[0_0_25px_rgba(16,255,210,0.45)] transition group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.src = "/machine_00.png";
        }}
      />
      <p className="font-bold tracking-wide text-emerald-100">{title}</p>
      <p className="text-xs text-emerald-300/80">Image name: {title.toLowerCase().replaceAll(" ", "-")}_01.png</p>
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("machines");
  const [colors, setColors] = useState(() => createColorDatabase());
  const [elements, setElements] = useState(() => createElementDatabase());
  const [planets, setPlanets] = useState(() => createPlanetDatabase());
  const [spaceNow, setSpaceNow] = useState(() => new Date());
  const [lastDrop, setLastDrop] = useState(null);
  const donutCanvasRef = useRef(null);
  const donutARef = useRef(0);
  const donutBRef = useRef(0);
  const animationRef = useRef(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, title: "", detail: "", color: "#00e6b8" });
  const [dropFading, setDropFading] = useState(false);
  const [planetScaleMode, setPlanetScaleMode] = useState("real");

  const colorUnlocked = useMemo(() => colors.filter((c) => c.unlocked).length, [colors]);
  const elementUnlocked = useMemo(() => elements.filter((e) => e.unlocked).length, [elements]);
  const planetUnlocked = useMemo(() => planets.filter((p) => p.unlocked).length, [planets]);
  const webSafeRectGrid = useMemo(() => createWebSafeRectGrid(), []);

  const handlePlanetHover = useCallback((planet, x, y) => {
    setTooltip({
      show: true,
      x,
      y,
      title: planet.unlocked ? planet.name : "Unknown Planet",
      detail: planet.unlocked
        ? `Mass: ${planet.mass} | Gravity: ${planet.gravity} | Temp: ${planet.tempMinC}°C to ${planet.tempMaxC}°C | Age: ${planet.ageBillionYears}B years`
        : "Locked | Draw this planet to reveal full data.",
      color: planet.unlocked ? "#bde3ff" : "#94a3b8",
    });
  }, []);

  const handlePlanetLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, show: false }));
  }, []);

  function drawColor() {
    const item = drawFromPool(colors);
    const wasDuplicate = item.unlocked;
    setColors((prev) => prev.map((c) => (c.id === item.id ? { ...c, unlocked: true } : c)));
    setLastDrop({ mode: "colour", name: item.hex, rarity: item.rarity, duplicate: wasDuplicate });
  }

  function drawElement() {
    const item = drawFromPool(elements);
    const wasDuplicate = item.unlocked;
    setElements((prev) => prev.map((e) => (e.z === item.z ? { ...e, unlocked: true } : e)));
    setLastDrop({ mode: "chemical", name: `${item.sym} - ${item.name}`, rarity: item.rarity, duplicate: wasDuplicate });
  }

  function drawPlanet() {
    const item = drawFromPool(planets);
    const wasDuplicate = item.unlocked;
    setPlanets((prev) => prev.map((p) => (p.name === item.name ? { ...p, unlocked: true } : p)));
    setLastDrop({ mode: "planets", name: item.name, rarity: item.rarity, duplicate: wasDuplicate });
  }

  useEffect(() => {
    if (!lastDrop) return undefined;
    setDropFading(false);
    const fadeTimer = setTimeout(() => setDropFading(true), 2000);
    const hideTimer = setTimeout(() => {
      setLastDrop(null);
      setDropFading(false);
    }, 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [lastDrop]);

  useEffect(() => {
    const timer = setInterval(() => setSpaceNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function turnOnAll() {
    setColors((prev) => prev.map((item) => ({ ...item, unlocked: true })));
    setElements((prev) => prev.map((item) => ({ ...item, unlocked: true })));
    setPlanets((prev) => prev.map((item) => ({ ...item, unlocked: true })));
  }

  function resetAll() {
    setColors((prev) => prev.map((item) => ({ ...item, unlocked: false })));
    setElements((prev) => prev.map((item) => ({ ...item, unlocked: false })));
    setPlanets((prev) => prev.map((item) => ({ ...item, unlocked: false })));
  }

  useEffect(() => {
    if (tab !== "chemical") {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = donutCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const R1 = 1;
    const R2 = 2.5;
    const K2 = 5;
    const columns = 50;
    const rows = 50;
    const donutRenderSize = 500;
    const cellW = donutRenderSize / columns;
    const cellH = donutRenderSize / rows;
    const K1 = (columns * K2 * 3) / (9 * (R1 + R2));
    const elementMap = ["H", "He", "Li", "C", "N", "O", "F", "Si", "P", "S", "Fe", "Au"];
    const colorMap = ["255, 102, 102", "204, 153, 255", "255, 153, 204", "102, 255, 204", "153, 204, 255", "153, 255, 153", "102, 204, 255", "204, 255, 153", "255, 204, 102", "255, 255, 102", "204, 204, 204", "255, 215, 0"];

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const zbuffer = new Array(columns * rows).fill(0);
      const output = new Array(columns * rows).fill("");
      const lumBuffer = new Array(columns * rows).fill(0);
      const colorIndexBuffer = new Array(columns * rows).fill(0);

      const cA = Math.cos(donutARef.current);
      const sA = Math.sin(donutARef.current);
      const cB = Math.cos(donutBRef.current);
      const sB = Math.sin(donutBRef.current);

      for (let theta = 0; theta < 6.28; theta += 0.07) {
        const ct = Math.cos(theta);
        const st = Math.sin(theta);
        for (let phi = 0; phi < 6.28; phi += 0.02) {
          const cp = Math.cos(phi);
          const sp = Math.sin(phi);
          const circlex = R2 + R1 * ct;
          const circley = R1 * st;
          const x = circlex * (cB * cp + sA * sB * sp) - circley * cA * sB;
          const y = circlex * (sB * cp - sA * cB * sp) + circley * cA * cB;
          const z = K2 + cA * circlex * sp + circley * sA;
          const ooz = 1 / z;
          const xp = Math.floor(columns / 2 + K1 * ooz * x);
          const yp = Math.floor(rows / 2 - K1 * ooz * y);
          const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);

          if (L > 0 && xp >= 0 && xp < columns && yp >= 0 && yp < rows) {
            const idx = xp + yp * columns;
            if (ooz > zbuffer[idx]) {
              zbuffer[idx] = ooz;
              const lumIndex = Math.floor(L * 8);
              const mappedIdx = Math.min(Math.max(lumIndex, 0), 11);
              lumBuffer[idx] = lumIndex;
              output[idx] = elementMap[mappedIdx];
              colorIndexBuffer[idx] = mappedIdx;
            }
          }
        }
      }

      ctx.font = "bold 15px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const offsetX = (width - donutRenderSize) / 2;
      const offsetY = (height - donutRenderSize) / 2 - 40;

      for (let i = 0; i < columns * rows; i += 1) {
        if (!output[i]) continue;
        const xp = offsetX + (i % columns) * cellW + cellW / 2;
        const yp = offsetY + Math.floor(i / columns) * cellH + cellH / 2;
        const alpha = Math.min(1, lumBuffer[i] / 8 + 0.1);
        const sym = output[i];
        const dbItem = elements.find((e) => e.sym === sym);
        const isUnlocked = dbItem ? dbItem.unlocked : false;
        const renderColor = isUnlocked ? colorMap[colorIndexBuffer[i]] : "60, 75, 70";
        ctx.fillStyle = `rgba(${renderColor}, ${alpha})`;
        ctx.fillText(output[i], xp, yp);
      }

      donutARef.current += 0.002;
      donutBRef.current += 0.001;
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [tab, elements]);

  const periodicGrid = useMemo(() => {
    const cells = Array(18 * 10).fill(null);
    elements.forEach((item) => {
      const gridIndex = (item.pos.r - 1) * 18 + (item.pos.c - 1);
      cells[gridIndex] = item;
    });
    return cells;
  }, [elements]);

  const hexMapLayout = useMemo(() => {
    // Must match rendered size (w-14=56px, h-12=48px).
    const hexW = 56;
    const hexH = 48;
    const maxLen = Math.max(...manualColorMap.map((col) => col.length));
    const cells = manualColorMap.flatMap((col, q) => {
      const padTop = ((maxLen - col.length) * hexH) / 2;
      return col.map((hex, r) => ({
        hex,
        q,
        r,
        // Tight, slight-overlap packing to remove seams.
        x: q * (hexW * 0.75),
        y: padTop + r * (hexH * 0.88),
      }));
    });
    const rainbow = cells.find((c) => c.hex === "RAINBW") ?? cells[0];
    return { cells, rainbow };
  }, []);

  return (
    <div className="min-h-screen bg-bunker px-4 py-6 text-emerald-50 sm:px-8">
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <button onClick={turnOnAll} className="rounded-md bg-emerald-400 px-3 py-2 text-xs font-black text-black">
          TURN ON ALL
        </button>
        <button onClick={resetAll} className="rounded-md bg-rose-500 px-3 py-2 text-xs font-black text-white">
          RESET
        </button>
      </div>

      {tooltip.show && (
        <div
          className="pointer-events-none fixed z-50 max-w-72 rounded-lg border bg-black/90 p-3 text-xs text-emerald-100 shadow-lg"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14, borderColor: tooltip.color }}
        >
          <p className="font-bold" style={{ color: tooltip.color }}>
            {tooltip.title}
          </p>
          <p className="mt-1 text-emerald-200">{tooltip.detail}</p>
        </div>
      )}

      <div className="mx-auto max-w-7xl text-center">
        <header className="mb-6 px-6 py-5 text-center">
          <h1 className="text-3xl font-black tracking-[0.2em]">EARTH'S ARCHIVE</h1>
          <p className="text-emerald-300">Gacha Diorama</p>
        </header>

        <nav className="mb-6 flex flex-nowrap justify-center gap-2 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${
                tab === item.id ? "bg-accent text-black" : "bg-panel text-emerald-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {lastDrop && (() => {
          const frameStyle = getDropFrameStyle(lastDrop.rarity);
          return (
          <div
            className={`pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 transition-opacity duration-500 ${
              dropFading ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className={`rounded-xl border px-1 py-1 text-center ${frameStyle.outer}`}>
              <div className={`rounded-lg px-4 py-3 ${frameStyle.inner ?? "bg-black/30"}`}>
                <p className={`text-xs uppercase tracking-wider ${frameStyle.title}`}>Latest Drop</p>
                <p className={`font-bold ${frameStyle.text}`}>
                  {lastDrop.name} <span className={frameStyle.accent}>[{lastDrop.rarity}]</span>
                </p>
                <p className={`mt-1 text-xs font-extrabold tracking-widest ${lastDrop.duplicate ? "text-rose-300" : "text-emerald-200"}`}>
                  {lastDrop.duplicate ? "DUPLICATE" : "NEW UNLOCK"}
                </p>
              </div>
            </div>
          </div>
          );
        })()}

        {tab === "machines" && (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {machineSlots.map((item) => (
              <FloatingMachine key={item.id} image={item.image} title={item.title} onClick={() => setTab(item.id)} />
            ))}
          </section>
        )}

        {tab === "colour" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-emerald-800/60 bg-panel/70 p-4">
              <div className="flex items-center justify-center gap-3 text-center">
                <button
                  onClick={drawColor}
                  className="rounded-lg px-3 py-1 text-xl font-bold text-emerald-50 transition hover:bg-white/5"
                  title="Click title to draw"
                >
                  216 Web-Safe Colour Collection
                </button>
              </div>
              <div className="text-center">
                <p className="text-sm text-emerald-300">Unlocked {colorUnlocked} / {colors.length}</p>
              </div>
            </div>

            <div className="relative mx-auto mb-8 h-[760px] w-full max-w-[860px] overflow-visible">
              {hexMapLayout.cells.map((cell, idx) => {
                const item = colors.find((c) => c.hex === cell.hex);
                const unlocked = item ? item.unlocked : true;
                const isRainbow = cell.hex === "RAINBW";
                const display = isRainbow ? "♻" : cell.hex.replace("#", "").toUpperCase();
                const bg = cell.hex === "RAINBW" ? "linear-gradient(45deg, red, orange, yellow, green, blue, purple)" : cell.hex;
                const textColor = cell.hex === "RAINBW" ? "#fff" : getContrastColor(cell.hex);
                const rarity = item?.rarity ?? "EXR";
                return (
                  <button
                    key={`${cell.q}-${cell.r}-${idx}`}
                    className="absolute z-10 hex-shape flex h-12 w-14 items-center justify-center border-0 text-[10px] font-semibold tracking-tight transition-transform duration-200 [transform:translate(-50%,-50%)_scale(1)] hover:z-[999] hover:[transform:translate(-50%,-50%)_scale(1.45)] focus:z-[999] focus:[transform:translate(-50%,-50%)_scale(1.45)]"
                    style={{
                      left: `${Math.round(cell.x - hexMapLayout.rainbow.x + 430)}px`,
                      top: `${Math.round(cell.y - hexMapLayout.rainbow.y + 380)}px`,
                      background: bg,
                      color: textColor,
                      opacity: unlocked ? 1 : 0.16,
                      filter: unlocked ? "none" : "grayscale(100%) brightness(0.22)",
                      boxShadow: "none",
                      textShadow: "none",
                      fontSize: isRainbow ? "20px" : "10px",
                    }}
                    onMouseMove={(e) =>
                      setTooltip({
                        show: true,
                        x: e.clientX,
                        y: e.clientY,
                        title: `HEX ${display}`,
                        detail: `Rarity: ${rarity} | ${unlocked ? "Unlocked" : "Locked"}`,
                        color: rarityColor[rarity],
                      })
                    }
                    onMouseLeave={() => setTooltip((prev) => ({ ...prev, show: false }))}
                  >
                    {display}
                  </button>
                );
              })}
            </div>

            <div className="mt-16 rounded-xl border border-emerald-800/50 bg-panel/35 p-5 text-emerald-100">
              <h3 className="mb-4 text-3xl font-semibold text-emerald-200">216 Web Safe Colour Chart</h3>
              <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-[2px]">
                {webSafeRectGrid.map((hex, idx) => {
                  const item = colors.find((c) => c.hex.toUpperCase() === hex);
                  const unlocked = item ? item.unlocked : true;
                  return (
                  <button
                    key={`inv-${idx}`}
                    className="inventory-cell flex h-10 items-start justify-start border border-white/20 px-1 pt-[2px] text-left text-[8px] font-bold transition hover:z-10 hover:scale-110 sm:h-12"
                    style={{
                      background: unlocked ? hex : "#193029",
                      color: getContrastColor(hex),
                      opacity: unlocked ? 1 : 0.45,
                    }}
                    onMouseMove={(e) =>
                      setTooltip({
                        show: true,
                        x: e.clientX,
                        y: e.clientY,
                        title: hex.toUpperCase(),
                        detail: `Web-safe inventory slot #${idx + 1} | ${unlocked ? "Unlocked" : "Locked"}`,
                        color: unlocked ? "#66e5c2" : "#94a3b8",
                      })
                    }
                    onMouseLeave={() => setTooltip((prev) => ({ ...prev, show: false }))}
                  >
                    {hex.toUpperCase()}
                  </button>
                  );
                })}
              </div>
            </div>

          </section>
        )}

        {tab === "chemical" && (
          <section className="space-y-4 rounded-xl p-4 text-[#d6d1b4]">
            <div className="p-2">
              <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 text-center">
                <button
                  onClick={drawElement}
                  className="rounded-lg px-3 py-1 font-serif text-4xl tracking-wide text-[#d6d1b4] transition hover:bg-white/5"
                  title="Click title to draw"
                >
                  PERIODIC TABLE OF THE ELEMENTS
                </button>
              </div>
              <div className="mx-auto max-w-4xl text-center">
                <p className="mt-1 text-sm text-[#b8b39a]">Unlocked {elementUnlocked} / {elements.length}</p>
              </div>
            </div>
            <canvas ref={donutCanvasRef} width={1000} height={566} className="w-full" />
            <div className="mb-1 flex flex-wrap justify-center gap-3 text-xs">
              {Object.entries(elementCategoryPalette).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm border border-black/15" style={{ backgroundColor: color }} />
                  <span className="text-[#c4bea1]">{key.replace("cat-", "").replace("-", " ")}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
              {periodicGrid.map((item, idx) => (
                <button
                  key={idx}
                  className={`min-h-12 rounded border p-1 text-left transition hover:scale-110 ${
                    !item
                      ? "border-transparent bg-transparent"
                      : item.unlocked
                        ? "border-[#6e6a4e] text-[#232114]"
                        : "border-[#8c8a74] bg-[#666660] text-[#222] opacity-60 grayscale"
                  }`}
                  style={item && item.unlocked ? { backgroundColor: elementCategoryPalette[item.cat] ?? "#d7d19a" } : undefined}
                  onMouseMove={(e) => {
                    if (!item) return;
                    setTooltip({
                      show: true,
                      x: e.clientX,
                      y: e.clientY,
                      title: `${item.z} | ${item.sym} - ${item.name}`,
                      detail: `Mass: ${item.mass} | Type: ${item.cat.replace("cat-", "").replace("-", " ")} | ${item.unlocked ? "Unlocked" : "Locked"}`,
                      color: item.unlocked ? "#c2a96a" : "#6b6b6b",
                    });
                  }}
                  onMouseLeave={() => setTooltip((prev) => ({ ...prev, show: false }))}
                >
                  {item ? (
                    <>
                      <p className="text-[10px]">{item.z}</p>
                      <p className="text-sm font-black">{item.unlocked ? item.sym : "?"}</p>
                      <p className="truncate text-[10px]">{item.unlocked ? item.name : "Locked"}</p>
                    </>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "planets" && (
          <section className="relative left-1/2 min-h-[calc(100vh-210px)] w-screen -translate-x-1/2 overflow-hidden border-y border-slate-200/10 bg-[#030611]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(116,180,255,0.25),transparent_40%),radial-gradient(circle_at_82%_25%,rgba(255,210,140,0.18),transparent_44%),radial-gradient(circle_at_62%_85%,rgba(126,85,255,0.16),transparent_42%),linear-gradient(180deg,#02040a_0%,#050a19_100%)]" />

            <div className="relative z-10 mx-auto max-w-[1650px] px-6 pb-3 pt-5 text-center">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={drawPlanet}
                  className="rounded-lg px-3 py-1 font-serif text-4xl tracking-wide text-slate-100 transition hover:bg-white/5"
                  title="Click title to draw"
                >
                  SOLAR SYSTEM OBSERVATORY
                </button>
              </div>
              <div>
                <p className="mt-1 text-sm text-sky-100/80">Unlocked {planetUnlocked} / {planets.length}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setPlanetScaleMode("real")}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                    planetScaleMode === "real"
                      ? "bg-sky-300 text-slate-950 shadow-[0_0_16px_rgba(125,211,252,0.55)]"
                      : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  Real Scale
                </button>
                <button
                  onClick={() => setPlanetScaleMode("presentation")}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                    planetScaleMode === "presentation"
                      ? "bg-fuchsia-300 text-slate-950 shadow-[0_0_16px_rgba(244,114,182,0.55)]"
                      : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  Presentation
                </button>
              </div>
            </div>

            <div className="relative z-10 mx-auto h-[calc(100vh-320px)] min-h-[560px] w-full max-w-[1650px]">
              <SolarSystemThree
                planets={planets}
                scaleMode={planetScaleMode}
                onHoverPlanet={handlePlanetHover}
                onLeavePlanet={handlePlanetLeave}
              />
            </div>

            <div className="absolute bottom-6 right-3 z-20 max-w-[230px] rounded-md bg-black/25 px-2 py-1 text-right text-[10px] leading-tight text-slate-100/90 sm:bottom-8 sm:right-6">
              <p>GMT {spaceNow.toUTCString().replace("GMT", "").trim()}</p>
              <p className="text-slate-300/90">格林威治時間</p>
              <p>Universe age: 13.8 billion years</p>
              <p className="text-slate-300/90">宇宙年齡：約 138 億年</p>
              <p>Voyager 1 distance: ~24.6 billion km</p>
              <p className="text-slate-300/90">航海家一號距離：約 246 億公里</p>
            </div>
          </section>
        )}

        {tabs
          .filter((t) => !["machines", "colour", "chemical", "planets"].includes(t.id))
          .map((t) =>
            tab === t.id ? (
              <section key={t.id} className="rounded-xl border border-emerald-800/60 bg-panel p-6 text-center">
                <h2 className="text-2xl font-bold">{t.label}</h2>
                <p className="mt-2 text-emerald-200">Tab installed. Put your machine PNG here: `{t.id}_01.png`</p>
              </section>
            ) : null
          )}
      </div>
    </div>
  );
}
