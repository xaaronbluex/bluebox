import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Scans `3d/ai_arts` and exposes sorted-by-mtime image list (newest first) via Vite asset URLs. */
function aiArtsGalleryPlugin() {
  const VIRTUAL_ID = "virtual:ai-arts";
  const RESOLVED = "\0virtual:ai-arts";

  function scanAiArts() {
    const dir = path.resolve(__dirname, "3d/ai_arts");
    if (!fs.existsSync(dir)) {
      return "export default []";
    }
    const exts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && exts.has(path.extname(d.name).toLowerCase()))
      .map((d) => {
        const full = path.join(dir, d.name);
        const stat = fs.statSync(full);
        return { name: d.name, full, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (entries.length === 0) {
      return "export default []";
    }

    const importLines = entries.map((e, i) => {
      const rel = "./" + path.relative(__dirname, e.full).split(path.sep).join("/");
      return `import u${i} from ${JSON.stringify(`${rel}?url`)}`;
    });

    const exportItems = entries.map(
      (e, i) => `{ id: ${JSON.stringify(e.name)}, url: u${i}, mtime: ${e.mtime} }`
    );

    return `${importLines.join("\n")}\nexport default [${exportItems.join(",")}];`;
  }

  return {
    name: "ai-arts-gallery",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED;
    },
    load(id) {
      if (id === RESOLVED) return scanAiArts();
    },
    configureServer(server) {
      const aiArtsDir = path.resolve(__dirname, "3d/ai_arts");
      if (fs.existsSync(aiArtsDir)) {
        server.watcher.add(aiArtsDir);
      }
      const invalidate = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on("add", (file) => {
        if (file.startsWith(aiArtsDir)) invalidate();
      });
      server.watcher.on("unlink", (file) => {
        if (file.startsWith(aiArtsDir)) invalidate();
      });
      server.watcher.on("change", (file) => {
        if (file.startsWith(aiArtsDir)) invalidate();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), aiArtsGalleryPlugin()],
  server: {
    host: true,
    port: 3000,
    open: true,
  },
});
