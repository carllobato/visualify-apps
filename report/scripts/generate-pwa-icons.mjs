import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportRoot = path.resolve(__dirname, "..");
const symbolPath = path.join(reportRoot, "public/visualify-brand-mark.png");
const masterSvgPath = path.join(reportRoot, "public/icons/visualify-v-pwa.svg");

const TARGET_V_WIDTH_RATIO = 0.7;
const CANVAS_SIZE = 1024;

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function getOpaqueBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const idx = (png.width * y + x) << 2;
      const alpha = png.data[idx + 3];
      if (alpha > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("No opaque pixels found in symbol PNG");
  }

  return { minX, minY, maxX, maxY };
}

function buildMasterSvg(symbolPath, bounds, symbolWidth, symbolHeight) {
  const contentWidth = bounds.maxX - bounds.minX + 1;
  const contentHeight = bounds.maxY - bounds.minY + 1;
  const targetWidth = CANVAS_SIZE * TARGET_V_WIDTH_RATIO;
  const scale = targetWidth / contentWidth;
  const scaledWidth = symbolWidth * scale;
  const scaledHeight = symbolHeight * scale;
  const contentCenterX = bounds.minX + contentWidth / 2;
  const contentCenterY = bounds.minY + contentHeight / 2;
  const x = CANVAS_SIZE / 2 - contentCenterX * scale;
  const y = CANVAS_SIZE / 2 - contentCenterY * scale;
  const encoded = fs.readFileSync(symbolPath).toString("base64");

  return `<svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" viewBox="0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" fill="#FFFFFF"/>
  <image href="data:image/png;base64,${encoded}" x="${x}" y="${y}" width="${scaledWidth}" height="${scaledHeight}"/>
</svg>`;
}

const symbol = readPng(symbolPath);
const bounds = getOpaqueBounds(symbol);
const masterSvg = buildMasterSvg(symbolPath, bounds, symbol.width, symbol.height);
fs.writeFileSync(masterSvgPath, masterSvg);

const outputs = [
  { file: path.join(reportRoot, "app/apple-icon.png"), size: 180 },
  { file: path.join(reportRoot, "public/icons/icon-192x192.png"), size: 192 },
  { file: path.join(reportRoot, "public/icons/icon-512x512.png"), size: 512 },
  { file: path.join(reportRoot, "public/icons/icon-1024x1024.png"), size: 1024 },
];

for (const { file, size } of outputs) {
  const resvg = new Resvg(Buffer.from(masterSvg), {
    fitTo: { mode: "width", value: size },
  });
  fs.writeFileSync(file, resvg.render().asPng());
  console.log(`wrote ${path.relative(reportRoot, file)} (${size}x${size})`);
}

console.log(
  `source ${path.relative(reportRoot, symbolPath)}; V width ${Math.round(CANVAS_SIZE * TARGET_V_WIDTH_RATIO)}px on ${CANVAS_SIZE}px canvas`,
);
