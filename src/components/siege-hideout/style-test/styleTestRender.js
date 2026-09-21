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

/** Combat band ends above campaign-map strip. */
const MAP_Y = 392;
const COMBAT_H = MAP_Y;

const ash = hexToRgb(PALETTE.paleAsh);
const parchment = hexToRgb(PALETTE.parchment);
const parchmentDeep = hexToRgb(PALETTE.parchmentDeep);
const parchmentEdge = hexToRgb(PALETTE.parchmentEdge);
const mid = hexToRgb(PALETTE.midGray);
const charcoal = hexToRgb(PALETTE.charcoal);
const charcoalMid = hexToRgb(PALETTE.charcoalMid);
const red = hexToRgb(PALETTE.redSignal);
const redDark = hexToRgb(PALETTE.redShadow);
const crimson = hexToRgb(PALETTE.crimson);
const brass = hexToRgb(PALETTE.brass);
const player = hexToRgb(PALETTE.playerAccent);
const navy = hexToRgb(PALETTE.navy);
const navyDeep = hexToRgb(PALETTE.navyDeep);
const navyMid = hexToRgb(PALETTE.navyMid);
const royal = hexToRgb(PALETTE.royal);
const royalLit = hexToRgb(PALETTE.royalLit);
const stoneLight = hexToRgb(PALETTE.stoneLight);
const stoneBlue = hexToRgb(PALETTE.stoneBlue);
const slate = hexToRgb(PALETTE.slate);
const slateDeep = hexToRgb(PALETTE.slateDeep);
const cliff = hexToRgb(PALETTE.cliff);
const cliffLit = hexToRgb(PALETTE.cliffLit);
const earth = hexToRgb(PALETTE.earth);
const earthDark = hexToRgb(PALETTE.earthDark);
const grass = hexToRgb(PALETTE.grass);
const moss = hexToRgb(PALETTE.moss);
const pine = hexToRgb(PALETTE.pine);
const wood = hexToRgb(PALETTE.wood);
const woodLight = hexToRgb(PALETTE.woodLight);
const woodDark = hexToRgb(PALETTE.woodDark);
const tableWood = hexToRgb(PALETTE.tableWood);
const tableLit = hexToRgb(PALETTE.tableLit);
const skyHaze = hexToRgb(PALETTE.skyHaze);
const mist = hexToRgb(PALETTE.mist);
const fireHot = hexToRgb(PALETTE.fireHot);
const fireMid = hexToRgb(PALETTE.fireMid);
const fireCore = hexToRgb(PALETTE.fireCore);

function px(ctx, rgb, x, y) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

function fill(ctx, rgb, x, y, w, h) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Deterministic speck hash — no Math.random shimmer. */
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

/** Paper grain flecks over a rect. */
function paperGrain(ctx, x0, y0, w, h, intensity = 0.12) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const hsh = hash2(x, y);
      if (hsh < intensity * 0.35) px(ctx, parchmentDeep, x, y);
      else if (hsh > 1 - intensity * 0.25) px(ctx, ash, x, y);
    }
  }
}

/** Weathered parchment margin — deckled edge feel (original, not traced). */
function drawParchmentFrame(ctx) {
  fill(ctx, parchmentEdge, 0, 0, W, H);
  fill(ctx, parchment, 10, 8, W - 20, MAP_Y - 14);
  paperGrain(ctx, 10, 8, W - 20, MAP_Y - 14, 0.1);
  // Deckled nicks
  for (let i = 0; i < 48; i++) {
    const x = 8 + ((i * 37) % (W - 20));
    const top = 4 + (hash2(x, 1) > 0.5 ? 1 : 0);
    fill(ctx, parchmentEdge, x, top, 3 + (i % 3), 3);
    const bot = MAP_Y - 8 + (hash2(x, 9) > 0.55 ? 1 : 0);
    fill(ctx, parchmentEdge, x + 2, bot, 2 + (i % 2), 3);
  }
  for (let i = 0; i < 28; i++) {
    const y = 12 + ((i * 41) % (MAP_Y - 24));
    fill(ctx, parchmentEdge, 4 + (hash2(1, y) > 0.5 ? 1 : 0), y, 4, 2);
    fill(ctx, parchmentEdge, W - 10, y + 1, 4, 2);
  }
}

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
      const base = lit
        ? pickShade(x, y, stoneBlue, slate, charcoalMid)
        : pickShade(x, y, slateDeep, charcoalMid, slate);
      fill(ctx, base, x, y, bw, bh);
      fill(ctx, charcoalMid, x, y + bh - 1, bw, 1);
      if (hash2(x + 3, y + 1) > 0.85) px(ctx, lit ? cliffLit : slate, x, y);
    }
  }
}

function drawWoodGrain(ctx, x, y, w, h) {
  fill(ctx, wood, x, y, w, h);
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const hsh = hash2(x + ix, y + iy);
      if (ix === w - 1 || hsh < 0.08) px(ctx, woodDark, x + ix, y + iy);
      else if (iy % 3 === 0 && hsh < 0.45) px(ctx, woodLight, x + ix, y + iy);
      else if (hsh > 0.92) px(ctx, earthDark, x + ix, y + iy);
    }
  }
}

/** Original diamond mark — not fleur / cross from refs. */
function drawBlueBanner(ctx, x, y, tall = 28) {
  fill(ctx, navyDeep, x, y, 9, tall);
  for (let iy = 1; iy < tall - 1; iy++) {
    for (let ix = 1; ix < 8; ix++) {
      px(ctx, hash2(x + ix, y + iy) > 0.9 ? navyDeep : royal, x + ix, y + iy);
    }
  }
  // Pale diamond
  fill(ctx, ash, x + 4, y + 6, 1, 10);
  fill(ctx, ash, x + 3, y + 8, 3, 6);
  fill(ctx, ash, x + 2, y + 10, 5, 2);
  fill(ctx, brass, x + 3, y + 3, 3, 1);
  for (let i = 0; i < 3; i++) {
    if (hash2(x, y + tall - 1 - i) > 0.4) px(ctx, navyDeep, x + 2 + i * 2, y + tall - 1);
  }
}

/** Original bar + ring mark — not skull / heraldic cross. */
function drawRedBanner(ctx, x, y, tall = 28) {
  fill(ctx, redDark, x, y, 9, tall);
  for (let iy = 1; iy < tall - 1; iy++) {
    for (let ix = 1; ix < 8; ix++) {
      px(ctx, hash2(x + ix, y + iy) > 0.88 ? redDark : crimson, x + ix, y + iy);
    }
  }
  fill(ctx, ash, x + 2, y + 8, 5, 2);
  fill(ctx, ash, x + 3, y + 12, 3, 3);
  px(ctx, ash, x + 4, y + 11);
  px(ctx, ash, x + 4, y + 15);
  fill(ctx, brass, x + 3, y + 3, 3, 1);
}

function drawContactShadow(ctx, x, y, w = 10, h = 3) {
  fillDitherRect(ctx, x, y, w, h, charcoalMid, mid, 0.55, 4);
}

/** Soft isometric diamond tile (ground / bridge stone). */
function drawIsoTile(ctx, cx, cy, hw, hh, top, left, right) {
  // Top face
  for (let dy = -hh; dy <= 0; dy++) {
    const t = 1 - Math.abs(dy) / hh;
    const half = Math.max(1, Math.floor(hw * t));
    for (let dx = -half; dx <= half; dx++) {
      px(ctx, top, cx + dx, cy + dy);
    }
  }
  // Left face
  for (let dy = 0; dy < hh + 2; dy++) {
    const shrink = Math.floor(dy * (hw / (hh + 4)));
    for (let dx = -hw + shrink; dx <= -1; dx++) {
      px(ctx, left, cx + dx, cy + dy);
    }
  }
  // Right face
  for (let dy = 0; dy < hh + 2; dy++) {
    const shrink = Math.floor(dy * (hw / (hh + 4)));
    for (let dx = 1; dx <= hw - shrink; dx++) {
      px(ctx, right, cx + dx, cy + dy);
    }
  }
}

function drawPine(ctx, x, y, scale = 1) {
  const s = scale;
  fill(ctx, earthDark, x + Math.floor(2 * s), y + Math.floor(14 * s), Math.max(1, Math.floor(2 * s)), Math.floor(8 * s));
  const layers = [
    { oy: 10, w: 10, c: pine },
    { oy: 5, w: 8, c: moss },
    { oy: 1, w: 6, c: grass },
    { oy: -3, w: 4, c: pine },
  ];
  for (const L of layers) {
    const ww = Math.floor(L.w * s);
    const x0 = x + Math.floor(3 * s) - (ww >> 1);
    const yy = y + Math.floor(L.oy * s);
    for (let iy = 0; iy < Math.floor(6 * s); iy++) {
      for (let ix = 0; ix < ww; ix++) {
        if (hash2(x0 + ix, yy + iy) > 0.28) px(ctx, L.c, x0 + ix, yy + iy);
      }
    }
  }
}

function drawCliffMass(ctx, x, y, w, h, soft = false) {
  for (let iy = 0; iy < h; iy++) {
    for (let ix = 0; ix < w; ix++) {
      const edge = ix < 3 || ix > w - 4 || iy < 2;
      const base = soft
        ? pickShade(x + ix, y + iy, mist, cliff, slate)
        : pickShade(x + ix, y + iy, cliffLit, cliff, slateDeep);
      if (edge && hash2(x + ix, y + iy) > 0.4) px(ctx, soft ? mist : slate, x + ix, y + iy);
      else px(ctx, base, x + ix, y + iy);
    }
  }
  // Grass lip
  for (let ix = 2; ix < w - 2; ix += 2) {
    if (hash2(x + ix, y) > 0.35) px(ctx, grass, x + ix, y);
    if (hash2(x + ix, y - 1) > 0.6) px(ctx, moss, x + ix, y - 1);
  }
}

/** Chibi-ish dense defender — royal blue tunic, silver helm. */
function drawIsoDefender(ctx, x, y) {
  drawContactShadow(ctx, x + 1, y + 16, 10, 3);
  fill(ctx, stoneLight, x + 3, y, 5, 5);
  px(ctx, ash, x + 4, y);
  px(ctx, charcoalMid, x + 7, y + 2);
  fill(ctx, royal, x + 2, y + 5, 7, 8);
  px(ctx, royalLit, x + 3, y + 6);
  px(ctx, navy, x + 6, y + 7);
  fill(ctx, brass, x + 4, y + 8, 2, 1);
  fill(ctx, charcoal, x + 3, y + 13, 2, 4);
  fill(ctx, charcoal, x + 6, y + 13, 2, 4);
  fill(ctx, wood, x + 9, y + 2, 1, 10);
  px(ctx, mid, x + 9, y + 1);
}

/** Compact red grunt — original silhouette. */
function drawIsoGrunt(ctx, x, y, variant = 0) {
  drawContactShadow(ctx, x + 1, y + 16, 11, 3);
  if (variant === 2) {
    // Brute — larger but not copied boss design
    fill(ctx, redDark, x, y + 2, 14, 14);
    for (let iy = 0; iy < 10; iy++) {
      for (let ix = 0; ix < 10; ix++) {
        px(ctx, hash2(x + ix, y + iy) > 0.55 ? redDark : red, x + 2 + ix, y + 4 + iy);
      }
    }
    fill(ctx, slate, x + 4, y - 2, 7, 6);
    fill(ctx, brass, x + 5, y, 4, 1);
    fill(ctx, woodDark, x - 6, y + 6, 8, 4);
    fill(ctx, charcoal, x + 2, y + 16, 3, 4);
    fill(ctx, charcoal, x + 8, y + 16, 3, 4);
    return;
  }
  fill(ctx, charcoal, x + 3, y + 6, 7, 10);
  for (let iy = 0; iy < 8; iy++) {
    for (let ix = 0; ix < 6; ix++) {
      px(ctx, hash2(x + ix, y + iy) > 0.5 ? redDark : crimson, x + 3 + ix, y + 7 + iy);
    }
  }
  fill(ctx, slate, x + 3, y, 6, 6);
  px(ctx, ash, x + 4, y);
  if (variant === 1) {
    fill(ctx, wood, x + 10, y + 4, 8, 2);
    fill(ctx, woodDark, x + 12, y + 2, 2, 6);
  } else {
    fill(ctx, red, x - 1, y + 7, 4, 7);
    fill(ctx, brass, x, y + 9, 2, 2);
    fill(ctx, mid, x + 10, y - 4, 1, 14);
  }
  fill(ctx, charcoal, x + 3, y + 16, 2, 3);
  fill(ctx, charcoal, x + 7, y + 16, 2, 3);
}

function drawIsoArcher(ctx, x, y) {
  drawContactShadow(ctx, x + 1, y + 14, 9, 3);
  fill(ctx, royal, x + 2, y + 4, 6, 8);
  fill(ctx, stoneLight, x + 3, y, 4, 4);
  fill(ctx, wood, x + 8, y + 2, 1, 10);
  fill(ctx, parchment, x + 9, y + 5, 5, 1);
  fill(ctx, charcoal, x + 2, y + 12, 2, 3);
  fill(ctx, charcoal, x + 5, y + 12, 2, 3);
}

function drawBolt(ctx, x, y) {
  fill(ctx, parchment, x, y, 9, 1);
  px(ctx, mid, x - 1, y);
  px(ctx, fireHot, x + 9, y);
}

function drawHitSpark(ctx, x, y, t) {
  const pulse = Math.sin(t * 9) > 0 ? 0 : 1;
  fill(ctx, fireHot, x + pulse, y - 2, 5, 5);
  fill(ctx, fireMid, x - 3, y, 5, 4);
  fill(ctx, fireCore, x + 1, y + 2, 4, 3);
  fill(ctx, red, x + 4, y + 4, 2, 2);
}

function drawLeftKeep(ctx) {
  // Cliff shelf
  drawCliffMass(ctx, 24, 210, 170, 95, false);
  fillDitherRect(ctx, 30, 300, 160, 40, earth, earthDark, 0.4, 4);

  // Gatehouse body (slight iso lean — left mass)
  drawDenseStoneRect(ctx, 48, 118, 110, 100, true);
  for (let i = 0; i < 10; i++) {
    drawDenseStoneRect(ctx, 50 + i * 11, 104, 8, 16, i % 2 === 0);
  }
  // Side tower
  drawDenseStoneRect(ctx, 138, 88, 42, 130, true);
  for (let i = 0; i < 4; i++) {
    drawDenseStoneRect(ctx, 140 + i * 10, 74, 8, 15, true);
  }
  drawWoodGrain(ctx, 140, 66, 38, 10);
  fill(ctx, brass, 156, 62, 4, 4);

  // Portcullis / gate — wood bars (original)
  fill(ctx, charcoalMid, 78, 168, 42, 50);
  drawWoodGrain(ctx, 80, 170, 38, 46);
  for (let i = 0; i < 5; i++) {
    fill(ctx, woodDark, 84 + i * 7, 172, 2, 42);
  }
  fill(ctx, brass, 96, 190, 4, 4);

  drawBlueBanner(ctx, 66, 126, 34);
  drawBlueBanner(ctx, 118, 112, 30);
  fill(ctx, woodDark, 152, 70, 2, 18);
  for (let iy = 0; iy < 8; iy++) {
    for (let ix = 0; ix < 12; ix++) {
      px(ctx, hash2(152 + ix, 70 + iy) > 0.9 ? navyDeep : royal, 154 + ix, 70 + iy);
    }
  }
  // Diamond pip on flag
  fill(ctx, ash, 158, 72, 3, 3);

  drawIsoArcher(ctx, 70, 110);
  drawIsoArcher(ctx, 108, 108);
  drawIsoDefender(ctx, 88, 196);
  drawIsoDefender(ctx, 120, 200);
  drawPine(ctx, 18, 240, 1.1);
  drawPine(ctx, 4, 268, 0.9);
}

function drawRightKeep(ctx) {
  drawCliffMass(ctx, 760, 200, 170, 100, false);
  fillDitherRect(ctx, 770, 295, 150, 42, earth, charcoalMid, 0.42, 4);

  drawDenseStoneRect(ctx, 790, 100, 90, 120, false);
  for (let i = 0; i < 8; i++) {
    drawDenseStoneRect(ctx, 792 + i * 11, 86, 8, 15, i % 2 === 0);
  }
  drawDenseStoneRect(ctx, 860, 70, 48, 150, false);
  for (let i = 0; i < 4; i++) {
    drawDenseStoneRect(ctx, 862 + i * 11, 56, 9, 15, true);
  }
  drawWoodGrain(ctx, 862, 48, 44, 10);

  drawRedBanner(ctx, 808, 108, 32);
  drawRedBanner(ctx, 848, 92, 28);
  fill(ctx, woodDark, 880, 52, 2, 16);
  for (let iy = 0; iy < 8; iy++) {
    for (let ix = 0; ix < 12; ix++) {
      px(ctx, hash2(880 + ix, 52 + iy) > 0.88 ? redDark : crimson, 882 + ix, 52 + iy);
    }
  }
  fill(ctx, ash, 885, 54, 5, 2);

  drawIsoGrunt(ctx, 820, 198, 0);
  drawIsoGrunt(ctx, 848, 204, 1);
  drawPine(ctx, 920, 250, 1);
  drawPine(ctx, 900, 280, 0.85);
}

function drawBridge(ctx, t) {
  // Chasm void
  fillDitherRect(ctx, 280, 220, 400, 120, charcoalMid, charcoal, 0.55, 8);
  fillDitherRect(ctx, 300, 250, 360, 80, charcoal, slateDeep, 0.4, 8);
  // Mist in gorge
  fillDitherRect(ctx, 320, 280, 320, 40, mist, charcoalMid, 0.25, 8);

  // Stone arch suggestion
  for (let i = 0; i < 14; i++) {
    const x = 300 + i * 26;
    const dip = Math.abs(i - 6.5) * 3;
    drawIsoTile(
      ctx,
      x,
      248 + dip,
      14,
      7,
      pickShade(x, 248, stoneLight, stoneBlue, slate),
      slate,
      slateDeep
    );
  }
  // Deck planks / stones on top
  for (let i = 0; i < 18; i++) {
    const x = 290 + i * 20;
    const y = 236 + Math.sin(i * 0.4) * 2;
    drawDenseStoneRect(ctx, x, y, 18, 10, i % 2 === 0);
    fill(ctx, charcoalMid, x, y + 9, 18, 1);
  }
  // Rail posts
  for (let i = 0; i < 10; i++) {
    const x = 310 + i * 36;
    fill(ctx, woodDark, x, 228, 2, 12);
    fill(ctx, wood, x - 4, 228, 10, 2);
  }

  // Combatants on bridge — blue left / red right
  drawIsoDefender(ctx, 340, 218);
  drawIsoDefender(ctx, 372, 220);
  drawIsoDefender(ctx, 400, 216);
  drawIsoArcher(ctx, 318, 212);

  drawIsoGrunt(ctx, 520, 218, 0);
  drawIsoGrunt(ctx, 548, 220, 1);
  drawIsoGrunt(ctx, 576, 216, 0);
  drawIsoGrunt(ctx, 608, 214, 2);

  const boltX = 420 + ((t * 70) % 120);
  drawBolt(ctx, boltX, 210);
  drawBolt(ctx, boltX - 28, 206);
  drawHitSpark(ctx, 510, 208, t);
}

function drawBackground(ctx) {
  // Soft distant haze mountains (lower info — DoF will soften further)
  fillDitherRect(ctx, 200, 40, 560, 100, skyHaze, mist, 0.35, 8);
  fillDitherRect(ctx, 260, 70, 200, 70, mist, cliff, 0.4, 8);
  fillDitherRect(ctx, 520, 60, 220, 80, cliff, mist, 0.38, 8);
  // Far pines
  drawPine(ctx, 240, 120, 0.7);
  drawPine(ctx, 270, 128, 0.55);
  drawPine(ctx, 640, 110, 0.65);
  drawPine(ctx, 680, 118, 0.5);
  // Soft waterfall suggestion (right-of-center gorge wall)
  fillDitherRect(ctx, 470, 100, 14, 110, ash, mist, 0.5, 4);
  fillDitherRect(ctx, 484, 110, 8, 90, mist, ash, 0.4, 4);
}

function drawMiniHud(ctx) {
  fill(ctx, charcoal, 18, 14, 88, 10);
  fill(ctx, red, 20, 15, 60, 8);
  fill(ctx, charcoal, W - 120, 14, 100, 10);
  fill(ctx, brass, W - 118, 15, 26, 8);
  fill(ctx, mid, W - 90, 15, 26, 8);
  fill(ctx, royal, W - 62, 15, 26, 8);
}

/** Campaign map strip — wooden table + parchment path stub (original icons). */
function drawMapStrip(ctx) {
  fill(ctx, tableWood, 0, MAP_Y, W, H - MAP_Y);
  for (let y = MAP_Y; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hsh = hash2(x, y);
      if (hsh < 0.06) px(ctx, tableLit, x, y);
      else if (hsh > 0.94) px(ctx, charcoal, x, y);
      else if (x % 37 === 0) px(ctx, earthDark, x, y);
    }
  }

  // Parchment sheet on table
  const mx = 70;
  const my = MAP_Y + 10;
  const mw = W - 140;
  const mh = H - MAP_Y - 18;
  fill(ctx, parchmentDeep, mx - 2, my - 2, mw + 4, mh + 4);
  fill(ctx, parchment, mx, my, mw, mh);
  paperGrain(ctx, mx, my, mw, mh, 0.14);
  // Deckled edge of map sheet
  for (let i = 0; i < 40; i++) {
    const x = mx + ((i * 29) % mw);
    if (hash2(x, my) > 0.5) fill(ctx, parchmentEdge, x, my - 1, 2, 2);
    if (hash2(x, my + mh) > 0.45) fill(ctx, parchmentEdge, x, my + mh - 1, 2, 2);
  }

  // Hand-drawn mountain / tree sketches (negative space fillers)
  fillDitherRect(ctx, mx + 40, my + 18, 90, 28, parchmentDeep, mid, 0.35, 4);
  fillDitherRect(ctx, mx + mw - 140, my + 22, 80, 24, parchmentDeep, mid, 0.32, 4);
  for (let i = 0; i < 6; i++) {
    drawPine(ctx, mx + 60 + i * 110, my + 55, 0.45);
  }

  // Dotted campaign path + original location nodes
  const nodes = [
    { x: mx + 50, y: my + 70, kind: "keep", faction: "blue" },
    { x: mx + 150, y: my + 55, kind: "grove", faction: "blue" },
    { x: mx + 250, y: my + 75, kind: "hut", faction: "neutral" },
    { x: mx + 360, y: my + 50, kind: "bridge", faction: "blue" },
    { x: mx + 470, y: my + 70, kind: "village", faction: "red" },
    { x: mx + 580, y: my + 48, kind: "mine", faction: "red" },
    { x: mx + 690, y: my + 68, kind: "fort", faction: "red" },
  ];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];
    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const x = Math.round(a.x + (b.x - a.x) * u);
      const y = Math.round(a.y + (b.y - a.y) * u);
      if (s % 2 === 0) fill(ctx, charcoal, x, y, 2, 2);
    }
  }
  for (const n of nodes) {
    drawMapNode(ctx, n.x, n.y, n.kind, n.faction);
  }

  // Original table props — compass, coins, scroll, cloth scraps
  drawCompass(ctx, 18, H - 42);
  drawCoins(ctx, 48, H - 28);
  drawScroll(ctx, 22, MAP_Y + 16);
  drawClothScrap(ctx, W - 58, H - 48, royal);
  drawClothScrap(ctx, W - 40, H - 36, crimson);
}

function drawMapNode(ctx, x, y, kind, faction) {
  drawContactShadow(ctx, x - 4, y + 10, 12, 3);
  if (kind === "keep" || kind === "fort") {
    drawDenseStoneRect(ctx, x - 5, y - 8, 12, 14, faction === "blue");
    fill(ctx, woodDark, x - 4, y - 12, 10, 4);
  } else if (kind === "grove") {
    drawPine(ctx, x - 4, y - 10, 0.55);
  } else if (kind === "hut") {
    drawWoodGrain(ctx, x - 6, y - 2, 12, 10);
    fill(ctx, woodLight, x - 7, y - 8, 14, 6);
  } else if (kind === "bridge") {
    fill(ctx, slate, x - 8, y + 2, 16, 4);
    fill(ctx, stoneBlue, x - 6, y - 2, 12, 4);
  } else if (kind === "village") {
    drawWoodGrain(ctx, x - 8, y, 8, 8);
    drawWoodGrain(ctx, x + 1, y - 2, 8, 10);
    fill(ctx, woodLight, x - 9, y - 5, 10, 5);
  } else if (kind === "mine") {
    fill(ctx, charcoalMid, x - 6, y, 12, 8);
    fill(ctx, charcoal, x - 2, y + 2, 5, 5);
    fill(ctx, brass, x + 4, y - 2, 3, 3);
  }
  // Status ribbon — geometric only
  if (faction === "blue") {
    fill(ctx, royal, x - 3, y - 18, 7, 8);
    fill(ctx, ash, x - 1, y - 16, 3, 3);
  } else if (faction === "red") {
    fill(ctx, crimson, x - 3, y - 18, 7, 8);
    fill(ctx, ash, x - 2, y - 15, 5, 2);
  }
}

function drawCompass(ctx, x, y) {
  fill(ctx, brass, x, y, 22, 22);
  fill(ctx, parchment, x + 3, y + 3, 16, 16);
  fill(ctx, charcoal, x + 10, y + 4, 2, 14);
  fill(ctx, charcoal, x + 4, y + 10, 14, 2);
  fill(ctx, red, x + 10, y + 5, 2, 6);
  fill(ctx, navy, x + 10, y + 11, 2, 5);
}

function drawCoins(ctx, x, y) {
  for (let i = 0; i < 4; i++) {
    fill(ctx, brass, x + i * 5, y + (i % 2), 6, 5);
    px(ctx, fireHot, x + 2 + i * 5, y + 1 + (i % 2));
  }
}

function drawScroll(ctx, x, y) {
  fill(ctx, parchmentDeep, x, y, 28, 10);
  fill(ctx, parchment, x + 1, y + 1, 26, 8);
  fill(ctx, royal, x + 10, y + 3, 14, 4);
  fill(ctx, navyDeep, x + 12, y + 4, 10, 2);
}

function drawClothScrap(ctx, x, y, rgb) {
  fill(ctx, rgb, x, y, 18, 22);
  for (let iy = 0; iy < 20; iy++) {
    for (let ix = 0; ix < 16; ix++) {
      if (hash2(x + ix, y + iy) > 0.92) px(ctx, ash, x + 1 + ix, y + 1 + iy);
    }
  }
  fill(ctx, ash, x + 6, y + 6, 5, 5);
}

/**
 * v5 isometric parchment combat + campaign-map strip.
 * Dither on atmosphere only; keeps / units stay clean for readability.
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

  // --- Layer A: parchment + soft BG (may receive print dither) ---
  sceneCtx.clearRect(0, 0, W, H);
  drawParchmentFrame(sceneCtx);
  drawBackground(sceneCtx);
  // Soft ground wash under bridge
  fillDitherRect(sceneCtx, 200, 300, 560, 70, parchmentDeep, earth, 0.18, 8);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    applyOrderedDither(outCtx, W, H, { strength: 0.22, matrix: "8" });
  }

  // --- Layer B: clean isometric subjects ---
  sceneCtx.clearRect(0, 0, W, H);
  drawLeftKeep(sceneCtx);
  drawRightKeep(sceneCtx);
  drawBridge(sceneCtx, t);
  drawMiniHud(sceneCtx);
  drawMapStrip(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);

  outCtx.drawImage(sceneCanvas, 0, 0);

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.14,
      bottomFrac: 0.06,
      blurPx: 1.15,
    });
    applyVignette(outCtx, W, H, { strength: 0.18 });
    applyGrain(outCtx, W, H, { opacity: 0.032, seed: 17 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
export const STYLE_TEST_LAYOUT = { mapY: MAP_Y, combatH: COMBAT_H };
