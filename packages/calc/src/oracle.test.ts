import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
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
import {
  calculateBuild,
  CANONICAL_ORACLE_BENCHMARK_IDS,
  evaluateSnapshot,
  validateSnapshotCorpus,
  type OracleSnapshotFile,
  type OracleSnapshotRecord,
} from './index.js';

const rootDir = process.cwd();
const snapFile = path.join(rootDir, 'fixtures/oracle/snapshots.json');
const rawPayload: OracleSnapshotFile | null = fs.existsSync(snapFile)
  ? (JSON.parse(fs.readFileSync(snapFile, 'utf-8')) as OracleSnapshotFile)
  : null;
const snapshots: OracleSnapshotRecord[] = rawPayload?.snapshots ?? [];

describe('Official PathOfBuilding Oracle Differential Regression Suite (PoE 1 3.30 & PoE 2 0.5)', () => {
  beforeAll(() => {
    const dataDir = path.join(rootDir, 'apps/web/public/data');
    const poe1Tree = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-tree-3_30.json'), 'utf-8')) as CompactTreePayload;
    const poe2Tree = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-tree-0_5.json'), 'utf-8')) as CompactTreePayload;
    const poe1Gems = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-gems.json'), 'utf-8')) as CompactGemsPayload;
    const poe2Gems = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-gems.json'), 'utf-8')) as CompactGemsPayload;
    const poe1Bases = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
    const poe2Bases = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-bases.json'), 'utf-8')) as CompactBaseItemsPayload;
    const poe1Clusters = JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-clusters.json'), 'utf-8')) as CompactClusterNotablesPayload;
    registerTreeData(hydrateCompactTree(poe1Tree));
    registerTreeData(hydrateCompactTree(poe2Tree));
    registerGemsData('poe1', poe1Gems);
    registerGemsData('poe2', poe2Gems);
    registerBaseItems(poe1Bases);
    registerBaseItems(poe2Bases);
    registerClusterNotables(poe1Clusters);
  });

  it('passes corpus schema, canonical expected IDs (130), and duplicate-ID checks', () => {
    const corpus = validateSnapshotCorpus(rawPayload, {
      minCount: CANONICAL_ORACLE_BENCHMARK_IDS.length,
      expectedIds: CANONICAL_ORACLE_BENCHMARK_IDS,
    });
    expect(corpus.errors).toEqual([]);
    expect(corpus.valid).toBe(true);
    expect(corpus.count).toBeGreaterThanOrEqual(CANONICAL_ORACLE_BENCHMARK_IDS.length);
    expect(corpus.duplicateIds).toEqual([]);
    expect(corpus.missingIds).toEqual([]);
    // Legacy v1 snapshots lack non-coerced null/NaN provenance and cannot be marked certified
    expect(corpus.legacyCount).toBe(corpus.count);
  });

  for (const snap of snapshots) {
    it(`matches official PoB oracle core contract [${snap.id}] (${snap.title})`, () => {
      const build = xmlToBuild(snap.xml);
      const out = calculateBuild(build);
      const evaluation = evaluateSnapshot(snap, build, out);

      expect(evaluation.context.errors).toEqual([]);
      expect(evaluation.context.valid).toBe(true);
      // Legacy fixtures must never be falsely marked certified
      expect(evaluation.certified).toBe(false);

      const coreFailures = evaluation.metrics.filter(
        (m) =>
          m.tier === 'core' &&
          (m.status === 'mismatch' || m.status === 'missing' || m.status === 'invalid' || m.status === 'unsupported'),
      );
      expect(coreFailures).toEqual([]);
      expect(evaluation.corePassed).toBe(true);

      // Preserve explicit Enlighten ManaUnreserved regression check
      if (snap.id.includes('enlighten')) {
        const manaUnres = evaluation.metrics.find((m) => m.metric === 'ManaUnreserved');
        expect(manaUnres?.status).toBe('pass');
      }
    });
  }
});
