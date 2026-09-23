/**
 * Headless capture of StyleTestScene canvas (halftone on/off).
 * Usage: node scripts/capture-style-test-v2.mjs
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

async function capture(page, halftone, outName) {
  const url = `${BASE}/style-test-capture.html?halftone=${halftone}&dof=on`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector('canvas[data-style-test-canvas="true"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(600);
  const canvas = page.locator('canvas[data-style-test-canvas="true"]');
  const outPath = path.join(STORE_MEDIA, outName);
  await canvas.screenshot({ path: outPath });
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
    viewport: { width: 1100, height: 700 },
  });

  try {
    await capture(page, "on", "style-test-v2-halftone-on.png");
    await capture(page, "off", "style-test-v2-halftone-off.png");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
