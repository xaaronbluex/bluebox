import { DITHER_RGB } from "./palette.js";

/** Bayer 8×8 threshold matrix, normalized 0–1. */
const BAYER_8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64));

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function dist2(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/** Nearest palette colour (no dither). */
export function quantizeRgb(r, g, b, palette = DITHER_RGB) {
  let best = palette[0];
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = dist2({ r, g, b }, palette[i]);
    if (d < bestD) {
      bestD = d;
      best = palette[i];
    }
  }
  return best;
}

/**
 * Ordered dither ImageData in-place toward `palette`.
 * @param {ImageData} imageData
 * @param {{ palette?: {r:number,g:number,b:number}[], strength?: number }} [opts]
 */
export function orderedDitherImageData(imageData, opts = {}) {
  const palette = opts.palette ?? DITHER_RGB;
  const strength = opts.strength ?? 0.55;
  const { data, width, height } = imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a === 0) continue;

      const thr = BAYER_8[y & 7][x & 7] - 0.5;
      const bias = thr * strength * 255;
      let r = data[i] + bias;
      let g = data[i + 1] + bias;
      let b = data[i + 2] + bias;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;

      const q = quantizeRgb(r, g, b, palette);
      data[i] = q.r;
      data[i + 1] = q.g;
      data[i + 2] = q.b;
    }
  }
  return imageData;
}

/**
 * Apply ordered dither to a full canvas buffer.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ strength?: number }} [opts]
 */
export function applyOrderedDither(ctx, width, height, opts) {
  const imageData = ctx.getImageData(0, 0, width, height);
  orderedDitherImageData(imageData, opts);
  ctx.putImageData(imageData, 0, 0);
}

/** Fill a rect with two-tone Bayer stipple (terrain mottling without full-frame dither). */
export function fillDitherRect(ctx, x, y, w, h, rgbA, rgbB, density = 0.35) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const thr = BAYER_8[py & 7][px & 7];
      const c = thr < density ? rgbB : rgbA;
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

export { luminance, BAYER_8 };
