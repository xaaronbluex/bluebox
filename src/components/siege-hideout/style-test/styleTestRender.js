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
const navy = hexToRgb(PALETTE.navy);
const navyDeep = hexToRgb(PALETTE.navyDeep);
const navyMid = hexToRgb(PALETTE.navyMid);
const stoneLight = hexToRgb(PALETTE.stoneLight);
const stoneBlue = hexToRgb(PALETTE.stoneBlue);
const earth = hexToRgb(PALETTE.earth);
const earthDark = hexToRgb(PALETTE.earthDark);
const grass = hexToRgb(PALETTE.grass);
const moss = hexToRgb(PALETTE.moss);
const wood = hexToRgb(PALETTE.wood);
const woodLight = hexToRgb(PALETTE.woodLight);
const woodDark = hexToRgb(PALETTE.woodDark);
const fireHot = hexToRgb(PALETTE.fireHot);
const fireMid = hexToRgb(PALETTE.fireMid);
const fireCore = hexToRgb(PALETTE.fireCore);

/** Ground line above the thick diorama plinth (scaled for 640×360). */
const GROUND_Y = 222;
const PLINTH_TOP = 258;

function fill(ctx, rgb, x, y, w, h) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Original geometric banner — navy cloth + pale chevron (no crest/logo copy). */
function drawBanner(ctx, x, y, tall = 28) {
  fill(ctx, navyDeep, x, y, 9, tall);
  fill(ctx, navy, x + 1, y + 1, 7, tall - 2);
  fill(ctx, navyMid, x + 2, y + 2, 5, 3);
  // Simple pale chevron mark — original, not heraldry from refs
  fill(ctx, ash, x + 2, y + 8, 5, 2);
  fill(ctx, ash, x + 3, y + 10, 3, 2);
  fill(ctx, ash, x + 4, y + 12, 1, 6);
  fill(ctx, brass, x + 3, y + 4, 3, 1);
  fill(ctx, charcoalMid, x + 8, y, 1, tall);
}

function drawFlag(ctx, x, y) {
  fill(ctx, woodDark, x, y, 2, 18);
  fill(ctx, navy, x + 2, y, 10, 7);
  fill(ctx, navyDeep, x + 2, y + 7, 8, 2);
  fill(ctx, ash, x + 5, y + 2, 3, 3);
  fill(ctx, brass, x, y - 1, 2, 2);
}

function drawLantern(ctx, x, y) {
  fill(ctx, woodDark, x + 1, y, 1, 4);
  fill(ctx, brass, x, y + 4, 3, 4);
  fill(ctx, fireHot, x + 1, y + 5, 1, 2);
}

function drawMoss(ctx, x, y, w = 6) {
  fill(ctx, moss, x, y, w, 2);
  fill(ctx, grass, x + 1, y - 1, Math.max(1, w - 2), 1);
}

function drawWoodGrain(ctx, x, y, w, h) {
  fill(ctx, wood, x, y, w, h);
  for (let i = 0; i < h; i += 3) {
    fill(ctx, i % 6 === 0 ? woodDark : woodLight, x, y + i, w, 1);
  }
  fill(ctx, woodDark, x + w - 1, y, 1, h);
}

function drawStoneBlock(ctx, x, y, w, h, lit = true) {
  fill(ctx, lit ? stoneLight : stoneBlue, x, y, w, h);
  fill(ctx, lit ? stoneBlue : charcoalMid, x, y + h - 1, w, 1);
  fill(ctx, charcoalMid, x + w - 1, y, 1, h);
  if (lit) fill(ctx, ash, x, y, Math.max(1, w - 1), 1);
  // Fine mortar nick
  if (w > 3 && (x + y) % 5 === 0) fill(ctx, mid, x + 1, y + Math.floor(h / 2), 1, 1);
}

function drawCastle(ctx) {
  // Cliff mass under keep — multi-value dither
  fillDitherRect(ctx, 0, GROUND_Y - 16, 140, 42, stoneBlue, charcoalMid, 0.52, 4);
  fill(ctx, charcoalMid, 0, GROUND_Y + 6, 132, 22);
  fillDitherRect(ctx, 2, GROUND_Y + 8, 124, 18, earth, charcoalMid, 0.48, 4);
  drawMoss(ctx, 8, GROUND_Y + 4, 14);
  drawMoss(ctx, 48, GROUND_Y + 5, 10);
  drawMoss(ctx, 90, GROUND_Y + 3, 12);

  // Main keep — finer stone courses (~4×3 blocks)
  const keepX = 8;
  const keepY = 42;
  const keepW = 96;
  const keepH = GROUND_Y - keepY;
  for (let row = 0; row < 18; row++) {
    const y = keepY + row * 5;
    if (y >= GROUND_Y) break;
    const ox = (row % 2) * 2;
    for (let col = 0; col < 16; col++) {
      const x = keepX + ox + col * 6;
      if (x + 5 > keepX + keepW) break;
      drawStoneBlock(ctx, x, y, 5, 4, (row + col) % 2 === 0);
    }
  }
  fillDitherRect(ctx, keepX, keepY, keepW, keepH, stoneBlue, stoneLight, 0.18, 4);

  // Battlements — finer merlons
  for (let i = 0; i < 11; i++) {
    drawStoneBlock(ctx, keepX + 2 + i * 8, keepY - 10, 6, 11, i % 2 === 0);
  }

  // Corner round-ish tower
  fillDitherRect(ctx, 88, 22, 38, GROUND_Y - 22, stoneLight, stoneBlue, 0.36, 4);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 5; col++) {
      drawStoneBlock(ctx, 90 + col * 7, 24 + row * 5, 6, 4, (row + col) % 2 === 0);
    }
  }
  for (let i = 0; i < 4; i++) {
    drawStoneBlock(ctx, 90 + i * 8, 14, 7, 9, true);
  }
  // Conical roof — wood/navy, not red
  fill(ctx, woodDark, 90, 6, 34, 8);
  fill(ctx, wood, 94, 2, 26, 7);
  fill(ctx, woodLight, 100, 0, 14, 4);
  fill(ctx, brass, 104, -3, 5, 4);
  drawFlag(ctx, 106, -2);
  drawLantern(ctx, 92, 28);
  drawMoss(ctx, 94, GROUND_Y - 2, 8);

  // Gatehouse arch + wood grain door
  fill(ctx, charcoalMid, 36, GROUND_Y - 48, 32, 48);
  drawWoodGrain(ctx, 38, GROUND_Y - 46, 28, 44);
  fill(ctx, earthDark, 42, GROUND_Y - 42, 20, 38);
  fill(ctx, woodDark, 50, GROUND_Y - 42, 4, 38);
  fill(ctx, brass, 58, GROUND_Y - 24, 3, 3);
  // Arrow slits
  fill(ctx, charcoal, 18, 70, 3, 10);
  fill(ctx, charcoal, 70, 70, 3, 10);
  fill(ctx, charcoal, 18, 100, 3, 10);
  fill(ctx, charcoal, 70, 100, 3, 10);

  // Sparse brass trim + player accent (no red on structure)
  fill(ctx, brass, 14, 72, 14, 2);
  fill(ctx, brass, 60, 84, 16, 2);
  fill(ctx, player, 20, 92, 7, 26);
  fill(ctx, brass, 19, 90, 9, 3);

  drawBanner(ctx, 28, 58, 34);
  drawBanner(ctx, 68, 42, 28);
  drawFlag(ctx, 48, 32);
  drawLantern(ctx, 34, 58);

  drawDefender(ctx, 22, keepY - 6);
  drawDefender(ctx, 48, keepY - 6);
  drawDefender(ctx, 96, 28);

  drawBallista(ctx, 118, GROUND_Y - 40);
}

function drawDefender(ctx, x, y) {
  fill(ctx, player, x + 3, y + 6, 8, 14);
  fill(ctx, navyMid, x + 4, y + 8, 6, 4);
  fill(ctx, stoneLight, x + 4, y, 6, 7);
  fill(ctx, charcoal, x + 4, y + 20, 3, 5);
  fill(ctx, charcoal, x + 8, y + 20, 3, 5);
  fill(ctx, brass, x + 5, y + 9, 3, 2);
  fill(ctx, wood, x + 11, y + 3, 2, 14);
  fill(ctx, mid, x + 13, y + 8, 5, 1);
}

function drawBallista(ctx, x, y) {
  // Stone platform with finer blocks
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      drawStoneBlock(ctx, x + col * 6, y + 18 + row * 5, 5, 4, (row + col) % 2 === 0);
    }
  }
  drawWoodGrain(ctx, x + 2, y + 10, 34, 8);
  fill(ctx, woodDark, x + 4, y + 26, 5, 12);
  fill(ctx, woodDark, x + 26, y + 26, 5, 12);
  drawWoodGrain(ctx, x + 8, y + 2, 20, 10);
  fill(ctx, earthDark, x + 2, y + 6, 10, 4);
  fill(ctx, earthDark, x + 24, y + 6, 10, 4);
  fill(ctx, brass, x + 16, y + 1, 5, 5);
  fill(ctx, fireHot, x + 28, y + 6, 12, 2);
  fill(ctx, parchment, x + 38, y + 6, 7, 2);
  drawBanner(ctx, x + 30, y - 8, 20);
  drawLantern(ctx, x + 1, y + 4);
  // Bolt crate
  drawWoodGrain(ctx, x - 10, y + 22, 10, 8);
  fill(ctx, mid, x - 8, y + 20, 2, 6);
  fill(ctx, mid, x - 5, y + 19, 2, 7);
}

function drawHouse(ctx, x, y) {
  drawWoodGrain(ctx, x, y + 14, 26, 20);
  fill(ctx, charcoalMid, x + 2, y + 16, 22, 16);
  // Wood roof — not red
  fill(ctx, woodDark, x - 2, y + 6, 30, 9);
  fill(ctx, wood, x + 2, y + 1, 22, 8);
  fill(ctx, woodLight, x + 8, y - 2, 10, 5);
  fill(ctx, earthDark, x + 10, y + 20, 6, 10);
  fill(ctx, brass, x + 12, y + 24, 2, 2);
  drawMoss(ctx, x + 2, y + 32, 8);
}

function drawTree(ctx, x, y) {
  fill(ctx, earthDark, x + 5, y + 24, 4, 16);
  fill(ctx, grass, x, y + 14, 14, 8);
  fill(ctx, charcoalMid, x + 1, y + 6, 12, 8);
  fill(ctx, grass, x + 2, y, 10, 8);
  fill(ctx, moss, x + 3, y - 4, 8, 6);
  fill(ctx, charcoal, x + 5, y - 8, 4, 5);
  // Soft dithered shadow
  fillDitherRect(ctx, x + 10, y + 34, 18, 6, mid, ash, 0.55, 4);
}

function drawFlower(ctx, x, y) {
  fill(ctx, grass, x, y + 3, 1, 5);
  // Tiny pale blossom — not enemy red
  fill(ctx, parchment, x - 1, y, 3, 2);
  fill(ctx, brass, x, y, 1, 1);
}

function drawGrassTuft(ctx, x, y) {
  fill(ctx, grass, x, y, 1, 5);
  fill(ctx, moss, x + 2, y - 1, 1, 6);
  fill(ctx, grass, x + 4, y, 1, 5);
}

/**
 * Readable red-faction class silhouettes (original placeholders).
 * variant: 0 spear, 1 scout, 2 crossbow, 3 tower-shield, 4 ram-brute
 */
function drawEnemy(ctx, x, y, variant = 0) {
  fill(ctx, charcoalMid, x + 3, y + 38, 16, 3);

  if (variant === 4) {
    fill(ctx, redDark, x, y + 6, 26, 32);
    fill(ctx, red, x + 3, y + 9, 20, 24);
    fill(ctx, stoneBlue, x + 7, y - 2, 12, 12);
    fill(ctx, brass, x + 9, y + 1, 8, 3);
    drawWoodGrain(ctx, x - 20, y + 14, 24, 8);
    fill(ctx, earthDark, x - 24, y + 16, 7, 5);
    fill(ctx, mid, x - 26, y + 17, 5, 3);
    fill(ctx, red, x + 22, y + 4, 4, 12);
    fill(ctx, brass, x + 22, y + 2, 4, 3);
    fill(ctx, charcoal, x + 4, y + 38, 6, 6);
    fill(ctx, charcoal, x + 16, y + 38, 6, 6);
    return;
  }

  if (variant === 3) {
    fill(ctx, charcoal, x + 7, y + 9, 11, 24);
    fill(ctx, stoneBlue, x + 8, y, 9, 10);
    fill(ctx, red, x + 8, y + 12, 9, 12);
    fill(ctx, red, x - 3, y + 3, 10, 30);
    fill(ctx, brass, x - 1, y + 8, 6, 3);
    fill(ctx, brass, x + 1, y + 14, 3, 9);
    fill(ctx, charcoal, x + 7, y + 33, 4, 7);
    fill(ctx, charcoal, x + 14, y + 33, 4, 7);
    return;
  }

  if (variant === 2) {
    fill(ctx, charcoal, x + 6, y + 10, 11, 20);
    fill(ctx, red, x + 4, y + 12, 10, 12);
    fill(ctx, redDark, x + 5, y, 10, 10);
    drawWoodGrain(ctx, x + 16, y + 12, 16, 4);
    fill(ctx, wood, x + 20, y + 8, 4, 12);
    fill(ctx, parchment, x + 30, y + 12, 6, 3);
    fill(ctx, charcoal, x + 4, y + 30, 5, 7);
    fill(ctx, charcoal, x + 12, y + 30, 5, 7);
    return;
  }

  if (variant === 1) {
    fill(ctx, redDark, x + 1, y + 18, 16, 14);
    fill(ctx, red, x + 3, y + 19, 13, 10);
    fill(ctx, charcoal, x + 5, y + 9, 10, 10);
    fill(ctx, redDark, x + 4, y + 3, 11, 8);
    fill(ctx, mid, x + 17, y + 20, 8, 3);
    fill(ctx, charcoal, x + 3, y + 32, 5, 7);
    fill(ctx, charcoal, x + 11, y + 30, 5, 8);
    return;
  }

  // Spearman
  fill(ctx, charcoal, x + 6, y + 9, 11, 22);
  fill(ctx, red, x + 4, y + 12, 10, 14);
  fill(ctx, stoneBlue, x + 7, y, 9, 10);
  fill(ctx, brass, x + 8, y + 3, 5, 3);
  fill(ctx, red, x - 3, y + 12, 8, 12);
  fill(ctx, brass, x - 1, y + 15, 4, 4);
  fill(ctx, mid, x + 16, y - 14, 2, 34);
  fill(ctx, stoneLight, x + 14, y - 18, 6, 6);
  fill(ctx, charcoal, x + 4, y + 31, 5, 7);
  fill(ctx, charcoal, x + 12, y + 31, 5, 7);
}

function drawProjectile(ctx, x, y, kind = "bolt") {
  if (kind === "arrow") {
    fill(ctx, parchment, x, y, 14, 2);
    fill(ctx, mid, x - 4, y, 4, 2);
    fill(ctx, mid, x + 14, y, 4, 2);
    return;
  }
  fill(ctx, fireHot, x, y, 12, 3);
  fill(ctx, parchment, x + 11, y, 8, 3);
  fill(ctx, fireMid, x - 10, y, 9, 3);
  fill(ctx, fireCore, x - 16, y + 1, 5, 2);
  fill(ctx, ash, x - 22, y, 5, 2);
}

function drawHitFx(ctx, x, y, t) {
  const pulse = Math.sin(t * 8) > 0 ? 0 : 1;
  fill(ctx, fireHot, x + pulse, y - 6, 10, 10);
  fill(ctx, fireMid, x - 7, y - 2, 11, 8);
  fill(ctx, fireCore, x + 3, y + 3, 8, 7);
  fill(ctx, parchment, x + 2, y - 3, 4, 4);
  fill(ctx, fireHot, x - 12, y - 8, 4, 3);
  fill(ctx, fireMid, x + 15, y - 7, 4, 3);
  fill(ctx, fireCore, x + 14, y + 7, 3, 4);
  fill(ctx, fireHot, x - 8, y + 10, 4, 3);
  fill(ctx, charcoal, x - 3, y + 12, 4, 4);
  fill(ctx, charcoalMid, x + 8, y - 12, 4, 4);
  // Red reserved for danger signal in FX
  fill(ctx, red, x + 6, y + 10, 4, 3);
  fill(ctx, redDark, x - 5, y + 8, 3, 2);
}

function drawTerrain(ctx) {
  fill(ctx, parchment, 0, 0, W, H);
  // Dense parchment sky stipple — multi-value
  fillDitherRect(ctx, 0, 0, W, 130, parchment, parchmentDeep, 0.3, 4);
  fillDitherRect(ctx, 0, 70, W, 80, parchment, ash, 0.18, 4);

  // Distant mountains — finer dither bands
  fillDitherRect(ctx, 260, 86, 360, 80, parchmentDeep, mid, 0.56, 4);
  fillDitherRect(ctx, 320, 62, 260, 62, mid, parchmentDeep, 0.44, 4);
  fillDitherRect(ctx, 400, 48, 200, 50, mid, ash, 0.5, 4);
  fill(ctx, mid, 500, 58, 16, 26);
  fill(ctx, mid, 504, 50, 8, 12);
  fillDitherRect(ctx, 290, 148, 320, 40, ash, parchmentDeep, 0.34, 4);

  // Near ground
  fillDitherRect(ctx, 0, GROUND_Y - 36, W, 70, ash, parchment, 0.22, 4);
  fillDitherRect(ctx, 160, GROUND_Y - 12, 420, 24, ash, grass, 0.12, 4);
}

function drawPath(ctx) {
  fillDitherRect(ctx, 148, GROUND_Y - 3, 450, 22, mid, earth, 0.38, 4);
  fillDitherRect(ctx, 142, GROUND_Y + 8, 240, 14, earth, charcoalMid, 0.32, 4);
}

function drawPlinth(ctx) {
  const depth = H - PLINTH_TOP;
  fill(ctx, earth, 0, PLINTH_TOP, W, depth);
  fillDitherRect(ctx, 0, PLINTH_TOP, W, 18, earth, earthDark, 0.55, 4);
  fillDitherRect(ctx, 0, PLINTH_TOP + 18, W, depth - 26, earthDark, charcoalMid, 0.48, 4);
  fillDitherRect(ctx, 0, H - 22, W, 16, charcoalMid, charcoal, 0.45, 4);
  fill(ctx, charcoal, 0, H - 6, W, 6);
  for (let i = 0; i < 18; i++) {
    fill(ctx, charcoalMid, 12 + i * 35, PLINTH_TOP + 24 + (i % 3) * 8, 28, 2);
    fill(ctx, earth, 28 + i * 35, PLINTH_TOP + 42 + (i % 2) * 6, 20, 2);
  }
  for (let x = 4; x < W - 4; x += 5) {
    if (x < 148 || x > 168) drawGrassTuft(ctx, x, PLINTH_TOP - 5);
  }
}

function drawMiniHud(ctx) {
  fill(ctx, charcoal, 10, 6, 72, 10);
  fill(ctx, red, 12, 7, 50, 8);
  fill(ctx, charcoal, W - 88, 6, 78, 10);
  fill(ctx, brass, W - 86, 7, 20, 8);
  fill(ctx, mid, W - 64, 7, 20, 8);
  fill(ctx, mid, W - 42, 7, 20, 8);
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
  drawHouse(sceneCtx, 168, GROUND_Y - 34);
  drawHouse(sceneCtx, 208, GROUND_Y - 28);
  drawTree(sceneCtx, 255, GROUND_Y - 40);
  drawTree(sceneCtx, 460, GROUND_Y - 48);
  drawTree(sceneCtx, 580, GROUND_Y - 42);

  drawGrassTuft(sceneCtx, 160, GROUND_Y - 5);
  drawGrassTuft(sceneCtx, 300, GROUND_Y - 4);
  drawGrassTuft(sceneCtx, 370, GROUND_Y - 6);
  drawFlower(sceneCtx, 312, GROUND_Y - 8);
  drawFlower(sceneCtx, 382, GROUND_Y - 9);
  drawFlower(sceneCtx, 190, GROUND_Y - 7);

  // Readable class line — scaled for wider finer field
  const enemies = [
    { x: 340, y: GROUND_Y - 38, v: 0 },
    { x: 382, y: GROUND_Y - 36, v: 1 },
    { x: 420, y: GROUND_Y - 38, v: 2 },
    { x: 464, y: GROUND_Y - 38, v: 3 },
    { x: 514, y: GROUND_Y - 42, v: 4 },
  ];
  enemies.forEach((e, i) => {
    const bob = Math.sin(t * 3 + i) > 0 ? 0 : 1;
    drawEnemy(sceneCtx, e.x, e.y + bob, e.v);
  });

  const boltX = 180 + ((t * 70) % 200);
  drawProjectile(sceneCtx, boltX, GROUND_Y - 56, "bolt");
  drawProjectile(sceneCtx, boltX - 48, GROUND_Y - 70, "arrow");
  drawProjectile(sceneCtx, boltX - 28, GROUND_Y - 42, "arrow");

  drawHitFx(sceneCtx, 312, GROUND_Y - 58, t);

  drawPlinth(sceneCtx);
  drawMiniHud(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    // Dense Bayer-4 print pass — finer grid still reads as print
    applyOrderedDither(outCtx, W, H, { strength: 0.58, matrix: "4" });
  }

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.1,
      bottomFrac: 0.08,
      blurPx: 1.0,
    });
    applyGrain(outCtx, W, H, { opacity: 0.035, seed: 11 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
