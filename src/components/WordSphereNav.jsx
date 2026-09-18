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

export default function WordSphereNav({ items = WORD_SPHERE_ITEMS, onNavigate, className = "" }) {
  const containerRef = useRef(null);
  const rotationRef = useRef({ x: 0.25, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef(null);
  const [frame, setFrame] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 500 });

  const basePoints = useMemo(
    () => fibonacciSphere(items.length, SPHERE_RADIUS),
    [items.length]
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

  const projected = useMemo(() => {
    const { x: rotX, y: rotY } = rotationRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;

    const nodes = items.map((item, i) => {
      const rotated = rotatePoint(basePoints[i], rotX, rotY);
      const { x, y, z } = rotated;
      const depth = (z + SPHERE_RADIUS) / (2 * SPHERE_RADIUS);
      const perspectiveScale = PERSPECTIVE / (PERSPECTIVE + z);

      return {
        ...item,
        index: i,
        x,
        y,
        z,
        depth,
        screenX: cx + x * perspectiveScale,
        screenY: cy + y * perspectiveScale,
        opacity: 0.18 + depth * 0.82,
        scale: 0.6 + depth * 0.72,
        blur: (1 - depth) * 3.5,
      };
    });

    return nodes.sort((a, b) => a.z - b.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- frame drives rotation updates
  }, [items, basePoints, size, frame]);

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

  const handleWordEnter = (index) => {
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
      style={{ height: "min(62vh, 560px)", maxWidth: "56rem" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="navigation"
      aria-label="Archive navigation sphere"
    >
      {projected.map((node) => {
        const isHovered = hoveredIndex === node.index;
        const opacity = isHovered ? 1 : node.opacity;
        const scale = isHovered ? Math.max(node.scale, 1.05) * 1.12 : node.scale;
        const blur = isHovered ? 0 : node.blur;

        return (
          <button
            key={`${node.label}-${node.index}`}
            type="button"
            className="word-sphere-nav__tag absolute whitespace-nowrap border-none bg-transparent font-bold tracking-wide transition-[color,text-shadow] duration-200"
            style={{
              left: node.screenX,
              top: node.screenY,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              filter: blur > 0.1 ? `blur(${blur}px)` : "none",
              zIndex: isHovered ? 2000 : Math.round(node.z + SPHERE_RADIUS),
              color: isHovered ? node.color : `color-mix(in srgb, ${node.color} 75%, #e2e8f0)`,
              textShadow: isHovered
                ? `0 0 16px ${node.color}, 0 0 32px ${node.color}88, 0 0 4px #fff`
                : node.depth > 0.55
                  ? `0 0 8px ${node.color}44`
                  : "none",
              fontSize: node.label.length > 14 ? "0.88rem" : "1.05rem",
            }}
            onMouseEnter={() => handleWordEnter(node.index)}
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
