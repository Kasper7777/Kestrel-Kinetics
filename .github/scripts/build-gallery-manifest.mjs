import { readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

const galleryDir = process.env.GALLERY_DIR || "assets/images/cyber-bully/gallery";
const outputFile = process.env.OUTPUT_FILE || "assets/gallery.json";
const altPrefix = process.env.ALT_PREFIX || "Cyber Bully";
const imageExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);

const toTitle = (fileName) =>
  basename(fileName, extname(fileName))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const entries = await readdir(galleryDir, { withFileTypes: true }).catch(() => []);
const images = entries
  .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
  .map((entry) => ({
    src: `${galleryDir}/${entry.name}`.replaceAll("\\", "/"),
    alt: `${altPrefix} ${toTitle(entry.name)}`,
    title: toTitle(entry.name),
  }))
  .sort((left, right) => left.src.localeCompare(right.src, undefined, { numeric: true }));

const manifest = {
  generatedAt: new Date().toISOString(),
  imageCount: images.length,
  images,
};

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
