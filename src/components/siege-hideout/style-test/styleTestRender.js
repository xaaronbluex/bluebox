import { PALETTE, hexToRgb } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither, fillDitherRect } from "../shared/dither.js";
import { applyEdgeDof, applyGrain, drawInkFrame } from "../shared/dofGrain.js";

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

const ash = hexToRgb(PALETTE.paleAsh);
const parchment = hexToRgb(PALETTE.parchment);
const parchmentDeep = hexToRgb(PALETTE.parchmentDeep);
const mid = hexToRgb(PALETTE.midGray);
const charcoal = hexToRgb(PALETTE.charcoal);
const charcoalMid = hexToRgb(PALETTE.charcoalMid);
const red = hexToRgb(PALETTE.redSignal);
const redDark = hexToRgb(PALETTE.redShadow);
const brass = hexToRgb(PALETTE.brass);
const player = hexToRgb(PALETTE.playerAccent);
const stoneLight = hexToRgb(PALETTE.stoneLight);
const stoneBlue = hexToRgb(PALETTE.stoneBlue);
const earth = hexToRgb(PALETTE.earth);
const earthDark = hexToRgb(PALETTE.earthDark);
const grass = hexToRgb(PALETTE.grass);
const wood = hexToRgb(PALETTE.wood);
const fireHot = hexToRgb(PALETTE.fireHot);
const fireMid = hexToRgb(PALETTE.fireMid);
const fireCore = hexToRgb(PALETTE.fireCore);

/** Ground line above the thick diorama plinth. */
const GROUND_Y = 148;
const PLINTH_TOP = 172;

function fill(ctx, rgb, x, y, w, h) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Simple geometric banner — original chevron, not a crest/logo. */
function drawBanner(ctx, x, y, tall = 18) {
  fill(ctx, red, x, y, 6, tall);
  fill(ctx, redDark, x + 6, y, 1, tall);
  fill(ctx, brass, x + 1, y + 3, 4, 2);
  fill(ctx, brass, x + 2, y + 5, 2, 5);
  fill(ctx, brass, x + 1, y + 10, 4, 1);
}

function drawStoneBlock(ctx, x, y, w, h, lit = true) {
  fill(ctx, lit ? stoneLight : stoneBlue, x, y, w, h);
  fill(ctx, lit ? stoneBlue : charcoalMid, x, y + h - 1, w, 1);
  fill(ctx, charcoalMid, x + w - 1, y, 1, h);
  if (lit) fill(ctx, ash, x, y, Math.max(1, w - 1), 1);
}

function drawCastle(ctx) {
  // Cliff mass under keep
  fillDitherRect(ctx, 0, GROUND_Y - 10, 96, 30, stoneBlue, charcoalMid, 0.52, 4);
  fill(ctx, charcoalMid, 0, GROUND_Y + 4, 90, 16);
  fillDitherRect(ctx, 2, GROUND_Y + 6, 84, 12, earth, charcoalMid, 0.48, 4);

  // Main keep — visible stone courses
  const keepX = 6;
  const keepY = 28;
  for (let row = 0; row < 10; row++) {
    const y = keepY + row * 7;
    for (let col = 0; col < 8; col++) {
      const ox = (row % 2) * 3;
      drawStoneBlock(ctx, keepX + ox + col * 8, y, 7, 6, (row + col) % 2 === 0);
    }
  }
  fillDitherRect(ctx, keepX, keepY, 64, GROUND_Y - keepY, stoneBlue, stoneLight, 0.22, 4);

  // Battlements
  for (let i = 0; i < 7; i++) {
    drawStoneBlock(ctx, keepX + 1 + i * 9, keepY - 9, 7, 10, i % 2 === 0);
  }

  // Corner tower
  fillDitherRect(ctx, 56, 14, 26, GROUND_Y - 14, stoneLight, stoneBlue, 0.38, 4);
  for (let i = 0; i < 3; i++) {
    drawStoneBlock(ctx, 58 + i * 8, 8, 7, 8, true);
  }
  // Conical roof + finial (muted red / brass — no crest)
  fill(ctx, redDark, 58, 2, 22, 5);
  fill(ctx, red, 61, -1, 16, 5);
  fill(ctx, brass, 66, -4, 5, 4);

  // Gate
  fill(ctx, charcoalMid, 26, GROUND_Y - 32, 20, 32);
  fill(ctx, wood, 28, GROUND_Y - 30, 16, 30);
  fill(ctx, earthDark, 30, GROUND_Y - 28, 12, 26);
  fill(ctx, brass, 41, GROUND_Y - 16, 2, 2);

  // Gold trim + blue-gray defender accent
  fill(ctx, brass, 10, 48, 10, 2);
  fill(ctx, brass, 42, 56, 12, 2);
  fill(ctx, player, 14, 62, 5, 18);
  fill(ctx, brass, 13, 60, 7, 3);
  drawBanner(ctx, 20, 40, 22);
  drawBanner(ctx, 46, 28, 18);

  drawDefender(ctx, 16, keepY - 4);
  drawDefender(ctx, 34, keepY - 4);
  drawDefender(ctx, 62, 20);

  drawBallista(ctx, 78, GROUND_Y - 26);
}

function drawDefender(ctx, x, y) {
  fill(ctx, player, x + 2, y + 4, 6, 10);
  fill(ctx, stoneLight, x + 3, y, 4, 5);
  fill(ctx, charcoal, x + 3, y + 14, 2, 4);
  fill(ctx, charcoal, x + 6, y + 14, 2, 4);
  fill(ctx, brass, x + 4, y + 6, 2, 2);
  fill(ctx, wood, x + 8, y + 2, 1, 10);
  fill(ctx, mid, x + 9, y + 6, 4, 1);
}

function drawBallista(ctx, x, y) {
  fill(ctx, wood, x, y + 12, 26, 5);
  fill(ctx, charcoalMid, x + 2, y + 17, 4, 9);
  fill(ctx, charcoalMid, x + 18, y + 17, 4, 9);
  fill(ctx, wood, x + 6, y + 4, 14, 8);
  fill(ctx, earthDark, x + 1, y + 6, 8, 3);
  fill(ctx, earthDark, x + 16, y + 6, 8, 3);
  fill(ctx, brass, x + 11, y + 3, 4, 4);
  fill(ctx, fireHot, x + 20, y + 6, 8, 2);
  fill(ctx, parchment, x + 26, y + 6, 5, 2);
}

function drawHouse(ctx, x, y) {
  fill(ctx, wood, x, y + 10, 18, 14);
  fill(ctx, charcoalMid, x + 1, y + 11, 16, 12);
  fill(ctx, redDark, x - 1, y + 5, 20, 6);
  fill(ctx, red, x + 2, y, 14, 6);
  fill(ctx, brass, x + 7, y + 1, 4, 1);
  fill(ctx, earthDark, x + 7, y + 14, 4, 7);
}

function drawTree(ctx, x, y) {
  fill(ctx, earthDark, x + 4, y + 16, 3, 12);
  fill(ctx, grass, x, y + 8, 11, 6);
  fill(ctx, charcoalMid, x + 1, y + 3, 9, 6);
  fill(ctx, grass, x + 2, y - 2, 7, 6);
  fill(ctx, charcoal, x + 4, y - 5, 3, 4);
}

function drawFlower(ctx, x, y) {
  fill(ctx, grass, x, y + 2, 1, 4);
  fill(ctx, red, x - 1, y, 3, 2);
  fill(ctx, fireHot, x, y, 1, 1);
}

function drawGrassTuft(ctx, x, y) {
  fill(ctx, grass, x, y, 1, 4);
  fill(ctx, grass, x + 2, y - 1, 1, 5);
  fill(ctx, grass, x + 4, y, 1, 4);
}

/**
 * Readable red-faction class silhouettes (original placeholders).
 * variant: 0 spear, 1 scout, 2 crossbow, 3 tower-shield, 4 ram-brute
 */
function drawEnemy(ctx, x, y, variant = 0) {
  fill(ctx, charcoalMid, x + 2, y + 26, 12, 2);

  if (variant === 4) {
    // Ram brute — hulking
    fill(ctx, redDark, x, y + 4, 18, 22);
    fill(ctx, red, x + 2, y + 6, 14, 16);
    fill(ctx, stoneBlue, x + 5, y - 2, 8, 8);
    fill(ctx, brass, x + 6, y, 6, 2);
    fill(ctx, wood, x - 14, y + 10, 18, 6);
    fill(ctx, earthDark, x - 16, y + 11, 5, 4);
    fill(ctx, mid, x - 18, y + 12, 4, 2);
    fill(ctx, red, x + 16, y + 2, 3, 8);
    fill(ctx, brass, x + 16, y + 1, 3, 2);
    fill(ctx, charcoal, x + 3, y + 26, 4, 4);
    fill(ctx, charcoal, x + 11, y + 26, 4, 4);
    return;
  }

  if (variant === 3) {
    // Tower shield
    fill(ctx, charcoal, x + 5, y + 6, 8, 16);
    fill(ctx, stoneBlue, x + 6, y, 6, 7);
    fill(ctx, red, x + 6, y + 8, 6, 8);
    fill(ctx, red, x - 2, y + 2, 7, 20);
    fill(ctx, brass, x - 1, y + 5, 5, 2);
    fill(ctx, brass, x + 1, y + 10, 2, 6);
    fill(ctx, charcoal, x + 5, y + 22, 3, 5);
    fill(ctx, charcoal, x + 10, y + 22, 3, 5);
    return;
  }

  if (variant === 2) {
    // Crossbow
    fill(ctx, charcoal, x + 4, y + 7, 8, 14);
    fill(ctx, red, x + 3, y + 8, 7, 8);
    fill(ctx, redDark, x + 4, y, 7, 7);
    fill(ctx, wood, x + 11, y + 8, 11, 3);
    fill(ctx, wood, x + 14, y + 5, 3, 8);
    fill(ctx, parchment, x + 21, y + 8, 4, 2);
    fill(ctx, charcoal, x + 3, y + 21, 4, 5);
    fill(ctx, charcoal, x + 9, y + 21, 4, 5);
    return;
  }

  if (variant === 1) {
    // Scout crouch
    fill(ctx, redDark, x + 1, y + 12, 11, 10);
    fill(ctx, red, x + 2, y + 13, 9, 7);
    fill(ctx, charcoal, x + 4, y + 6, 7, 7);
    fill(ctx, redDark, x + 3, y + 2, 8, 6);
    fill(ctx, mid, x + 12, y + 14, 6, 2);
    fill(ctx, charcoal, x + 2, y + 22, 4, 5);
    fill(ctx, charcoal, x + 8, y + 20, 4, 6);
    return;
  }

  // Spearman
  fill(ctx, charcoal, x + 4, y + 6, 8, 15);
  fill(ctx, red, x + 3, y + 8, 7, 10);
  fill(ctx, stoneBlue, x + 5, y, 6, 7);
  fill(ctx, brass, x + 6, y + 2, 3, 2);
  fill(ctx, red, x - 2, y + 8, 6, 8);
  fill(ctx, brass, x - 1, y + 10, 3, 3);
  fill(ctx, mid, x + 11, y - 10, 2, 24);
  fill(ctx, stoneLight, x + 10, y - 13, 4, 4);
  fill(ctx, charcoal, x + 3, y + 21, 4, 5);
  fill(ctx, charcoal, x + 9, y + 21, 4, 5);
}

function drawProjectile(ctx, x, y, kind = "bolt") {
  if (kind === "arrow") {
    fill(ctx, parchment, x, y, 10, 2);
    fill(ctx, red, x - 3, y, 3, 2);
    fill(ctx, mid, x + 10, y, 3, 2);
    return;
  }
  fill(ctx, fireHot, x, y, 9, 3);
  fill(ctx, parchment, x + 8, y, 6, 3);
  fill(ctx, fireMid, x - 8, y, 7, 3);
  fill(ctx, fireCore, x - 13, y + 1, 4, 2);
  fill(ctx, ash, x - 18, y, 4, 2);
}

function drawHitFx(ctx, x, y, t) {
  const pulse = Math.sin(t * 8) > 0 ? 0 : 1;
  fill(ctx, fireHot, x + pulse, y - 4, 7, 7);
  fill(ctx, fireMid, x - 5, y - 1, 8, 6);
  fill(ctx, fireCore, x + 2, y + 2, 6, 5);
  fill(ctx, parchment, x + 1, y - 2, 3, 3);
  fill(ctx, fireHot, x - 9, y - 6, 3, 2);
  fill(ctx, fireMid, x + 11, y - 5, 3, 2);
  fill(ctx, fireCore, x + 10, y + 5, 2, 3);
  fill(ctx, fireHot, x - 6, y + 7, 3, 2);
  fill(ctx, charcoal, x - 2, y + 8, 3, 3);
  fill(ctx, charcoalMid, x + 6, y - 9, 3, 3);
  fill(ctx, red, x + 4, y + 7, 3, 2);
}

function drawTerrain(ctx) {
  fill(ctx, parchment, 0, 0, W, H);
  // Dense parchment sky stipple
  fillDitherRect(ctx, 0, 0, W, 90, parchment, parchmentDeep, 0.32, 4);
  fillDitherRect(ctx, 0, 50, W, 55, parchment, ash, 0.2, 4);

  // Distant mountains
  fillDitherRect(ctx, 180, 58, 240, 55, parchmentDeep, mid, 0.58, 4);
  fillDitherRect(ctx, 220, 42, 170, 42, mid, parchmentDeep, 0.46, 4);
  fillDitherRect(ctx, 280, 32, 130, 34, mid, ash, 0.52, 4);
  fill(ctx, mid, 340, 40, 12, 18);
  fill(ctx, mid, 343, 34, 6, 8);
  fillDitherRect(ctx, 200, 100, 210, 28, ash, parchmentDeep, 0.36, 4);

  // Near ground
  fillDitherRect(ctx, 0, GROUND_Y - 24, W, 48, ash, parchment, 0.24, 4);
  fillDitherRect(ctx, 110, GROUND_Y - 8, 280, 16, ash, grass, 0.14, 4);
}

function drawPath(ctx) {
  fillDitherRect(ctx, 100, GROUND_Y - 2, 300, 16, mid, earth, 0.4, 4);
  fillDitherRect(ctx, 96, GROUND_Y + 6, 160, 10, earth, charcoalMid, 0.34, 4);
}

function drawPlinth(ctx) {
  // Thick earth cross-section — tabletop diorama base (~28% of frame)
  const depth = H - PLINTH_TOP;
  fill(ctx, earth, 0, PLINTH_TOP, W, depth);
  fillDitherRect(ctx, 0, PLINTH_TOP, W, 14, earth, earthDark, 0.55, 4);
  fillDitherRect(ctx, 0, PLINTH_TOP + 14, W, depth - 20, earthDark, charcoalMid, 0.5, 4);
  fillDitherRect(ctx, 0, H - 18, W, 13, charcoalMid, charcoal, 0.45, 4);
  fill(ctx, charcoal, 0, H - 5, W, 5);
  for (let i = 0; i < 12; i++) {
    fill(ctx, charcoalMid, 10 + i * 35, PLINTH_TOP + 18 + (i % 3) * 6, 22, 2);
    fill(ctx, earth, 24 + i * 35, PLINTH_TOP + 32 + (i % 2) * 5, 16, 2);
  }
  for (let x = 4; x < W - 4; x += 6) {
    if (x < 100 || x > 112) drawGrassTuft(ctx, x, PLINTH_TOP - 4);
  }
}

function drawMiniHud(ctx) {
  fill(ctx, charcoal, 8, 5, 48, 8);
  fill(ctx, red, 10, 6, 34, 6);
  fill(ctx, charcoal, W - 60, 5, 52, 8);
  fill(ctx, brass, W - 58, 6, 14, 6);
  fill(ctx, mid, W - 42, 6, 14, 6);
  fill(ctx, mid, W - 26, 6, 14, 6);
}

/**
 * Draw the style-test still into `sceneCtx`, then composite presentation passes
 * into `outCtx`.
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
  drawHouse(sceneCtx, 112, GROUND_Y - 24);
  drawHouse(sceneCtx, 140, GROUND_Y - 20);
  drawTree(sceneCtx, 172, GROUND_Y - 28);
  drawTree(sceneCtx, 310, GROUND_Y - 34);
  drawTree(sceneCtx, 390, GROUND_Y - 30);

  drawGrassTuft(sceneCtx, 108, GROUND_Y - 4);
  drawGrassTuft(sceneCtx, 200, GROUND_Y - 3);
  drawGrassTuft(sceneCtx, 250, GROUND_Y - 5);
  drawFlower(sceneCtx, 210, GROUND_Y - 6);
  drawFlower(sceneCtx, 258, GROUND_Y - 7);
  drawFlower(sceneCtx, 128, GROUND_Y - 5);

  // Readable class line — larger footprints, spread on wider field
  const enemies = [
    { x: 230, y: GROUND_Y - 26, v: 0 },
    { x: 258, y: GROUND_Y - 24, v: 1 },
    { x: 284, y: GROUND_Y - 26, v: 2 },
    { x: 314, y: GROUND_Y - 26, v: 3 },
    { x: 348, y: GROUND_Y - 28, v: 4 },
  ];
  enemies.forEach((e, i) => {
    const bob = Math.sin(t * 3 + i) > 0 ? 0 : 1;
    drawEnemy(sceneCtx, e.x, e.y + bob, e.v);
  });

  const boltX = 120 + ((t * 55) % 140);
  drawProjectile(sceneCtx, boltX, GROUND_Y - 38, "bolt");
  drawProjectile(sceneCtx, boltX - 32, GROUND_Y - 48, "arrow");
  drawProjectile(sceneCtx, boltX - 18, GROUND_Y - 28, "arrow");

  drawHitFx(sceneCtx, 210, GROUND_Y - 40, t);

  drawPlinth(sceneCtx);
  drawMiniHud(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    // Dense Bayer-4 print pass — forms stay readable
    applyOrderedDither(outCtx, W, H, { strength: 0.62, matrix: "4" });
  }

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.1,
      // Keep plinth strata readable — soft blur only at extreme bottom lip
      bottomFrac: 0.08,
      blurPx: 0.9,
    });
    applyGrain(outCtx, W, H, { opacity: 0.04, seed: 11 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
