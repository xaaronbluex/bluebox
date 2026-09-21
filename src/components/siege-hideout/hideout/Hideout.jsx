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
  bootHideout,
  snapshotHideout,
  collectBuilding,
  collectAll,
  upgradeBuilding,
  applyHideoutCapturePreset,
  syncProduction,
} from "./hideoutSim.js";
import { RESOURCES } from "./configs/resources.js";
import {
  preloadStyleTestBg,
  renderHideout,
  hitTestBuilding,
} from "./hideoutRender.js";

function eventToLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = LOGICAL_WIDTH / rect.width;
  const sy = LOGICAL_HEIGHT / rect.height;
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
  };
}

function costLabel(cost) {
  if (!cost) return "MAX";
  return Object.entries(cost)
    .map(([k, v]) => `${v} ${RESOURCES[k]?.short || k}`)
    .join(" · ");
}

/**
 * Hideout vertical slice — AFK producers, collect, upgrade, Siege bonus handoff.
 */
export default function Hideout({ onExit } = {}) {
  const displayRef = useRef(null);
  const bgRef = useRef(null);
  const saveRef = useRef(null);
  const claimedRef = useRef(null);
  const selectedRef = useRef(null);
  const [bgReady, setBgReady] = useState(false);
  const [hud, setHud] = useState({
    resources: { supplies: 0, stone: 0, marks: 0 },
    selected: null,
    claimed: null,
    readyCount: 0,
  });
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const { save, claimed } = bootHideout();
    try {
      const preset = new URLSearchParams(window.location.search).get(
        "hideoutCapture",
      );
      if (preset) applyHideoutCapturePreset(save, preset);
    } catch {
      /* ignore */
    }
    saveRef.current = save;
    claimedRef.current = claimed;
    if (claimed) {
      setFlash(
        `Siege spoils · +${claimed.supplies} Sup · +${claimed.stone} Stn · +${claimed.marks} Seals`,
      );
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
    if (!bgReady || !saveRef.current) return;
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
    let lastHud = 0;

    const frame = (now) => {
      const save = saveRef.current;
      syncProduction(save, Date.now());
      const snap = snapshotHideout(save, Date.now());

      renderHideout({
        sceneCtx: scene.ctx,
        outCtx: out.ctx,
        sceneCanvas: scene.canvas,
        scratchCanvas: scratch.canvas,
        scratchCtx: scratch.ctx,
        options: {
          snapshot: snap,
          bgImage: bgRef.current,
          selectedId: selectedRef.current,
          claimed: claimedRef.current,
          halftone: true,
          dofGrain: true,
          now,
        },
      });
      blitNearest(displayCtx, out.canvas, DISPLAY_SCALE);

      if (now - lastHud > 200) {
        lastHud = now;
        const selected =
          snap.buildings.find((b) => b.id === selectedRef.current) || null;
        setHud({
          resources: snap.resources,
          selected,
          claimed: claimedRef.current,
          readyCount: snap.buildings.filter((b) => b.ready).length,
          bonuses: snap.siegeBonuses,
        });
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bgReady]);

  const refreshFlash = (msg) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((f) => (f === msg ? "" : f)), 2200);
  };

  const onPointerDown = (e) => {
    const canvas = displayRef.current;
    const save = saveRef.current;
    if (!canvas || !save) return;
    const { x, y } = eventToLogical(canvas, e.clientX, e.clientY);
    const snap = snapshotHideout(save);
    const id = hitTestBuilding(snap, x, y);
    if (!id) return;
    selectedRef.current = id;
    const b = snap.buildings.find((row) => row.id === id);
    if (b?.ready) {
      const r = collectBuilding(save, id);
      if (r.ok) {
        refreshFlash(`Collected +${r.amount} ${RESOURCES[r.resource]?.label || r.resource}`);
      }
    }
  };

  const onCollectSelected = () => {
    const save = saveRef.current;
    const id = selectedRef.current;
    if (!save || !id) return;
    const r = collectBuilding(save, id);
    if (r.ok) {
      refreshFlash(`Collected +${r.amount} ${RESOURCES[r.resource]?.label || r.resource}`);
    } else {
      refreshFlash("Nothing ready — wait for the cycle.");
    }
  };

  const onCollectAll = () => {
    const save = saveRef.current;
    if (!save) return;
    const r = collectAll(save);
    refreshFlash(r.total > 0 ? `Collected ${r.total} goods` : "No stock ready");
  };

  const onUpgrade = () => {
    const save = saveRef.current;
    const id = selectedRef.current;
    if (!save || !id) return;
    const r = upgradeBuilding(save, id);
    if (r.ok) {
      refreshFlash(`Upgraded ${id} → L${save.buildings[id].level}`);
    } else if (r.reason === "cost") {
      refreshFlash("Need more resources for that upgrade.");
    } else if (r.reason === "max") {
      refreshFlash("Already at max level.");
    }
  };

  const sel = hud.selected;

  return (
    <div className="hideout" data-hideout="true">
      <div className="hideout__toolbar">
        <span className="hideout__stat">
          Sup {hud.resources.supplies}
        </span>
        <span className="hideout__stat">
          Stn {hud.resources.stone}
        </span>
        <span className="hideout__stat hideout__stat--marks">
          Seals {hud.resources.marks}
        </span>
        <span className="hideout__stat">
          Ready {hud.readyCount}
        </span>
        <div className="hideout__actions">
          <button type="button" className="hideout__btn" onClick={onCollectAll}>
            Collect all
          </button>
          <button
            type="button"
            className="hideout__btn"
            onClick={onCollectSelected}
            disabled={!sel}
          >
            Collect
          </button>
          <button
            type="button"
            className="hideout__btn"
            onClick={onUpgrade}
            disabled={!sel || !sel.upgradeCost}
          >
            Upgrade
          </button>
          {typeof onExit === "function" && (
            <button type="button" className="hideout__btn" onClick={onExit}>
              Exit
            </button>
          )}
        </div>
      </div>

      <div className="siege-canvas-shell">
        <canvas
          ref={displayRef}
          className="siege-canvas hideout__canvas"
          data-hideout-canvas="true"
          width={LOGICAL_WIDTH * DISPLAY_SCALE}
          height={LOGICAL_HEIGHT * DISPLAY_SCALE}
          aria-label="Hideout settlement"
          onPointerDown={onPointerDown}
        />
      </div>

      <div className="hideout__panel">
        {sel ? (
          <>
            <strong>{sel.label}</strong>
            <span className="hideout__muted"> · {sel.role} · L{sel.level}/{sel.maxLevel}</span>
            <p>
              Produces <em>{RESOURCES[sel.output]?.label}</em> every{" "}
              {Math.round(sel.cycleMs / 60000)} min · stock {sel.pending}/{sel.cap}
              {sel.ready ? " · READY" : ` · ${Math.floor(sel.progress * 100)}%`}
            </p>
            <p className="hideout__muted">
              Upgrade: {costLabel(sel.upgradeCost)}
            </p>
          </>
        ) : (
          <p className="hideout__muted">
            Click a building to select. Ready buildings pulse — click again or use Collect.
            Upgrades feed permanent Siege Run bonuses.
          </p>
        )}
        {flash ? <p className="hideout__flash">{flash}</p> : null}
      </div>

      <p className="hideout__hint">
        AFK timers keep running offline (localStorage). Finish a Siege Run to earn spoils here.
        {!bgReady ? " · loading BG…" : ""}
      </p>
    </div>
  );
}
