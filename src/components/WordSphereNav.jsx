import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Edit labels and tab targets here.
 * `tabId` must match an id in App.jsx `tabs`.
 */
export const WORD_SPHERE_ITEMS = [
  { label: "Gacha", tabId: "machines", color: "#cbd5e1" },
  { label: "Diorama", tabId: "machines", color: "#00e6b8" },
  { label: "Collection Vault", tabId: "items", color: "#38bdf8" },
  { label: "Plants Gallery", tabId: "plants", color: "#4ade80" },
  { label: "Colour", tabId: "colour", color: "#fb7185" },
  { label: "Elements", tabId: "chemical", color: "#fbbf24" },
  { label: "Planets", tabId: "planets", color: "#818cf8" },
  { label: "心經", tabId: "heart", color: "#facc15" },
  { label: "Stamps", tabId: "stamps", color: "#a78bfa" },
  { label: "Maps", tabId: "maps", color: "#2dd4bf" },
  { label: "AI Arts", tabId: "hero", color: "#e879f9" },
  { label: "HK Towers", tabId: "hk", color: "#22d3ee" },
  { label: "Siege Run", tabId: "tower-defense", color: "#fb923c" },
  { label: "Mimic Insects", tabId: "mimic", color: "#a3e635" },
];

/** Former lower typography-sphere lexicon — secondary labels in the top sphere. */
export const WORD_SPHERE_SECONDARY = [
  "Microcosm", "微觀世界", "Miniature", "微縮模型", "Topography", "地貌", "Ecosystem", "生態系統",
  "Vignette", "情景模型", "Scale Model", "比例模型", "World-Building", "世界觀構建", "Depth of Field", "極致景深",
  "Terrarium", "生態缸", "Isometric", "等距視角", "Cross-Section", "橫截面", "Habitat", "棲息地",
  "Encapsulated", "封裝空間", "Blind Box", "盲盒", "Unlockable", "解鎖", "SSR", "極罕有",
  "Super Rare", "RNG", "隨機機率", "Collection Vault", "收藏庫", "Loot Drop", "掉落戰利品",
  "Silhouette", "剪影解鎖", "Serendipity", "不期而遇", "Glow Effect", "高光特效", "Addictive", "上癮",
  "Sticker Book", "貼紙圖鑑", "Hidden Secret", "隱藏款", "Hyper-Detailed", "超高細節", "Microscopic", "顯微級",
  "Intricate", "錯綜複雜", "Craftsmanship", "工匠精神", "Photorealistic", "極致寫實", "Texture", "物理材質",
  "8K Resolution", "8K 超高清", "Granular", "顆粒感", "Precision", "精準度", "Meticulous", "一絲不苟",
  "Raytracing", "光線追蹤", "Nuance", "細微差別", "More is More", "多即是多", "Organized Chaos", "有序的混亂",
  "Sensory Overload", "感官超載", "Visual Tapestry", "視覺織錦", "Layered", "層次疊加", "Eclectic", "折衷主義",
  "Vibrant", "色彩斑斕", "Kaleidoscope", "萬花筒", "Extravaganza", "狂想曲", "Abundance", "無盡豐盛",
  "Juxtaposition", "碰撞並置", "Opulent", "奢華繁複", "Multiverse", "多重宇宙", "Spectrum", "無盡光譜",
  "Cross-Cultural", "跨文化", "Myriad", "包羅萬象", "Fusion", "極致融合", "Global Heritage", "全球遺產",
  "Flora & Fauna", "動植物相", "Coexistence", "萬物共存", "Boundless", "無邊界", "Omniverse", "全宇宙",
  "Evolution", "生命演化", "Symbiosis", "共生",
];

/** Dense fill for the circular silhouette — capped for 60fps DOM transforms. */
const SECONDARY_TARGET = 140;

const SECONDARY_PALETTE = [
  "#ffffff", "#f8fafc", "#ff8c33", "#fb923c", "#f59e0b", "#facc15", "#fbbf24",
  "#fb7185", "#f472b6", "#e879f9", "#c084fc", "#a78bfa", "#818cf8",
  "#60a5fa", "#38bdf8", "#22d3ee", "#06b6d4", "#00e6b8", "#2dd4bf",
  "#4ade80", "#a3e635", "#fda4af", "#7dd3fc", "#a5f3fc",
];

function secondaryColor(label, index) {
  const hash =
    (index * 2654435761) ^
    [...label].reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 0);
  return SECONDARY_PALETTE[Math.abs(hash) % SECONDARY_PALETTE.length];
}

function densifySecondary(labels, target) {
  if (labels.length === 0) return [];
  const out = [];
  let i = 0;
  while (out.length < target) {
    out.push(labels[i % labels.length]);
    i += 1;
  }
  return out;
}

/**
 * Interleave primary nav so page names sit throughout the sphere,
 * not clustered at the start of the fibonacci spiral.
 */
function buildSphereEntries(primaryItems, secondaryLabels) {
  const secondaryDense = densifySecondary(secondaryLabels, SECONDARY_TARGET);
  const secondary = secondaryDense.map((label, i) => ({
    label,
    tabId: null,
    color: secondaryColor(label, i),
    kind: "secondary",
  }));
  const primary = primaryItems.map((item) => ({
    ...item,
    kind: "primary",
  }));

  if (primary.length === 0) return secondary;

  const merged = [...secondary];
  const step = Math.max(1, Math.floor(merged.length / primary.length));
  primary.forEach((item, i) => {
    const at = Math.min(merged.length, i * step + Math.floor(step / 2));
    merged.splice(at, 0, item);
  });
  return merged;
}

const SPHERE_RADIUS = 200;
const PERSPECTIVE = 520;

/** Even distribution on a sphere (Fibonacci / golden-angle spiral). */
function fibonacciSphere(count, radius) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, z: radius }];

  const golden = Math.PI * (3 - Math.sqrt(5));
  const points = [];

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({
      x: Math.cos(theta) * ring * radius,
      y: y * radius,
      z: Math.sin(theta) * ring * radius,
    });
  }

  return points;
}

function rotatePoint({ x, y, z }, rotX, rotY) {
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  let x1 = x * cosY + z * sinY;
  let z1 = -x * sinY + z * cosY;

  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y1 = y * cosX - z1 * sinX;
  z1 = y * sinX + z1 * cosX;

  return { x: x1, y: y1, z: z1 };
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function WordSphereNav({
  items = WORD_SPHERE_ITEMS,
  secondaryLabels = WORD_SPHERE_SECONDARY,
  onNavigate,
  className = "",
}) {
  const containerRef = useRef(null);
  const discRef = useRef(null);
  const nodeElsRef = useRef([]);
  const rotationRef = useRef({ x: 0.25, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef(null);
  const sizeRef = useRef({ w: 600, h: 500 });
  const reducedMotionRef = useRef(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 500 });

  const entries = useMemo(
    () => buildSphereEntries(items, secondaryLabels),
    [items, secondaryLabels]
  );

  const basePoints = useMemo(
    () => fibonacciSphere(entries.length, SPHERE_RADIUS),
    [entries.length]
  );

  const setNodeEl = useCallback((index, el) => {
    nodeElsRef.current[index] = el;
  }, []);

  const resizeObserver = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const next = { w: el.clientWidth, h: el.clientHeight };
    sizeRef.current = next;
    setSize(next);
  }, []);

  useEffect(() => {
    resizeObserver();
    window.addEventListener("resize", resizeObserver);
    return () => window.removeEventListener("resize", resizeObserver);
  }, [resizeObserver]);

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      reducedMotionRef.current = mq.matches;
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // RAF loop: mutate transforms/opacity only — no React setState per frame.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const points = basePoints;
    const list = entries;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const { w, h } = sizeRef.current;
      const drawRadius = Math.min(w, h) * 0.5;
      const cx = w / 2;
      const cy = h / 2;
      const radiusScale = drawRadius / SPHERE_RADIUS;

      const disc = discRef.current;
      if (disc) {
        const d = drawRadius * 2;
        disc.style.width = `${d}px`;
        disc.style.height = `${d}px`;
      }

      const hovered = hoveredRef.current;
      const mouse = mouseRef.current;
      const reduced = reducedMotionRef.current;
      const speedScale = reduced ? 0 : hovered === null ? 1 : 0.15;

      const autoY = 0.42 * speedScale;
      const autoX = 0.12 * speedScale;
      const mouseY = mouse.x * 0.85 * speedScale;
      const mouseX = mouse.y * 0.65 * speedScale;

      rotationRef.current.y += (autoY + mouseY) * dt;
      rotationRef.current.x += (autoX + mouseX) * dt;

      const { x: rotX, y: rotY } = rotationRef.current;
      const els = nodeElsRef.current;

      for (let i = 0; i < list.length; i++) {
        const el = els[i];
        if (!el) continue;

        const item = list[i];
        const rotated = rotatePoint(points[i], rotX, rotY);
        const { x, y, z } = rotated;
        const depth = (z + SPHERE_RADIUS) / (2 * SPHERE_RADIUS);
        const perspectiveScale = PERSPECTIVE / (PERSPECTIVE + z);
        const isSecondary = item.kind === "secondary";
        const isHovered = !isSecondary && hovered === i;

        const opacity = isHovered
          ? 1
          : isSecondary
            ? 0.14 + depth * 0.55
            : 0.35 + depth * 0.65;
        const scale = isHovered
          ? Math.max(0.78 + depth * 0.55, 1.05) * 1.12
          : isSecondary
            ? 0.42 + depth * 0.34
            : 0.78 + depth * 0.55;

        const screenX = cx + x * radiusScale * perspectiveScale;
        const screenY = cy + y * radiusScale * perspectiveScale;
        const zIndex = isHovered
          ? 2000
          : Math.round(z + SPHERE_RADIUS) + (isSecondary ? 0 : 40);

        el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%) scale(${scale})`;
        el.style.opacity = String(opacity);
        el.style.zIndex = String(zIndex);

        if (!isSecondary) {
          if (isHovered) {
            el.style.color = item.color;
            el.style.textShadow = `0 0 16px ${item.color}, 0 0 32px ${item.color}88, 0 0 4px #fff`;
          } else {
            el.style.color = `color-mix(in srgb, ${item.color} 82%, #f8fafc)`;
            el.style.textShadow = `0 0 10px ${item.color}55, 0 1px 2px rgba(0,0,0,0.55)`;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entries, basePoints]);

  const handleMouseMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current = { x: 0, y: 0 };
  };

  const handleWordEnter = (index, kind) => {
    if (kind === "secondary") return;
    hoveredRef.current = index;
    setHoveredIndex(index);
  };

  const handleWordLeave = () => {
    hoveredRef.current = null;
    setHoveredIndex(null);
  };

  const handleWordClick = (tabId) => {
    if (tabId && onNavigate) onNavigate(tabId);
  };

  const drawRadius = Math.min(size.w, size.h) * 0.5;

  return (
    <div
      ref={containerRef}
      className={`word-sphere-nav relative mx-auto select-none ${className}`.trim()}
      style={{
        // Fit under the title: leave ~15rem for hero header + padding, still larger than prior ~560px disc.
        width: "min(calc(100vh - 15rem), 72vw, 700px)",
        height: "min(calc(100vh - 15rem), 72vw, 700px)",
        maxWidth: "100%",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Archive navigation sphere"
    >
      <div
        ref={discRef}
        className="word-sphere-nav__disc pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: drawRadius * 2,
          height: drawRadius * 2,
        }}
        aria-hidden
      />
      {entries.map((item, index) => {
        const isSecondary = item.kind === "secondary";
        const primarySize = item.label.length > 14 ? "1.18rem" : "1.42rem";
        // Modest bump vs prior sizes — still clearly below primary.
        const secondarySize = item.label.length > 10 ? "0.68rem" : "0.8rem";

        if (isSecondary) {
          return (
            <span
              key={`sec-${item.label}-${index}`}
              ref={(el) => setNodeEl(index, el)}
              className="word-sphere-nav__tag word-sphere-nav__tag--secondary absolute whitespace-nowrap pointer-events-none tracking-wide"
              aria-hidden
              style={{
                left: 0,
                top: 0,
                transform: "translate3d(-9999px, -9999px, 0)",
                opacity: 0,
                zIndex: 0,
                color: `color-mix(in srgb, ${item.color} 48%, #64748b)`,
                fontSize: secondarySize,
                fontWeight: 300,
              }}
            >
              {item.label}
            </span>
          );
        }

        return (
          <button
            key={`pri-${item.label}-${index}`}
            ref={(el) => setNodeEl(index, el)}
            type="button"
            className="word-sphere-nav__tag absolute whitespace-nowrap border-none bg-transparent font-bold tracking-wide"
            style={{
              left: 0,
              top: 0,
              transform: "translate3d(-9999px, -9999px, 0)",
              opacity: 0,
              zIndex: 40,
              color: `color-mix(in srgb, ${item.color} 82%, #f8fafc)`,
              textShadow: `0 0 10px ${item.color}55, 0 1px 2px rgba(0,0,0,0.55)`,
              fontSize: primarySize,
            }}
            aria-pressed={hoveredIndex === index}
            onMouseEnter={() => handleWordEnter(index, item.kind)}
            onMouseLeave={handleWordLeave}
            onClick={() => handleWordClick(item.tabId)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
