import { PALETTE, hexToRgb } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither, fillDitherRect } from "../shared/dither.js";
import {
  applyEdgeDof,
  applyGrain,
  applyVignette,
  drawInkFrame,
} from "../shared/dofGrain.js";

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

/** Ground line above thick diorama plinth (960×540). */
const GROUND_Y = 333;
const PLINTH_TOP = 387;

function px(ctx, rgb, x, y) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

function fill(ctx, rgb, x, y, w, h) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Deterministic speck hash for dense pixel noise without Math.random shimmer. */
function hash2(x, y) {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function pickShade(x, y, a, b, c) {
  const h = hash2(x, y);
  if (h < 0.18) return c;
  if (h < 0.55) return b;
  return a;
}

/** Dense stone face — many small blocks + mortar nicks (charcoal-weighted). */
function drawDenseStoneRect(ctx, x0, y0, w, h, lit = true) {
  const blockW = 3;
  const blockH = 2;
  for (let row = 0; row < Math.ceil(h / blockH); row++) {
    const y = y0 + row * blockH;
    if (y >= y0 + h) break;
    const ox = (row % 2) * 1;
    for (let col = -1; col < Math.ceil(w / blockW) + 1; col++) {
      const x = x0 + ox + col * blockW;
      if (x + 1 < x0 || x >= x0 + w) continue;
      const bw = Math.min(blockW - 1, x0 + w - x);
      const bh = Math.min(blockH, y0 + h - y);
      if (bw <= 0 || bh <= 0) continue;
      // Bias dark — pale parchment needs charcoal masses (not washed stoneLight)
      const base = lit
        ? pickShade(x, y, charcoalMid, stoneBlue, charcoal)
        : pickShade(x, y, charcoal, charcoalMid, stoneBlue);
      fill(ctx, base, x, y, bw, bh);
      fill(ctx, charcoal, x, y + bh - 1, bw, 1);
      if (hash2(x + 3, y + 1) > 0.82) px(ctx, lit ? stoneBlue : charcoalMid, x, y);
      if (hash2(x + 7, y) > 0.9) px(ctx, charcoal, x + Math.min(1, bw - 1), y);
    }
  }
}

/** Fine wood grain — vertical fibres + knot flecks. */
function drawWoodGrain(ctx, x, y, w, h) {
  fill(ctx, wood, x, y, w, h);
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const hsh = hash2(x + ix, y + iy);
      if (ix === w - 1 || hsh < 0.08) {
        px(ctx, woodDark, x + ix, y + iy);
      } else if (iy % 3 === 0 && hsh < 0.45) {
        px(ctx, woodLight, x + ix, y + iy);
      } else if (hsh > 0.92) {
        px(ctx, earthDark, x + ix, y + iy);
      }
    }
  }
}

/** Original geometric banner — navy + pale chevron (no crest copy). */
function drawBanner(ctx, x, y, tall = 42) {
  fill(ctx, navyDeep, x, y, 11, tall);
  for (let iy = 1; iy < tall - 1; iy++) {
    for (let ix = 1; ix < 10; ix++) {
      const c = hash2(x + ix, y + iy) > 0.88 ? navyDeep : navy;
      px(ctx, c, x + ix, y + iy);
    }
  }
  fill(ctx, navyMid, x + 2, y + 2, 7, 4);
  fill(ctx, ash, x + 2, y + 10, 7, 2);
  fill(ctx, ash, x + 3, y + 12, 5, 2);
  fill(ctx, ash, x + 4, y + 14, 3, 2);
  fill(ctx, ash, x + 5, y + 16, 1, 8);
  fill(ctx, brass, x + 4, y + 5, 3, 1);
  fill(ctx, charcoalMid, x + 10, y, 1, tall);
  // Cloth edge fray
  for (let i = 0; i < 4; i++) {
    if (hash2(x, y + tall - 1 - i) > 0.4) px(ctx, navyDeep, x + 2 + i * 2, y + tall - 1);
  }
}

function drawFlag(ctx, x, y) {
  fill(ctx, woodDark, x, y, 2, 26);
  for (let iy = 0; iy < 10; iy++) {
    for (let ix = 0; ix < 14; ix++) {
      px(ctx, hash2(x + ix, y + iy) > 0.9 ? navyDeep : navy, x + 2 + ix, y + iy);
    }
  }
  fill(ctx, navyDeep, x + 2, y + 10, 12, 2);
  fill(ctx, ash, x + 6, y + 3, 4, 4);
  fill(ctx, brass, x, y - 1, 2, 2);
}

function drawLantern(ctx, x, y) {
  fill(ctx, woodDark, x + 1, y, 1, 5);
  fill(ctx, brass, x, y + 5, 4, 5);
  px(ctx, fireHot, x + 1, y + 6);
  px(ctx, fireHot, x + 2, y + 7);
  px(ctx, fireMid, x + 1, y + 8);
}

function drawMoss(ctx, x, y, w = 8) {
  for (let i = 0; i < w; i++) {
    px(ctx, hash2(x + i, y) > 0.5 ? moss : grass, x + i, y);
    if (hash2(x + i, y - 1) > 0.55) px(ctx, grass, x + i, y - 1);
  }
}

function drawCastle(ctx) {
  // Cliff under keep — dithered strata (BG language OK)
  fillDitherRect(ctx, 0, GROUND_Y - 24, 210, 58, stoneBlue, charcoalMid, 0.5, 4);
  fill(ctx, charcoalMid, 0, GROUND_Y + 8, 198, 30);
  fillDitherRect(ctx, 4, GROUND_Y + 10, 186, 24, earth, charcoalMid, 0.46, 4);
  drawMoss(ctx, 12, GROUND_Y + 6, 18);
  drawMoss(ctx, 70, GROUND_Y + 7, 14);
  drawMoss(ctx, 130, GROUND_Y + 5, 16);

  const keepX = 12;
  const keepY = 58;
  const keepW = 144;
  const keepH = GROUND_Y - keepY;
  drawDenseStoneRect(ctx, keepX, keepY, keepW, keepH, true);
  // Shadow plane on right of keep (hand pixels, not full-frame dither)
  for (let y = keepY; y < GROUND_Y; y++) {
    for (let x = keepX + keepW - 18; x < keepX + keepW; x++) {
      if (hash2(x, y) < 0.55) px(ctx, stoneBlue, x, y);
    }
  }

  // Battlements — dense merlons
  for (let i = 0; i < 16; i++) {
    drawDenseStoneRect(ctx, keepX + 2 + i * 9, keepY - 14, 7, 15, i % 2 === 0);
  }

  // Round corner tower
  drawDenseStoneRect(ctx, 132, 28, 56, GROUND_Y - 28, true);
  for (let i = 0; i < 6; i++) {
    drawDenseStoneRect(ctx, 134 + i * 9, 16, 8, 13, true);
  }
  // Conical wood roof
  drawWoodGrain(ctx, 134, 8, 52, 10);
  fill(ctx, woodLight, 148, 2, 22, 7);
  fill(ctx, brass, 156, -2, 6, 5);
  drawFlag(ctx, 158, -1);
  drawLantern(ctx, 136, 36);
  drawMoss(ctx, 140, GROUND_Y - 2, 12);

  // Gatehouse — dense wood door
  fill(ctx, charcoalMid, 52, GROUND_Y - 72, 48, 72);
  drawWoodGrain(ctx, 55, GROUND_Y - 69, 42, 66);
  fill(ctx, earthDark, 62, GROUND_Y - 62, 28, 56);
  fill(ctx, woodDark, 74, GROUND_Y - 62, 5, 56);
  // Door studs
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      fill(ctx, brass, 66 + col * 16, GROUND_Y - 54 + row * 10, 2, 2);
    }
  }
  // Arrow slits
  fill(ctx, charcoal, 26, 100, 4, 14);
  fill(ctx, charcoal, 104, 100, 4, 14);
  fill(ctx, charcoal, 26, 148, 4, 14);
  fill(ctx, charcoal, 104, 148, 4, 14);

  // Sparse brass + player accent (no structure red)
  fill(ctx, brass, 20, 108, 18, 2);
  fill(ctx, brass, 88, 124, 22, 2);
  fill(ctx, player, 28, 136, 9, 36);
  fill(ctx, brass, 27, 134, 11, 3);

  drawBanner(ctx, 40, 84, 48);
  drawBanner(ctx, 100, 62, 40);
  drawFlag(ctx, 72, 44);
  drawLantern(ctx, 48, 84);

  // Tiny defenders vs large keep (macro diorama scale)
  drawDefender(ctx, 30, keepY - 4);
  drawDefender(ctx, 70, keepY - 4);
  drawDefender(ctx, 148, 34);

  drawBallista(ctx, 176, GROUND_Y - 58);
}

/** Tiny multi-shade navy/blue-gray defender. */
function drawDefender(ctx, x, y) {
  // Helmet
  fill(ctx, stoneLight, x + 2, y, 5, 5);
  px(ctx, ash, x + 3, y);
  px(ctx, charcoalMid, x + 6, y + 2);
  // Body — multi-shade armor
  fill(ctx, player, x + 2, y + 5, 6, 10);
  px(ctx, navyMid, x + 3, y + 6);
  px(ctx, navyMid, x + 4, y + 8);
  px(ctx, navy, x + 5, y + 7);
  fill(ctx, brass, x + 3, y + 7, 2, 1);
  // Legs
  fill(ctx, charcoal, x + 2, y + 15, 2, 4);
  fill(ctx, charcoal, x + 5, y + 15, 2, 4);
  // Pike
  fill(ctx, wood, x + 8, y + 1, 1, 12);
  px(ctx, mid, x + 8, y);
  fill(ctx, mid, x + 9, y + 5, 3, 1);
}

function drawBallista(ctx, x, y) {
  drawDenseStoneRect(ctx, x, y + 26, 48, 18, true);
  drawWoodGrain(ctx, x + 3, y + 14, 42, 10);
  fill(ctx, woodDark, x + 6, y + 36, 6, 16);
  fill(ctx, woodDark, x + 34, y + 36, 6, 16);
  drawWoodGrain(ctx, x + 12, y + 2, 24, 14);
  // Bow arms
  fill(ctx, earthDark, x + 2, y + 8, 12, 4);
  fill(ctx, earthDark, x + 32, y + 8, 12, 4);
  for (let i = 0; i < 10; i++) {
    px(ctx, woodDark, x + 14 + i, y + 6 + ((i * 3) % 2));
  }
  fill(ctx, brass, x + 22, y + 1, 5, 5);
  fill(ctx, fireHot, x + 38, y + 8, 14, 2);
  fill(ctx, parchment, x + 50, y + 8, 8, 2);
  drawBanner(ctx, x + 40, y - 12, 28);
  drawLantern(ctx, x + 1, y + 6);
  drawWoodGrain(ctx, x - 14, y + 30, 12, 10);
  fill(ctx, mid, x - 12, y + 28, 2, 7);
  fill(ctx, mid, x - 8, y + 27, 2, 8);
}

function drawHouse(ctx, x, y) {
  drawWoodGrain(ctx, x, y + 20, 36, 28);
  for (let iy = 0; iy < 22; iy++) {
    for (let ix = 0; ix < 30; ix++) {
      if (hash2(x + ix, y + iy) > 0.82) px(ctx, charcoalMid, x + 3 + ix, y + 22 + iy);
    }
  }
  drawWoodGrain(ctx, x - 3, y + 8, 42, 12);
  fill(ctx, woodLight, x + 8, y + 2, 18, 8);
  fill(ctx, earthDark, x + 14, y + 28, 8, 14);
  fill(ctx, brass, x + 17, y + 34, 2, 2);
  drawMoss(ctx, x + 4, y + 46, 12);
}

function drawTree(ctx, x, y) {
  fill(ctx, earthDark, x + 6, y + 32, 4, 20);
  // Dense pine needles — pixel clusters
  const layers = [
    { y: 24, w: 18, c: grass },
    { y: 14, w: 16, c: charcoalMid },
    { y: 6, w: 14, c: grass },
    { y: -2, w: 12, c: moss },
    { y: -10, w: 8, c: charcoal },
  ];
  for (const L of layers) {
    const x0 = x + 8 - (L.w >> 1);
    for (let iy = 0; iy < 10; iy++) {
      for (let ix = 0; ix < L.w; ix++) {
        if (hash2(x0 + ix, y + L.y + iy) > 0.28) px(ctx, L.c, x0 + ix, y + L.y + iy);
      }
    }
  }
}

function drawFlower(ctx, x, y) {
  fill(ctx, grass, x, y + 4, 1, 6);
  fill(ctx, parchment, x - 1, y, 3, 2);
  px(ctx, brass, x, y);
}

function drawGrassTuft(ctx, x, y) {
  px(ctx, grass, x, y);
  px(ctx, moss, x, y + 1);
  px(ctx, grass, x, y + 2);
  px(ctx, moss, x + 2, y - 1);
  px(ctx, grass, x + 2, y);
  px(ctx, grass, x + 2, y + 1);
  px(ctx, grass, x + 4, y);
  px(ctx, moss, x + 4, y + 1);
}

/**
 * Tiny red-faction class silhouettes — multi-shade armor (original placeholders).
 * variant: 0 spear, 1 scout, 2 crossbow, 3 tower-shield, 4 ram-brute
 */
function drawEnemy(ctx, x, y, variant = 0) {
  fillDitherRect(ctx, x + 1, y + 36, 14, 4, mid, ash, 0.5, 4);

  if (variant === 4) {
    fill(ctx, redDark, x, y + 6, 22, 28);
    for (let iy = 0; iy < 22; iy++) {
      for (let ix = 0; ix < 16; ix++) {
        const c = hash2(x + ix, y + iy) > 0.65 ? redDark : red;
        px(ctx, c, x + 3 + ix, y + 8 + iy);
      }
    }
    fill(ctx, stoneBlue, x + 6, y - 2, 10, 10);
    fill(ctx, brass, x + 7, y + 1, 6, 2);
    drawWoodGrain(ctx, x - 18, y + 12, 20, 7);
    fill(ctx, earthDark, x - 22, y + 13, 6, 5);
    fill(ctx, charcoal, x + 3, y + 34, 5, 5);
    fill(ctx, charcoal, x + 12, y + 34, 5, 5);
    return;
  }

  if (variant === 3) {
    fill(ctx, charcoal, x + 5, y + 8, 9, 20);
    fill(ctx, stoneBlue, x + 5, y, 8, 9);
    for (let i = 0; i < 12; i++) {
      px(ctx, red, x + 6 + (i % 5), y + 10 + (i >> 2) * 3);
      px(ctx, redDark, x + 7 + (i % 4), y + 11 + (i >> 2) * 3);
    }
    fill(ctx, red, x - 3, y + 2, 9, 26);
    fill(ctx, brass, x - 1, y + 7, 5, 2);
    fill(ctx, brass, x, y + 12, 3, 8);
    fill(ctx, charcoal, x + 5, y + 28, 3, 6);
    fill(ctx, charcoal, x + 10, y + 28, 3, 6);
    return;
  }

  if (variant === 2) {
    fill(ctx, charcoal, x + 5, y + 9, 9, 17);
    fill(ctx, red, x + 4, y + 10, 8, 10);
    fill(ctx, redDark, x + 4, y, 8, 9);
    drawWoodGrain(ctx, x + 13, y + 10, 14, 3);
    fill(ctx, wood, x + 16, y + 6, 3, 11);
    fill(ctx, parchment, x + 26, y + 10, 5, 2);
    fill(ctx, charcoal, x + 4, y + 26, 3, 6);
    fill(ctx, charcoal, x + 10, y + 26, 3, 6);
    return;
  }

  if (variant === 1) {
    fill(ctx, redDark, x + 1, y + 15, 13, 12);
    fill(ctx, red, x + 2, y + 16, 11, 9);
    fill(ctx, charcoal, x + 4, y + 7, 8, 9);
    fill(ctx, redDark, x + 3, y + 2, 9, 6);
    fill(ctx, mid, x + 14, y + 17, 7, 2);
    fill(ctx, charcoal, x + 2, y + 27, 4, 6);
    fill(ctx, charcoal, x + 9, y + 26, 4, 7);
    return;
  }

  // Spearman — multi-shade tunic + helm
  fill(ctx, charcoal, x + 5, y + 8, 8, 18);
  for (let iy = 0; iy < 12; iy++) {
    for (let ix = 0; ix < 7; ix++) {
      px(ctx, hash2(x + ix, y + iy) > 0.55 ? redDark : red, x + 4 + ix, y + 10 + iy);
    }
  }
  fill(ctx, stoneBlue, x + 5, y, 7, 8);
  px(ctx, ash, x + 6, y);
  fill(ctx, brass, x + 6, y + 2, 4, 2);
  fill(ctx, red, x - 2, y + 10, 6, 10);
  fill(ctx, brass, x - 1, y + 12, 3, 3);
  fill(ctx, mid, x + 13, y - 12, 1, 28);
  fill(ctx, stoneLight, x + 11, y - 15, 5, 5);
  fill(ctx, charcoal, x + 4, y + 26, 3, 6);
  fill(ctx, charcoal, x + 10, y + 26, 3, 6);
}

function drawProjectile(ctx, x, y, kind = "bolt") {
  if (kind === "arrow") {
    fill(ctx, parchment, x, y, 10, 1);
    px(ctx, mid, x - 2, y);
    px(ctx, mid, x + 10, y);
    return;
  }
  fill(ctx, fireHot, x, y, 10, 2);
  fill(ctx, parchment, x + 9, y, 7, 2);
  fill(ctx, fireMid, x - 8, y, 7, 2);
  fill(ctx, fireCore, x - 13, y, 4, 2);
  fill(ctx, ash, x - 18, y, 4, 1);
}

function drawHitFx(ctx, x, y, t) {
  const pulse = Math.sin(t * 8) > 0 ? 0 : 1;
  fill(ctx, fireHot, x + pulse, y - 4, 7, 7);
  fill(ctx, fireMid, x - 5, y - 1, 8, 6);
  fill(ctx, fireCore, x + 2, y + 2, 6, 5);
  fill(ctx, parchment, x + 1, y - 2, 3, 3);
  px(ctx, fireHot, x - 9, y - 6);
  px(ctx, fireMid, x + 12, y - 5);
  px(ctx, fireCore, x + 11, y + 6);
  px(ctx, fireHot, x - 6, y + 8);
  fill(ctx, charcoal, x - 2, y + 9, 3, 3);
  // Selective brick-red danger only
  fill(ctx, red, x + 5, y + 7, 3, 2);
  fill(ctx, redDark, x - 4, y + 6, 2, 2);
}

/** Atmosphere / terrain only — dither is the shading language here. */
function drawTerrain(ctx) {
  fill(ctx, parchment, 0, 0, W, H);
  fillDitherRect(ctx, 0, 0, W, 190, parchment, parchmentDeep, 0.28, 8);
  fillDitherRect(ctx, 0, 100, W, 120, parchment, ash, 0.16, 8);

  // Distant mountains — soft print stipple
  fillDitherRect(ctx, 390, 120, 540, 120, parchmentDeep, mid, 0.52, 8);
  fillDitherRect(ctx, 480, 90, 400, 90, mid, parchmentDeep, 0.4, 8);
  fillDitherRect(ctx, 600, 70, 300, 70, mid, ash, 0.48, 8);
  fill(ctx, mid, 760, 85, 20, 36);
  fill(ctx, mid, 766, 74, 10, 16);
  fillDitherRect(ctx, 430, 210, 480, 60, ash, parchmentDeep, 0.3, 8);

  // Near ground mottling
  fillDitherRect(ctx, 0, GROUND_Y - 50, W, 100, ash, parchment, 0.2, 8);
  fillDitherRect(ctx, 240, GROUND_Y - 16, 620, 32, ash, grass, 0.1, 8);
}

function drawPath(ctx) {
  fillDitherRect(ctx, 220, GROUND_Y - 4, 680, 28, mid, earth, 0.36, 8);
  fillDitherRect(ctx, 210, GROUND_Y + 10, 360, 18, earth, charcoalMid, 0.3, 8);
}

function drawPlinth(ctx) {
  const depth = H - PLINTH_TOP;
  fill(ctx, earth, 0, PLINTH_TOP, W, depth);
  fillDitherRect(ctx, 0, PLINTH_TOP, W, 24, earth, earthDark, 0.52, 8);
  fillDitherRect(ctx, 0, PLINTH_TOP + 24, W, depth - 34, earthDark, charcoalMid, 0.46, 8);
  fillDitherRect(ctx, 0, H - 28, W, 20, charcoalMid, charcoal, 0.42, 8);
  fill(ctx, charcoal, 0, H - 8, W, 8);
  for (let i = 0; i < 24; i++) {
    fill(ctx, charcoalMid, 16 + i * 40, PLINTH_TOP + 32 + (i % 3) * 10, 32, 2);
    fill(ctx, earth, 32 + i * 40, PLINTH_TOP + 52 + (i % 2) * 8, 24, 2);
  }
  for (let x = 6; x < W - 6; x += 6) {
    if (x < 220 || x > 250) drawGrassTuft(ctx, x, PLINTH_TOP - 6);
  }
}

function drawMiniHud(ctx) {
  fill(ctx, charcoal, 14, 8, 96, 12);
  fill(ctx, red, 16, 9, 68, 10);
  fill(ctx, charcoal, W - 118, 8, 104, 12);
  fill(ctx, brass, W - 116, 9, 28, 10);
  fill(ctx, mid, W - 86, 9, 28, 10);
  fill(ctx, mid, W - 56, 9, 28, 10);
}

/**
 * Draw style-test still: dither only on terrain/shadows/BG;
 * castle / units / projectiles stay cleaner so dense detail reads.
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

  // --- Layer A: atmosphere / ground (may receive print dither) ---
  drawTerrain(sceneCtx);
  drawPath(sceneCtx);
  drawPlinth(sceneCtx);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    // Restrained: light Bayer-8 on BG only — not a heavy full-screen mesh
    applyOrderedDither(outCtx, W, H, { strength: 0.28, matrix: "8" });
  }

  // --- Layer B: clean dense sprites over dithered BG (no full-frame mesh) ---
  sceneCtx.clearRect(0, 0, W, H);

  drawCastle(sceneCtx);
  drawHouse(sceneCtx, 252, GROUND_Y - 48);
  drawHouse(sceneCtx, 310, GROUND_Y - 40);
  drawTree(sceneCtx, 380, GROUND_Y - 52);
  drawTree(sceneCtx, 690, GROUND_Y - 64);
  drawTree(sceneCtx, 860, GROUND_Y - 56);

  drawGrassTuft(sceneCtx, 240, GROUND_Y - 6);
  drawGrassTuft(sceneCtx, 450, GROUND_Y - 5);
  drawGrassTuft(sceneCtx, 555, GROUND_Y - 7);
  drawFlower(sceneCtx, 468, GROUND_Y - 10);
  drawFlower(sceneCtx, 572, GROUND_Y - 11);
  drawFlower(sceneCtx, 286, GROUND_Y - 9);

  const enemies = [
    { x: 510, y: GROUND_Y - 36, v: 0 },
    { x: 552, y: GROUND_Y - 34, v: 1 },
    { x: 588, y: GROUND_Y - 36, v: 2 },
    { x: 630, y: GROUND_Y - 36, v: 3 },
    { x: 678, y: GROUND_Y - 40, v: 4 },
  ];
  enemies.forEach((e, i) => {
    const bob = Math.sin(t * 3 + i) > 0 ? 0 : 1;
    drawEnemy(sceneCtx, e.x, e.y + bob, e.v);
  });

  const boltX = 270 + ((t * 90) % 280);
  drawProjectile(sceneCtx, boltX, GROUND_Y - 78, "bolt");
  drawProjectile(sceneCtx, boltX - 60, GROUND_Y - 96, "arrow");
  drawProjectile(sceneCtx, boltX - 36, GROUND_Y - 60, "arrow");

  drawHitFx(sceneCtx, 470, GROUND_Y - 78, t);

  drawMiniHud(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);

  outCtx.drawImage(sceneCanvas, 0, 0);

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.12,
      bottomFrac: 0.1,
      blurPx: 1.2,
    });
    applyVignette(outCtx, W, H, { strength: 0.2 });
    applyGrain(outCtx, W, H, { opacity: 0.028, seed: 11 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
