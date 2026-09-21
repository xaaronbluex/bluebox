/** Logical pixel canvas helpers — nearest-neighbour only. */

/** v3: 640×360 — ~1.5× denser than v2 426×240; ×2 → 1280×720 display. */
export const LOGICAL_WIDTH = 640;
export const LOGICAL_HEIGHT = 360;
export const DISPLAY_SCALE = 2;

/**
 * @param {number} width
 * @param {number} height
 * @param {(w: number, h: number) => HTMLCanvasElement | OffscreenCanvas} [factory]
 */
export function createBuffer(width, height, factory) {
  const canvas = factory
    ? factory(width, height)
    : (() => {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        return c;
      })();
  if ("width" in canvas) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  disableSmoothing(ctx);
  return { canvas, ctx };
}

/** @param {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null} ctx */
export function disableSmoothing(ctx) {
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  // Vendor prefixes for older Safari
  // @ts-ignore
  if ("webkitImageSmoothingEnabled" in ctx) ctx.webkitImageSmoothingEnabled = false;
  // @ts-ignore
  if ("mozImageSmoothingEnabled" in ctx) ctx.mozImageSmoothingEnabled = false;
}

/**
 * Present logical buffer onto a display canvas at integer scale.
 * @param {CanvasRenderingContext2D} displayCtx
 * @param {HTMLCanvasElement | OffscreenCanvas} logicalCanvas
 * @param {number} [scale]
 */
export function blitNearest(displayCtx, logicalCanvas, scale = DISPLAY_SCALE) {
  disableSmoothing(displayCtx);
  const w = LOGICAL_WIDTH * scale;
  const h = LOGICAL_HEIGHT * scale;
  displayCtx.clearRect(0, 0, w, h);
  displayCtx.drawImage(logicalCanvas, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT, 0, 0, w, h);
}

export function displaySize(scale = DISPLAY_SCALE) {
  return { width: LOGICAL_WIDTH * scale, height: LOGICAL_HEIGHT * scale };
}
