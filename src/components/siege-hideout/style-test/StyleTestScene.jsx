import { useEffect, useRef, useState } from "react";
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  DISPLAY_SCALE,
  createBuffer,
  blitNearest,
  disableSmoothing,
  displaySize,
} from "../shared/canvasScale.js";
import { renderStyleTest } from "./styleTestRender.js";

/**
 * Style-test visual proof — v5 parchment isometric bridge + campaign-map strip.
 */
function readToggleParam(name, defaultOn = true) {
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    if (v === "off" || v === "0") return false;
    if (v === "on" || v === "1") return true;
  } catch {
    /* ignore */
  }
  return defaultOn;
}

export default function StyleTestScene() {
  const displayRef = useRef(null);
  const [halftone, setHalftone] = useState(() => readToggleParam("halftone", true));
  const [dofGrain, setDofGrain] = useState(() => readToggleParam("dof", true));
  const togglesRef = useRef({
    halftone: readToggleParam("halftone", true),
    dofGrain: readToggleParam("dof", true),
  });

  useEffect(() => {
    togglesRef.current = { halftone, dofGrain };
  }, [halftone, dofGrain]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "d" || e.key === "D") {
        setHalftone((v) => !v);
      }
      if (e.key === "g" || e.key === "G") {
        setDofGrain((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const display = displayRef.current;
    if (!display) return;

    const { width: dw, height: dh } = displaySize(DISPLAY_SCALE);
    display.width = dw;
    display.height = dh;
    const displayCtx = display.getContext("2d");
    disableSmoothing(displayCtx);

    const scene = createBuffer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    const out = createBuffer(LOGICAL_WIDTH, LOGICAL_HEIGHT);
    const scratch = createBuffer(LOGICAL_WIDTH, LOGICAL_HEIGHT);

    let raf = 0;
    const start = performance.now();

    const frame = (now) => {
      const { halftone: h, dofGrain: g } = togglesRef.current;
      renderStyleTest({
        sceneCtx: scene.ctx,
        outCtx: out.ctx,
        sceneCanvas: scene.canvas,
        scratchCanvas: scratch.canvas,
        scratchCtx: scratch.ctx,
        options: { halftone: h, dofGrain: g, timeMs: now - start },
      });
      blitNearest(displayCtx, out.canvas, DISPLAY_SCALE);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="siege-style-test">
      <div className="siege-style-test__toolbar">
        <label className="siege-style-test__toggle">
          <input
            type="checkbox"
            checked={halftone}
            onChange={(e) => setHalftone(e.target.checked)}
          />
          Halftone / dither <kbd>D</kbd>
        </label>
        <label className="siege-style-test__toggle">
          <input
            type="checkbox"
            checked={dofGrain}
            onChange={(e) => setDofGrain(e.target.checked)}
          />
          DoF + grain <kbd>G</kbd>
        </label>
        <span className="siege-style-test__meta">
          {LOGICAL_WIDTH}×{LOGICAL_HEIGHT} ×{DISPLAY_SCALE}
        </span>
      </div>
      <div className="siege-canvas-shell">
        <canvas
          ref={displayRef}
          className="siege-canvas"
          data-style-test-canvas="true"
          width={LOGICAL_WIDTH * DISPLAY_SCALE}
          height={LOGICAL_HEIGHT * DISPLAY_SCALE}
          aria-label="Siege Run style test scene"
        />
      </div>
      <p className="siege-style-test__hint">
        Style test v5 — parchment isometric bridge (960×540), royal blue vs crimson, campaign-map strip. Original marks only.
      </p>
    </div>
  );
}
