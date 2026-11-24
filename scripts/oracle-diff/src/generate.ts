import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ORACLE_BENCHMARKS, type OracleBenchmarkCase } from './benchmarks.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const LUA_RUNNER = path.resolve(__dirname, '../lua/run_oracle.lua');
const FIXTURES_DIR = path.join(ROOT_DIR, 'fixtures/oracle');

export interface OracleNumericOutput {
  CombinedDPS: number;
  TotalDPS: number;
  FullDPS: number;
  AverageDamage: number;
  AverageHit: number;
  Speed: number;
  CritChance: number;
  CritMultiplier: number;
  HitChance: number;
  ManaCost: number;
  Life: number;
  LifeUnreserved: number;
  LifeRegen: number;
  EnergyShield: number;
  Mana: number;
  ManaUnreserved: number;
  ManaRegen: number;
  Spirit: number;
  SpiritReserved: number;
  SpiritUnreserved: number;
  Armour: number;
  PhysicalDamageReduction: number;
  Evasion: number;
  MeleeEvadeChance: number;
  BlockChance: number;
  SpellBlockChance: number;
  SpellSuppressionChance: number;
  FireResist: number;
  FireResistOverCap: number;
  FireResistMax: number;
  ColdResist: number;
  ColdResistOverCap: number;
  ColdResistMax: number;
  LightningResist: number;
  LightningResistOverCap: number;
  LightningResistMax: number;
  ChaosResist: number;
  ChaosResistOverCap: number;
  ChaosResistMax: number;
  Str: number;
  Dex: number;
  Int: number;
  EffectiveMovementSpeedMod: number;
  TotalEHP: number;
  PhysicalMaximumHitTaken: number;
  FireMaximumHitTaken: number;
  ColdMaximumHitTaken: number;
  LightningMaximumHitTaken: number;
  IgniteDPS: number;
  BleedDPS: number;
  TotalPoisonDPS: number;
  PhysicalMin: number;
  PhysicalMax: number;
  FireMin: number;
  FireMax: number;
  ColdMin: number;
  ColdMax: number;
  LightningMin: number;
  LightningMax: number;
  ChaosMin: number;
  ChaosMax: number;
}

export interface OracleGoldenSnapshot {
  id: string;
  title: string;
  game: 'poe1' | 'poe2';
  xml: string;
  pobCommit: string;
  generatedAt: string;
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

async function runUpstreamOracle(bench: OracleBenchmarkCase): Promise<OracleNumericOutput> {
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
    return JSON.parse(jsonStr) as OracleNumericOutput;
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
    const oracle = await runUpstreamOracle(bench);
    console.log(
      `OK (Life=${Math.round(oracle.Life)}, ES=${Math.round(oracle.EnergyShield)}, DPS=${Math.round(oracle.CombinedDPS)}, Str/Dex/Int=${Math.round(oracle.Str)}/${Math.round(oracle.Dex)}/${Math.round(oracle.Int)})`,
    );
    snapshots.push({
      id: bench.id,
      title: bench.title,
      game: bench.game,
      xml: bench.xml,
      pobCommit: bench.game === 'poe2' ? poe2Rev : poe1Rev,
      generatedAt: new Date().toISOString(),
      oracle,
    });
  }

  await fs.mkdir(FIXTURES_DIR, { recursive: true });
  const outPath = path.join(FIXTURES_DIR, 'snapshots.json');
  await fs.writeFile(outPath, JSON.stringify({ snapshots }, null, 2), 'utf-8');
  console.log(`\n✓ Wrote ${snapshots.length} Golden Snapshots to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
