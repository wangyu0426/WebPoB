import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DATA_DIR = path.join(ROOT_DIR, 'apps/web/public/data');
const LUAJIT_BIN = path.join(ROOT_DIR, '.cache/luajit-src/src/luajit');
const CLIBS_DIR = path.join(ROOT_DIR, '.cache/clibs');
const EXPORT_LUA = path.join(__dirname, '../lua/export_pob_data.lua');

interface ExportedGemData {
  en: string;
  sup: number;
  ct?: number;
  cc?: number;
  asm?: number;
  mrp?: number;
  sr?: number;
  bd?: Record<string, [number, number]>;
  am?: number;
  de?: number;
  mc?: number;
  st?: string[];
  qs?: Array<{ t: string; q: number }>;
  ls?: Record<
    string,
    {
      bd?: Record<string, [number, number]>;
      am?: number;
      de?: number;
      mc?: number;
      st?: string[];
    }
  >;
}

interface ExistingGemsFile {
  game: 'poe1' | 'poe2';
  count: number;
  gems: Array<{
    id: string;
    en: string;
    zh?: string;
    cat: 'active' | 'support';
    color: 'red' | 'green' | 'blue' | 'white';
    tags: string[];
    [k: string]: unknown;
  }>;
}

async function runGameExport(game: 'poe1' | 'poe2') {
  const upstreamSrc = path.join(
    ROOT_DIR,
    game === 'poe1' ? '.cache/upstream-pob/src' : '.cache/upstream-pob2/src',
  );
  const outBases = path.join(PUBLIC_DATA_DIR, `${game}-bases.json`);
  const tmpGems = path.join(ROOT_DIR, `.cache/${game}-gems-lua.json`);

  console.log(`\n=== Exporting ${game.toUpperCase()} Base Items & Official Skill Tables via LuaJIT ===`);
  const stdout = execFileSync(LUAJIT_BIN, [EXPORT_LUA, game, outBases, tmpGems], {
    cwd: upstreamSrc,
    env: {
      ...process.env,
      LUA_PATH: './?.lua;../runtime/lua/?.lua;../runtime/lua/?/init.lua;;',
      LUA_CPATH: `${CLIBS_DIR}/?.so;;`,
    },
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  });
  for (const line of stdout.split('\n')) {
    if (line.startsWith('Exported ')) console.log('  ' + line);
  }

  // Merge Lua-evaluated official skill numbers into existing bilingual poeX-gems.json (preserving all ZH names!)
  const existingPath = path.join(PUBLIC_DATA_DIR, `${game}-gems.json`);
  const existing = JSON.parse(await fs.readFile(existingPath, 'utf-8')) as ExistingGemsFile;
  const luaPayload = JSON.parse(await fs.readFile(tmpGems, 'utf-8')) as {
    gems: Record<string, ExportedGemData>;
  };

  let enrichedCount = 0;
  const mergedGems = existing.gems.map((entry) => {
    const key = entry.en.toLowerCase().trim();
    const altKey = key.replace(/\s+support$/i, '');
    const lua = luaPayload.gems[key] ?? luaPayload.gems[altKey];
    if (!lua) return entry;
    enrichedCount++;
    const enriched: Record<string, unknown> = {
      id: entry.id,
      en: entry.en,
      ...(entry.zh ? { zh: entry.zh } : {}),
      cat: entry.cat,
      color: entry.color,
      tags: entry.tags,
    };
    if (lua.ct !== undefined) enriched.ct = lua.ct;
    if (lua.cc !== undefined) enriched.cc = lua.cc;
    if (lua.asm !== undefined) enriched.asm = lua.asm;
    if (lua.mrp !== undefined) enriched.mrp = lua.mrp;
    if (lua.sr !== undefined) enriched.sr = lua.sr;
    if (lua.bd !== undefined) enriched.bd = lua.bd;
    if (lua.am !== undefined) enriched.am = lua.am;
    if (lua.de !== undefined) enriched.de = lua.de;
    if (lua.mc !== undefined) enriched.mc = lua.mc;
    if (lua.st !== undefined && lua.st.length > 0) enriched.st = lua.st;
    if (lua.qs !== undefined) enriched.qs = lua.qs;
    if (lua.ls !== undefined) enriched.ls = lua.ls;
    return enriched;
  });

  const outPayload = {
    game,
    count: mergedGems.length,
    gems: mergedGems,
  };
  await fs.writeFile(existingPath, JSON.stringify(outPayload), 'utf-8');
  const sizeKb = Math.round((Buffer.byteLength(JSON.stringify(outPayload)) / 1024) * 10) / 10;
  const baseSizeKb = Math.round(((await fs.stat(outBases)).size / 1024) * 10) / 10;
  console.log(
    `  ✓ Enriched ${enrichedCount}/${mergedGems.length} ${game.toUpperCase()} gems with official Lv.1-30 stats (${sizeKb} KB); bases (${baseSizeKb} KB)`,
  );
}

async function main() {
  await runGameExport('poe1');
  await runGameExport('poe2');
  console.log('\nDone!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
