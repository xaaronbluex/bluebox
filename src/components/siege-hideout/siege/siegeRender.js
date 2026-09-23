/**
 * Canvas presentation for Siege Run — reads sim snapshot, draws on a plain playfield.
 * Theme-ref parchment BG is intentionally unused here (logic polish first).
 */

import { PALETTE } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither } from "../shared/dither.js";
import { applyEdgeDof, applyGrain, applyVignette, drawInkFrame } from "../shared/dofGrain.js";
import { getEnemyDef } from "./configs/enemies.js";
import { CASTLE, AUTO_TOWER, PLAYER_WEAPON } from "./configs/weapons.js";
import { WAVE_COUNT } from "./configs/waves.js";
import { PHASE } from "./siegeSim.js";
import {
  getPlayerMuzzle,
  sampleBallisticArc,
  velocityFromLaunch,
} from "./ballistic.js";

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

/** Flat playfield — no theme-ref image. Dark so units / HUD stay readable. */
const PLAYFIELD_BG = PALETTE.charcoal;

function fillRgb(ctx, hex, x, y, w, h) {
  ctx.fillStyle = hex;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Minimal keep silhouette so the left contact line is visible without theme art. */
function drawCastle(ctx) {
  const { x, y } = CASTLE.anchor;
  fillRgb(ctx, PALETTE.navyDeep, x - 42, y - 70, 84, 90);
  fillRgb(ctx, PALETTE.navy, x - 36, y - 62, 72, 78);
  fillRgb(ctx, PALETTE.charcoalMid, x - 42, y - 78, 18, 16);
  fillRgb(ctx, PALETTE.charcoalMid, x - 9, y - 84, 18, 22);
  fillRgb(ctx, PALETTE.charcoalMid, x + 24, y - 78, 18, 16);
  fillRgb(ctx, PALETTE.brass, x + 28, y - 40, 8, 28);
  fillRgb(ctx, PALETTE.royalLit, x - 10, y - 28, 14, 22);
}

function drawHpBar(ctx, x, y, w, h, ratio, fill = PALETTE.redSignal) {
  fillRgb(ctx, PALETTE.charcoal, x, y, w, h);
  const fw = Math.max(0, Math.round(w * Math.max(0, Math.min(1, ratio))));
  if (fw > 0) fillRgb(ctx, fill, x + 1, y + 1, Math.max(0, fw - 2), h - 2);
}

function drawEnemy(ctx, e) {
  const def = getEnemyDef(e.type);
  const r = e.radius;
  const x = Math.round(e.x);
  const y = Math.round(e.y);

  // Shadow
  ctx.fillStyle = "rgba(29,32,32,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  if (e.type === "brute") {
    fillRgb(ctx, def.color, x - r, y - r * 1.1, r * 2, r * 2.1);
    fillRgb(ctx, def.accent, x - r * 0.4, y - r * 1.4, r * 0.8, r * 0.5);
    fillRgb(ctx, PALETTE.woodDark, x + r * 0.6, y - r * 0.2, r * 0.7, r * 0.35);
  } else if (e.type === "shield") {
    fillRgb(ctx, def.color, x - r * 0.7, y - r, r * 1.4, r * 2);
    fillRgb(ctx, def.accent, x - r * 1.1, y - r * 0.6, r * 0.55, r * 1.4);
  } else if (e.type === "scout") {
    fillRgb(ctx, def.color, x - r * 0.7, y - r, r * 1.3, r * 1.8);
    fillRgb(ctx, def.accent, x + r * 0.2, y - r * 0.3, r * 0.6, r * 0.4);
  } else if (e.type === "ranged") {
    fillRgb(ctx, def.color, x - r * 0.75, y - r, r * 1.4, r * 1.9);
    fillRgb(ctx, def.accent, x - r * 1.2, y - r * 0.2, r * 0.7, r * 0.25);
  } else {
    fillRgb(ctx, def.color, x - r * 0.8, y - r, r * 1.5, r * 1.9);
    fillRgb(ctx, PALETTE.charcoalMid, x - r * 0.35, y - r * 1.15, r * 0.7, r * 0.4);
  }

  if (e.hp < e.maxHp) {
    drawHpBar(ctx, x - r, y - r - 8, r * 2, 3, e.hp / e.maxHp, PALETTE.fireMid);
  }
}

function drawProjectile(ctx, p) {
  const fill = p.team === "player" ? PALETTE.brass : PALETTE.crimson;
  fillRgb(ctx, fill, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
  if (p.team === "player") {
    fillRgb(ctx, PALETTE.fireHot, p.x - 1, p.y - 1, 2, 2);
  }
}

function drawFx(ctx, f) {
  const a = Math.max(0, f.life / f.maxLife);
  if (f.kind === "spark" || f.kind === "kill") {
    ctx.fillStyle = `rgba(242,230,160,${0.7 * a})`;
    ctx.fillRect(Math.round(f.x - 3), Math.round(f.y - 3), 6, 6);
  } else if (f.kind === "hitCastle") {
    ctx.fillStyle = `rgba(183,51,46,${0.55 * a})`;
    ctx.fillRect(Math.round(f.x - 6), Math.round(f.y - 8), 12, 16);
  }
}

function drawAim(ctx, state) {
  if (state.phase !== PHASE.combat && state.phase !== PHASE.paused) return;

  const { x: mx, y: my } = getPlayerMuzzle();
  // Preview uses the same cursor-locked launch as fire (no lag vs pointer).
  const { vx, vy } = velocityFromLaunch(state.aimAngle, state.aimSpeed);
  const points = sampleBallisticArc(mx, my, vx, vy, PLAYER_WEAPON.gravity, {
    dt: 1 / 60,
    maxSteps: 96,
  });

  // Dotted arc — sample every few integration steps so spacing tracks speed.
  const stride = 3;
  for (let i = stride; i < points.length; i += stride) {
    const p = points[i];
    const fade = 1 - i / points.length;
    const r = i % (stride * 2) === 0 ? 2 : 1.5;
    ctx.fillStyle = `rgba(242,230,160,${0.25 + 0.45 * fade})`;
    ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
  }

  // Power pip near muzzle
  const powerT = Math.max(
    0,
    Math.min(
      1,
      (state.aimSpeed / (state.mods?.projSpeedMul || 1) - PLAYER_WEAPON.minLaunchSpeed) /
        Math.max(1, PLAYER_WEAPON.maxLaunchSpeed - PLAYER_WEAPON.minLaunchSpeed),
    ),
  );
  fillRgb(ctx, PALETTE.charcoal, mx - 14, my + 10, 28, 4);
  fillRgb(ctx, PALETTE.brass, mx - 13, my + 11, Math.max(2, Math.round(26 * powerT)), 2);

  // Reticule glued to mouse pointer (aimX/Y === pointer).
  const ax = Math.round(state.aimX);
  const ay = Math.round(state.aimY);
  fillRgb(ctx, PALETTE.brass, ax - 3, ay - 1, 6, 2);
  fillRgb(ctx, PALETTE.brass, ax - 1, ay - 3, 2, 6);
  fillRgb(ctx, PALETTE.paleAsh, ax - 1, ay - 1, 2, 2);
}

function drawTowerMarker(ctx) {
  const { x, y } = AUTO_TOWER.position;
  fillRgb(ctx, PALETTE.navy, x - 5, y - 14, 10, 16);
  fillRgb(ctx, PALETTE.brass, x - 3, y - 18, 6, 4);
}

function drawHud(ctx, state) {
  // Castle HP
  fillRgb(ctx, PALETTE.charcoal, 16, 12, 160, 14);
  drawHpBar(ctx, 18, 14, 156, 10, state.castleHp / state.castleMaxHp, PALETTE.redSignal);

  // Wave / marks
  fillRgb(ctx, "rgba(29,32,32,0.72)", W - 210, 12, 194, 28);
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`Wave ${state.waveIndex}/${WAVE_COUNT}`, W - 200, 28);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillText(`Marks ${state.marks}`, W - 100, 28);

  // Cd pip
  const ready = state.playerCd <= 0;
  fillRgb(ctx, PALETTE.charcoal, 16, 32, 48, 6);
  fillRgb(
    ctx,
    ready ? PALETTE.brass : PALETTE.midGray,
    17,
    33,
    ready ? 46 : Math.max(2, 46 * (1 - state.playerCd / (PLAYER_WEAPON.cooldown * state.mods.playerCooldownMul))),
    4,
  );
}

function drawOverlayPanel(ctx, title, lines, buttons) {
  fillRgb(ctx, "rgba(29,32,32,0.72)", 0, 0, W, 392);
  fillRgb(ctx, "rgba(29,32,32,0.88)", 200, 70, 560, 220);
  ctx.strokeStyle = PALETTE.brass;
  ctx.strokeRect(200.5, 70.5, 559, 219);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 108);

  ctx.fillStyle = PALETTE.midGray;
  ctx.font = "12px monospace";
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, 136 + i * 18);
  });

  if (buttons?.length) {
    const bw = 140;
    const gap = 16;
    const total = buttons.length * bw + (buttons.length - 1) * gap;
    let x = (W - total) / 2;
    const y = 220;
    for (const b of buttons) {
      fillRgb(ctx, PALETTE.charcoalMid, x, y, bw, 36);
      ctx.strokeStyle = PALETTE.parchmentDeep;
      ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, 35);
      ctx.fillStyle = PALETTE.paleAsh;
      ctx.font = "12px monospace";
      ctx.fillText(b, x + bw / 2, y + 23);
      x += bw + gap;
    }
  }
}

function drawUpgradeChoices(ctx, state) {
  fillRgb(ctx, "rgba(29,32,32,0.55)", 0, 0, W, 392);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = "15px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Between waves — pick one", W / 2, 88);

  ctx.fillStyle = PALETTE.midGray;
  ctx.font = "12px monospace";
  ctx.fillText(`Marks ${state.marks} • next wave ${state.waveIndex + 1}`, W / 2, 112);

  const cards = state.upgradeChoices || [];
  const cw = 200;
  const gap = 18;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let x = (W - total) / 2;
  const y = 140;
  cards.forEach((u, i) => {
    fillRgb(ctx, "rgba(29,32,32,0.82)", x, y, cw, 100);
    ctx.strokeStyle = i === 0 ? PALETTE.brass : PALETTE.charcoalMid;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, 99);
    ctx.fillStyle = PALETTE.parchment;
    ctx.font = "13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(u.label, x + cw / 2, y + 32);
    ctx.fillStyle = PALETTE.midGray;
    ctx.font = "11px monospace";
    wrapText(ctx, u.description, x + cw / 2, y + 56, cw - 24, 14);
    x += cw + gap;
  });
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

/**
 * Hit-test upgrade cards in logical space. Returns upgrade id or null.
 */
export function hitTestUpgrade(state, lx, ly) {
  if (state.phase !== PHASE.betweenWaves) return null;
  const cards = state.upgradeChoices || [];
  const cw = 200;
  const gap = 18;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let x = (W - total) / 2;
  const y = 140;
  for (const u of cards) {
    if (lx >= x && lx <= x + cw && ly >= y && ly <= y + 100) return u.id;
    x += cw + gap;
  }
  return null;
}

/**
 * @param {{ sceneCtx, outCtx, sceneCanvas, scratchCanvas, scratchCtx, options }} args
 */
export function renderSiege({
  sceneCtx,
  outCtx,
  sceneCanvas,
  scratchCanvas,
  scratchCtx,
  options = {},
}) {
  const state = options.state;
  const halftone = options.halftone !== false;
  const dofGrain = options.dofGrain !== false;

  disableSmoothing(sceneCtx);
  disableSmoothing(outCtx);
  disableSmoothing(scratchCtx);

  sceneCtx.clearRect(0, 0, W, H);
  fillRgb(sceneCtx, PLAYFIELD_BG, 0, 0, W, H);

  if (state) {
    drawCastle(sceneCtx);
    drawTowerMarker(sceneCtx);
    for (const e of state.enemies) drawEnemy(sceneCtx, e);
    for (const p of state.projectiles) drawProjectile(sceneCtx, p);
    for (const f of state.fx) drawFx(sceneCtx, f);
    drawAim(sceneCtx, state);
    drawHud(sceneCtx, state);

    if (state.phase === PHASE.betweenWaves) {
      drawUpgradeChoices(sceneCtx, state);
    } else if (state.phase === PHASE.paused) {
      drawOverlayPanel(sceneCtx, "Paused", ["Click Resume or press Esc"], ["Resume"]);
    } else if (state.phase === PHASE.victory) {
      drawOverlayPanel(
        sceneCtx,
        "Victory",
        [`Marks ${state.marks}`, `Kills ${state.kills}`, "Run clear — 10 waves held."],
        ["Restart"],
      );
    } else if (state.phase === PHASE.defeat) {
      drawOverlayPanel(
        sceneCtx,
        "Defeat",
        [`Fell on wave ${state.waveIndex}`, `Marks ${state.marks}`, `Kills ${state.kills}`],
        ["Restart"],
      );
    }
  }

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    applyOrderedDither(outCtx, W, H, { strength: 0.08, matrix: "8" });
  }

  sceneCtx.clearRect(0, 0, W, H);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.08,
      bottomFrac: 0.04,
      blurPx: 0.8,
    });
    applyVignette(outCtx, W, H, { strength: 0.1 });
    applyGrain(outCtx, W, H, { opacity: 0.018, seed: 19 });
  }
}
