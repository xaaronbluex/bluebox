/**
 * Headless capture of StyleTestScene canvas — v6 parchment isometric theme.
 * Usage: node scripts/capture-style-test-v6.mjs
 * Optional: STYLE_TEST_URL, STYLE_TEST_MEDIA_DIR, CHROME_PATH
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STORE_MEDIA =
  process.env.STYLE_TEST_MEDIA_DIR ||
  path.join(
    process.env.HOME,
    "Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-d08018ce-7015-45e7-89b7-ad9d28eceaa5/files/media"
  );

const BASE = process.env.STYLE_TEST_URL || "http://127.0.0.1:3000";

async function capture(page, outName, query = "halftone=on&dof=on", crop = null) {
  const url = `${BASE}/style-test-capture.html?${query}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('canvas[data-style-test-canvas="true"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  const canvas = page.locator('canvas[data-style-test-canvas="true"]');
  const outPath = path.join(STORE_MEDIA, outName);
  if (crop) {
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas box");
    await page.screenshot({
      path: outPath,
      clip: {
        x: box.x + crop.x,
        y: box.y + crop.y,
        width: crop.width,
        height: crop.height,
      },
    });
  } else {
    await canvas.screenshot({ path: outPath });
  }
  console.log("wrote", outPath, fs.statSync(outPath).size, "bytes");
}

async function main() {
  fs.mkdirSync(STORE_MEDIA, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });

  try {
    await capture(page, "style-test-v6-theme.png", "halftone=on&dof=on");
    await capture(page, "style-test-v6-map.png", "halftone=on&dof=on", {
      x: 0,
      y: Math.round(540 * (392 / 540)),
      width: 960,
      height: Math.round(540 * ((540 - 392) / 540)),
    });
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
