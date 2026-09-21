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
  // Top face (diamond)
  for (let dy = -hh; dy <= 0; dy++) {
    const t = 1 - Math.abs(dy) / Math.max(1, hh);
    const half = Math.max(1, Math.floor(hw * t));
    for (let dx = -half; dx <= half; dx++) {
      const c = hash2(cx + dx, cy + dy) > 0.88 ? left : top;
      px(ctx, c, cx + dx, cy + dy);
    }
  }
  // Left face
  for (let dy = 1; dy <= hh + 3; dy++) {
    const shrink = Math.floor((dy / (hh + 4)) * hw);
    for (let dx = -hw + shrink; dx <= 0; dx++) {
      px(ctx, left, cx + dx, cy + dy);
    }
  }
  // Right face
  for (let dy = 1; dy <= hh + 3; dy++) {
    const shrink = Math.floor((dy / (hh + 4)) * hw);
    for (let dx = 0; dx <= hw - shrink; dx++) {
      px(ctx, right, cx + dx, cy + dy);
    }
  }
}

/**
 * Isometric prism (2:1) — top rhombus + parallelogram walls with stone courses.
 * (cx,cy) = top-face center.
 */
function drawIsoPrism(ctx, cx, cy, hw, hh, depth, top, left, right) {
  const H = Math.max(1, hh);
  const W = Math.max(1, hw);
  // Top rhombus
  for (let row = -H; row <= H; row++) {
    const half = Math.max(1, Math.round(W * (1 - Math.abs(row) / H)));
    for (let col = -half; col <= half; col++) {
      const c = hash2(cx + col, cy + row) > 0.9 ? left : top;
      px(ctx, c, cx + col, cy + row);
    }
  }
  // Left face (SW parallelogram)
  for (let d = 1; d <= depth; d++) {
    for (let i = 0; i <= W; i++) {
      const x = cx - W + i;
      const y = cy + Math.round((i / W) * H) + d;
      const mortar = d % 3 === 0 || (i + Math.floor(d / 3)) % 5 === 0;
      const base = mortar
        ? charcoalMid
        : pickShade(x, y, left, slateDeep, charcoalMid);
      px(ctx, base, x, y);
    }
  }
  // Right face (SE parallelogram)
  for (let d = 1; d <= depth; d++) {
    for (let i = 0; i <= W; i++) {
      const x = cx + W - i;
      const y = cy + Math.round((i / W) * H) + d;
      const mortar = d % 3 === 0 || (i + Math.floor(d / 3)) % 5 === 0;
      const base = mortar
        ? charcoalMid
        : pickShade(x, y, right, charcoalMid, slate);
      px(ctx, base, x, y);
    }
  }
  // Front vertical seam (readable cube edge)
  fill(ctx, charcoal, cx - 1, cy + H + 1, 2, depth);
}

/** Merlon battlements along an iso ridge. */
function drawBattlements(ctx, cx, cy, count, spacing, hw = 6, hh = 3, depth = 8) {
  for (let i = -Math.floor(count / 2); i <= Math.floor(count / 2); i++) {
    drawIsoPrism(
      ctx,
      cx + i * spacing,
      cy + Math.abs(i),
      hw,
      hh,
      depth,
      stoneLight,
      slate,
      charcoalMid
    );
  }
}

/** Arched wood gate on the front (SE-ish) face of a keep. */
function drawGateArch(ctx, x, y, w, h) {
  fill(ctx, charcoal, x, y, w, h);
  const mid = x + (w >> 1);
  for (let iy = 0; iy < 8; iy++) {
    const half = Math.floor((w / 2) * (1 - iy / 10));
    fill(ctx, charcoal, mid - half, y + iy - 6, half * 2, 1);
  }
  drawWoodGrain(ctx, x + 2, y + 2, w - 4, h - 4);
  for (let i = 0; i < Math.floor((w - 6) / 5); i++) {
    fill(ctx, woodDark, x + 4 + i * 5, y + 3, 2, h - 6);
  }
  fill(ctx, brass, mid - 2, y + Math.floor(h * 0.45), 4, 4);
  for (let a = -Math.floor(w / 2) - 1; a <= Math.floor(w / 2) + 1; a++) {
    const ay = y - 5 + Math.floor((a * a) / Math.max(8, w));
    fill(ctx, stoneLight, mid + a, ay, 2, 3);
    fill(ctx, charcoalMid, mid + a, ay + 2, 2, 1);
  }
}

/** Map iso grid → screen (2:1). */
function isoToScreen(ix, iy, ox, oy, tw = 18, th = 9) {
  return {
    x: Math.round(ox + (ix - iy) * tw),
    y: Math.round(oy + (ix + iy) * th),
  };
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
    // Jagged silhouette — narrower toward gorge edge
    const jagged = Math.floor(hash2(x, y + iy) * 5) + Math.floor(iy * 0.04);
    const xStart = soft ? 0 : jagged;
    const xEnd = soft ? w : w - jagged;
    for (let ix = xStart; ix < xEnd; ix++) {
      const edge = ix < xStart + 3 || ix > xEnd - 4 || iy < 2;
      const strata = Math.floor(iy / 7) % 3;
      let base;
      if (soft) {
        base = pickShade(x + ix, y + iy, mist, cliff, slate);
      } else if (strata === 0) {
        base = pickShade(x + ix, y + iy, cliffLit, cliff, slate);
      } else if (strata === 1) {
        base = pickShade(x + ix, y + iy, cliff, slate, slateDeep);
      } else {
        base = pickShade(x + ix, y + iy, earth, cliff, slateDeep);
      }
      if (edge && hash2(x + ix, y + iy) > 0.35) px(ctx, soft ? mist : slate, x + ix, y + iy);
      else px(ctx, base, x + ix, y + iy);
    }
  }
  // Grass lip
  for (let ix = 2; ix < w - 2; ix += 2) {
    if (hash2(x + ix, y) > 0.3) px(ctx, grass, x + ix, y);
    if (hash2(x + ix, y - 1) > 0.55) px(ctx, moss, x + ix, y - 1);
  }
}

/** Rocky plateau shelf with stepped lip toward the gorge. */
function drawPlateau(ctx, x0, y0, w, steps, towardRight) {
  for (let s = 0; s < steps; s++) {
    const inset = s * 10;
    const yy = y0 + s * 14;
    const ww = w - inset - s * 6;
    const xx = towardRight ? x0 + inset : x0;
    drawCliffMass(ctx, xx, yy, Math.max(40, ww), 18 + s * 2, false);
    // Iso grass tiles along lip
    for (let i = 0; i < 4; i++) {
      const gx = towardRight ? xx + 20 + i * 22 : xx + ww - 40 - i * 22;
      drawIsoTile(ctx, gx, yy - 2, 14, 7, grass, moss, earthDark);
    }
  }
}

/** Soft waterfall veil into the gorge. */
function drawWaterfall(ctx, x, y, h) {
  fillDitherRect(ctx, x, y, 12, h, ash, mist, 0.52, 4);
  fillDitherRect(ctx, x + 10, y + 8, 7, h - 12, mist, ash, 0.4, 4);
  for (let i = 0; i < 8; i++) {
    if (hash2(x, y + i * 11) > 0.4) px(ctx, ash, x + 3 + (i % 3), y + 10 + i * 11);
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
  // Rocky plateau stepping into gorge
  drawPlateau(ctx, 4, 175, 250, 5, true);
  fillDitherRect(ctx, 10, 290, 230, 55, earth, earthDark, 0.38, 4);

  for (let i = 0; i < 5; i++) {
    const p = isoToScreen(i * 0.9, 1.2, 60, 240);
    drawIsoTile(ctx, p.x, p.y, 16, 8, grass, moss, earthDark);
  }

  // Curtain wall
  drawIsoPrism(ctx, 100, 175, 48, 24, 42, stoneLight, slate, slateDeep);
  drawBattlements(ctx, 100, 168, 6, 14, 6, 3, 8);

  // Gatehouse block
  drawIsoPrism(ctx, 115, 130, 36, 18, 58, stoneLight, slate, charcoalMid);
  drawBattlements(ctx, 115, 122, 5, 12, 6, 3, 8);
  drawGateArch(ctx, 108, 155, 28, 40);

  // Tall keep tower
  drawIsoPrism(ctx, 170, 95, 26, 13, 95, stoneLight, slate, charcoalMid);
  drawBattlements(ctx, 170, 86, 3, 12, 7, 4, 10);
  drawWoodGrain(ctx, 152, 72, 36, 10);
  fill(ctx, brass, 166, 68, 5, 4);

  // Corner turret
  drawIsoPrism(ctx, 62, 155, 14, 7, 40, stoneBlue, slateDeep, charcoalMid);
  drawBattlements(ctx, 62, 148, 2, 10, 5, 3, 7);

  drawBlueBanner(ctx, 70, 138, 34);
  drawBlueBanner(ctx, 128, 112, 30);
  fill(ctx, woodDark, 176, 78, 2, 16);
  for (let iy = 0; iy < 10; iy++) {
    for (let ix = 0; ix < 12; ix++) {
      px(ctx, hash2(176 + ix, 78 + iy) > 0.9 ? navyDeep : royal, 178 + ix, 78 + iy);
    }
  }
  fill(ctx, ash, 181, 81, 4, 4);

  fill(ctx, charcoal, 160, 125, 3, 7);
  fill(ctx, charcoal, 182, 115, 3, 7);

  drawIsoArcher(ctx, 95, 118);
  drawIsoArcher(ctx, 138, 105);
  drawIsoDefender(ctx, 85, 218);
  drawIsoDefender(ctx, 120, 224);
  drawIsoDefender(ctx, 150, 212);

  drawPine(ctx, 8, 220, 1.2);
  drawPine(ctx, -4, 255, 0.95);
  drawPine(ctx, 36, 268, 0.75);
}

function drawRightKeep(ctx) {
  drawPlateau(ctx, 700, 170, 250, 5, false);
  fillDitherRect(ctx, 720, 288, 220, 55, earth, charcoalMid, 0.4, 4);

  for (let i = 0; i < 4; i++) {
    const p = isoToScreen(i * 0.9, 1.0, 780, 235);
    drawIsoTile(ctx, p.x, p.y, 15, 7, grass, moss, earthDark);
  }

  drawIsoPrism(ctx, 815, 145, 42, 21, 52, stoneBlue, slateDeep, charcoalMid);
  drawBattlements(ctx, 815, 136, 5, 14, 6, 3, 8);

  drawIsoPrism(ctx, 870, 95, 24, 12, 100, stoneBlue, slateDeep, charcoal);
  drawBattlements(ctx, 870, 86, 3, 12, 7, 4, 10);
  drawWoodGrain(ctx, 852, 72, 38, 10);

  drawIsoPrism(ctx, 755, 170, 18, 9, 28, woodLight, wood, woodDark);
  for (let i = 0; i < 5; i++) {
    fill(ctx, woodDark, 735 + i * 8, 195, 3, 20);
    fill(ctx, wood, 735 + i * 8, 193, 3, 2);
  }

  drawRedBanner(ctx, 788, 122, 32);
  drawRedBanner(ctx, 842, 100, 28);
  fill(ctx, woodDark, 882, 78, 2, 16);
  for (let iy = 0; iy < 10; iy++) {
    for (let ix = 0; ix < 12; ix++) {
      px(ctx, hash2(882 + ix, 78 + iy) > 0.88 ? redDark : crimson, 884 + ix, 78 + iy);
    }
  }
  fill(ctx, ash, 887, 81, 6, 2);

  fill(ctx, charcoal, 858, 130, 3, 7);
  fill(ctx, charcoal, 880, 120, 3, 7);

  drawIsoGrunt(ctx, 775, 220, 0);
  drawIsoGrunt(ctx, 808, 226, 1);
  drawIsoGrunt(ctx, 840, 216, 0);
  drawIsoGrunt(ctx, 865, 232, 2);

  drawPine(ctx, 920, 228, 1.1);
  drawPine(ctx, 900, 262, 0.85);
  drawPine(ctx, 940, 250, 0.7);
}

function drawGorge(ctx) {
  for (let y = 170; y < 345; y++) {
    const depth = (y - 170) / 175;
    const leftEdge = 245 + Math.floor(depth * 50) + Math.floor(hash2(1, y) * 8);
    const rightEdge = 715 - Math.floor(depth * 45) - Math.floor(hash2(2, y) * 8);
    for (let x = leftEdge; x < rightEdge; x++) {
      const fromL = (x - leftEdge) / Math.max(1, rightEdge - leftEdge);
      const wall = fromL < 0.14 || fromL > 0.86;
      const midBand = fromL > 0.32 && fromL < 0.68;
      let base;
      if (wall) {
        base = pickShade(x, y, cliffLit, cliff, slateDeep);
      } else if (midBand && depth > 0.4) {
        base = pickShade(x, y, charcoal, charcoalMid, slateDeep);
      } else {
        base = pickShade(x, y, slateDeep, charcoalMid, cliff);
      }
      px(ctx, base, x, y);
    }
  }
  fillDitherRect(ctx, 305, 275, 350, 60, mist, charcoalMid, 0.3, 8);
  fillDitherRect(ctx, 335, 298, 290, 38, mist, ash, 0.2, 8);
  drawCliffMass(ctx, 290, 220, 55, 80, false);
  drawCliffMass(ctx, 615, 215, 58, 85, false);
  drawWaterfall(ctx, 450, 140, 135);
  drawWaterfall(ctx, 485, 150, 115);
}

function drawBridge(ctx, t) {
  // Continuous iso deck with overlapping tiles (solid lane, not floating row)
  const tiles = 22;
  const ox = 255;
  const oy = 200;

  for (let i = 0; i < tiles; i++) {
    const x = ox + i * 20;
    const y = oy + Math.floor(i * 0.7) - 8;
    fill(ctx, slate, x, y, 4, 10);
    if (i % 2 === 0) fill(ctx, stoneLight, x, y - 4, 5, 5);
  }

  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < tiles - row; i++) {
      const x = ox + i * 20 + row * 6;
      const y = oy + Math.floor(i * 0.7) + row * 7;
      drawIsoTile(
        ctx,
        x,
        y,
        14,
        7,
        pickShade(x, y, stoneLight, stoneBlue, slate),
        slate,
        slateDeep
      );
    }
  }

  for (let i = 0; i < tiles; i++) {
    const x = ox + i * 20 + 10;
    const y = oy + Math.floor(i * 0.7) + 20;
    fill(ctx, charcoalMid, x - 2, y, 16, 3);
    if (i % 2 === 0) {
      fill(ctx, woodDark, x + 4, y - 12, 3, 14);
      fill(ctx, wood, x, y - 12, 11, 3);
    }
  }

  const piers = [310, 390, 470, 550, 630];
  for (const px0 of piers) {
    const py = oy + 28;
    drawDenseStoneRect(ctx, px0 - 8, py, 16, 48, false);
    fill(ctx, charcoal, px0 - 10, py + 44, 20, 8);
  }
  for (let i = 0; i < piers.length - 1; i++) {
    const a = piers[i] + 8;
    const b = piers[i + 1] - 8;
    const span = b - a;
    for (let x = a; x <= b; x++) {
      const u = (x - a) / Math.max(1, span);
      const archY = oy + 32 + Math.floor(Math.sin(u * Math.PI) * 26);
      fill(ctx, slate, x, archY, 2, 4);
      fill(ctx, charcoalMid, x, archY + 3, 2, 2);
    }
  }

  for (let i = 0; i < 5; i++) {
    const x = ox + 40 + i * 80;
    const y = oy + 28;
    fill(ctx, navyDeep, x, y, 7, 15);
    for (let iy = 1; iy < 13; iy++) {
      for (let ix = 1; ix < 6; ix++) {
        px(ctx, hash2(x + ix, y + iy) > 0.9 ? navyDeep : royal, x + ix, y + iy);
      }
    }
    fill(ctx, ash, x + 2, y + 4, 2, 5);
  }

  drawIsoArcher(ctx, 275, oy - 6);
  drawIsoDefender(ctx, 310, oy - 2);
  drawIsoDefender(ctx, 348, oy);
  drawIsoDefender(ctx, 385, oy - 4);
  drawIsoDefender(ctx, 420, oy - 1);

  drawIsoGrunt(ctx, 520, oy - 2, 0);
  drawIsoGrunt(ctx, 555, oy - 4, 1);
  drawIsoGrunt(ctx, 590, oy, 0);
  drawIsoGrunt(ctx, 625, oy - 3, 1);
  drawIsoGrunt(ctx, 660, oy - 1, 2);

  const boltX = 430 + Math.floor((t * 40) % 80);
  drawBolt(ctx, boltX, oy - 14);
  drawBolt(ctx, boltX - 28, oy - 20);
  drawHitSpark(ctx, 528, oy - 18, t);
}

function drawBackground(ctx) {
  // Distant cliff ridges — layered, not abstract beige slabs
  fillDitherRect(ctx, 180, 28, 600, 90, skyHaze, mist, 0.3, 8);
  // Left far ridge
  for (let i = 0; i < 5; i++) {
    const x = 200 + i * 36;
    const h = 40 + (i % 3) * 12;
    fillDitherRect(ctx, x, 100 - h, 40, h, cliff, mist, 0.42, 8);
  }
  // Right far ridge
  for (let i = 0; i < 5; i++) {
    const x = 560 + i * 40;
    const h = 48 + ((i + 1) % 3) * 14;
    fillDitherRect(ctx, x, 95 - h, 44, h, mist, cliff, 0.4, 8);
  }
  // Center gorge notch in BG
  fillDitherRect(ctx, 400, 70, 160, 60, mist, skyHaze, 0.35, 8);
  drawWaterfall(ctx, 460, 55, 90);
  drawWaterfall(ctx, 500, 65, 75);

  drawPine(ctx, 220, 105, 0.65);
  drawPine(ctx, 250, 112, 0.5);
  drawPine(ctx, 280, 100, 0.55);
  drawPine(ctx, 620, 95, 0.6);
  drawPine(ctx, 655, 105, 0.5);
  drawPine(ctx, 690, 98, 0.45);
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
    drawIsoPrism(ctx, x, y, 8, 4, 12, stoneLight, slate, charcoalMid);
    fill(ctx, woodDark, x - 5, y - 10, 10, 3);
  } else if (kind === "grove") {
    drawPine(ctx, x - 4, y - 10, 0.55);
  } else if (kind === "hut") {
    drawIsoPrism(ctx, x, y + 2, 7, 3, 8, woodLight, wood, woodDark);
  } else if (kind === "bridge") {
    drawIsoTile(ctx, x, y + 2, 10, 4, stoneBlue, slate, slateDeep);
    drawIsoTile(ctx, x + 10, y + 2, 10, 4, stoneLight, slate, slateDeep);
  } else if (kind === "village") {
    drawIsoPrism(ctx, x - 5, y + 2, 5, 3, 7, woodLight, wood, woodDark);
    drawIsoPrism(ctx, x + 5, y, 5, 3, 8, wood, woodDark, earthDark);
  } else if (kind === "mine") {
    drawIsoPrism(ctx, x, y + 2, 7, 3, 8, charcoalMid, charcoal, slateDeep);
    fill(ctx, brass, x + 4, y - 4, 3, 3);
  }
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
 * v6 isometric parchment combat + campaign-map strip.
 * Layout pass: readable keeps, gorge+arched bridge, blue-left / red-right.
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
  drawGorge(sceneCtx);
  // Soft ground wash at shelf feet
  fillDitherRect(sceneCtx, 40, 320, 200, 40, parchmentDeep, earth, 0.16, 8);
  fillDitherRect(sceneCtx, 720, 318, 200, 40, parchmentDeep, earth, 0.16, 8);

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (halftone) {
    applyOrderedDither(outCtx, W, H, { strength: 0.22, matrix: "8" });
  }

  // --- Layer B: clean isometric subjects (keeps → bridge on top) ---
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
