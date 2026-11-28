import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  DEFAULT_PINS_PATH,
  ROOT_DIR,
  loadOraclePins,
  verifyPinnedCheckout,
  verifyPinnedDataFiles,
  type OraclePinsFile,
} from './pins.js';

const execFileAsync = promisify(execFile);
export const LUAJIT_SOURCE_DIR = path.join(ROOT_DIR, '.cache/luajit-src');
export const LUAJIT_BIN = path.join(LUAJIT_SOURCE_DIR, 'src/luajit');
export const LUAROCKS_TREE_DIR = path.join(ROOT_DIR, '.cache/luajit-rocks');

interface SetupOptions {
  games: Array<'poe1' | 'poe2'>;
  verifyOnly: boolean;
  pinsPath: string;
}

export interface PinnedLuaRuntime {
  bin: string;
  version: string;
  luaCpath: string;
  luaUtf8Version: string;
}

function parseArgs(argv: string[]): SetupOptions {
  const games: Array<'poe1' | 'poe2'> = [];
  let verifyOnly = false;
  let pinsPath = DEFAULT_PINS_PATH;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--game') {
      const val = argv[++i];
      if (val !== 'poe1' && val !== 'poe2') {
        throw new Error('Invalid --game value "' + String(val) + '" (expected poe1 or poe2).');
      }
      if (!games.includes(val)) games.push(val);
    } else if (arg === '--verify-only') {
      verifyOnly = true;
    } else if (arg === '--pins') {
      const val = argv[++i];
      if (!val) throw new Error('Missing value for --pins.');
      pinsPath = path.resolve(process.cwd(), val);
    } else {
      throw new Error('Unknown CLI argument: ' + arg);
    }
  }

  return {
    games: games.length > 0 ? games : ['poe1', 'poe2'],
    verifyOnly,
    pinsPath,
  };
}

export function getLuaCpath(): string {
  return path.join(LUAROCKS_TREE_DIR, 'lib/lua/5.1/?.so');
}

function luaRuntimeSmokeSource(pins: OraclePinsFile, includeUtf8: boolean): string {
  const snippets = [
    'local increment = 1; increment += 1; assert(increment == 2)',
    'local nested = { child = { value = 7 } }; assert(nested?.child?.value == 7)',
    'local missing = nil; assert(missing?.child == nil)',
    'local choice = true ? "selected" : "rejected"; assert(choice == "selected")',
  ];
  if (includeUtf8) {
    const module = pins.runtime.luajit.utf8Module;
    snippets.push(
      'local utf8 = require(' + JSON.stringify(module.name) + '); assert(type(utf8) == "table"); assert(utf8.version == ' + JSON.stringify(module.version) + ')',
    );
  }
  return snippets.join('; ');
}

async function verifyLuaJitBinary(
  pins: OraclePinsFile,
  includeUtf8: boolean,
): Promise<{ bin: string; version: string }> {
  const pin = pins.runtime.luajit;
  await verifyPinnedCheckout(LUAJIT_SOURCE_DIR, pin.revision, 'LuaJIT', pin.repository);
  await fs.access(LUAJIT_BIN);
  const { stdout, stderr } = await execFileAsync(LUAJIT_BIN, ['-v'], { timeout: 10_000 });
  const versionLine = (stderr || stdout).trim().split('\n')[0] || '';
  if (!versionLine.includes(pin.version)) {
    throw new Error('Pinned LuaJIT version mismatch: expected ' + pin.version + ', got "' + versionLine + '".');
  }
  if (includeUtf8) {
    const modulePath = path.join(LUAROCKS_TREE_DIR, 'lib/lua/5.1/lua-utf8.so');
    await fs.access(modulePath);
  }
  await execFileAsync(
    LUAJIT_BIN,
    ['-e', luaRuntimeSmokeSource(pins, includeUtf8)],
    {
      env: { ...process.env, LUA_CPATH: getLuaCpath() },
      timeout: 10_000,
    },
  );
  return { bin: LUAJIT_BIN, version: versionLine };
}

export async function resolveLuaJitBin(pins: OraclePinsFile): Promise<PinnedLuaRuntime> {
  const verified = await verifyLuaJitBinary(pins, true);
  return {
    ...verified,
    luaCpath: getLuaCpath(),
    luaUtf8Version: pins.runtime.luajit.utf8Module.version,
  };
}

async function ensurePinnedRepo(
  repoUrl: string,
  commit: string,
  targetDir: string,
  label: string,
  verifyOnly: boolean,
): Promise<void> {
  try {
    await verifyPinnedCheckout(targetDir, commit, label, repoUrl);
    console.log('  ✓ ' + label + ' already pinned at ' + commit);
    return;
  } catch (err) {
    if (verifyOnly) throw err;
  }

  console.log('  ↓ Fetching ' + label + ' @ ' + commit + ' into ' + path.relative(ROOT_DIR, targetDir) + '...');
  await fs.mkdir(targetDir, { recursive: true });
  let hasGit = false;
  try {
    await fs.access(path.join(targetDir, '.git'));
    hasGit = true;
  } catch {
    hasGit = false;
  }

  if (!hasGit) {
    await execFileAsync('git', ['init'], { cwd: targetDir });
  }
  let hasOrigin = false;
  try {
    const { stdout } = await execFileAsync('git', ['remote'], { cwd: targetDir });
    hasOrigin = stdout.split('\n').includes('origin');
  } catch {
    hasOrigin = false;
  }
  if (hasOrigin) {
    await execFileAsync('git', ['remote', 'set-url', 'origin', repoUrl], { cwd: targetDir });
  } else {
    await execFileAsync('git', ['remote', 'add', 'origin', repoUrl], { cwd: targetDir });
  }

  await execFileAsync('git', ['fetch', '--depth', '1', 'origin', commit], {
    cwd: targetDir,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 300_000,
  });
  await execFileAsync('git', ['checkout', '--detach', commit], {
    cwd: targetDir,
    timeout: 30_000,
  });
  await verifyPinnedCheckout(targetDir, commit, label, repoUrl);
  console.log('  ✓ ' + label + ' checked out and verified at ' + commit);
}

async function ensurePinnedLuaJit(pins: OraclePinsFile, verifyOnly: boolean): Promise<void> {
  const pin = pins.runtime.luajit;
  await ensurePinnedRepo(pin.repository, pin.revision, LUAJIT_SOURCE_DIR, 'LuaJIT', verifyOnly);
  if (!verifyOnly) {
    console.log('  ↓ Building pinned LuaJIT source @ ' + pin.revision);
    await execFileAsync('make', ['clean'], {
      cwd: path.join(LUAJIT_SOURCE_DIR, 'src'),
      timeout: 30_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    await execFileAsync('make', ['-j2'], {
      cwd: path.join(LUAJIT_SOURCE_DIR, 'src'),
      timeout: 300_000,
      maxBuffer: 20 * 1024 * 1024,
    });
  }
  await verifyLuaJitBinary(pins, false);
  console.log('  ✓ Built and verified LuaJIT ' + pin.version + ' @ ' + pin.revision);
}

async function hasPinnedLuaUtf8(pins: OraclePinsFile): Promise<boolean> {
  try {
    await verifyLuaJitBinary(pins, true);
    return true;
  } catch {
    return false;
  }
}

async function ensurePinnedLuaUtf8(pins: OraclePinsFile, verifyOnly: boolean): Promise<void> {
  if (await hasPinnedLuaUtf8(pins)) {
    console.log('  ✓ Verified ' + pins.runtime.luajit.utf8Module.rock + ' ' + pins.runtime.luajit.utf8Module.rockVersion);
    return;
  }
  if (verifyOnly) {
    throw new Error('Pinned Lua UTF-8 rock is missing or has the wrong version.');
  }

  const module = pins.runtime.luajit.utf8Module;
  try {
    await execFileAsync('luarocks', ['--version'], { timeout: 10_000 });
  } catch {
    throw new Error('LuaRocks is required to install the locked ' + module.rock + ' ' + module.rockVersion + '.');
  }
  await fs.mkdir(LUAROCKS_TREE_DIR, { recursive: true });
  console.log('  ↓ Installing pinned LuaRocks package ' + module.rock + ' ' + module.rockVersion);
  await execFileAsync(
    'luarocks',
    [
      '--lua-version=5.1',
      '--tree=' + LUAROCKS_TREE_DIR,
      'install',
      module.rock,
      module.rockVersion,
    ],
    {
      timeout: 180_000,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  await verifyLuaJitBinary(pins, true);
  console.log('  ✓ Verified Lua module ' + module.name + ' ' + module.version);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log('=== WebPoB Pinned Native Oracle Setup ===\n');

  const pins = await loadOraclePins(opts.pinsPath);
  const dataCheck = await verifyPinnedDataFiles(pins, ROOT_DIR);
  if (!dataCheck.valid) {
    throw new Error('Pinned data verification failed:\n  - ' + dataCheck.errors.join('\n  - '));
  }
  console.log('  ✓ Verified ' + Object.keys(pins.dataFiles).length + ' pinned data file SHA-256 hashes');

  for (const game of opts.games) {
    const pin = pins.upstream[game];
    const targetDir = path.join(ROOT_DIR, game === 'poe2' ? '.cache/upstream-pob2' : '.cache/upstream-pob');
    await ensurePinnedRepo(pin.repo, pin.commit, targetDir, 'upstream-' + game, opts.verifyOnly);
  }

  await ensurePinnedLuaJit(pins, opts.verifyOnly);
  await ensurePinnedLuaUtf8(pins, opts.verifyOnly);
  await resolveLuaJitBin(pins);

  console.log('\n✓ Pinned Native Oracle environment verified.');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  main().catch((err) => {
    console.error('FAIL: ' + (err as Error).message);
    process.exit(1);
  });
}
