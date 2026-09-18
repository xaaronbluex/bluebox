import { PALETTE, hexToRgb } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither, fillDitherRect } from "../shared/dither.js";
import { applyEdgeDof, applyGrain, drawInkFrame } from "../shared/dofGrain.js";

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

const ash = hexToRgb(PALETTE.paleAsh);
const parchment = hexToRgb(PALETTE.parchment);
const mid = hexToRgb(PALETTE.midGray);
const charcoal = hexToRgb(PALETTE.charcoal);
const charcoalMid = hexToRgb(PALETTE.charcoalMid);
const red = hexToRgb(PALETTE.redSignal);
const redDark = hexToRgb(PALETTE.redShadow);
const brass = hexToRgb(PALETTE.brass);
const player = hexToRgb(PALETTE.playerAccent);

function fill(ctx, rgb, x, y, w, h) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(x, y, w, h);
}

function drawCastle(ctx) {
  // Cliff under castle
  fill(ctx, charcoalMid, 0, 118, 78, 42);
  fill(ctx, charcoal, 0, 128, 70, 32);
  // Keep mass
  fill(ctx, charcoal, 10, 58, 52, 70);
  fill(ctx, charcoalMid, 14, 62, 18, 14);
  fill(ctx, charcoalMid, 40, 70, 14, 12);
  // Battlements
  for (let i = 0; i < 5; i++) {
    fill(ctx, charcoal, 12 + i * 10, 50, 7, 10);
  }
  // Gate
  fill(ctx, charcoalMid, 28, 100, 14, 28);
  fill(ctx, charcoal, 31, 104, 8, 24);
  // Tower
  fill(ctx, charcoal, 48, 40, 16, 48);
  fill(ctx, charcoal, 46, 34, 20, 8);
  for (let i = 0; i < 3; i++) {
    fill(ctx, charcoal, 48 + i * 6, 28, 4, 8);
  }
  // Brass / blue-gray banner pip
  fill(ctx, player, 18, 72, 3, 14);
  fill(ctx, brass, 17, 70, 5, 3);
}

function drawHouse(ctx, x, y) {
  fill(ctx, charcoal, x, y + 6, 14, 12);
  // Gable
  fill(ctx, charcoal, x + 2, y, 10, 8);
  fill(ctx, charcoalMid, x + 5, y + 10, 4, 5);
}

function drawTree(ctx, x, y) {
  // Spindly pine
  fill(ctx, charcoal, x + 2, y + 10, 2, 12);
  fill(ctx, charcoal, x, y + 4, 6, 4);
  fill(ctx, charcoal, x + 1, y, 4, 5);
  fill(ctx, charcoal, x - 1, y + 6, 8, 3);
}

function drawEnemy(ctx, x, y, variant = 0) {
  // Charcoal body
  fill(ctx, charcoal, x + 2, y + 4, 6, 10);
  fill(ctx, charcoal, x + 3, y, 4, 5);
  fill(ctx, charcoal, x + 1, y + 14, 3, 4);
  fill(ctx, charcoal, x + 5, y + 14, 3, 4);
  // Red accent: tunic / shield
  if (variant % 2 === 0) {
    fill(ctx, red, x + 1, y + 6, 3, 5);
    fill(ctx, redDark, x, y + 7, 2, 3);
  } else {
    fill(ctx, red, x + 7, y + 5, 4, 6);
    fill(ctx, redDark, x + 8, y + 6, 2, 4);
  }
  // Spear / helm pip
  if (variant === 2) {
    fill(ctx, mid, x + 5, y - 6, 1, 10);
    fill(ctx, red, x + 3, y - 1, 5, 2);
  }
}

function drawProjectile(ctx, x, y) {
  // Pale bolt + dither trail
  fill(ctx, parchment, x, y, 5, 2);
  fill(ctx, ash, x - 4, y, 3, 1);
  fill(ctx, mid, x - 8, y + 1, 2, 1);
  fill(ctx, ash, x - 12, y, 2, 1);
}

function drawHitFx(ctx, x, y) {
  // Red pixel burst
  fill(ctx, red, x, y, 2, 2);
  fill(ctx, red, x + 4, y - 2, 2, 2);
  fill(ctx, redDark, x - 3, y + 1, 2, 2);
  fill(ctx, red, x + 2, y + 4, 2, 1);
  fill(ctx, parchment, x + 1, y - 1, 1, 1);
  fill(ctx, redDark, x - 1, y - 3, 2, 2);
  fill(ctx, red, x + 5, y + 2, 1, 2);
}

function drawPath(ctx) {
  // Slight wind / horizontal dither band toward gate
  fillDitherRect(ctx, 70, 126, 230, 14, mid, charcoalMid, 0.42);
  fillDitherRect(ctx, 66, 132, 100, 8, charcoalMid, mid, 0.28);
}

function drawTerrain(ctx) {
  // Pale field
  fill(ctx, ash, 0, 0, W, H);
  // Sky band (slightly parchment)
  fillDitherRect(ctx, 0, 0, W, 48, parchment, ash, 0.22);
  // Ground mottling
  fillDitherRect(ctx, 0, 100, W, 80, ash, parchment, 0.18);
  // Far hills (low info)
  fillDitherRect(ctx, 180, 70, 140, 40, mid, ash, 0.55);
  fillDitherRect(ctx, 200, 55, 100, 24, charcoalMid, mid, 0.4);
}

function drawMiniHud(ctx) {
  // Compact charcoal HP / wave pips (inside buffer, decorative for style-test)
  fill(ctx, charcoal, 8, 6, 40, 6);
  fill(ctx, red, 10, 7, 28, 4);
  fill(ctx, charcoal, W - 52, 6, 44, 6);
  fill(ctx, brass, W - 50, 7, 10, 4);
  fill(ctx, mid, W - 38, 7, 10, 4);
  fill(ctx, mid, W - 26, 7, 10, 4);
}

/**
 * Draw the style-test still into `sceneCtx`, then composite presentation passes
 * into `outCtx` (may be the same canvas if helpers provide scratch).
 *
 * @param {object} args
 * @param {CanvasRenderingContext2D} args.sceneCtx flat miniature set
 * @param {CanvasRenderingContext2D} args.outCtx final logical buffer
 * @param {HTMLCanvasElement} args.sceneCanvas
 * @param {HTMLCanvasElement} args.scratchCanvas
 * @param {CanvasRenderingContext2D} args.scratchCtx
 * @param {{ halftone?: boolean, dofGrain?: boolean, timeMs?: number }} args.options
 */
export function renderStyleTest({
  sceneCtx,
  outCtx,
  sceneCanvas,
  scratchCanvas,
  scratchCtx,
  options = {},
}) {
  const halftone = options.halftone !== false;
  const dofGrain = options.dofGrain !== false;
  const t = (options.timeMs ?? 0) * 0.001;

  disableSmoothing(sceneCtx);
  disableSmoothing(outCtx);
  disableSmoothing(scratchCtx);

  drawTerrain(sceneCtx);
  drawPath(sceneCtx);
  drawCastle(sceneCtx);
  drawHouse(sceneCtx, 92, 108);
  drawHouse(sceneCtx, 118, 112);
  drawTree(sceneCtx, 150, 98);
  drawTree(sceneCtx, 248, 88);

  // Enemies marching from the right (slight bob for life)
  const enemies = [
    { x: 210, y: 118, v: 0 },
    { x: 228, y: 120, v: 1 },
    { x: 246, y: 116, v: 2 },
    { x: 264, y: 122, v: 0 },
    { x: 282, y: 118, v: 1 },
  ];
  enemies.forEach((e, i) => {
    const bob = Math.sin(t * 3 + i) > 0 ? 0 : 1;
    drawEnemy(sceneCtx, e.x, e.y + bob, e.v);
  });

  // Projectile mid-flight toward lead enemy
  const boltX = 120 + ((t * 40) % 90);
  drawProjectile(sceneCtx, boltX, 108);

  // Hit FX on lead enemy
  drawHitFx(sceneCtx, 214, 112);

  drawMiniHud(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);

  // Copy scene → out
  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    applyOrderedDither(outCtx, W, H, { strength: 0.5 });
  }

  if (dofGrain && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.14,
      bottomFrac: 0.14,
      blurPx: 1.1,
    });
    applyGrain(outCtx, W, H, { opacity: 0.045, seed: 11 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
