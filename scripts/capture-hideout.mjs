/**
 * Headless capture of Hideout canvas — idle + ready-to-collect.
 * Usage: node scripts/capture-hideout.mjs
 * Env: STYLE_TEST_URL, STYLE_TEST_MEDIA_DIR, CHROME_PATH
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_MEDIA =
  process.env.STYLE_TEST_MEDIA_DIR ||
  "/cursor/stores/bc-d08018ce-7015-45e7-89b7-ad9d28eceaa5/media";

const BASE = process.env.STYLE_TEST_URL || "http://127.0.0.1:3000";

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/ms-playwright/chromium-1200/chrome-linux/chrome",
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

async function capture(page, outName, query) {
  const url = `${BASE}/hideout-capture.html?${query}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector('canvas[data-hideout-canvas="true"]', {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => {
      const hint = document.querySelector(".hideout__hint");
      return hint && !hint.textContent.includes("loading BG");
    },
    { timeout: 20000 },
  );
  await page.waitForTimeout(1000);
  const canvas = page.locator('canvas[data-hideout-canvas="true"]');
  const outPath = path.join(STORE_MEDIA, outName);
  await canvas.screenshot({ path: outPath });
  console.log("wrote", outPath, fs.statSync(outPath).size, "bytes");
}

async function main() {
  fs.mkdirSync(STORE_MEDIA, { recursive: true });
  const executablePath = await findChrome();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });

  try {
    // Clear prior hideout so presets apply cleanly
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("siege-hideout:hideout-v1");
      } catch {
        /* ignore */
      }
    });
    await capture(page, "hideout-idle.png", "hideoutCapture=idle");
    await capture(page, "hideout-collect.png", "hideoutCapture=ready");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
