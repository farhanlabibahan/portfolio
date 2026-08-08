#!/usr/bin/env node
/**
 * Syncs static assets from the source folder (`c/`) into `public/` so the
 * static export serves them at their public URLs. Run automatically before
 * `dev` and `build` — replace a file in `c/` and rebuild to update the site.
 *
 * Besides copying the raw assets, the signature is re-rendered into two
 * derived images:
 *   - `signature-white.png`  — the ink flattened to solid white (the raw scan
 *     is dark ink on transparent, which vanishes on the near-black chrome).
 *   - `signature-favicon.png`— 64×64 white signature on a dark rounded tile
 *     for the browser tab (white alone is invisible on light tab strips).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32, inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALPHA_THRESHOLD = 24;

// ---------------------------------------------------------------------------
// Minimal PNG reader/writer (no deps). Reads RGBA, writes RGBA.
// ---------------------------------------------------------------------------
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let width, height, bitDepth, colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += len + 12;
  }
  if (bitDepth !== 8 || colorType !== 6) throw new Error('expected 8-bit RGBA PNG');

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4 + 1;
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * stride + 1, (y + 1) * stride);
    row.copy(out, y * width * 4);
  }
  return { width, height, pixels: out };
}

function crc32buf(buf) {
  const n = crc32(buf);
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  crc32buf(Buffer.concat([Buffer.from(type, 'ascii'), data])).copy(out, 8 + data.length);
  return out;
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    pixels.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Signature → solid white silhouette (alpha threshold keeps anti-aliasing out)
// ---------------------------------------------------------------------------
function renderWhite(pixels, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (pixels[o + 3] > ALPHA_THRESHOLD) {
      out[o] = 255;
      out[o + 1] = 255;
      out[o + 2] = 255;
      out[o + 3] = 255;
    } else {
      out[o + 3] = 0;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Favicon: white signature centred on a dark rounded tile
// ---------------------------------------------------------------------------
function renderFavicon(white, w, h, size = 64, radius = 14, pad = 11) {
  const out = Buffer.alloc(size * size * 4);
  const tile = '#0A0D12';
  const tr = (tile >> 16) & 0xff;
  const tg = (tile >> 8) & 0xff;
  const tb = tile & 0xff;

  // White mask of the signature downsampled to the content box (max-alpha).
  const box = size - pad * 2;
  const scale = Math.min(box / w, box / h);
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const ox = Math.floor((size - cw) / 2);
  const oy = Math.floor((size - ch) / 2);
  const ink = Buffer.alloc(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      let max = 0;
      const x0 = Math.floor((x / cw) * w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) / cw) * w));
      const y0 = Math.floor((y / ch) * h);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) / ch) * h));
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const a = white[(sy * w + sx) * 4 + 3];
          if (a > max) max = a;
        }
      }
      ink[y * cw + x] = max > 0 ? 255 : 0;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      // Rounded-corner tile (axis-aligned rounded rect mask).
      const rx = Math.min(x, size - 1 - x);
      const ry = Math.min(y, size - 1 - y);
      const inCorner = rx < radius && ry < radius;
      let inside = true;
      if (inCorner) {
        const dx = radius - rx;
        const dy = radius - ry;
        inside = dx * dx + dy * dy <= radius * radius;
      }
      if (!inside) {
        out[o + 3] = 0;
        continue;
      }
      const ix = x - ox;
      const iy = y - oy;
      const isInk = ix >= 0 && iy >= 0 && ix < cw && iy < ch && ink[iy * cw + ix] === 255;
      if (isInk) {
        out[o] = 255;
        out[o + 1] = 255;
        out[o + 2] = 255;
        out[o + 3] = 255;
      } else {
        out[o] = tr;
        out[o + 1] = tg;
        out[o + 2] = tb;
        out[o + 3] = 255;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const COPIED = [
  ["Ahan's CV.pdf", 'cv.pdf'],
  ['signature.png', 'signature.png'],
  ['ahan.jpeg', 'ahan.jpeg'],
];

let failed = false;
const c = (n) => join(root, 'c', n);
const pub = (n) => join(root, 'public', n);

for (const [srcName, outName] of COPIED) {
  const src = c(srcName);
  const out = pub(outName);
  if (!existsSync(src)) {
    console.error(`Missing source asset: ${src}`);
    failed = true;
    continue;
  }
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(src, out);
  console.log(`Synced ${srcName} → ${out}`);
}

const sigSrc = c('signature.png');
if (existsSync(sigSrc)) {
  const { width, height, pixels } = decodePNG(readFileSync(sigSrc));
  const white = renderWhite(pixels, width, height);
  writeFileSync(pub('signature-white.png'), encodePNG(width, height, white));
  console.log(`Rendered signature-white.png (${width}×${height})`);
  writeFileSync(pub('signature-favicon.png'), encodePNG(64, 64, renderFavicon(white, width, height)));
  console.log('Rendered signature-favicon.png (64×64)');
} else {
  console.error(`Missing source asset: ${sigSrc}`);
  failed = true;
}

if (failed) process.exit(1);
