import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Edit labels and tab targets here.
 * `tabId` must match an id in App.jsx `tabs` (or use onEnter for main archive).
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

/** Dense fill for the circular silhouette (mockup-like), without drowning primary nav. */
const SECONDARY_TARGET = 220;

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

export default function WordSphereNav({
  items = WORD_SPHERE_ITEMS,
  secondaryLabels = WORD_SPHERE_SECONDARY,
  onNavigate,
  className = "",
}) {
  const containerRef = useRef(null);
  const rotationRef = useRef({ x: 0.25, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef(null);
  const [frame, setFrame] = useState(0);
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

  const resizeObserver = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setSize({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  useEffect(() => {
    resizeObserver();
    window.addEventListener("resize", resizeObserver);
    return () => window.removeEventListener("resize", resizeObserver);
  }, [resizeObserver]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const hovered = hoveredRef.current;
      const mouse = mouseRef.current;
      const speedScale = hovered === null ? 1 : 0.15;

      const autoY = 0.42 * speedScale;
      const autoX = 0.12 * speedScale;
      const mouseY = mouse.x * 0.85 * speedScale;
      const mouseX = mouse.y * 0.65 * speedScale;

      rotationRef.current.y += (autoY + mouseY) * dt;
      rotationRef.current.x += (autoX + mouseX) * dt;

      setFrame((f) => (f + 1) % 100000);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const drawRadius = Math.min(size.w, size.h) * 0.46;

  const projected = useMemo(() => {
    const { x: rotX, y: rotY } = rotationRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const radiusScale = drawRadius / SPHERE_RADIUS;

    const nodes = entries.map((item, i) => {
      const rotated = rotatePoint(basePoints[i], rotX, rotY);
      const { x, y, z } = rotated;
      const depth = (z + SPHERE_RADIUS) / (2 * SPHERE_RADIUS);
      const perspectiveScale = PERSPECTIVE / (PERSPECTIVE + z);
      const isSecondary = item.kind === "secondary";

      return {
        ...item,
        index: i,
        x,
        y,
        z,
        depth,
        screenX: cx + x * radiusScale * perspectiveScale,
        screenY: cy + y * radiusScale * perspectiveScale,
        opacity: isSecondary
          ? 0.12 + depth * 0.55
          : 0.35 + depth * 0.65,
        scale: isSecondary
          ? 0.38 + depth * 0.32
          : 0.78 + depth * 0.55,
        blur: (1 - depth) * (isSecondary ? 1.6 : 2.8),
      };
    });

    return nodes.sort((a, b) => a.z - b.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frame drives rotation updates
  }, [entries, basePoints, size, frame, drawRadius]);

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

  return (
    <div
      ref={containerRef}
      className={`word-sphere-nav relative mx-auto w-full select-none ${className}`.trim()}
      style={{ height: "min(68vh, 620px)", maxWidth: "56rem" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Archive navigation sphere"
    >
      <div
        className="word-sphere-nav__disc pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: drawRadius * 2,
          height: drawRadius * 2,
        }}
        aria-hidden
      />
      {projected.map((node) => {
        const isSecondary = node.kind === "secondary";
        const isHovered = !isSecondary && hoveredIndex === node.index;
        const opacity = isHovered ? 1 : node.opacity;
        const scale = isHovered ? Math.max(node.scale, 1.05) * 1.12 : node.scale;
        const blur = isHovered ? 0 : node.blur;
        const primarySize = node.label.length > 14 ? "1.05rem" : "1.28rem";
        const secondarySize = node.label.length > 10 ? "0.4rem" : "0.46rem";

        if (isSecondary) {
          return (
            <span
              key={`sec-${node.label}-${node.index}`}
              className="word-sphere-nav__tag word-sphere-nav__tag--secondary absolute whitespace-nowrap pointer-events-none tracking-wide"
              aria-hidden
              style={{
                left: node.screenX,
                top: node.screenY,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity,
                filter: blur > 0.1 ? `blur(${blur}px)` : "none",
                zIndex: Math.round(node.z + SPHERE_RADIUS),
                color: `color-mix(in srgb, ${node.color} 48%, #64748b)`,
                textShadow: node.depth > 0.6 ? `0 0 5px ${node.color}18` : "none",
                fontSize: secondarySize,
                fontWeight: 300,
              }}
            >
              {node.label}
            </span>
          );
        }

        return (
          <button
            key={`pri-${node.label}-${node.index}`}
            type="button"
            className="word-sphere-nav__tag absolute whitespace-nowrap border-none bg-transparent font-bold tracking-wide transition-[color,text-shadow] duration-200"
            style={{
              left: node.screenX,
              top: node.screenY,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              filter: blur > 0.1 ? `blur(${blur}px)` : "none",
              zIndex: isHovered ? 2000 : Math.round(node.z + SPHERE_RADIUS) + 40,
              color: isHovered ? node.color : `color-mix(in srgb, ${node.color} 82%, #f8fafc)`,
              textShadow: isHovered
                ? `0 0 16px ${node.color}, 0 0 32px ${node.color}88, 0 0 4px #fff`
                : `0 0 10px ${node.color}55, 0 1px 2px rgba(0,0,0,0.55)`,
              fontSize: primarySize,
            }}
            onMouseEnter={() => handleWordEnter(node.index, node.kind)}
            onMouseLeave={handleWordLeave}
            onClick={() => handleWordClick(node.tabId)}
          >
            {node.label}
          </button>
        );
      })}
    </div>
  );
}
