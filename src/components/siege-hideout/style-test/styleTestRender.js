import { PALETTE } from "../shared/palette.js";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, disableSmoothing } from "../shared/canvasScale.js";
import { applyOrderedDither } from "../shared/dither.js";
import {
  applyEdgeDof,
  applyGrain,
  applyVignette,
  drawInkFrame,
} from "../shared/dofGrain.js";

const W = LOGICAL_WIDTH;
const H = LOGICAL_HEIGHT;

/** Combat band ends above campaign-map strip (layout constant kept for capture crops). */
const MAP_Y = 392;
const COMBAT_H = MAP_Y;

/** Full user theme plate (battle + campaign map). */
export const THEME_BG_URL = "/static/img/siege-hideout/theme-ref-v7.png";
/** Optional upper combat crop (1536×520). */
export const BATTLE_PLATE_URL = "/static/img/siege-hideout/battle-plate-v7.png";

let themeImg = null;
let themeLoad = null;

/**
 * Preload the user theme plate once. Safe to call repeatedly.
 * @returns {Promise<HTMLImageElement>}
 */
export function preloadStyleTestBg(url = THEME_BG_URL) {
  if (themeImg?.complete && themeImg.naturalWidth > 0) {
    return Promise.resolve(themeImg);
  }
  if (themeLoad) return themeLoad;

  themeLoad = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      themeImg = img;
      resolve(img);
    };
    img.onerror = () => {
      themeLoad = null;
      reject(new Error(`Failed to load style-test BG: ${url}`));
    };
    img.src = url;
  });
  return themeLoad;
}

export function getStyleTestBg() {
  return themeImg;
}

function fillRgb(ctx, hex, x, y, w, h) {
  ctx.fillStyle = hex;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Cover-draw source into dest rect (center crop). Nearest-neighbour.
 */
function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) * 0.5;
  const sy = (ih - sh) * 0.5;

  disableSmoothing(ctx);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Light HP / resource chrome — units already live in the plate. */
function drawMiniHud(ctx) {
  fillRgb(ctx, PALETTE.charcoal, 18, 14, 88, 10);
  fillRgb(ctx, PALETTE.redSignal, 20, 15, 60, 8);
  fillRgb(ctx, PALETTE.charcoal, W - 120, 14, 100, 10);
  fillRgb(ctx, PALETTE.brass, W - 118, 15, 26, 8);
  fillRgb(ctx, PALETTE.midGray, W - 90, 15, 26, 8);
  fillRgb(ctx, PALETTE.royal, W - 62, 15, 26, 8);
}

/**
 * v7 — user theme plate as playfield BG (no procedural landscape / keeps / bridge).
 * Cover-scales full 1536×1024 plate into 960×540; light HUD + optional print pass.
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
  const bg = options.bgImage || themeImg;

  disableSmoothing(sceneCtx);
  disableSmoothing(outCtx);
  disableSmoothing(scratchCtx);

  sceneCtx.clearRect(0, 0, W, H);
  if (bg?.complete && (bg.naturalWidth || bg.width) > 0) {
    drawImageCover(sceneCtx, bg, 0, 0, W, H);
  } else {
    fillRgb(sceneCtx, PALETTE.parchment, 0, 0, W, H);
  }

  outCtx.clearRect(0, 0, W, H);
  outCtx.drawImage(sceneCanvas, 0, 0);

  // Light print atmosphere only — keep plate readable.
  if (halftone) {
    applyOrderedDither(outCtx, W, H, { strength: 0.1, matrix: "8" });
  }

  sceneCtx.clearRect(0, 0, W, H);
  drawMiniHud(sceneCtx);
  drawInkFrame(sceneCtx, W, H, PALETTE.charcoal);
  outCtx.drawImage(sceneCanvas, 0, 0);

  if (dofGrain && typeof document !== "undefined" && !document.hidden) {
    scratchCtx.clearRect(0, 0, W, H);
    scratchCtx.drawImage(outCtx.canvas, 0, 0);
    applyEdgeDof(outCtx, scratchCanvas, W, H, {
      topFrac: 0.1,
      bottomFrac: 0.05,
      blurPx: 0.9,
    });
    applyVignette(outCtx, W, H, { strength: 0.12 });
    applyGrain(outCtx, W, H, { opacity: 0.02, seed: 17 });
  }
}

export const STYLE_TEST_SIZE = { width: W, height: H };
export const STYLE_TEST_LAYOUT = { mapY: MAP_Y, combatH: COMBAT_H };
