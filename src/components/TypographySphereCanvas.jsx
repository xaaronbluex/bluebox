import { useEffect, useMemo, useRef } from "react";

/** Exact bilingual word list — duplicated to 300+ labels on the sphere. */
const BASE_WORDS = [
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

const TARGET_COUNT = 320;
const SPHERE_RADIUS = 1;
const PERSPECTIVE = 2.8;
const FONT_STACK = "'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', 'Heiti TC', sans-serif";
const MAX_DPR = 2;
const MIN_OPACITY = 0.05;
const MIN_DRAW_SCALE = 0.22;
const SPHERE_SIZE_RATIO = 0.48;

const PALETTE = [
  "#ffffff", "#f8fafc", "#ff8c33", "#fb923c", "#f59e0b", "#facc15", "#fbbf24",
  "#fb7185", "#f472b6", "#ff4dd8", "#e879f9", "#c084fc", "#a78bfa", "#818cf8",
  "#6366f1", "#60a5fa", "#38bdf8", "#22d3ee", "#06b6d4", "#00e6b8", "#2dd4bf",
  "#14b8a6", "#4ade80", "#a3e635", "#84cc16", "#f87171", "#ef4444", "#fda4af",
  "#7dd3fc", "#a5f3fc",
];

function pickColor(seed, text) {
  const hash =
    (seed * 2654435761) ^
    [...text].reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 0);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function buildDenseWordList() {
  const out = [];
  let i = 0;
  while (out.length < TARGET_COUNT) {
    const word = BASE_WORDS[i % BASE_WORDS.length];
    const seed = out.length;
    out.push({
      text: word,
      color: pickColor(seed, word),
      baseSize: 6 + (seed % 4) + (word.length > 10 ? 0 : 1),
    });
    i += 1;
  }
  return out;
}

function fibonacciSphere(count, radius) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: 0, y: 0, z: radius }];

  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  for (let j = 0; j < count; j++) {
    const y = 1 - (j / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * j;
    pts.push({
      x: Math.cos(theta) * ring * radius,
      y: y * radius,
      z: Math.sin(theta) * ring * radius,
    });
  }
  return pts;
}

function rotate3d(x, y, z, rotX, rotY) {
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

/** Draw each label once to an off-screen canvas; animation only uses drawImage. */
function buildSpriteCache(wordList) {
  const cache = new Map();
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");

  const getSprite = (text, color, baseSize) => {
    const key = `${text}|${color}|${baseSize}`;
    if (cache.has(key)) return cache.get(key);

    const renderSize = Math.ceil(baseSize * 1.35);
    const pad = 6;
    measureCtx.font = `bold ${renderSize}px ${FONT_STACK}`;
    const metrics = measureCtx.measureText(text);
    const w = Math.ceil(metrics.width) + pad * 2;
    const h = Math.ceil(renderSize * 1.25) + pad * 2;

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    octx.font = `bold ${renderSize}px ${FONT_STACK}`;
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = color;
    octx.fillText(text, w / 2, h / 2);

    const sprite = { canvas: off, w, h, renderSize };
    cache.set(key, sprite);
    return sprite;
  };

  return wordList.map((item) => getSprite(item.text, item.color, item.baseSize));
}

export default function TypographySphereCanvas({ className = "" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rotationRef = useRef({ x: 0.35, y: 0 });
  const spritesRef = useRef(null);
  const positionsRef = useRef(null);
  const sortBufRef = useRef(null);

  const words = useMemo(() => buildDenseWordList(), []);
  const positions = useMemo(() => fibonacciSphere(words.length, SPHERE_RADIUS), [words.length]);
  const sprites = useMemo(() => buildSpriteCache(words), [words]);

  useEffect(() => {
    spritesRef.current = sprites;
    positionsRef.current = positions;
    sortBufRef.current = new Array(words.length);
  }, [sprites, positions, words.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let raf = 0;
    let last = performance.now();
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const draw = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      rotationRef.current.y += 0.38 * dt;
      rotationRef.current.x += 0.14 * dt;

      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;
      const spriteList = spritesRef.current;
      const pts = positionsRef.current;
      const sortBuf = sortBufRef.current;

      if (!spriteList || !pts || !sortBuf || width === 0 || height === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const cx = width / 2;
      const cy = height / 2;
      const drawRadius = Math.min(width, height) * SPHERE_SIZE_RATIO;
      const count = pts.length;
      let visible = 0;

      for (let i = 0; i < count; i++) {
        const p = pts[i];
        const r = rotate3d(p.x, p.y, p.z, rotX, rotY);
        const depth = (r.z + SPHERE_RADIUS) / (2 * SPHERE_RADIUS);
        const persp = PERSPECTIVE / (PERSPECTIVE + r.z);
        const edgeBoost = 1 + (1 - Math.abs(r.y / SPHERE_RADIUS)) * 0.08;
        const fontSize = spriteList[i].renderSize * (0.3 + depth * 0.72) * edgeBoost;
        const opacity = 0.1 + depth * 0.9;
        const scale = fontSize / spriteList[i].renderSize;

        if (opacity < MIN_OPACITY || scale < MIN_DRAW_SCALE) continue;

        const sx = cx + r.x * drawRadius * persp;
        const sy = cy + r.y * drawRadius * persp;
        const dist = Math.hypot(sx - cx, sy - cy);
        if (dist > drawRadius * 0.99) continue;

        const rim = dist / drawRadius;
        const alpha = Math.min(1, opacity * (rim > 0.72 ? 1 + (rim - 0.72) * 0.35 : 1));
        if (alpha < MIN_OPACITY) continue;

        sortBuf[visible++] = { i, z: r.z, sx, sy, alpha, scale };
      }

      if (visible > 1) {
        sortBuf.length = visible;
        sortBuf.sort((a, b) => a.z - b.z);
      }

      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
      ctx.clip();

      for (let k = 0; k < visible; k++) {
        const node = sortBuf[k];
        const sprite = spriteList[node.i];
        const dw = sprite.w * node.scale;
        const dh = sprite.h * node.scale;

        ctx.globalAlpha = node.alpha;
        ctx.drawImage(sprite.canvas, node.sx - dw / 2, node.sy - dh / 2, dw, dh);
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`typography-sphere-canvas relative mx-auto w-full ${className}`.trim()}
      style={{ height: "min(62vh, 560px)", maxWidth: "56rem" }}
      aria-hidden
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

