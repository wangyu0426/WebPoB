import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { calculateBuild, evaluateOracleSuite, type OracleMetricStatus } from '@webpob/calc';
import { ORACLE_BENCHMARKS } from './benchmarks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../..');
const DEFAULT_SNAP_PATH = path.join(ROOT_DIR, 'fixtures/oracle/snapshots.json');
const DEFAULT_MIN_SNAPSHOT_COUNT = 130;

interface CliOptions {
  strict: boolean;
  certify: boolean;
  json: boolean;
  verbose: boolean;
  snapshotsPath: string;
  customSnapshots: boolean;
  minCount: number;
}

function parseCliArgs(argv: string[]): CliOptions {
  let strict = false;
  let certify = false;
  let json = false;
  let verbose = false;
  let snapshotsPath = DEFAULT_SNAP_PATH;
  let customSnapshots = false;
  let minCount: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--strict') {
      strict = true;
    } else if (arg === '--certify') {
      strict = true;
      certify = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--snapshots') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --snapshots');
      }
      snapshotsPath = path.resolve(process.cwd(), value);
      customSnapshots = true;
    } else if (arg === '--min-count') {
      const value = argv[++i];
      const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --min-count value: ${String(value)}`);
      }
      minCount = parsed;
    } else if (arg === '--') {
      continue;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  const canonicalMinCount = Math.max(DEFAULT_MIN_SNAPSHOT_COUNT, ORACLE_BENCHMARKS.length);
  return {
    strict,
    certify,
    json,
    verbose,
    snapshotsPath,
    customSnapshots,
    minCount: certify
      ? Math.max(minCount ?? canonicalMinCount, canonicalMinCount)
      : (minCount ?? (customSnapshots ? 1 : canonicalMinCount)),
  };
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

function statusSymbol(status: OracleMetricStatus): string {
  switch (status) {
    case 'pass':
      return '✓';
    case 'mismatch':
      return '✗';
    case 'missing':
      return '!';
    case 'invalid':
      return 'E';
    case 'not_applicable':
      return '-';
    case 'unsupported':
      return '?';
  }
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  await loadLocalDatasets();

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(await fs.readFile(opts.snapshotsPath, 'utf-8'));
  } catch (err) {
    console.error(`FAIL: Unable to read or parse snapshots file "${opts.snapshotsPath}": ${(err as Error).message}`);
    process.exit(1);
  }

  const suite = evaluateOracleSuite(
    rawPayload,
    (xml) => {
      const build = xmlToBuild(xml);
      const out = calculateBuild(build);
      return { build, out };
    },
    {
      minCount: opts.minCount,
      expectedIds: opts.certify || !opts.customSnapshots ? ORACLE_BENCHMARKS.map((b) => b.id) : undefined,
    },
  );

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          mode: opts.certify ? 'certify' : opts.strict ? 'strict' : 'diagnostic',
          snapshotsPath: opts.snapshotsPath,
          corpus: suite.corpus,
          statusCounts: suite.statusCounts,
          metricSummaries: suite.metricSummaries,
          corePassed: suite.corePassed,
          strictPassed: suite.strictPassed,
          certified: suite.certified,
        },
        null,
        2,
      ),
    );
  } else {
    const modeLabel = opts.certify ? 'CERTIFY (fail-closed)' : opts.strict ? 'STRICT (fail-closed)' : 'DIAGNOSTIC';
    console.log(`=== WebPoB vs Official PathOfBuilding Differential Report [${modeLabel}] ===\n`);
    console.log(
      `Corpus: ${suite.corpus.count} snapshots | schemaValid=${suite.corpus.valid} | legacyCount=${suite.corpus.legacyCount}`,
    );
    if (suite.corpus.errors.length > 0) {
      console.log('Corpus validation errors:');
      for (const err of suite.corpus.errors) {
        console.log(`  - ${err}`);
      }
    }

    console.log('\nMetric Summary (Core + Extended):');
    console.log('  Metric                 | Tier     | Pass | Mismatch | Missing | Invalid | N/A | Unsup');
    console.log('  -----------------------+----------+------+----------+---------+---------+-----+------');
    for (const s of suite.metricSummaries) {
      console.log(
        `  ${s.metric.padEnd(22)} | ${s.tier.padEnd(8)} | ${String(s.pass).padStart(4)} | ${String(s.mismatch).padStart(8)} | ${String(s.missing).padStart(7)} | ${String(s.invalid).padStart(7)} | ${String(s.not_applicable).padStart(3)} | ${String(s.unsupported).padStart(5)}`,
      );
    }

    if (opts.verbose) {
      for (const snap of suite.snapshots) {
        console.log(`\n[${snap.id}] ${snap.title} (PoB @ ${snap.pobCommit}, ${snap.context.provenance})`);
        if (!snap.context.valid) {
          for (const err of snap.context.errors) {
            console.log(`  ! CONTEXT: ${err}`);
          }
        }
        for (const m of snap.metrics) {
          if (m.status === 'not_applicable') continue;
          console.log(
            `  ${statusSymbol(m.status)} ${m.metric.padEnd(22)} | oracle=${String(m.oracle ?? m.rawOracle ?? 'null').padStart(10)} | actual=${String(m.actual ?? m.rawActual ?? 'null').padStart(10)} | ${m.status}${m.reason ? ` (${m.reason})` : ''}`,
          );
        }
      }
    }

    console.log(
      `\nGate Summary: corePassed=${suite.corePassed} | strictPassed=${suite.strictPassed} | certified=${suite.certified}`,
    );
  }

  if (!suite.corpus.valid || !suite.corePassed) {
    process.exit(1);
  }
  if (opts.strict && !suite.strictPassed) {
    process.exit(1);
  }
  if (opts.certify && !suite.certified) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
