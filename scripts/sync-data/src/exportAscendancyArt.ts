import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const OUT_DATA = path.join(ROOT, 'apps/web/public/data');
const POE2_ASC_DIR = path.join(OUT_DATA, 'poe2-asc');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/^classes/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function main() {
  fs.mkdirSync(POE2_ASC_DIR, { recursive: true });

  // 1. PoE 1 (3.30): copy ascendancy-3.webp & parse sprite coords from sprites.lua
  const p1WebpSrc = path.join(ROOT, '.cache/upstream-pob/src/TreeData/3_30/ascendancy-3.webp');
  const p1SpritesPath = path.join(ROOT, '.cache/upstream-pob/src/TreeData/3_30/sprites.lua');
  fs.copyFileSync(p1WebpSrc, path.join(OUT_DATA, 'poe1-ascendancy.webp'));

  const p1SprTxt = fs.readFileSync(p1SpritesPath, 'utf8');
  // Locate the full-resolution ascendancy-3.webp sprite block (2668x2668) specifically!
  const ascSheetIdx = p1SprTxt.indexOf('ascendancy-3.webp');
  if (ascSheetIdx < 0) throw new Error('Could not find ascendancy-3.webp in sprites.lua');
  const coordsStart = p1SprTxt.indexOf('["coords"]=', ascSheetIdx);
  const coordsEnd = p1SprTxt.indexOf('\n            }', coordsStart);
  const ascBlockSlice = p1SprTxt.slice(coordsStart, coordsEnd > coordsStart ? coordsEnd : coordsStart + 4500);
  const coordRe = /\["(Classes[^"]+)"\]=\s*\{\s*\["x"\]=\s*(\d+),\s*\["y"\]=\s*(\d+),\s*\["w"\]=\s*(\d+),\s*\["h"\]=\s*(\d+)\s*\}/g;
  const poe1Sprites: Record<string, { x: number; y: number; w: number; h: number }> = {};
  let match: RegExpExecArray | null;
  while ((match = coordRe.exec(ascBlockSlice)) !== null) {
    const ascKey = match[1]!.replace(/^Classes/, '');
    if (!poe1Sprites[ascKey]) {
      poe1Sprites[ascKey] = {
        x: Number(match[2]),
        y: Number(match[3]),
        w: Number(match[4]),
        h: Number(match[5]),
      };
    }
  }
  console.log(`PoE 1 ascendancy portraits parsed (full-res): ${Object.keys(poe1Sprites).length}`, poe1Sprites['Elementalist'], poe1Sprites['Raider']);

  // 2. PoE 2 (0.5): decompress BC7 DDS arrays & extract per-class/ascendancy JPEG + BGTree PNG ring
  const p2Json = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.cache/upstream-pob2/src/TreeData/0_5/tree.json'), 'utf8'),
  ) as {
    classes: Array<{
      name: string;
      ascendancies?: Array<{
        id: string;
        name: string;
        background?: { x: number; y: number; width: number; height: number; image: string };
      }>;
    }>;
    ddsCoords: Record<string, Record<string, number | number[]>>;
  };

  // Extract BGTree ornate gothic ring (slice 1 of 4008x4008 BC7 DDS array -> 768x768 PNG)
  const bgTreeRaw = zlib.zstdDecompressSync(
    fs.readFileSync(
      path.join(ROOT, '.cache/upstream-pob2/src/TreeData/0_5/ascendancy-background_4008_4008_BC7.dds.zst'),
    ),
  );
  const bgHdr = Buffer.from(bgTreeRaw.subarray(0, 148));
  bgHdr.writeUInt32LE(1, 28);
  bgHdr.writeUInt32LE(1, 140);
  const bgW = bgTreeRaw.readUInt32LE(16);
  const bgH = bgTreeRaw.readUInt32LE(12);
  const bgMip0 = Math.ceil(bgW / 4) * Math.ceil(bgH / 4) * 16;
  const tmpBgDds = '/tmp/webpob_bgtree.dds';
  fs.writeFileSync(tmpBgDds, Buffer.concat([bgHdr, bgTreeRaw.subarray(148, 148 + bgMip0)]));
  execFileSync('sips', ['-Z', '768', '-s', 'format', 'png', tmpBgDds, '--out', path.join(POE2_ASC_DIR, 'bg-ring.png')]);
  fs.unlinkSync(tmpBgDds);
  console.log('Extracted PoE 2 bg-ring.png:', fs.statSync(path.join(POE2_ASC_DIR, 'bg-ring.png')).size, 'bytes');

  // Extract all 1500x1500 class & ascendancy portraits -> 512x512 JPEG (quality 82)
  const ascRaw = zlib.zstdDecompressSync(
    fs.readFileSync(
      path.join(ROOT, '.cache/upstream-pob2/src/TreeData/0_5/ascendancy-background_1500_1500_BC7.dds.zst'),
    ),
  );
  const ascHdr = Buffer.from(ascRaw.subarray(0, 148));
  ascHdr.writeUInt32LE(1, 28);
  ascHdr.writeUInt32LE(1, 140);
  const arraySize = ascRaw.readUInt32LE(140);
  const bytesPerSlice = (ascRaw.length - 148) / arraySize;
  const mip0Bytes = Math.ceil(1500 / 4) * Math.ceil(1500 / 4) * 16;

  const sliceMap = p2Json.ddsCoords['ascendancy-background_1500_1500_BC7.dds.zst'] ?? {};
  const poe2Portraits: Record<string, string> = {};
  const poe2AscBg: Record<string, { x: number; y: number; width: number; height: number; file: string }> = {};

  const tmpDds = '/tmp/webpob_asc_slice.dds';
  let extractedCount = 0;
  for (const [key, idxVal] of Object.entries(sliceMap)) {
    if (typeof idxVal !== 'number') continue;
    const cleanName = key.replace(/^Classes/, '');
    const slug = slugify(key);
    const outFile = `poe2-asc/${slug}.jpg`;
    const outPath = path.join(OUT_DATA, outFile);
    const sliceOffset = 148 + (idxVal - 1) * bytesPerSlice;
    const singleDds = Buffer.concat([ascHdr, ascRaw.subarray(sliceOffset, sliceOffset + mip0Bytes)]);
    fs.writeFileSync(tmpDds, singleDds);
    execFileSync('sips', ['-Z', '512', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', tmpDds, '--out', outPath]);
    poe2Portraits[cleanName] = outFile;
    extractedCount++;
  }
  if (fs.existsSync(tmpDds)) fs.unlinkSync(tmpDds);

  for (const cls of p2Json.classes) {
    for (const asc of cls.ascendancies ?? []) {
      const bg = asc.background;
      const imgKey = (bg?.image ?? `Classes${asc.id}`).replace(/^Classes/, '');
      const file = poe2Portraits[imgKey] ?? poe2Portraits[asc.id] ?? poe2Portraits[cls.name] ?? '';
      if (bg && file) {
        poe2AscBg[asc.id] = {
          x: Math.round(bg.x * 10) / 10,
          y: Math.round(bg.y * 10) / 10,
          width: bg.width,
          height: bg.height,
          file,
        };
      }
    }
  }

  const manifest = {
    poe1: {
      sheet: 'poe1-ascendancy.webp',
      sprites: poe1Sprites,
    },
    poe2: {
      ring: 'poe2-asc/bg-ring.png',
      portraits: poe2Portraits,
      ascendancies: poe2AscBg,
    },
  };

  fs.writeFileSync(path.join(OUT_DATA, 'ascendancy-art.json'), JSON.stringify(manifest, null, 2));
  console.log(`Extracted ${extractedCount} PoE 2 portraits & wrote ascendancy-art.json!`);
}

main();
