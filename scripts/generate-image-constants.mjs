#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);

const args = new Set(process.argv.slice(2));
const shouldStripExtensions = args.has("--strip-extensions");
const shouldAllowEmpty = args.has("--allow-empty");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const imagesDirectory = path.join(projectRoot, "public", "images");
const constantsFile = path.join(projectRoot, "lib", "utils.ts");
const imageBlockPattern =
  /export const IMAGES = Object\.freeze\(\{[\s\S]*?\}\);/;

async function main() {
  const constantsSource = await fs.readFile(constantsFile, "utf8");
  const imageFiles = await getImageFiles(imagesDirectory);

  if (imageFiles.length === 0 && !shouldAllowEmpty) {
    console.log("No images found in public/images. IMAGES was not changed.");
    console.log(
      "Add images there and rerun, or pass --allow-empty to write an empty object.",
    );
    return;
  }

  const existingKeysByPath = getExistingKeysByPath(constantsSource);
  const entries = createImageEntries(imageFiles, existingKeysByPath);
  const nextImageBlock = formatImageBlock(entries);
  const nextConstantsSource = imageBlockPattern.test(constantsSource)
    ? constantsSource.replace(imageBlockPattern, nextImageBlock)
    : `${nextImageBlock}\n\n${constantsSource}`;

  await fs.writeFile(constantsFile, nextConstantsSource);
  console.log(
    `Updated lib/constants.ts with ${entries.length} image ${entries.length === 1 ? "entry" : "entries"}.`,
  );
}

async function getImageFiles(directory) {
  let directoryEntries;

  try {
    directoryEntries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    directoryEntries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getImageFiles(entryPath);
      }

      if (!entry.isFile() || entry.name.startsWith(".")) {
        return [];
      }

      return IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ? [entryPath]
        : [];
    }),
  );

  return files
    .flat()
    .sort((first, second) =>
      toPublicImagePath(first).localeCompare(toPublicImagePath(second)),
    );
}

function getExistingKeysByPath(constantsSource) {
  const imageBlock = constantsSource.match(imageBlockPattern)?.[0] ?? "";
  const entryPattern =
    /^\s*["']?([A-Z0-9_]+)["']?\s*:\s*["']([^"']+)["'],?\s*$/gm;
  const existingKeysByPath = new Map();

  for (const match of imageBlock.matchAll(entryPattern)) {
    const [, key, imagePath] = match;
    existingKeysByPath.set(normalizeImagePath(imagePath), key);
  }

  return existingKeysByPath;
}

function createImageEntries(imageFiles, existingKeysByPath) {
  const usedKeys = new Set();

  return imageFiles.map((imageFile) => {
    const imagePath = toPublicImagePath(imageFile);
    const normalizedImagePath = normalizeImagePath(imagePath);
    const fallbackKey = toConstantKey(
      normalizedImagePath.replace(/^\/images\//, ""),
    );
    const preferredKey =
      existingKeysByPath.get(normalizedImagePath) ?? fallbackKey;
    const key = getUniqueKey(preferredKey, usedKeys);

    usedKeys.add(key);

    return [key, imagePath];
  });
}

function toPublicImagePath(imageFile) {
  const relativePath = path
    .relative(imagesDirectory, imageFile)
    .split(path.sep)
    .join("/");
  const publicPath = `/images/${relativePath}`;

  if (!shouldStripExtensions) {
    return publicPath;
  }

  const extension = path.posix.extname(publicPath);
  return extension ? publicPath.slice(0, -extension.length) : publicPath;
}

function normalizeImagePath(imagePath) {
  const normalizedPath = imagePath.replaceAll("\\", "/");
  const extension = path.posix.extname(normalizedPath);

  return extension
    ? normalizedPath.slice(0, -extension.length)
    : normalizedPath;
}

function toConstantKey(imagePath) {
  const key = imagePath
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  if (!key) {
    return "IMAGE";
  }

  return /^\d/.test(key) ? `IMAGE_${key}` : key;
}

function getUniqueKey(preferredKey, usedKeys) {
  let key = preferredKey;
  let counter = 2;

  while (usedKeys.has(key)) {
    key = `${preferredKey}_${counter}`;
    counter += 1;
  }

  return key;
}

function formatImageBlock(entries) {
  const imageLines = entries.map(
    ([key, imagePath]) => `  ${key}: ${JSON.stringify(imagePath)},`,
  );

  return ["export const IMAGES = Object.freeze({", ...imageLines, "});"].join(
    "\n",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
