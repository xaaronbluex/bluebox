/**
 * Canvas presentation for Hideout settlement — parchment theme, clickable producers.
 */

import { PALETTE } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither } from "../shared/dither.js";
import { applyEdgeDof, applyGrain, applyVignette, drawInkFrame } from "../shared/dofGrain.js";
import { THEME_BG_URL, preloadStyleTestBg } from "../style-test/styleTestRender.js";
import { RESOURCES } from "./configs/resources.js";

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

export { THEME_BG_URL, preloadStyleTestBg };

function fillRgb(ctx, hex, x, y, w, h) {
  ctx.fillStyle = hex;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.35;
  disableSmoothing(ctx);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawParchmentWash(ctx) {
  // Soft map-table wash so settlement reads even if BG fails.
  fillRgb(ctx, PALETTE.tableWood, 0, 0, W, H);
  fillRgb(ctx, PALETTE.parchmentDeep, 48, 36, W - 96, H - 72);
  fillRgb(ctx, PALETTE.parchment, 64, 52, W - 128, H - 104);
  // Faint contour hatching
  ctx.strokeStyle = "rgba(74,75,73,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = 90 + i * 48;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.bezierCurveTo(280, y - 20, 680, y + 18, 880, y - 8);
    ctx.stroke();
  }
}

function drawGroundStrip(ctx) {
  // Settlement plateau
  fillRgb(ctx, PALETTE.earth, 100, 300, 760, 140);
  fillRgb(ctx, PALETTE.grass, 120, 290, 720, 28);
  fillRgb(ctx, PALETTE.moss, 140, 400, 680, 18);
  // Path
  fillRgb(ctx, PALETTE.cliff, 380, 280, 40, 160);
  fillRgb(ctx, PALETTE.cliffLit, 390, 280, 12, 160);
}

function drawBuilding(ctx, b, selectedId, nowPulse) {
  const { x, y, w, h } = b.layout;
  const ready = b.ready;
  const pulse = ready ? 0.55 + 0.45 * Math.sin(nowPulse * 0.006) : 1;

  // Shadow
  ctx.fillStyle = "rgba(29,32,32,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 4, w * 0.48, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  fillRgb(ctx, b.fill, x, y, w, h);
  fillRgb(ctx, b.accent, x + 4, y + 4, Math.max(8, w - 8), 8);

  // Roof / detail by role
  if (b.id === "keep") {
    fillRgb(ctx, PALETTE.navyDeep, x + 20, y - 28, 28, 32);
    fillRgb(ctx, PALETTE.navyDeep, x + w - 48, y - 28, 28, 32);
    fillRgb(ctx, PALETTE.brass, x + w / 2 - 6, y - 40, 12, 18);
  } else if (b.id === "watchtower") {
    fillRgb(ctx, PALETTE.navyDeep, x + 8, y - 24, w - 16, 28);
    fillRgb(ctx, PALETTE.brass, x + w / 2 - 4, y - 36, 8, 14);
  } else if (b.id === "garden") {
    fillRgb(ctx, PALETTE.pine, x + 6, y + 10, w - 12, h - 20);
    fillRgb(ctx, PALETTE.moss, x + 14, y + 18, 16, 16);
    fillRgb(ctx, PALETTE.grass, x + w - 36, y + 22, 18, 14);
  } else if (b.id === "quarry") {
    fillRgb(ctx, PALETTE.slateDeep, x + 10, y + h - 28, w - 20, 20);
    fillRgb(ctx, PALETTE.stoneLight, x + 18, y + 16, 22, 18);
  }

  // Selection
  if (selectedId === b.id) {
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }

  // Ready halo
  if (ready) {
    ctx.globalAlpha = 0.35 * pulse;
    ctx.strokeStyle = PALETTE.fireMid;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);
    ctx.globalAlpha = 1;
  }

  // Label plate
  const labelY = y + h + 10;
  fillRgb(ctx, "rgba(29,32,32,0.72)", x - 4, labelY, w + 8, 28);
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillText(b.label, x, labelY + 12);
  ctx.fillStyle = ready ? PALETTE.fireMid : PALETTE.midGray;
  ctx.font = "10px monospace";
  const status = ready
    ? `READY +${b.pending} ${RESOURCES[b.output]?.short || b.output}`
    : `L${b.level}  ${Math.floor(b.progress * 100)}%`;
  ctx.fillText(status, x, labelY + 24);

  // Tiny progress bar
  const barW = w;
  const barY = y - 10;
  fillRgb(ctx, PALETTE.charcoal, x, barY, barW, 4);
  const fw = Math.round(barW * (ready ? 1 : b.progress));
  fillRgb(ctx, ready ? PALETTE.fireMid : PALETTE.brass, x, barY, fw, 4);
}

function drawResourceHud(ctx, resources) {
  fillRgb(ctx, "rgba(29,32,32,0.78)", 24, 18, 320, 52);
  ctx.strokeStyle = PALETTE.charcoalMid;
  ctx.strokeRect(24.5, 18.5, 320, 52);
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  let x = 36;
  for (const id of ["supplies", "stone", "marks"]) {
    const def = RESOURCES[id];
    fillRgb(ctx, def.color, x, 30, 10, 10);
    ctx.fillStyle = PALETTE.parchment;
    ctx.fillText(`${def.short} ${resources[id] ?? 0}`, x + 16, 40);
    x += 100;
  }
  ctx.fillStyle = PALETTE.midGray;
  ctx.font = "10px monospace";
  ctx.fillText("HIDEOUT · AFK settlement", 36, 58);
}

function drawBonusStrip(ctx, bonuses) {
  fillRgb(ctx, "rgba(29,32,32,0.7)", W - 280, 18, 256, 64);
  ctx.fillStyle = PALETTE.brass;
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.fillText("Siege bonuses (active)", W - 268, 36);
  ctx.fillStyle = PALETTE.paleAsh;
  ctx.font = "10px monospace";
  const hp = bonuses.castleHpAdd || 0;
  const dmg = Math.round((bonuses.playerDamageMulAdd || 0) * 100);
  const twr = Math.round((bonuses.towerDamageMulAdd || 0) * 100);
  ctx.fillText(`HP +${hp} · Ballista +${dmg}% · Tower +${twr}%`, W - 268, 52);
  const rng = bonuses.towerRangeAdd || 0;
  const rew = Math.round((bonuses.rewardMulAdd || 0) * 100);
  ctx.fillText(`Tower range +${rng} · Marks +${rew}%`, W - 268, 68);
}

function drawClaimBanner(ctx, claimed) {
  if (!claimed) return;
  fillRgb(ctx, "rgba(111,37,37,0.88)", W / 2 - 200, H - 70, 400, 36);
  ctx.fillStyle = PALETTE.parchment;
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `Siege spoils claimed · +${claimed.supplies} Sup +${claimed.stone} Stn +${claimed.marks} Seals`,
    W / 2,
    H - 48,
  );
}

/**
 * Hit-test building under logical coords.
 * @returns {string | null}
 */
export function hitTestBuilding(snapshot, x, y) {
  // Topmost last in list — reverse for pick.
  for (let i = snapshot.buildings.length - 1; i >= 0; i--) {
    const b = snapshot.buildings[i];
    const { x: bx, y: by, w, h } = b.layout;
    // Include label plate
    if (x >= bx - 4 && x <= bx + w + 4 && y >= by - 12 && y <= by + h + 40) {
      return b.id;
    }
  }
  return null;
}

/**
 * @param {object} args
 */
export function renderHideout({
  sceneCtx,
  outCtx,
  sceneCanvas,
  scratchCanvas,
  scratchCtx,
  options,
}) {
  const {
    snapshot,
    bgImage = null,
    selectedId = null,
    claimed = null,
    halftone = true,
    dofGrain = true,
    now = performance.now(),
  } = options;

  const ctx = sceneCtx;
  disableSmoothing(ctx);
  ctx.clearRect(0, 0, W, H);

  if (bgImage) {
    drawImageCover(ctx, bgImage, 0, 0, W, H);
    // Dim overlay so settlement sprites read on theme plate
    ctx.fillStyle = "rgba(29,32,32,0.28)";
    ctx.fillRect(0, 0, W, H);
  } else {
    drawParchmentWash(ctx);
  }

  drawGroundStrip(ctx);

  for (const b of snapshot.buildings) {
    drawBuilding(ctx, b, selectedId, now);
  }

  drawResourceHud(ctx, snapshot.resources);
  drawBonusStrip(ctx, snapshot.siegeBonuses);
  drawClaimBanner(ctx, claimed);

  // Title ribbon
  fillRgb(ctx, "rgba(232,222,181,0.9)", W / 2 - 90, 88, 180, 22);
  ctx.fillStyle = PALETTE.charcoal;
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("FORTRESS HIDEOUT", W / 2, 104);

  // Post FX pipeline (match Siege / Style Test)
  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);
  if (halftone) {
    applyOrderedDither(outCtx, scratchCtx, scratchCanvas);
  }
  if (dofGrain) {
    applyEdgeDof(outCtx, scratchCtx, scratchCanvas);
    applyGrain(outCtx);
    applyVignette(outCtx);
  }
  drawInkFrame(outCtx);
}
