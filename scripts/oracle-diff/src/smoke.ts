import fs from 'node:fs/promises';
import path from 'node:path';
import {
  hydrateCompactTree,
  registerBaseItems,
  registerClusterNotables,
  registerGemsData,
  registerTreeData,
  type CompactBaseItemsPayload,
  type CompactClusterNotablesPayload,
  type CompactGemsPayload,
  type CompactTreePayload,
} from '@webpob/data';
import { xmlToBuild } from '@webpob/codec';
import { calculateBuild, evaluateSnapshot, ORACLE_METRIC_SPECS } from '@webpob/calc';
import { ORACLE_BENCHMARKS } from './benchmarks.js';
import {
  LUA_RUNNER,
  executePinnedBenchmark,
  type OracleGoldenSnapshot,
} from './generate.js';
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
import { resolveLuaJitBin } from './setup.js';

/**
 * Strip declared nonsemantic metadata (timestamps) so two independent native runs
 * on identical XML/config can be compared for strict repeatability.
 */
export function stripNonSemanticMetadata(snap: OracleGoldenSnapshot): Omit<OracleGoldenSnapshot, 'generatedAt'> {
  const { generatedAt: _ignored, ...semantic } = snap;
  return semantic;
}

export function compareRepeatability(
  first: OracleGoldenSnapshot,
  second: OracleGoldenSnapshot,
): { repeatable: boolean; diffs: string[] } {
  const a = stripNonSemanticMetadata(first);
  const b = stripNonSemanticMetadata(second);
  const diffs: string[] = [];

  if (JSON.stringify(a) !== JSON.stringify(b)) {
    for (const key of Object.keys(a) as Array<keyof typeof a>) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        diffs.push(`Field "${String(key)}" differed between run 1 and run 2`);
      }
    }
  }
  return { repeatable: diffs.length === 0, diffs };
}

async function loadLocalDatasets() {
  const dataDir = path.join(ROOT_DIR, 'apps/web/public/data');
  const poe1Tree = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-tree-3_30.json'), 'utf-8')) as CompactTreePayload;
  const poe2Tree = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-tree-0_5.json'), 'utf-8')) as CompactTreePayload;
  const poe1Gems = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-gems.json'), 'utf-8')) as CompactGemsPayload;
  const poe2Gems = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-gems.json'), 'utf-8')) as CompactGemsPayload;
  const poe1Bases = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
  const poe2Bases = JSON.parse(await fs.readFile(path.join(dataDir, 'poe2-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
  const poe1Clusters = JSON.parse(await fs.readFile(path.join(dataDir, 'poe1-clusters.json'), 'utf-8')) as CompactClusterNotablesPayload;
  registerTreeData(hydrateCompactTree(poe1Tree));
  registerTreeData(hydrateCompactTree(poe2Tree));
  registerGemsData('poe1', poe1Gems);
  registerGemsData('poe2', poe2Gems);
  registerBaseItems(poe1Bases);
  registerBaseItems(poe2Bases);
  registerClusterNotables(poe1Clusters);
}

function pickDefaultSmokeBenchmarks() {
  const poe1 = ORACLE_BENCHMARKS.find((b) => b.game === 'poe1');
  const poe2 = ORACLE_BENCHMARKS.find((b) => b.game === 'poe2');
  return [poe1, poe2].filter((b): b is NonNullable<typeof b> => Boolean(b));
}

function parseArgs(argv: string[]) {
  const ids: string[] = [];
  let outPath: string | undefined;
  let pinsPath = DEFAULT_PINS_PATH;
  let repeats = 2;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') continue;
    if (arg === '--id') {
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
    } else if (arg === '--repeats') {
      const val = Number.parseInt(argv[++i] ?? '', 10);
      if (!Number.isInteger(val) || val < 1) throw new Error('Invalid --repeats');
      repeats = val;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }
  return { ids, outPath, pinsPath, repeats };
}

async function writeNativeSnapshots(
  outPath: string | undefined,
  pins: OraclePinsFile,
  snapshots: OracleGoldenSnapshot[],
): Promise<void> {
  if (!outPath) return;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(
    outPath,
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
  console.log('  ✓ Saved independent native output to ' + outPath);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('=== WebPoB Pinned Native Oracle Smoke Verification ===\n');

  const pins = await loadOraclePins(opts.pinsPath);
  const dataCheck = await verifyPinnedDataFiles(pins, ROOT_DIR);
  if (!dataCheck.valid) {
    throw new Error(`Pinned data verification failed:\n  - ${dataCheck.errors.join('\n  - ')}`);
  }
  console.log(`  ✓ Verified ${Object.keys(pins.dataFiles).length} pinned data file hashes`);

  const runtime = await resolveLuaJitBin(pins);
  console.log(`  ✓ LuaJIT: ${runtime.version} @ ${pins.runtime.luajit.revision}`);
  console.log(`  ✓ UTF-8 module: ${pins.runtime.luajit.utf8Module.name} ${runtime.luaUtf8Version}`);
  const runnerScriptDigest = sha256Buffer(await fs.readFile(LUA_RUNNER));

  const selected =
    opts.ids.length > 0
      ? ORACLE_BENCHMARKS.filter((b) => opts.ids.includes(b.id))
      : pickDefaultSmokeBenchmarks();
  if (selected.length === 0) {
    throw new Error('No smoke benchmarks selected.');
  }

  for (const game of new Set(selected.map((b) => b.game))) {
    const repoDir = path.join(ROOT_DIR, game === 'poe2' ? '.cache/upstream-pob2' : '.cache/upstream-pob');
    await verifyPinnedCheckout(
      repoDir,
      pins.upstream[game].commit,
      `upstream-${game}`,
      pins.upstream[game].repo,
    );
    console.log(`  ✓ Verified upstream-${game} checkout @ ${pins.upstream[game].commit}`);
  }

  await loadLocalDatasets();

  const nativeSnapshots: OracleGoldenSnapshot[] = [];
  let allPassed = true;

  // Collect and persist native results before comparing any values with TypeScript.
  for (const bench of selected) {
    console.log('\n[' + bench.id + '] (' + bench.game + ') — running ' + opts.repeats + 'x native LuaJIT Oracle...');
    const runs: OracleGoldenSnapshot[] = [];
    for (let r = 0; r < opts.repeats; r++) {
      const run = await executePinnedBenchmark(bench, {
        pins,
        runtime,
        runnerScriptDigest,
      });
      runs.push(run);
      if (r === 0) {
        nativeSnapshots.push(run);
        await writeNativeSnapshots(opts.outPath, pins, nativeSnapshots);
      }
    }

    const first = runs[0]!;
    const provenanceErrors = validateSnapshotProvenance(first, pins, runnerScriptDigest);
    if (provenanceErrors.length > 0) {
      allPassed = false;
      for (const error of provenanceErrors) console.error('  ✗ PROVENANCE: ' + error);
    }
    for (let r = 1; r < runs.length; r++) {
      const rep = compareRepeatability(first, runs[r]!);
      if (!rep.repeatable) {
        allPassed = false;
        console.error('  ✗ Repeatability failed (run 1 vs run ' + (r + 1) + '): ' + rep.diffs.join('; '));
      }
    }
    if (opts.repeats >= 2) {
      console.log(
        '  ✓ Repeatability checked (' + opts.repeats +
          ' semantic runs, inputDigest=' + first.inputDigest.slice(0, 12) + ')',
      );
    }
  }

  for (let i = 0; i < selected.length; i++) {
    const bench = selected[i]!;
    const first = nativeSnapshots[i]!;
    const build = xmlToBuild(first.xml);
    const out = calculateBuild(build);
    const evaluation = evaluateSnapshot(
      first,
      build,
      out,
      ORACLE_METRIC_SPECS,
      pins.upstream[bench.game].commit,
    );

    const coreFailures = evaluation.metrics.filter(
      (m) =>
        m.tier === 'core' &&
        (m.status === 'mismatch' || m.status === 'missing' || m.status === 'invalid' || m.status === 'unsupported'),
    );

    console.log(
      '  Skill: ' + (first.context?.activeSkillName ?? '<none>') +
        ' | Source: ' + (first.context?.outputSource ?? '?') +
        ' | Present fields: ' + (first.presence?.presentCount ?? '?'),
    );
    console.log(
      '  Eval: contextValid=' + evaluation.context.valid +
        ' | corePassed=' + evaluation.corePassed +
        ' | strictPassed=' + evaluation.strictPassed +
        ' | certified=' + evaluation.certified,
    );

    if (!evaluation.context.valid || !evaluation.corePassed) {
      allPassed = false;
      for (const err of evaluation.context.errors) {
        console.error('  ✗ CONTEXT: ' + err);
      }
      for (const metric of coreFailures) {
        console.error(
          '  ✗ CORE ' + metric.metric + ': oracle=' + String(metric.oracle) +
            ' actual=' + String(metric.actual) + ' (' + (metric.reason ?? metric.status) + ')',
        );
      }
    }
  }

  if (!allPassed) {
    throw new Error('Pinned Native Oracle smoke verification failed.');
  }
  console.log('\n✓ Pinned Native Oracle smoke verification PASSED.');
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isDirectRun) {
  main().catch((err) => {
    console.error(`FAIL: ${(err as Error).message}`);
    process.exit(1);
  });
}
