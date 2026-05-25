import { rmSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { deflateRawSync } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

// ─── Clean dist ────────────────────────────────────────────────────────────────
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "icons"), { recursive: true });
mkdirSync(join(dist, "options"), { recursive: true });

// ─── Copy manifest ─────────────────────────────────────────────────────────────
copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));

// ─── Generate PNG icons (solid indigo-600 squares) ────────────────────────────
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcVal]);
}

function createSolidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter: None
    for (let x = 0; x < size; x++) raw.push(r, g, b);
  }
  const idat = deflateRawSync(Buffer.from(raw));

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdrData),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Indigo-600: #4F46E5 = rgb(79, 70, 229)
const [r, g, b] = [79, 70, 229];
for (const size of [16, 48, 128]) {
  const png = createSolidPNG(size, r, g, b);
  const path = join(dist, "icons", `icon${size}.png`);
  import("fs").then(({ writeFileSync }) => writeFileSync(path, png));
  console.log(`✓ icon${size}.png`);
}

console.log("✓ dist/ ready");
