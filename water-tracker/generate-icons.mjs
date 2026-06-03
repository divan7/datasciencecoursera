import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

// --- PNG helpers ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, c]);
}

function buildPNG(img, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(6, 9); // 8-bit RGBA

  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = y * (size * 4 + 1) + 1 + x * 4;
      rows[d] = img[s]; rows[d+1] = img[s+1]; rows[d+2] = img[s+2]; rows[d+3] = img[s+3];
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

// --- Icon drawing ---
function generateIcon(size) {
  const img = new Uint8Array(size * size * 4);

  // Set pixel with alpha blend
  function px(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    const al = a / 255;
    img[i]   = Math.round(img[i]   * (1 - al) + r * al);
    img[i+1] = Math.round(img[i+1] * (1 - al) + g * al);
    img[i+2] = Math.round(img[i+2] * (1 - al) + b * al);
    img[i+3] = img[i+3] === 0 ? Math.round(a) : 255;
  }

  // Background gradient: #0c4a6e (top) → #0f172a (bottom)
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(12  + (15 - 12)  * t);
    const g = Math.round(74  + (23 - 74)  * t);
    const b = Math.round(110 + (42 - 110) * t);
    for (let x = 0; x < size; x++) px(x, y, r, g, b);
  }

  // Rounded corners (make transparent)
  const cr = size * 0.20;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ax = Math.min(x, size - 1 - x);
      const ay = Math.min(y, size - 1 - y);
      if (ax < cr && ay < cr && Math.hypot(cr - ax - 0.5, cr - ay - 0.5) > cr) {
        img[(y * size + x) * 4 + 3] = 0;
      }
    }
  }

  // Water drop — center (cx,cy), circle radius r
  const cx = size * 0.5;
  const cy = size * 0.54;
  const r  = size * 0.26;
  const tipY = cy - r * 1.6; // top of the pointed tip

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (img[(y * size + x) * 4 + 3] === 0) continue;
      const dx = x - cx;
      const dy = y - cy;

      // Main circle body
      const inBody = dx * dx + dy * dy <= r * r;

      // Pointed tip: above cy, width tapers from 2r to 0 at tipY
      let inTip = false;
      if (y < cy) {
        const progress = (cy - y) / (cy - tipY); // 0 at cy, 1 at tipY
        const halfWidth = r * (1 - progress);
        inTip = progress <= 1 && Math.abs(dx) <= halfWidth;
      }

      if (inBody || inTip) {
        // Sky blue: #38bdf8
        px(x, y, 56, 189, 248);

        // Specular highlight (upper-left)
        const hlDx = dx + r * 0.3;
        const hlDy = dy + r * 0.4;
        if (hlDx * hlDx + hlDy * hlDy < (r * 0.32) * (r * 0.32) && dy < -r * 0.05) {
          px(x, y, 186, 230, 253);
        }
      }
    }
  }

  return buildPNG(img, size);
}

writeFileSync('public/icons/icon-192.png', generateIcon(192));
writeFileSync('public/icons/icon-512.png', generateIcon(512));
console.log('Icons generated: icon-192.png, icon-512.png');
