// Generates Prompterly app assets (icon, splash, adaptive-icon) as PNGs.
// Pure Node — uses zlib for the IDAT stream and a hand-rolled CRC32 for chunks.
// Run: node assets/gen-assets.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));

// --- CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- tiny drawing surface ---
function surface(size) {
  const buf = Buffer.alloc(size * size * 4); // transparent
  const px = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const af = a / 255;
    // alpha-over composite
    const ba = buf[i + 3] / 255;
    const oa = af + ba * (1 - af);
    if (oa === 0) return;
    buf[i] = Math.round((r * af + buf[i] * ba * (1 - af)) / oa);
    buf[i + 1] = Math.round((g * af + buf[i + 1] * ba * (1 - af)) / oa);
    buf[i + 2] = Math.round((b * af + buf[i + 2] * ba * (1 - af)) / oa);
    buf[i + 3] = Math.round(oa * 255);
  };
  return { buf, size, px };
}

const lerp = (a, b, t) => a + (b - a) * t;

function fillGradient(s, top, bot) {
  for (let y = 0; y < s.size; y++) {
    const t = y / (s.size - 1);
    const r = Math.round(lerp(top[0], bot[0], t));
    const g = Math.round(lerp(top[1], bot[1], t));
    const b = Math.round(lerp(top[2], bot[2], t));
    for (let x = 0; x < s.size; x++) s.px(x, y, r, g, b, 255);
  }
}

// Rounded-rectangle fill with simple edge anti-aliasing.
function roundRect(s, x0, y0, w, h, radius, [r, g, b], alpha = 255) {
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      // distance into nearest corner
      let cx = null;
      let cy = null;
      if (x < x0 + radius && y < y0 + radius) {
        cx = x0 + radius;
        cy = y0 + radius;
      } else if (x > x1 - radius && y < y0 + radius) {
        cx = x1 - radius;
        cy = y0 + radius;
      } else if (x < x0 + radius && y > y1 - radius) {
        cx = x0 + radius;
        cy = y1 - radius;
      } else if (x > x1 - radius && y > y1 - radius) {
        cx = x1 - radius;
        cy = y1 - radius;
      }
      let cover = 1;
      if (cx !== null) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        cover = Math.max(0, Math.min(1, radius - d + 0.5));
      }
      if (cover > 0) s.px(x, y, r, g, b, Math.round(alpha * cover));
    }
  }
}

// Draw the teleprompter glyph (screen card + text lines) centered in a box.
function drawGlyph(s, cx, cy, glyphW) {
  const glyphH = glyphW * 0.82;
  const x0 = cx - glyphW / 2;
  const y0 = cy - glyphH / 2;
  // white screen card
  roundRect(s, x0, y0, glyphW, glyphH, glyphW * 0.11, [245, 245, 247]);
  // text lines inside
  const inset = glyphW * 0.16;
  const lx = x0 + inset;
  const fullW = glyphW - inset * 2;
  const lineH = glyphH * 0.092;
  const gap = glyphH * 0.072;
  const startY = y0 + glyphH * 0.2;
  const widths = [1, 0.78, 1, 0.62, 0.88];
  const reading = 2; // highlighted line index
  for (let i = 0; i < widths.length; i++) {
    const ly = startY + i * (lineH + gap);
    const color = i === reading ? [108, 92, 231] : [180, 182, 196];
    roundRect(s, lx, ly, fullW * widths[i], lineH, lineH / 2, color);
  }
  // play triangle badge bottom-right of card (records!)
  const br = glyphW * 0.16;
  const bx = x0 + glyphW - br * 0.7;
  const by = y0 + glyphH - br * 0.7;
  // circle
  for (let y = Math.floor(by - br); y <= by + br; y++) {
    for (let x = Math.floor(bx - br); x <= bx + br; x++) {
      const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
      const cover = Math.max(0, Math.min(1, br - d + 0.5));
      if (cover > 0) s.px(x, y, 255, 92, 92, Math.round(255 * cover));
    }
  }
}

const PURPLE_TOP = [124, 108, 240];
const PURPLE_BOT = [85, 70, 214];

function makeIcon() {
  const size = 1024;
  const s = surface(size);
  fillGradient(s, PURPLE_TOP, PURPLE_BOT);
  drawGlyph(s, size / 2, size / 2, size * 0.58);
  return encodePNG(size, size, s.buf);
}

function makeAdaptive() {
  // Transparent bg, glyph within Android safe zone (~62%).
  const size = 1024;
  const s = surface(size);
  drawGlyph(s, size / 2, size / 2, size * 0.46);
  return encodePNG(size, size, s.buf);
}

function makeSplash() {
  // Transparent bg so the dark splash backgroundColor shows through.
  const size = 1024;
  const s = surface(size);
  drawGlyph(s, size / 2, size / 2, size * 0.62);
  return encodePNG(size, size, s.buf);
}

writeFileSync(join(DIR, 'icon.png'), makeIcon());
writeFileSync(join(DIR, 'adaptive-icon.png'), makeAdaptive());
writeFileSync(join(DIR, 'splash.png'), makeSplash());
console.log('Wrote icon.png, adaptive-icon.png, splash.png');
