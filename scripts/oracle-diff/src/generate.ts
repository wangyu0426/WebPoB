import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type {
  OracleContextMetadata,
  OraclePresenceMetadata,
  OracleProvenanceMetadata,
  OracleRawValue,
} from '@webpob/calc';
import { ORACLE_BENCHMARKS, type OracleBenchmarkCase } from './benchmarks.js';
import {
  DEFAULT_PINS_PATH,
  ROOT_DIR,
  loadOraclePins,
  sha256Buffer,
  verifyPinnedCheckout,
  verifyPinnedDataFiles,
  validateSnapshotProvenance,
  type OraclePinsFile,
} from './pins.js';
import { resolveLuaJitBin, type PinnedLuaRuntime } from './setup.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LUA_RUNNER = path.resolve(__dirname, '../lua/run_oracle.lua');
const FIXTURES_DIR = path.join(ROOT_DIR, 'fixtures/oracle');

export type OracleNumericOutput = Record<string, OracleRawValue>;

export interface OracleGoldenSnapshot {
  id: string;
  title: string;
  game: 'poe1' | 'poe2';
  xml: string;
  pobCommit: string;
  inputDigest: string;
  generatedAt: string;
  schemaVersion: number;
  context?: OracleContextMetadata;
  provenance: OracleProvenanceMetadata;
  presence?: OraclePresenceMetadata;
  nativeErrors: string[];
  oracle: OracleNumericOutput;
}

export interface NativeOracleExecutionResult {
  schemaVersion: number;
  context?: OracleContextMetadata;
  presence?: OraclePresenceMetadata;
  nativeErrors: string[];
  oracle: OracleNumericOutput;
}

export async function runUpstreamOracle(
  bench: OracleBenchmarkCase,
  opts: { luajitBin: string; luaCpath: string; timeoutMs?: number },
): Promise<NativeOracleExecutionResult> {
  const repoDir = path.join(
    ROOT_DIR,
    bench.game === 'poe2' ? '.cache/upstream-pob2' : '.cache/upstream-pob',
  );
  const srcDir = path.join(repoDir, 'src');

  const tmpXml = path.join(
    os.tmpdir(),
    `webpob_oracle_${bench.id}_${process.pid}_${Date.now()}.xml`,
  );
  await fs.writeFile(tmpXml, bench.xml, 'utf-8');

  const clibsPath = path.join(ROOT_DIR, '.cache/clibs/?.so');

  try {
    const env = {
      ...process.env,
      LUA_PATH: `${path.join(repoDir, 'runtime/lua/?.lua')};${path.join(repoDir, 'runtime/lua/?/init.lua')};${srcDir}/?.lua`,
      LUA_CPATH: `${opts.luaCpath};${clibsPath}`,
    };
    let stdout = '';
    let stderr = '';
    let processFailure: unknown;
    try {
      const result = await execFileAsync(opts.luajitBin, [LUA_RUNNER, tmpXml], {
        cwd: srcDir,
        env,
        maxBuffer: 10 * 1024 * 1024,
        timeout: opts.timeoutMs ?? 60_000,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      const processError = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
      stdout = processError.stdout?.toString() ?? '';
      stderr = processError.stderr?.toString() ?? '';
      processFailure = error;
    }

    const startMarker = '__ORACLE_JSON_START__';
    const endMarker = '__ORACLE_JSON_END__';
    const sIdx = stdout.indexOf(startMarker);
    const eIdx = stdout.indexOf(endMarker);
    if (sIdx === -1 || eIdx === -1) {
      throw new Error(`Oracle marker missing for ${bench.id}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    const jsonStr = stdout.slice(sIdx + startMarker.length, eIdx).trim();
    const parsed = JSON.parse(jsonStr) as {
      schemaVersion?: number;
      context?: OracleContextMetadata;
      presence?: OraclePresenceMetadata;
      nativeErrors?: string[];
      oracle?: OracleNumericOutput;
    };

    if (!parsed.oracle || typeof parsed.oracle !== 'object') {
      throw new Error(`Oracle JSON missing "oracle" object for ${bench.id}`);
    }

    if (parsed.schemaVersion !== 2) {
      throw new Error(`Oracle schemaVersion is missing or unsupported for ${bench.id}`);
    }
    if (!Array.isArray(parsed.nativeErrors)) {
      throw new Error(`Oracle nativeErrors metadata is missing for ${bench.id}`);
    }
    if (!parsed.context || typeof parsed.context.luaVersion !== 'string' || typeof parsed.context.luaUtf8Version !== 'string') {
      throw new Error(`Oracle runtime context is missing for ${bench.id}`);
    }
    if (
      !parsed.presence ||
      !Array.isArray(parsed.presence.presentFields) ||
      !Array.isArray(parsed.presence.missingFields) ||
      parsed.presence.presentCount !== parsed.presence.presentFields.length ||
      parsed.presence.missingCount !== parsed.presence.missingFields.length ||
      parsed.presence.presentCount + parsed.presence.missingCount === 0
    ) {
      throw new Error(`Oracle metric presence metadata is missing or inconsistent for ${bench.id}`);
    }

    const nativeErrors = parsed.nativeErrors;
    if (nativeErrors.length > 0) {
      throw new Error(
        'Native PoB Oracle reported errors for ' + bench.id + ':\n' +
          nativeErrors.join('\n') + '\nNative output: ' + JSON.stringify(parsed),
      );
    }
    if (processFailure) {
      const message = processFailure instanceof Error ? processFailure.message : String(processFailure);
      throw new Error('Pinned LuaJIT process failed for ' + bench.id + ': ' + message + '\nSTDERR:\n' + stderr);
    }

    return {
      schemaVersion: parsed.schemaVersion,
      context: parsed.context,
      presence: parsed.presence,
      nativeErrors,
      oracle: parsed.oracle,
    };
  } finally {
    await fs.unlink(tmpXml).catch(() => {});
  }
}

export async function executePinnedBenchmark(
  bench: OracleBenchmarkCase,
  ctx: {
    pins: OraclePinsFile;
    runtime: PinnedLuaRuntime;
    runnerScriptDigest: string;
    timeoutMs?: number;
  },
): Promise<OracleGoldenSnapshot> {
  const result = await runUpstreamOracle(bench, {
    luajitBin: ctx.runtime.bin,
    luaCpath: ctx.runtime.luaCpath,
    timeoutMs: ctx.timeoutMs,
  });
  const pin = ctx.pins.upstream[bench.game];
  const inputDigest = sha256Buffer(bench.xml);
  const snapshot: OracleGoldenSnapshot = {
    id: bench.id,
    title: bench.title,
    game: bench.game,
    xml: bench.xml,
    pobCommit: pin.commit,
    inputDigest,
    generatedAt: new Date().toISOString(),
    schemaVersion: result.schemaVersion,
    context: result.context,
    provenance: {
      pobRepo: pin.repo,
      pobCommit: pin.commit,
      luaJitRepository: ctx.pins.runtime.luajit.repository,
      luaJitRevision: ctx.pins.runtime.luajit.revision,
      luaJitVersion: ctx.runtime.version,
      luaUtf8Rock: ctx.pins.runtime.luajit.utf8Module.rock,
      luaUtf8RockVersion: ctx.pins.runtime.luajit.utf8Module.rockVersion,
      luaUtf8Module: ctx.pins.runtime.luajit.utf8Module.name,
      luaUtf8Version: ctx.runtime.luaUtf8Version,
      inputDigest,
      runnerScriptDigest: ctx.runnerScriptDigest,
    },
    presence: result.presence,
    nativeErrors: result.nativeErrors,
    oracle: result.oracle,
  };
  const provenanceErrors = validateSnapshotProvenance(snapshot, ctx.pins, ctx.runnerScriptDigest);
  if (provenanceErrors.length > 0) {
    throw new Error('Generated native snapshot failed provenance validation:\n  - ' + provenanceErrors.join('\n  - '));
  }
  return snapshot;
}

function parseArgs(argv: string[]) {
  let gameFilter: 'poe1' | 'poe2' | undefined;
  const ids: string[] = [];
  let outPath = path.join(FIXTURES_DIR, 'snapshots.json');
  let pinsPath = DEFAULT_PINS_PATH;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--game') {
      const val = argv[++i];
      if (val !== 'poe1' && val !== 'poe2') throw new Error(`Invalid --game: ${String(val)}`);
      gameFilter = val;
    } else if (arg === '--id') {
      const val = argv[++i];
      if (!val) throw new Error('Missing value for --id');
      ids.push(val);
    } else if (arg === '--out') {
      const val = argv[++i];
      if (!val) throw new Error('Missing value for --out');
      outPath = path.resolve(process.cwd(), val);
    } else if (arg === '--pins') {
      const val = argv[++i];
      if (!val) throw new Error('Missing value for --pins');
      pinsPath = path.resolve(process.cwd(), val);
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }
  return { gameFilter, ids, outPath, pinsPath };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('=== Generating Official PathOfBuilding Golden Snapshots (Pinned LuaJIT Oracle) ===\n');

  const pins = await loadOraclePins(opts.pinsPath);
  const dataCheck = await verifyPinnedDataFiles(pins, ROOT_DIR);
  if (!dataCheck.valid) {
    throw new Error(`Pinned data verification failed:\n  - ${dataCheck.errors.join('\n  - ')}`);
  }

  const runtime = await resolveLuaJitBin(pins);
  const runnerScriptDigest = sha256Buffer(await fs.readFile(LUA_RUNNER));

  const selected = ORACLE_BENCHMARKS.filter((b) => {
    if (opts.gameFilter && b.game !== opts.gameFilter) return false;
    if (opts.ids.length > 0 && !opts.ids.includes(b.id)) return false;
    return true;
  });
  if (selected.length === 0) {
    throw new Error('No benchmarks matched the provided filters.');
  }

  const neededGames = new Set(selected.map((b) => b.game));
  for (const game of neededGames) {
    const repoDir = path.join(ROOT_DIR, game === 'poe2' ? '.cache/upstream-pob2' : '.cache/upstream-pob');
    await verifyPinnedCheckout(
      repoDir,
      pins.upstream[game].commit,
      `upstream-${game}`,
      pins.upstream[game].repo,
    );
  }

  const snapshots: OracleGoldenSnapshot[] = [];
  for (const bench of selected) {
    process.stdout.write(`Running pinned PoB (${bench.game} @ ${pins.upstream[bench.game].commit.slice(0, 12)}) on [${bench.id}]... `);
    const snap = await executePinnedBenchmark(bench, {
      pins,
      runtime,
      runnerScriptDigest,
    });
    const oracle = snap.oracle;
    console.log(
      `OK (Life=${oracle.Life}, ES=${oracle.EnergyShield}, DPS=${oracle.CombinedDPS}, Str/Dex/Int=${oracle.Str}/${oracle.Dex}/${oracle.Int}, present=${snap.presence?.presentCount ?? '?'})`,
    );
    snapshots.push(snap);
  }

  await fs.mkdir(path.dirname(opts.outPath), { recursive: true });
  await fs.writeFile(
    opts.outPath,
    JSON.stringify(
      {
        schemaVersion: 2,
        pins: {
          poe1: pins.upstream.poe1.commit,
          poe2: pins.upstream.poe2.commit,
        },
        snapshots,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`\n✓ Wrote ${snapshots.length} Pinned Golden Snapshots to ${opts.outPath}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  main().catch((err) => {
    console.error(`FAIL: ${(err as Error).message}`);
    process.exit(1);
  });
}
