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
import {
  createSiegeState,
  tickSiege,
  setAim,
  tryPlayerFire,
  togglePause,
  chooseUpgrade,
  restartSiege,
  applyCapturePreset,
  PHASE,
} from "./siegeSim.js";
import {
  preloadStyleTestBg,
  renderSiege,
  hitTestUpgrade,
} from "./siegeRender.js";

/**
 * Map pointer event to logical canvas coordinates.
 */
function eventToLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = LOGICAL_WIDTH / rect.width;
  const sy = LOGICAL_HEIGHT / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  };
}

/**
 * Siege Run vertical slice — mouse aim + click fire, waves, upgrades.
 */
export default function SiegeRun({ onExit } = {}) {
  const displayRef = useRef(null);
  const bgRef = useRef(null);
  const stateRef = useRef(null);
  const [bgReady, setBgReady] = useState(false);
  const [hud, setHud] = useState({
    phase: PHASE.combat,
    wave: 1,
    marks: 0,
    hp: 100,
    maxHp: 100,
  });

  useEffect(() => {
    stateRef.current = createSiegeState();
    try {
      const preset = new URLSearchParams(window.location.search).get("siegeCapture");
      if (preset) applyCapturePreset(stateRef.current, preset);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    preloadStyleTestBg()
      .then((img) => {
        if (cancelled) return;
        bgRef.current = img;
        setBgReady(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setBgReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bgReady || !stateRef.current) return;
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
    let last = performance.now();
    let hudAcc = 0;

    const frame = (now) => {
      const state = stateRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickSiege(state, dt);

      renderSiege({
        sceneCtx: scene.ctx,
        outCtx: out.ctx,
        sceneCanvas: scene.canvas,
        scratchCanvas: scratch.canvas,
        scratchCtx: scratch.ctx,
        options: {
          state,
          bgImage: bgRef.current,
          halftone: true,
          dofGrain: true,
        },
      });
      blitNearest(displayCtx, out.canvas, DISPLAY_SCALE);

      hudAcc += dt;
      if (hudAcc > 0.15) {
        hudAcc = 0;
        setHud({
          phase: state.phase,
          wave: state.waveIndex,
          marks: state.marks,
          hp: Math.max(0, Math.round(state.castleHp)),
          maxHp: state.castleMaxHp,
        });
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bgReady]);

  useEffect(() => {
    const onKey = (e) => {
      const state = stateRef.current;
      if (!state) return;
      if (e.key === "Escape") {
        if (state.phase === PHASE.combat || state.phase === PHASE.paused) {
          togglePause(state);
        }
      }
      if (e.key === "r" || e.key === "R") {
        if (e.metaKey || e.ctrlKey) return;
        restartSiege(state);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerMove = (e) => {
    const canvas = displayRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const { x, y } = eventToLogical(canvas, e.clientX, e.clientY);
    setAim(state, x, y);
  };

  const onPointerDown = (e) => {
    const canvas = displayRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const { x, y } = eventToLogical(canvas, e.clientX, e.clientY);
    setAim(state, x, y);

    if (state.phase === PHASE.betweenWaves) {
      const id = hitTestUpgrade(state, x, y);
      if (id) chooseUpgrade(state, id);
      return;
    }
    if (state.phase === PHASE.paused) {
      togglePause(state);
      return;
    }
    if (state.phase === PHASE.victory || state.phase === PHASE.defeat) {
      restartSiege(state);
      return;
    }
    if (state.phase === PHASE.combat) {
      tryPlayerFire(state);
    }
  };

  return (
    <div className="siege-run" data-siege-run="true">
      <div className="siege-run__toolbar">
        <span className="siege-run__stat">
          HP {hud.hp}/{hud.maxHp}
        </span>
        <span className="siege-run__stat">Wave {hud.wave}/10</span>
        <span className="siege-run__stat">Marks {hud.marks}</span>
        <span className="siege-run__stat siege-run__phase">{hud.phase}</span>
        <div className="siege-run__actions">
          <button
            type="button"
            className="siege-run__btn"
            onClick={() => stateRef.current && togglePause(stateRef.current)}
          >
            Pause
          </button>
          <button
            type="button"
            className="siege-run__btn"
            onClick={() => stateRef.current && restartSiege(stateRef.current)}
          >
            Restart
          </button>
          {typeof onExit === "function" && (
            <button type="button" className="siege-run__btn" onClick={onExit}>
              Exit
            </button>
          )}
        </div>
      </div>
      <div className="siege-canvas-shell">
        <canvas
          ref={displayRef}
          className="siege-canvas"
          data-siege-run-canvas="true"
          width={LOGICAL_WIDTH * DISPLAY_SCALE}
          height={LOGICAL_HEIGHT * DISPLAY_SCALE}
          aria-label="Siege Run battlefield"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
        />
      </div>
      <p className="siege-run__hint">
        Aim with mouse, click to fire. One auto watchtower. Esc pause · R restart. Between waves pick
        one of three upgrades.
        {!bgReady ? " · loading BG…" : ""}
      </p>
    </div>
  );
}
