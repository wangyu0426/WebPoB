import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { OracleContextMetadata, OracleRawValue } from '@webpob/calc';
import { ORACLE_BENCHMARKS, type OracleBenchmarkCase } from './benchmarks.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const LUA_RUNNER = path.resolve(__dirname, '../lua/run_oracle.lua');
const FIXTURES_DIR = path.join(ROOT_DIR, 'fixtures/oracle');

export type OracleNumericOutput = Record<string, OracleRawValue>;

export interface OracleGoldenSnapshot {
  id: string;
  title: string;
  game: 'poe1' | 'poe2';
  xml: string;
  pobCommit: string;
  generatedAt: string;
  schemaVersion?: number;
  context?: OracleContextMetadata;
  oracle: OracleNumericOutput;
}

async function getGitRev(repoDir: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoDir });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

async function runUpstreamOracle(
  bench: OracleBenchmarkCase,
): Promise<{ schemaVersion: number; context?: OracleContextMetadata; oracle: OracleNumericOutput }> {
  const repoDir = path.join(
    ROOT_DIR,
    bench.game === 'poe2' ? '.cache/upstream-pob2' : '.cache/upstream-pob',
  );
  const srcDir = path.join(repoDir, 'src');

  const tmpXml = path.join(os.tmpdir(), `webpob_oracle_${bench.id}_${Date.now()}.xml`);
  await fs.writeFile(tmpXml, bench.xml, 'utf-8');

  const luajitBin = process.env.LUAJIT_BIN || path.join(ROOT_DIR, '.cache/luajit-src/src/luajit');
  const clibsPath = path.join(ROOT_DIR, '.cache/clibs/?.so');

  try {
    const env = {
      ...process.env,
      LUA_PATH: `${path.join(repoDir, 'runtime/lua/?.lua')};${path.join(repoDir, 'runtime/lua/?/init.lua')};${srcDir}/?.lua;;`,
      LUA_CPATH: `${clibsPath};;`,
    };
    const { stdout, stderr } = await execFileAsync(luajitBin, [LUA_RUNNER, tmpXml], {
      cwd: srcDir,
      env,
      maxBuffer: 10 * 1024 * 1024,
    });

    const startMarker = '__ORACLE_JSON_START__';
    const endMarker = '__ORACLE_JSON_END__';
    const sIdx = stdout.indexOf(startMarker);
    const eIdx = stdout.indexOf(endMarker);
    if (sIdx === -1 || eIdx === -1) {
      throw new Error(`Oracle marker missing for ${bench.id}.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    }
    const jsonStr = stdout.slice(sIdx + startMarker.length, eIdx).trim();
    const parsed = JSON.parse(jsonStr) as
      | { schemaVersion?: number; context?: OracleContextMetadata; oracle?: OracleNumericOutput }
      | OracleNumericOutput;
    if ('oracle' in parsed && parsed.oracle && typeof parsed.oracle === 'object') {
      return {
        schemaVersion: parsed.schemaVersion ?? 2,
        context: parsed.context,
        oracle: parsed.oracle,
      };
    }
    return { schemaVersion: 1, oracle: parsed as OracleNumericOutput };
  } finally {
    await fs.unlink(tmpXml).catch(() => {});
  }
}

async function main() {
  console.log('=== Generating Official PathOfBuilding Golden Snapshots (LuaJIT Oracle) ===\n');
  const poe1Rev = await getGitRev(path.join(ROOT_DIR, '.cache/upstream-pob'));
  const poe2Rev = await getGitRev(path.join(ROOT_DIR, '.cache/upstream-pob2'));
  const snapshots: OracleGoldenSnapshot[] = [];

  for (const bench of ORACLE_BENCHMARKS) {
    process.stdout.write(`Running official PoB (${bench.game}) on [${bench.id}]... `);
    const result = await runUpstreamOracle(bench);
    const oracle = result.oracle;
    console.log(
      `OK (Life=${oracle.Life}, ES=${oracle.EnergyShield}, DPS=${oracle.CombinedDPS}, Str/Dex/Int=${oracle.Str}/${oracle.Dex}/${oracle.Int})`,
    );
    snapshots.push({
      id: bench.id,
      title: bench.title,
      game: bench.game,
      xml: bench.xml,
      pobCommit: bench.game === 'poe2' ? poe2Rev : poe1Rev,
      generatedAt: new Date().toISOString(),
      schemaVersion: result.schemaVersion,
      context: result.context,
      oracle,
    });
  }

  await fs.mkdir(FIXTURES_DIR, { recursive: true });
  const outPath = path.join(FIXTURES_DIR, 'snapshots.json');
  await fs.writeFile(outPath, JSON.stringify({ schemaVersion: 2, snapshots }, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${snapshots.length} Golden Snapshots to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
