import { hexToRgb } from "./palette.js";

/**
 * Soft tilt-shift DoF: blur top/bottom bands of logical buffer.
 * Mid horizontal band stays sharp for gameplay silhouettes.
 *
 * @param {CanvasRenderingContext2D} ctx target (will be overwritten)
 * @param {HTMLCanvasElement | OffscreenCanvas} source
 * @param {number} width
 * @param {number} height
 * @param {{ topFrac?: number, bottomFrac?: number, blurPx?: number }} [opts]
 */
export function applyEdgeDof(ctx, source, width, height, opts = {}) {
  const topFrac = opts.topFrac ?? 0.15;
  const bottomFrac = opts.bottomFrac ?? 0.15;
  const blurPx = opts.blurPx ?? 1.25;

  const topH = Math.max(1, Math.floor(height * topFrac));
  const botH = Math.max(1, Math.floor(height * bottomFrac));
  const midY = topH;
  const midH = Math.max(1, height - topH - botH);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, width, height);

  // Soft top strip
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(source, 0, 0, width, topH + 2, 0, 0, width, topH + 2);

  // Soft bottom strip
  ctx.drawImage(
    source,
    0,
    height - botH - 2,
    width,
    botH + 2,
    0,
    height - botH - 2,
    width,
    botH + 2
  );

  ctx.filter = "none";
  ctx.imageSmoothingEnabled = false;
  // Sharp mid band
  ctx.drawImage(source, 0, midY, width, midH, 0, midY, width, midH);
  ctx.restore();
}

/**
 * Light print grain / scan dust overlay (static pattern).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ opacity?: number, seed?: number }} [opts]
 */
export function applyGrain(ctx, width, height, opts = {}) {
  const opacity = opts.opacity ?? 0.05;
  const seed = opts.seed ?? 7;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const n = (rand() - 0.5) * 255 * opacity * 2;
    data[i] = clampByte(data[i] + n);
    data[i + 1] = clampByte(data[i + 1] + n);
    data[i + 2] = clampByte(data[i + 2] + n);
  }
  ctx.putImageData(imageData, 0, 0);
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

/** Soft radial vignette — macro lens falloff without crushing mid-band detail. */
export function applyVignette(ctx, width, height, opts = {}) {
  const strength = opts.strength ?? 0.22;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const cx = width * 0.5;
  const cy = height * 0.48;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const d = Math.sqrt(dx * dx + dy * dy);
      const fall = Math.max(0, d - 0.42) / 0.58;
      const dim = 1 - fall * fall * strength;
      data[i] = clampByte(data[i] * dim);
      data[i + 1] = clampByte(data[i + 1] * dim);
      data[i + 2] = clampByte(data[i + 2] * dim);
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Thin charcoal frame with mild ink distress. */
export function drawInkFrame(ctx, width, height, charcoalHex = "#1D2020") {
  const ink = hexToRgb(charcoalHex);
  ctx.fillStyle = `rgb(${ink.r},${ink.g},${ink.b})`;
  // Outer frame
  ctx.fillRect(0, 0, width, 2);
  ctx.fillRect(0, height - 2, width, 2);
  ctx.fillRect(0, 0, 2, height);
  ctx.fillRect(width - 2, 0, 2, height);
  // Corner distress ticks
  ctx.fillRect(3, 3, 4, 1);
  ctx.fillRect(width - 7, 3, 4, 1);
  ctx.fillRect(3, height - 4, 5, 1);
  ctx.fillRect(width - 8, height - 4, 5, 1);
}
