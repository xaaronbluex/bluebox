import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createColorDatabase, createWebSafeRectGrid, manualColorMap } from "./data/colors";
import { createElementDatabase } from "./data/elements";
import { createPlanetDatabase } from "./data/planets";
import { createSutraDatabase, HEART_SUTRA_PATTERN_LINES } from "./data/sutra";
import SolarSystemThree from "./components/SolarSystemThree";
import EarthMoonThree from "./components/EarthMoonThree";
import SunThree from "./components/SunThree";
import PlanetSoloThree from "./components/PlanetSoloThree";
import { drawFromPool } from "./lib/gacha";

const itemAssetEntries = Object.entries(
  import.meta.glob("../3d/*.{glb,gltf,obj,fbx,stl,dae,3ds,blend,png,jpg,jpeg,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  })
);

const heroGalleryArtworks = [
  { id: "hero-00", imageUrl: "/hero_00.png", description: "Hero 00" },
  { id: "hero-01", imageUrl: "/hero_01.png", description: "Hero 01" },
];

function createInitialItemInventory() {
  const grouped = new Map();
  itemAssetEntries.forEach(([filePath, assetUrl]) => {
    const fileName = filePath.split("/").pop() ?? "";
    const dot = fileName.lastIndexOf(".");
    if (dot <= 0) return;
    const base = fileName.slice(0, dot);
    const ext = fileName.slice(dot + 1).toLowerCase();
    if (!grouped.has(base)) grouped.set(base, { modelName: "", modelUrl: "", imageUrl: "" });
    const entry = grouped.get(base);
    if (!entry) return;
    if (["glb", "gltf", "obj", "fbx", "stl", "dae", "3ds", "blend"].includes(ext)) {
      entry.modelName = fileName;
      entry.modelUrl = assetUrl;
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      entry.imageUrl = assetUrl;
    }
  });

  const seeded = Array.from(grouped.values());
  return Array.from({ length: 100 }, (_, idx) => ({
    id: idx + 1,
    modelName: seeded[idx]?.modelName ?? "",
    modelUrl: seeded[idx]?.modelUrl ?? "",
    imageUrl: seeded[idx]?.imageUrl ?? "",
  }));
}

const tabs = [
  { id: "machines", label: "Machines" },
  { id: "colour", label: "Colour" },
  { id: "chemical", label: "Elements" },
  { id: "planets", label: "Planets" },
  { id: "heart", label: "心經" },
  { id: "items", label: "Items" },
  { id: "hero", label: "AI Arts" },
  { id: "plants", label: "Plants" },
  { id: "mimic", label: "Mimic Insects" },
  { id: "ocean", label: "Ocean Creatures" },
  { id: "music", label: "Music Instrument" },
  { id: "hk", label: "HK 3D Buildings" },
];

const machineSlots = [
  { id: "colour", title: "Colour", image: "/colour_01.png" },
  { id: "chemical", title: "Elements", image: "/chem_01.png" },
  { id: "planets", title: "Planets", image: "/planets_01.png" },
  { id: "items", title: "Items", image: "/items_01.png" },
  { id: "plants", title: "Plants", image: "/plants_01.png" },
  { id: "mimic", title: "Mimic Insects", image: "/mimic_01.png" },
  { id: "ocean", title: "Ocean Creatures", image: "/ocean_01.png" },
  { id: "music", title: "Music Instrument", image: "/music_01.png" },
  { id: "heart", title: "心經", image: "/heart_01.png" },
  { id: "hk", title: "Hong Kong 3D", image: "/hk_01.png" },
];

/** Sun-ward order: Mercury, Venus, Earth (full scene), then outer planets. */
const planetViewOrder = [
  { id: "mercury", label: "Mercury" },
  { id: "venus", label: "Venus" },
  { id: "earth", label: "Earth" },
  { id: "mars", label: "Mars" },
  { id: "jupiter", label: "Jupiter" },
  { id: "saturn", label: "Saturn" },
  { id: "uranus", label: "Uranus" },
  { id: "neptune", label: "Neptune" },
  { id: "pluto", label: "Pluto" },
];

const soloPlanetIds = planetViewOrder.filter((p) => p.id !== "earth").map((p) => p.id);
const sutraSsrChars = new Set(["色", "空", "佛", "般", "若"]);
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
  const [sutraCharacters, setSutraCharacters] = useState(() => createSutraDatabase());
  const [itemInventory, setItemInventory] = useState(() => createInitialItemInventory());
  const [itemPreview, setItemPreview] = useState(null);
  const previewHideTimerRef = useRef(null);
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
  const sutraUnlocked = useMemo(() => sutraCharacters.filter((c) => c.unlocked).length, [sutraCharacters]);
  const sutraColumns = useMemo(() => {
    let charCursor = 0;
    return HEART_SUTRA_PATTERN_LINES.map((line, lineIndex) =>
      Array.from(line).map((token, tokenIndex) => {
        const isSeparator = token === "。" || token === "　";
        if (isSeparator) {
          return {
            id: `sep-${lineIndex}-${tokenIndex}`,
            staticToken: true,
            unlocked: true,
            character: token,
          };
        }
        const sutraChar = sutraCharacters[charCursor];
        charCursor += 1;
        return {
          id: sutraChar?.id ?? `missing-${lineIndex}-${tokenIndex}`,
          staticToken: false,
          unlocked: sutraChar?.unlocked ?? false,
          character: sutraChar?.character ?? token,
        };
      })
    );
  }, [sutraCharacters]);
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

  function rollSutraGacha() {
    const pickedIndex = Math.floor(Math.random() * sutraCharacters.length);
    const item = sutraCharacters[pickedIndex];
    if (!item) return;
    const wasDuplicate = item.unlocked;
    const isSsr = sutraSsrChars.has(item.character);
    setSutraCharacters((prev) => prev.map((c, idx) => (idx === pickedIndex ? { ...c, unlocked: true } : c)));
    setLastDrop({
      mode: "heart",
      name: `抽中嘅字：${item.character}${isSsr ? "  [SSR]" : ""}`,
      rarity: isSsr ? "UR" : "N",
      duplicate: wasDuplicate,
    });
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
    setSutraCharacters((prev) => prev.map((item) => ({ ...item, unlocked: true })));
  }

  function resetAll() {
    setColors((prev) => prev.map((item) => ({ ...item, unlocked: false })));
    setElements((prev) => prev.map((item) => ({ ...item, unlocked: false })));
    setPlanets((prev) => prev.map((item) => ({ ...item, unlocked: false })));
    setSutraCharacters((prev) => prev.map((item) => ({ ...item, unlocked: false })));
  }

  function handleItemUpload(slotIndex, file, kind = "model") {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setItemInventory((prev) =>
      prev.map((slot, idx) =>
        idx === slotIndex
          ? {
              ...slot,
              modelName: kind === "model" ? file.name : slot.modelName,
              modelUrl: kind === "model" ? objectUrl : slot.modelUrl,
              imageUrl: kind === "image" ? objectUrl : slot.imageUrl,
            }
          : slot
      )
    );
  }

  function clearItemPreviewHideTimer() {
    if (previewHideTimerRef.current) {
      clearTimeout(previewHideTimerRef.current);
      previewHideTimerRef.current = null;
    }
  }

  function showItemPreview(slot, event) {
    if (!slot.imageUrl) {
      setItemPreview(null);
      return;
    }
    clearItemPreviewHideTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    const popupWidth = 680;
    const popupHeight = 760;
    let left = rect.right + 12;
    let top = rect.top - 18;
    if (left + popupWidth > window.innerWidth - 12) {
      left = rect.left - popupWidth - 12;
    }
    if (top + popupHeight > window.innerHeight - 12) {
      top = window.innerHeight - popupHeight - 12;
    }
    if (top < 12) top = 12;
    setItemPreview({ slot, left, top });
  }

  function hideItemPreviewSoon() {
    clearItemPreviewHideTimer();
    previewHideTimerRef.current = setTimeout(() => {
      setItemPreview(null);
      previewHideTimerRef.current = null;
    }, 120);
  }

  useEffect(
    () => () => {
      clearItemPreviewHideTimer();
    },
    []
  );

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
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setPlanetScaleMode("real")}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                    planetScaleMode === "real"
                      ? "bg-sky-300 text-slate-950 shadow-[0_0_16px_rgba(125,211,252,0.55)]"
                      : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  Solar System
                </button>
                <button
                  onClick={() => setPlanetScaleMode("sun")}
                  className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                    planetScaleMode === "sun"
                      ? "bg-amber-300 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.55)]"
                      : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/80"
                  }`}
                >
                  Sun
                </button>
                {planetViewOrder.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanetScaleMode(p.id)}
                    className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                      planetScaleMode === p.id
                        ? p.id === "earth"
                          ? "bg-emerald-300 text-slate-950 shadow-[0_0_16px_rgba(74,222,128,0.55)]"
                          : "bg-violet-300 text-slate-950 shadow-[0_0_16px_rgba(196,181,253,0.5)]"
                        : "bg-slate-900/70 text-slate-200 hover:bg-slate-700/80"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative z-10 mx-auto h-[calc(100vh-320px)] min-h-[560px] w-full max-w-[1650px]">
              {planetScaleMode === "earth" ? (
                <EarthMoonThree />
              ) : planetScaleMode === "sun" ? (
                <SunThree />
              ) : soloPlanetIds.includes(planetScaleMode) ? (
                <PlanetSoloThree planetId={planetScaleMode} />
              ) : (
                <SolarSystemThree
                  planets={planets}
                  scaleMode={planetScaleMode}
                  onHoverPlanet={handlePlanetHover}
                  onLeavePlanet={handlePlanetLeave}
                />
              )}
            </div>

            <div className="absolute bottom-6 right-3 z-20 max-w-[230px] rounded-md bg-black/25 px-2 py-1 text-right text-[10px] leading-tight text-slate-100/90 sm:bottom-8 sm:right-6">
              <p>Spin ratio: 1 minute = 5 Earth days</p>
              <p className="text-slate-300/90">轉速比例：1 分鐘 = 5 地球日</p>
              <p>GMT {spaceNow.toUTCString().replace("GMT", "").trim()}</p>
              <p className="text-slate-300/90">格林威治時間</p>
              <p>Universe age: 13.8 billion years</p>
              <p className="text-slate-300/90">宇宙年齡：約 138 億年</p>
              <p>Voyager 1 distance: ~24.6 billion km</p>
              <p className="text-slate-300/90">航海家一號距離：約 246 億公里</p>
            </div>
          </section>
        )}

        {tab === "heart" && (
          <section className="rounded-2xl bg-transparent p-4 sm:p-6">
            <div className="relative rounded-xl bg-transparent px-3 pb-4 pt-24 sm:px-4 sm:pt-28">
              <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 text-center">
                <p
                  className="text-lg tracking-[0.3em] text-white/90"
                  style={{ fontFamily: '"DFKai-SB","BiauKai","KaiTi","STKaiti","Songti TC","PMingLiU","Noto Serif TC",serif' }}
                >
                  般若波羅蜜多心經
                </p>
                <button
                  onClick={rollSutraGacha}
                  className="pointer-events-auto mt-2 rounded-md bg-[linear-gradient(180deg,#d34b2e,#a72f1f)] px-4 py-2 font-serif text-base tracking-[0.2em] text-amber-100 shadow-[0_4px_12px_rgba(110,25,10,0.35)] transition hover:brightness-110"
                  title="Draw one Heart Sutra character"
                >
                  抽 字
                </button>
                <p className="mt-1 text-sm text-white/70">Unlocked {sutraUnlocked} / {sutraCharacters.length}</p>
              </div>

              <div
                className="flex w-full flex-row-reverse justify-between gap-1"
                style={{ fontFamily: '"DFKai-SB","BiauKai","KaiTi","STKaiti","Songti TC","PMingLiU","Noto Serif TC",serif' }}
              >
                {sutraColumns.map((column, colIdx) => (
                  <div
                    key={`col-${colIdx}`}
                    className="flex w-8 flex-col items-center gap-1"
                  >
                    {column.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-center bg-transparent px-[1px] text-2xl leading-none transition duration-150 ${
                          item.staticToken
                            ? "text-white/80"
                            : item.unlocked
                              ? sutraSsrChars.has(item.character)
                                ? "cursor-pointer text-[#FFD700] [text-shadow:0_0_10px_rgba(255,215,0,0.9),0_0_20px_rgba(255,215,0,0.6)] hover:scale-125 hover:[text-shadow:0_0_14px_rgba(255,215,0,1),0_0_26px_rgba(255,215,0,0.75)]"
                                : "cursor-pointer text-white [text-shadow:0_0_8px_rgba(255,255,255,0.45)] hover:scale-125 hover:text-cyan-200 hover:[text-shadow:0_0_14px_rgba(165,243,252,0.85)]"
                              : "text-white/28 hover:text-white/45"
                        }`}
                      >
                        {item.staticToken ? item.character : item.unlocked ? item.character : "·"}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "items" && (
          <section className="rounded-xl border border-cyan-900/40 bg-slate-950/30 p-4">
            <div className="mb-3 text-center">
              <h2 className="text-2xl font-bold text-cyan-100">Items 3D Inventory</h2>
              <p className="mt-1 text-sm text-cyan-200/80">100 slots (10 x 10). Upload a 3D model and PNG cover for each slot.</p>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {itemInventory.map((slot, idx) => (
                <div
                  key={slot.id}
                  className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-cyan-700/40 bg-slate-900/70 p-1 text-center transition hover:border-cyan-300/80"
                  title={slot.modelName || `Slot ${slot.id}`}
                  onMouseEnter={(e) => showItemPreview(slot, e)}
                  onMouseLeave={hideItemPreviewSoon}
                >
                  {slot.imageUrl ? (
                    <img src={slot.imageUrl} alt={`Slot ${slot.id}`} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-cyan-200/45">EMPTY</div>
                  )}
                  <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1 text-[9px] text-cyan-100/90">
                    {slot.id}
                  </div>
                  <div className="absolute bottom-1 left-1 right-1 z-20 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <label className="flex-1 cursor-pointer rounded bg-cyan-700/90 px-1 py-[2px] text-[9px] font-bold text-white">
                      3D
                      <input
                        type="file"
                        className="hidden"
                        accept=".glb,.gltf,.obj,.fbx,.stl,.dae,.3ds,.blend"
                        onChange={(e) => handleItemUpload(idx, e.target.files?.[0], "model")}
                      />
                    </label>
                    <label className="flex-1 cursor-pointer rounded bg-fuchsia-700/90 px-1 py-[2px] text-[9px] font-bold text-white">
                      PNG
                      <input
                        type="file"
                        className="hidden"
                        accept=".png,image/png,image/jpeg,image/webp"
                        onChange={(e) => handleItemUpload(idx, e.target.files?.[0], "image")}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {itemPreview?.slot?.imageUrl ? (
              <div
                className="fixed z-[70] w-[680px] rounded-xl border border-cyan-500/40 bg-slate-950/90 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
                style={{ left: `${itemPreview.left}px`, top: `${itemPreview.top}px` }}
                onMouseEnter={clearItemPreviewHideTimer}
                onMouseLeave={hideItemPreviewSoon}
              >
                <p className="mb-2 truncate text-sm font-semibold text-cyan-100">
                  {itemPreview.slot.modelName || `Slot ${itemPreview.slot.id}`}
                </p>
                <div className="overflow-hidden rounded-md border border-cyan-900/60 bg-slate-900">
                  <img
                    src={itemPreview.slot.imageUrl}
                    alt={`Slot ${itemPreview.slot.id} preview`}
                    className="h-[660px] w-full object-contain"
                  />
                </div>
                <p className="mt-2 text-xs text-cyan-200/70">
                  PNG preview mode active. GLB data is still stored and uploadable.
                </p>
              </div>
            ) : null}
          </section>
        )}

        {tab === "hero" && (
          <section className="p-2">
            <div className="grid grid-cols-1 justify-items-center gap-10 lg:grid-cols-2">
              {heroGalleryArtworks.map((art) => (
                <article key={art.id} className="w-full max-w-[520px]">
                  <div className="relative w-full overflow-visible">
                    {art.imageUrl ? (
                      <img src={art.imageUrl} alt={art.description} className="mx-auto block h-auto w-[92%]" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center text-sm text-fuchsia-200/80">
                        Missing image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-center text-xs tracking-[0.08em] text-fuchsia-100/85">{art.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {tabs
          .filter((t) => !["machines", "colour", "chemical", "planets", "heart", "items", "hero"].includes(t.id))
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
