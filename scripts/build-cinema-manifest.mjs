#!/usr/bin/env node
/**
 * RAIGE — cinematic sequence manifest.
 *
 * Reads public/cinema/frames/, works out the frame count, padding and
 * pixel dimensions, and writes public/cinema/manifest.json.
 *
 *   node scripts/build-cinema-manifest.mjs
 *
 * See public/cinema/README.md for how to produce the frames.
 */

import fs from 'node:fs';
import path from 'node:path';

const FRAMES_DIR = path.join(process.cwd(), 'public', 'cinema', 'frames');
const OUT = path.join(process.cwd(), 'public', 'cinema', 'manifest.json');

if (!fs.existsSync(FRAMES_DIR)) {
  console.error(`No frames directory at ${FRAMES_DIR}`);
  console.error('See public/cinema/README.md.');
  process.exit(1);
}

const files = fs
  .readdirSync(FRAMES_DIR)
  .filter((f) => /\.(webp|avif|jpg|jpeg|png)$/i.test(f))
  .sort();

if (files.length < 2) {
  console.error(`Found ${files.length} frame(s); need at least 2.`);
  process.exit(1);
}

const match = files[0].match(/^(.*?)(\d+)\.(\w+)$/);
if (!match) {
  console.error(`Cannot parse a frame index from "${files[0]}".`);
  console.error('Expected names like raige_0000.webp');
  process.exit(1);
}

const [, stem, digits, ext] = match;
const pattern = `/cinema/frames/${stem}%0${digits.length}d.${ext}`;

/** Pixel dimensions, read from the file header rather than assumed. */
function dimensions(file) {
  const buf = fs.readFileSync(file);

  // WebP: 'RIFF' .... 'WEBP'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
    const fourcc = buf.slice(12, 16).toString('ascii');
    if (fourcc === 'VP8X') return { width: (buf.readUIntLE(24, 3) & 0xffffff) + 1, height: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fourcc === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (fourcc === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  // PNG
  if (buf.slice(1, 4).toString('ascii') === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: walk the segments to the first SOF marker.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  return null;
}

const size = dimensions(path.join(FRAMES_DIR, files[0]));
if (!size) {
  console.error(`Could not read the dimensions of ${files[0]}.`);
  console.error('Supported: WebP, PNG, JPEG. For AVIF, set width/height by hand.');
  process.exit(1);
}

const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(FRAMES_DIR, f)).size, 0);

const manifest = {
  version: 1,
  frameCount: files.length,
  width: size.width,
  height: size.height,
  pattern,
};

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
console.log(`  frames  ${manifest.frameCount}`);
console.log(`  size    ${manifest.width} x ${manifest.height}`);
console.log(`  pattern ${manifest.pattern}`);
console.log(`  weight  ${(bytes / 1024 / 1024).toFixed(1)} MB`);
if (bytes > 16 * 1024 * 1024) {
  console.log('\n  Note: over 16 MB. Consider fewer frames or more compression.');
}
console.log('\nNow set VITE_CINEMA_MODE=frames in .env');
