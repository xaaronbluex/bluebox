/**
 * Convert BodyParts3D STL assets (xaaronbluex/BodyParts3D) to GLB files grouped by body region.
 * Requires a checkout at 04_human/bodyparts3d-staging (see README in 04_human).
 *
 * Usage:
 *   node scripts/bodyparts3d-stl-to-glb.mjs
 *   node scripts/bodyparts3d-stl-to-glb.mjs --no-per-file   # skip per-file GLBs; still builds merged outputs
 */
import "./polyfill-filereader.mjs";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const require = createRequire(import.meta.url);
const { processGlb } = require("gltf-pipeline");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const DEFAULT_DATA = path.join(REPO_ROOT, "04_human/bodyparts3d-staging/assets/BodyParts3D_data");
const DEFAULT_OUT = path.join(REPO_ROOT, "04_human/bodyparts3d_glb");
const FULL_PUBLIC = path.join(REPO_ROOT, "public/04_human/human3d/human.glb");
const FULL_PUBLIC_COMPRESSED = path.join(REPO_ROOT, "public/04_human/human3d/human-compressed.glb");
const HEAD_PUBLIC = path.join(REPO_ROOT, "public/04_human/human3d/head.glb");
const HEAD_PUBLIC_COMPRESSED = path.join(REPO_ROOT, "public/04_human/human3d/head-compressed.glb");

const REGION_DIRS = {
  head: "head",
  hands: "hands",
  feet: "feet",
  arms: "arms",
  legs: "legs",
  torso: "torso",
  other: "other",
};

const MAT = new THREE.MeshStandardMaterial({
  color: 0x8c93a1,
  roughness: 0.54,
  metalness: 0.03,
});

function parseArgs() {
  const a = process.argv.slice(2);
  return {
    perFile: !a.includes("--no-per-file"),
    compressMerged: !a.includes("--skip-compress"),
    dataDir: process.env.BODYPARTS3D_DATA || DEFAULT_DATA,
    outRoot: process.env.BODYPARTS3D_OUT || DEFAULT_OUT,
  };
}

function loadChildrenMap(conventionalPath) {
  const text = fsSync.readFileSync(conventionalPath, "utf8");
  const children = new Map();
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const c = line.split("\t");
    if (c.length < 4) continue;
    const p = c[0].trim();
    const ch = c[2].trim();
    if (!children.has(p)) children.set(p, []);
    children.get(p).push(ch);
  }
  return children;
}

function descendants(children, root) {
  const out = new Set();
  const q = [root];
  while (q.length) {
    const id = q.pop();
    if (out.has(id)) continue;
    out.add(id);
    for (const x of children.get(id) || []) q.push(x);
  }
  return out;
}

function buildRegionSets(children) {
  const head = new Set([...descendants(children, "FMA7154"), ...descendants(children, "FMA7155")]);
  const hands = descendants(children, "FMA9712");
  const feet = descendants(children, "FMA9664");
  const upper = descendants(children, "FMA7183");
  const lower = descendants(children, "FMA7184");
  const trunk = descendants(children, "FMA7181");
  return { head, hands, feet, upper, lower, trunk };
}

function bucket(fma, sets) {
  if (sets.hands.has(fma)) return "hands";
  if (sets.feet.has(fma)) return "feet";
  if (sets.head.has(fma)) return "head";
  if (sets.upper.has(fma)) return "arms";
  if (sets.lower.has(fma)) return "legs";
  if (sets.trunk.has(fma)) return "torso";
  return "other";
}

function loadPartsLabels(partsListPath) {
  const map = new Map();
  const text = fsSync.readFileSync(partsListPath, "utf8");
  for (const line of text.split("\n").slice(1)) {
    if (!line.trim()) continue;
    const [id, ...rest] = line.split("\t");
    if (!id?.startsWith("FMA")) continue;
    map.set(id.trim(), rest.join("\t").trim());
  }
  return map;
}

const stlLoader = new STLLoader();
const gltfExporter = new GLTFExporter();

async function stlFileToMesh(stlPath, meshName) {
  const buf = await fs.readFile(stlPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const geom = stlLoader.parse(ab);
  if (!geom.getAttribute("normal")) geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, MAT);
  mesh.name = meshName;
  return mesh;
}

async function exportSceneGlb(scene) {
  return gltfExporter.parseAsync(scene, { binary: true });
}

async function compressGlb(rawGlbBuffer) {
  const options = {
    dracoOptions: {
      compressionLevel: 10,
      quantizePositionBits: 14,
      quantizeNormalBits: 10,
      quantizeTexcoordBits: 10,
      quantizeColorBits: 8,
      quantizeGenericBits: 10,
      unifiedQuantization: true,
    },
  };
  const results = await processGlb(rawGlbBuffer, options);
  return results.glb;
}

async function main() {
  const { perFile, compressMerged, dataDir, outRoot } = parseArgs();
  const stlDir = path.join(dataDir, "stl");
  const conventionalPath = path.join(dataDir, "conventional_part_of.txt");
  const partsPath = path.join(dataDir, "parts_list_e.txt");

  if (!fsSync.existsSync(stlDir)) {
    console.error(`Missing STL directory: ${stlDir}`);
    console.error("Clone with: git clone --depth 1 --filter=blob:none --sparse https://github.com/xaaronbluex/BodyParts3D.git 04_human/bodyparts3d-staging");
    console.error("Then: cd 04_human/bodyparts3d-staging && git sparse-checkout set assets/BodyParts3D_data");
    process.exit(1);
  }

  const children = loadChildrenMap(conventionalPath);
  const sets = buildRegionSets(children);
  const labels = loadPartsLabels(partsPath);

  const files = (await fs.readdir(stlDir)).filter((f) => /^FMA\d+\.stl$/i.test(f));
  files.sort();

  const headMeshes = [];
  const fullMeshes = [];

  if (perFile) {
    for (const region of Object.values(REGION_DIRS)) {
      await fs.mkdir(path.join(outRoot, region), { recursive: true });
    }

    let n = 0;
    for (const file of files) {
      const fma = file.replace(/\.stl$/i, "");
      const region = bucket(fma, sets);
      const dir = REGION_DIRS[region];
      const outPath = path.join(outRoot, dir, `${fma}.glb`);
      const label = labels.get(fma) || "";
      const meshName = label ? `${fma}_${label.replace(/[^\w\s-]/g, "").slice(0, 40)}` : fma;

      const mesh = await stlFileToMesh(path.join(stlDir, file), meshName);
      if (region === "head") headMeshes.push(mesh.clone());
      fullMeshes.push(mesh.clone());

      const scene = new THREE.Scene();
      scene.add(mesh);
      const glb = await exportSceneGlb(scene);
      await fs.writeFile(outPath, Buffer.from(glb));

      n += 1;
      if (n % 100 === 0) console.error(`Converted ${n} / ${files.length}…`);
    }
    console.error(`Wrote ${files.length} per-part GLBs under ${outRoot}`);
  } else {
    for (const file of files) {
      const fma = file.replace(/\.stl$/i, "");
      const label = labels.get(fma) || "";
      const meshName = label ? `${fma}_${label.replace(/[^\w\s-]/g, "").slice(0, 40)}` : fma;
      const mesh = await stlFileToMesh(path.join(stlDir, file), meshName);
      if (bucket(fma, sets) === "head") headMeshes.push(mesh.clone());
      fullMeshes.push(mesh);
    }
  }

  if (headMeshes.length === 0 || fullMeshes.length === 0) {
    console.error("No meshes found to merge.");
    process.exit(1);
  }

  await fs.mkdir(path.dirname(FULL_PUBLIC), { recursive: true });

  const mergedFull = new THREE.Scene();
  for (const m of fullMeshes) mergedFull.add(m);
  const fullGlb = await exportSceneGlb(mergedFull);
  await fs.writeFile(FULL_PUBLIC, Buffer.from(fullGlb));
  console.error(`Merged full-body GLB (${fullMeshes.length} meshes) -> ${FULL_PUBLIC}`);

  const mergedHead = new THREE.Scene();
  for (const m of headMeshes) mergedHead.add(m);
  const headGlb = await exportSceneGlb(mergedHead);
  await fs.writeFile(HEAD_PUBLIC, Buffer.from(headGlb));
  console.error(`Merged head GLB (${headMeshes.length} meshes) -> ${HEAD_PUBLIC}`);

  if (compressMerged) {
    const fullCompressed = await compressGlb(Buffer.from(fullGlb));
    await fs.writeFile(FULL_PUBLIC_COMPRESSED, Buffer.from(fullCompressed));
    console.error(`Draco-compressed full-body GLB -> ${FULL_PUBLIC_COMPRESSED}`);

    const headCompressed = await compressGlb(Buffer.from(headGlb));
    await fs.writeFile(HEAD_PUBLIC_COMPRESSED, Buffer.from(headCompressed));
    console.error(`Draco-compressed head GLB -> ${HEAD_PUBLIC_COMPRESSED}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
