// Regenerates the raster brand icons from the same glyph as app/icon.svg.
// Usage: node scripts/generate-brand-assets.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const ACCENT = "#4f46e5";
const PATHS = `
  <path d="M13.038 19.927a9.933 9.933 0 0 1 -5.338 -.927l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.993 1.7 2.93 4.043 2.746 6.346"/>
  <path d="M19 16l-2 3h4l-2 3"/>`;

/** Square canvas of `size`; glyph occupies `glyph` (fraction of the canvas). */
function svg({ size = 512, radius = 0.235, glyph = 0.625, stroke = 2.1 }) {
  const px = size * glyph;
  const scale = px / 24;
  const offset = (size - px) / 2;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${ACCENT}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${PATHS}</g>
</svg>`);
}

const png = (opts, out) => sharp(svg(opts), { density: 384 }).resize(out, out).png({ compressionLevel: 9 }).toBuffer();

// Packs PNG images into a multi-size .ico (PNG-compressed entries).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

mkdirSync(join(root, "public"), { recursive: true });

// Browser tab icon: slightly bolder strokes so it survives at 16px.
const faviconSizes = [16, 32, 48];
const favicon = ico(
  await Promise.all(
    faviconSizes.map(async (size) => ({
      size,
      data: await png({ radius: 0.22, glyph: 0.7, stroke: 2.4 }, size),
    })),
  ),
);
writeFileSync(join(root, "app", "favicon.ico"), favicon);

// Android / PWA: transparent rounded "any" icons and a full-bleed maskable one
// (glyph kept inside the 80% safe zone).
writeFileSync(join(root, "public", "icon-192.png"), await png({}, 192));
writeFileSync(join(root, "public", "icon-512.png"), await png({}, 512));
writeFileSync(join(root, "public", "icon-maskable-512.png"), await png({ radius: 0, glyph: 0.5 }, 512));

// iOS rounds the corners itself, so the tile has to be full-bleed.
writeFileSync(join(root, "app", "apple-icon.png"), await png({ radius: 0, glyph: 0.58 }, 180));

console.log("brand assets written");
