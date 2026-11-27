import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
  evaluateOracleSuite,
  evaluateSnapshot,
  ORACLE_METRIC_SPECS,
  validateSnapshotCorpus,
  type OracleSnapshotRecord,
} from './index.js';

const rootDir = process.cwd();
const snapFile = path.join(rootDir, 'fixtures/oracle/snapshots.json');
const firstRealSnapshot = (
  JSON.parse(fs.readFileSync(snapFile, 'utf-8')) as { snapshots: OracleSnapshotRecord[] }
).snapshots[0]!;

describe('Oracle Differential Contract — Fail-Closed & Adversarial Tests', () => {
  beforeAll(() => {
    const dataDir = path.join(rootDir, 'apps/web/public/data');
    registerTreeData(hydrateCompactTree(JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-tree-3_30.json'), 'utf-8')) as CompactTreePayload));
    registerTreeData(hydrateCompactTree(JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-tree-0_5.json'), 'utf-8')) as CompactTreePayload));
    registerGemsData('poe1', JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-gems.json'), 'utf-8')) as CompactGemsPayload);
    registerGemsData('poe2', JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-gems.json'), 'utf-8')) as CompactGemsPayload);
    registerBaseItems(JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-bases.json'), 'utf-8')) as CompactBaseItemsPayload);
    registerBaseItems(JSON.parse(fs.readFileSync(path.join(dataDir, 'poe2-bases.json'), 'utf-8')) as CompactBaseItemsPayload);
    registerClusterNotables(JSON.parse(fs.readFileSync(path.join(dataDir, 'poe1-clusters.json'), 'utf-8')) as CompactClusterNotablesPayload);
  });

  it('distinguishes true zero from missing (null/undefined) on both oracle and actual sides', () => {
    const build = xmlToBuild(firstRealSnapshot.xml);
    const out = calculateBuild(build);

    // 1. Oracle FullDPS > 0 while actual fullDps is undefined -> MUST be 'missing' (never silently skipped!)
    const snapWithFullDps: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      oracle: { ...firstRealSnapshot.oracle, FullDPS: 5000 },
    };
    const evalFullDps = evaluateSnapshot(snapWithFullDps, build, {
      ...out,
      offence: { ...out.offence, fullDps: undefined },
    });
    const fullDpsMetric = evalFullDps.metrics.find((m) => m.metric === 'FullDPS');
    expect(fullDpsMetric?.status).toBe('missing');
    expect(evalFullDps.corePassed).toBe(false);

    // 2. Oracle Life is null (missing) -> MUST be 'missing', not coerced to 0
    const snapWithNullLife: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      oracle: { ...firstRealSnapshot.oracle, Life: null },
    };
    const evalNullLife = evaluateSnapshot(snapWithNullLife, build, out);
    expect(evalNullLife.metrics.find((m) => m.metric === 'Life')?.status).toBe('missing');
    expect(evalNullLife.corePassed).toBe(false);

    // 3. True zero (Ward = 0 on both sides in PoE 1) -> MUST be 'pass', not skipped,
    //    while omitted actual ward (undefined) -> MUST fail closed as 'missing'
    const evalZeroWard = evaluateSnapshot(firstRealSnapshot, build, out);
    const wardMetric = evalZeroWard.metrics.find((m) => m.metric === 'Ward');
    expect(wardMetric?.status).toBe('pass');
    expect(wardMetric?.oracle).toBe(0);
    expect(wardMetric?.actual).toBe(0);

    const evalMissingWard = evaluateSnapshot(firstRealSnapshot, build, {
      ...out,
      defence: { ...out.defence, ward: undefined },
    });
    expect(evalMissingWard.metrics.find((m) => m.metric === 'Ward')?.status).toBe('missing');
    expect(evalMissingWard.corePassed).toBe(false);

    const evalMissingImpale = evaluateSnapshot(firstRealSnapshot, build, {
      ...out,
      offence: { ...out.offence, impaleDps: undefined },
    });
    expect(evalMissingImpale.metrics.find((m) => m.metric === 'ImpaleDPS')?.status).toBe('missing');
    expect(evalMissingImpale.corePassed).toBe(false);

    // 3b. v2 AverageDamage: 0 must stay 0 (not fall back to AverageHit), while null falls back to AverageHit
    const v2ZeroAvgDmg = evaluateSnapshot(
      {
        ...firstRealSnapshot,
        schemaVersion: 2,
        context: { activeSkillName: out.offence.mainSkillName.en, mainSocketGroup: 1, outputSource: 'player' },
        oracle: { ...firstRealSnapshot.oracle, AverageDamage: 0, AverageHit: 9999 },
      },
      build,
      out,
    );
    const v2ZeroAvgMetric = v2ZeroAvgDmg.metrics.find((m) => m.metric === 'AverageDamage');
    expect(v2ZeroAvgMetric?.oracle).toBe(0);
    expect(v2ZeroAvgMetric?.status).toBe('mismatch');

    // 4. PoE 2 includeInFullDps group excluded by weaponSets -> FullDPS is not_applicable when oracle=0 and fullDps=undefined
    const inactiveWeaponSetBuild = {
      ...build,
      activeWeaponSet: 1 as const,
      skills: build.skills.map((g, idx) =>
        idx === 0 ? { ...g, includeInFullDps: true, weaponSets: [2 as const] } : g,
      ),
    };
    const evalInactiveWeaponSet = evaluateSnapshot(
      { ...firstRealSnapshot, oracle: { ...firstRealSnapshot.oracle, FullDPS: 0 } },
      inactiveWeaponSetBuild,
      { ...out, offence: { ...out.offence, fullDps: undefined } },
    );
    expect(evalInactiveWeaponSet.metrics.find((m) => m.metric === 'FullDPS')?.status).toBe('not_applicable');

    // 5. Negative oracle FullDPS must NEVER be treated as not_applicable
    const evalNegativeFullDps = evaluateSnapshot(
      { ...firstRealSnapshot, oracle: { ...firstRealSnapshot.oracle, FullDPS: -100 } },
      build,
      { ...out, offence: { ...out.offence, fullDps: undefined } },
    );
    expect(evalNegativeFullDps.metrics.find((m) => m.metric === 'FullDPS')?.status).toBe('missing');
    expect(evalNegativeFullDps.corePassed).toBe(false);
  });

  it('rejects NaN, Infinity, -Infinity, and string non-finite sentinels as invalid', () => {
    const build = xmlToBuild(firstRealSnapshot.xml);
    const out = calculateBuild(build);

    const snapNonFinite: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      oracle: {
        ...firstRealSnapshot.oracle,
        Life: 'NaN',
        Mana: 'Infinity',
        Armour: '-Infinity',
        Evasion: Number.NaN,
      },
    };
    const badOut = {
      ...out,
      offence: { ...out.offence, hitDps: Number.POSITIVE_INFINITY },
    };
    const evaluation = evaluateSnapshot(snapNonFinite, build, badOut);
    expect(evaluation.metrics.find((m) => m.metric === 'Life')?.status).toBe('invalid');
    expect(evaluation.metrics.find((m) => m.metric === 'Mana')?.status).toBe('invalid');
    expect(evaluation.metrics.find((m) => m.metric === 'Armour')?.status).toBe('invalid');
    expect(evaluation.metrics.find((m) => m.metric === 'Evasion')?.status).toBe('invalid');
    expect(evaluation.metrics.find((m) => m.metric === 'HitDPS')?.status).toBe('invalid');
    expect(evaluation.corePassed).toBe(false);
    expect(evaluation.strictPassed).toBe(false);
    expect(evaluation.certified).toBe(false);
  });

  it('fails closed on out-of-tolerance values and wrong skill/game context', () => {
    const build = xmlToBuild(firstRealSnapshot.xml);
    const out = calculateBuild(build);

    // Out-of-tolerance HitDPS
    const badDpsSnap: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      oracle: { ...firstRealSnapshot.oracle, TotalDPS: (firstRealSnapshot.oracle.TotalDPS as number) * 1.1 },
    };
    const evalBadDps = evaluateSnapshot(badDpsSnap, build, out);
    expect(evalBadDps.metrics.find((m) => m.metric === 'HitDPS')?.status).toBe('mismatch');
    expect(evalBadDps.corePassed).toBe(false);

    // Wrong skill identity context
    const wrongSkillSnap: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      context: { activeSkillName: 'Arc', mainSocketGroup: 1, outputSource: 'player' },
    };
    const evalWrongSkill = evaluateSnapshot(wrongSkillSnap, build, out);
    expect(evalWrongSkill.context.valid).toBe(false);
    expect(evalWrongSkill.context.skillMatches).toBe(false);
    expect(evalWrongSkill.corePassed).toBe(false);
    expect(evalWrongSkill.certified).toBe(false);
  });

  it('detects duplicate snapshot IDs, missing expected IDs, and insufficient count', () => {
    const dupPayload = { snapshots: [firstRealSnapshot, firstRealSnapshot] };
    const dupResult = validateSnapshotCorpus(dupPayload, {
      minCount: 3,
      expectedIds: [firstRealSnapshot.id, 'missing_fixture_id'],
    });
    expect(dupResult.valid).toBe(false);
    expect(dupResult.duplicateIds).toEqual([firstRealSnapshot.id]);
    expect(dupResult.missingIds).toEqual(['missing_fixture_id']);
    expect(dupResult.errors.length).toBeGreaterThanOrEqual(3);

    // Empty corpus must never pass or certify when options are omitted
    const emptySuite = evaluateOracleSuite({ snapshots: [] }, () => {
      throw new Error('should not be called');
    });
    expect(emptySuite.corpus.valid).toBe(false);
    expect(emptySuite.corePassed).toBe(false);
    expect(emptySuite.strictPassed).toBe(false);
    // Unsupported explicit schemaVersion (e.g. 3) must fail corpus validation
    const unsupportedVer = validateSnapshotCorpus(
      { schemaVersion: 3, snapshots: [{ ...firstRealSnapshot, schemaVersion: 3 }] },
      { minCount: 1 },
    );
    expect(unsupportedVer.valid).toBe(false);
    expect(unsupportedVer.errors.some((e) => e.includes('schemaVersion'))).toBe(true);
  });

  it('never certifies legacy v1 snapshots even when all metrics match, and certifies v2 when all metrics match', () => {
    const build = xmlToBuild(firstRealSnapshot.xml);
    const out = calculateBuild(build);

    const perfectOracle: Record<string, number> = {
      ...firstRealSnapshot.oracle as Record<string, number>,
      ChaosResist: out.defence.chaosResist,
      TotalEHP: out.defence.effectiveHitPool,
      IgniteDPS: out.offence.igniteDps,
      BleedDPS: out.offence.bleedDps,
      TotalPoisonDPS: out.offence.poisonDps,
      CombinedDPS: out.offence.totalDps,
      ManaUnreserved: out.defence.manaUnreserved,
    };

    const legacyPerfect: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      oracle: perfectOracle,
    };
    const legacySuite = evaluateOracleSuite(
      { snapshots: [legacyPerfect] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(legacySuite.strictPassed).toBe(true);
    expect(legacySuite.certified).toBe(false);

    const v2MissingContext: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      oracle: perfectOracle,
    };
    const v2MissingCtxSuite = evaluateOracleSuite(
      { schemaVersion: 2, snapshots: [v2MissingContext] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(v2MissingCtxSuite.snapshots[0]?.context.valid).toBe(false);
    expect(v2MissingCtxSuite.strictPassed).toBe(false);
    expect(v2MissingCtxSuite.certified).toBe(false);

    const v2MissingSkillName: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      context: { activeSkillName: null, mainSocketGroup: 1, outputSource: 'player' },
      oracle: perfectOracle,
    };
    const v2MissingSkillSuite = evaluateOracleSuite(
      { schemaVersion: 2, snapshots: [v2MissingSkillName] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(v2MissingSkillSuite.snapshots[0]?.context.valid).toBe(false);
    expect(v2MissingSkillSuite.strictPassed).toBe(false);
    expect(v2MissingSkillSuite.certified).toBe(false);

    const v2WrongMainGroup: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      context: { activeSkillName: out.offence.mainSkillName.en, mainSocketGroup: 2, outputSource: 'player' },
      oracle: perfectOracle,
    };
    const v2WrongGroupSuite = evaluateOracleSuite(
      { schemaVersion: 2, snapshots: [v2WrongMainGroup] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(v2WrongGroupSuite.snapshots[0]?.context.valid).toBe(false);
    expect(v2WrongGroupSuite.strictPassed).toBe(false);
    expect(v2WrongGroupSuite.certified).toBe(false);

    const v2MinionSource: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      context: { activeSkillName: out.offence.mainSkillName.en, mainSocketGroup: 1, outputSource: 'minion' },
      oracle: perfectOracle,
    };
    const v2MinionSuite = evaluateOracleSuite(
      { schemaVersion: 2, snapshots: [v2MinionSource] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(v2MinionSuite.snapshots[0]?.context.outputSourceVerified).toBe(false);
    expect(v2MinionSuite.certified).toBe(false);

    const v2Perfect: OracleSnapshotRecord = {
      ...firstRealSnapshot,
      schemaVersion: 2,
      context: { activeSkillName: out.offence.mainSkillName.en, mainSocketGroup: 1, outputSource: 'player' },
      oracle: perfectOracle,
    };
    const v2Suite = evaluateOracleSuite(
      { schemaVersion: 2, snapshots: [v2Perfect] },
      () => ({ build, out }),
      { minCount: 1 },
    );
    expect(v2Suite.strictPassed).toBe(true);
    expect(v2Suite.certified).toBe(true);

    // Partial, empty, or custom specs (even reusing canonical names) must never certify a snapshot
    const partialEval = evaluateSnapshot(v2Perfect, build, out, []);
    expect(partialEval.corePassed).toBe(false);
    expect(partialEval.strictPassed).toBe(false);
    expect(partialEval.certified).toBe(false);

    const spoofedSpecs = ORACLE_METRIC_SPECS.map((s) => ({
      ...s,
      tolerance: { kind: 'relative_or_abs' as const, maxRelPct: 100, maxAbs: 1e9 },
    }));
    const spoofedEval = evaluateSnapshot(v2Perfect, build, out, spoofedSpecs);
    expect(spoofedEval.strictPassed).toBe(true);
    expect(spoofedEval.certified).toBe(false);
  });

  it('CLI returns nonzero in --certify / --strict mode on failing or missing inputs, and 0 in diagnostic mode on baseline', () => {
    const tsxBin = path.join(rootDir, 'node_modules/.bin/tsx');
    const diffScript = path.join(rootDir, 'scripts/oracle-diff/src/diff.ts');

    // 1. Diagnostic mode on real corpus exits 0 and reports certified=false honestly
    const diagOut = execFileSync(tsxBin, [diffScript, '--json'], {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    const diagJson = JSON.parse(diagOut) as { corePassed: boolean; strictPassed: boolean; certified: boolean };
    expect(diagJson.corePassed).toBe(true);
    expect(diagJson.strictPassed).toBe(false);
    expect(diagJson.certified).toBe(false);

    // 2. --certify mode on real legacy corpus MUST exit nonzero
    let certifyExitCode = 0;
    try {
      execFileSync(tsxBin, [diffScript, '--certify', '--json'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (err) {
      certifyExitCode = (err as { status?: number }).status ?? 1;
    }
    expect(certifyExitCode).not.toBe(0);

    // 3. Absent snapshots file MUST exit nonzero
    const missingPath = path.join(os.tmpdir(), `nonexistent_oracle_${Date.now()}.json`);
    let missingExitCode = 0;
    try {
      execFileSync(tsxBin, [diffScript, '--snapshots', missingPath], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (err) {
      missingExitCode = (err as { status?: number }).status ?? 1;
    }
    expect(missingExitCode).not.toBe(0);

    // 4. Unknown CLI flag (e.g. typo --certfiy) MUST exit nonzero instead of silently downgrading
    let unknownFlagExitCode = 0;
    try {
      execFileSync(tsxBin, [diffScript, '--certfiy'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch (err) {
      unknownFlagExitCode = (err as { status?: number }).status ?? 1;
    }
    expect(unknownFlagExitCode).not.toBe(0);
  });
});
