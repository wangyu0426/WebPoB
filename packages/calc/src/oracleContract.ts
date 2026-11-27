import type { Build, CalcOutput, GameId } from '@webpob/core';

export type OracleMetricStatus =
  | 'pass'
  | 'mismatch'
  | 'missing'
  | 'invalid'
  | 'not_applicable'
  | 'unsupported';

export type OracleMetricTier = 'core' | 'extended';

export type OracleMetricUnit = 'int' | 'pct' | 'dps' | 'per_sec' | 'damage' | 'ehp' | 'flat';

export type OracleToleranceRule =
  | { kind: 'exact_int' }
  | { kind: 'relative_or_abs'; maxRelPct: number; maxAbs: number; nearZeroFloor?: number };

export type OracleRawValue = number | string | null | undefined;

export interface OracleContextMetadata {
  activeSkillName?: string | null;
  mainSocketGroup?: number | null;
  outputSource?: 'player' | 'minion' | null;
}

export interface OracleSnapshotRecord {
  id: string;
  title: string;
  game: GameId;
  xml: string;
  pobCommit: string;
  generatedAt?: string;
  schemaVersion?: number;
  context?: OracleContextMetadata;
  oracle: Record<string, OracleRawValue>;
}

export interface OracleSnapshotFile {
  schemaVersion?: number;
  snapshots: OracleSnapshotRecord[];
}

export interface OracleMetricResult {
  metric: string;
  oracleKey: string;
  tier: OracleMetricTier;
  unit: OracleMetricUnit;
  status: OracleMetricStatus;
  oracle: number | null;
  actual: number | null;
  rawOracle?: OracleRawValue;
  rawActual?: unknown;
  absDiff: number | null;
  relDiffPct: number | null;
  reason?: string;
}

export interface OracleContextCheckResult {
  valid: boolean;
  gameMatches: boolean;
  skillMatches: boolean;
  outputSourceVerified: boolean;
  expectedSkillName: string | null;
  actualSkillName: string | null;
  provenance: 'v2_hardened' | 'legacy_unverified';
  errors: string[];
}

export interface OracleSnapshotEvaluation {
  id: string;
  title: string;
  game: GameId;
  pobCommit: string;
  context: OracleContextCheckResult;
  metrics: OracleMetricResult[];
  corePassed: boolean;
  strictPassed: boolean;
  certified: boolean;
}

export interface CorpusValidationOptions {
  minCount?: number;
  expectedIds?: readonly string[];
}

export interface CorpusValidationResult {
  valid: boolean;
  count: number;
  duplicateIds: string[];
  missingIds: string[];
  legacyCount: number;
  errors: string[];
}

export interface OracleMetricSummary {
  metric: string;
  tier: OracleMetricTier;
  pass: number;
  mismatch: number;
  missing: number;
  invalid: number;
  not_applicable: number;
  unsupported: number;
}

export interface OracleSuiteEvaluation {
  corpus: CorpusValidationResult;
  snapshots: OracleSnapshotEvaluation[];
  statusCounts: Record<OracleMetricStatus, number>;
  metricSummaries: OracleMetricSummary[];
  corePassed: boolean;
  strictPassed: boolean;
  certified: boolean;
}

type ParsedNumeric =
  | { kind: 'number'; value: number }
  | { kind: 'missing' }
  | { kind: 'invalid'; raw: unknown };

export function parseOracleNumeric(raw: OracleRawValue): ParsedNumeric {
  if (raw === undefined || raw === null) {
    return { kind: 'missing' };
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { kind: 'invalid', raw };
    }
    return { kind: 'number', value: raw };
  }
  return { kind: 'invalid', raw };
}

export function parseActualNumeric(raw: unknown): ParsedNumeric {
  if (raw === undefined || raw === null) {
    return { kind: 'missing' };
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      return { kind: 'invalid', raw };
    }
    return { kind: 'number', value: raw };
  }
  return { kind: 'invalid', raw };
}

export function compareNumericValues(
  oracle: number,
  actual: number,
  tolerance: OracleToleranceRule,
): { passed: boolean; absDiff: number; relDiffPct: number } {
  const absDiff = actual - oracle;
  const absMag = Math.abs(absDiff);

  if (tolerance.kind === 'exact_int') {
    const expectedInt = Math.round(oracle);
    const actualInt = Math.round(actual);
    const passed = actual === expectedInt && actualInt === expectedInt;
    const denom = Math.max(1, Math.abs(expectedInt));
    const relDiffPct = Math.round((Math.abs(actual - expectedInt) / denom) * 10000) / 100;
    return {
      passed,
      absDiff: Math.round((actual - expectedInt) * 10000) / 10000,
      relDiffPct,
    };
  }

  const floor = tolerance.nearZeroFloor ?? 1;
  const denom = Math.max(floor, Math.abs(oracle));
  const relDiffPct = Math.round((absMag / denom) * 10000) / 100;
  const passed = absMag <= tolerance.maxAbs || (absMag / denom) * 100 <= tolerance.maxRelPct;

  return {
    passed,
    absDiff: Math.round(absDiff * 10000) / 10000,
    relDiffPct,
  };
}

export interface OracleMetricSpec {
  metric: string;
  oracleKey: string;
  tier: OracleMetricTier;
  unit: OracleMetricUnit;
  tolerance: OracleToleranceRule;
  /** Return false when the metric is genuinely not applicable for this build/game. */
  isApplicable?: (ctx: {
    snapshot: OracleSnapshotRecord;
    build: Build;
    out: CalcOutput;
  }) => boolean;
  /** Extract raw oracle value (allows unit normalization like CritMultiplier ratio->pct). */
  getOracle: (oracle: Record<string, OracleRawValue>, snapshot?: OracleSnapshotRecord) => OracleRawValue;
  /** Extract raw WebPoB actual value. */
  getActual: (out: CalcOutput) => unknown;
}

function hasAnyFullDpsSkill(build: Build): boolean {
  return build.skills.some((group) => {
    if (!group.enabled || !group.includeInFullDps) return false;
    if (group.weaponSets && group.weaponSets.length > 0 && !group.weaponSets.includes(build.activeWeaponSet)) {
      return false;
    }
    return true;
  });
}

function normalizeOracleCritMulti(raw: OracleRawValue): OracleRawValue {
  const parsed = parseOracleNumeric(raw);
  if (parsed.kind !== 'number') return raw;
  return parsed.value > 10 ? parsed.value : parsed.value * 100;
}

function getOracleAverageDamage(
  oracle: Record<string, OracleRawValue>,
  snapshot?: OracleSnapshotRecord,
): OracleRawValue {
  const avgDmg = parseOracleNumeric(oracle.AverageDamage);
  if (avgDmg.kind === 'invalid') return oracle.AverageDamage;
  const isV2 = snapshot?.schemaVersion === 2;
  if (avgDmg.kind === 'number' && (isV2 || avgDmg.value !== 0)) return avgDmg.value;
  const avgHit = parseOracleNumeric(oracle.AverageHit);
  if (avgHit.kind === 'invalid') return oracle.AverageHit;
  if (avgHit.kind === 'number') return avgHit.value;
  return oracle.AverageDamage;
}

export const ORACLE_METRIC_SPECS: readonly OracleMetricSpec[] = [
  // Core attributes
  {
    metric: 'Str',
    oracleKey: 'Str',
    tier: 'core',
    unit: 'int',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.Str,
    getActual: (w) => w.defence.str,
  },
  {
    metric: 'Dex',
    oracleKey: 'Dex',
    tier: 'core',
    unit: 'int',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.Dex,
    getActual: (w) => w.defence.dex,
  },
  {
    metric: 'Int',
    oracleKey: 'Int',
    tier: 'core',
    unit: 'int',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.Int,
    getActual: (w) => w.defence.int,
  },

  // Core defence pools & mitigation
  {
    metric: 'Life',
    oracleKey: 'Life',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.1, maxAbs: 1 },
    getOracle: (o) => o.Life,
    getActual: (w) => w.defence.life,
  },
  {
    metric: 'EnergyShield',
    oracleKey: 'EnergyShield',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.EnergyShield,
    getActual: (w) => w.defence.energyShield,
  },
  {
    metric: 'Ward',
    oracleKey: 'Ward',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    isApplicable: ({ snapshot }) => snapshot.game === 'poe1',
    getOracle: (o) => o.Ward,
    getActual: (w) => w.defence.ward,
  },
  {
    metric: 'Mana',
    oracleKey: 'Mana',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.1, maxAbs: 1 },
    getOracle: (o) => o.Mana,
    getActual: (w) => w.defence.mana,
  },
  {
    metric: 'ManaUnreserved',
    oracleKey: 'ManaUnreserved',
    tier: 'extended',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 2 },
    getOracle: (o) => o.ManaUnreserved,
    getActual: (w) => w.defence.manaUnreserved,
  },
  {
    metric: 'SpiritReserved',
    oracleKey: 'SpiritReserved',
    tier: 'core',
    unit: 'int',
    tolerance: { kind: 'exact_int' },
    isApplicable: ({ snapshot }) => snapshot.game === 'poe2',
    getOracle: (o) => o.SpiritReserved,
    getActual: (w) => w.defence.spiritReserved,
  },
  {
    metric: 'Armour',
    oracleKey: 'Armour',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.Armour,
    getActual: (w) => w.defence.armour,
  },
  {
    metric: 'Evasion',
    oracleKey: 'Evasion',
    tier: 'core',
    unit: 'flat',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.Evasion,
    getActual: (w) => w.defence.evasion,
  },
  {
    metric: 'SpellSuppressionChance',
    oracleKey: 'SpellSuppressionChance',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    isApplicable: ({ snapshot }) => snapshot.game === 'poe1',
    getOracle: (o) => o.SpellSuppressionChance,
    getActual: (w) => w.defence.spellSuppressionChance,
  },
  {
    metric: 'SpellBlockChance',
    oracleKey: 'SpellBlockChance',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    isApplicable: ({ snapshot }) => snapshot.game === 'poe1',
    getOracle: (o) => o.SpellBlockChance,
    getActual: (w) => w.defence.spellBlockChance,
  },

  // Resistances
  {
    metric: 'FireResist',
    oracleKey: 'FireResist',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.FireResist,
    getActual: (w) => w.defence.fireResist,
  },
  {
    metric: 'ColdResist',
    oracleKey: 'ColdResist',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.ColdResist,
    getActual: (w) => w.defence.coldResist,
  },
  {
    metric: 'LightningResist',
    oracleKey: 'LightningResist',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.LightningResist,
    getActual: (w) => w.defence.lightningResist,
  },
  {
    metric: 'ChaosResist',
    oracleKey: 'ChaosResist',
    tier: 'extended',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.ChaosResist,
    getActual: (w) => w.defence.chaosResist,
  },
  {
    metric: 'TotalEHP',
    oracleKey: 'TotalEHP',
    tier: 'extended',
    unit: 'ehp',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 5, maxAbs: 10 },
    getOracle: (o) => o.TotalEHP,
    getActual: (w) => w.defence.effectiveHitPool,
  },

  // Offence
  {
    metric: 'Speed',
    oracleKey: 'Speed',
    tier: 'core',
    unit: 'per_sec',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 0.02, nearZeroFloor: 0.01 },
    getOracle: (o) => o.Speed,
    getActual: (w) => w.offence.speed,
  },
  {
    metric: 'CritChance',
    oracleKey: 'CritChance',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 0.05, nearZeroFloor: 1 },
    getOracle: (o) => o.CritChance,
    getActual: (w) => w.offence.critChance,
  },
  {
    metric: 'CritMultiplier',
    oracleKey: 'CritMultiplier',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => normalizeOracleCritMulti(o.CritMultiplier),
    getActual: (w) => w.offence.critMultiplier,
  },
  {
    metric: 'HitChance',
    oracleKey: 'HitChance',
    tier: 'core',
    unit: 'pct',
    tolerance: { kind: 'exact_int' },
    getOracle: (o) => o.HitChance,
    getActual: (w) => w.offence.hitChance,
  },
  {
    metric: 'AverageDamage',
    oracleKey: 'AverageDamage',
    tier: 'core',
    unit: 'damage',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o, snap) => getOracleAverageDamage(o, snap),
    getActual: (w) => {
      if (typeof w.offence.averageHit !== 'number' || typeof w.offence.hitChance !== 'number') {
        return undefined;
      }
      return w.offence.averageHit * (w.offence.hitChance / 100);
    },
  },
  {
    metric: 'HitDPS',
    oracleKey: 'TotalDPS',
    tier: 'core',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.TotalDPS,
    getActual: (w) => w.offence.hitDps,
  },
  {
    metric: 'ImpaleDPS',
    oracleKey: 'ImpaleDPS',
    tier: 'core',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    isApplicable: ({ snapshot }) => snapshot.game === 'poe1',
    getOracle: (o) => o.ImpaleDPS,
    getActual: (w) => w.offence.impaleDps,
  },
  {
    metric: 'IgniteDPS',
    oracleKey: 'IgniteDPS',
    tier: 'extended',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.IgniteDPS,
    getActual: (w) => w.offence.igniteDps,
  },
  {
    metric: 'BleedDPS',
    oracleKey: 'BleedDPS',
    tier: 'extended',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.BleedDPS,
    getActual: (w) => w.offence.bleedDps,
  },
  {
    metric: 'PoisonDPS',
    oracleKey: 'TotalPoisonDPS',
    tier: 'extended',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.TotalPoisonDPS,
    getActual: (w) => w.offence.poisonDps,
  },
  {
    metric: 'CombinedDPS',
    oracleKey: 'CombinedDPS',
    tier: 'extended',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    getOracle: (o) => o.CombinedDPS,
    getActual: (w) => w.offence.totalDps,
  },
  {
    metric: 'FullDPS',
    oracleKey: 'FullDPS',
    tier: 'core',
    unit: 'dps',
    tolerance: { kind: 'relative_or_abs', maxRelPct: 0.5, maxAbs: 1 },
    isApplicable: ({ snapshot, build }) => {
      const parsed = parseOracleNumeric(snapshot.oracle.FullDPS);
      if (parsed.kind === 'invalid') return true;
      if (parsed.kind === 'number' && parsed.value !== 0) return true;
      return hasAnyFullDpsSkill(build);
    },
    getOracle: (o) => o.FullDPS,
    getActual: (w) => w.offence.fullDps,
  },
];

export function validateSnapshotCorpus(
  payload: unknown,
  options: CorpusValidationOptions = {},
): CorpusValidationResult {
  const errors: string[] = [];
  const duplicateIds: string[] = [];
  const missingIds: string[] = [];
  let legacyCount = 0;

  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as OracleSnapshotFile).snapshots)) {
    return {
      valid: false,
      count: 0,
      duplicateIds: [],
      missingIds: options.expectedIds ? [...options.expectedIds] : [],
      legacyCount: 0,
      errors: ['Snapshot payload must be an object containing a "snapshots" array.'],
    };
  }

  const rootSchemaVersion = (payload as OracleSnapshotFile).schemaVersion;
  if (rootSchemaVersion !== undefined && rootSchemaVersion !== 1 && rootSchemaVersion !== 2) {
    errors.push(`Unsupported root schemaVersion "${String(rootSchemaVersion)}" (expected 1 or 2).`);
  }

  const snapshots = (payload as OracleSnapshotFile).snapshots;
  const seen = new Set<string>();

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i] as Partial<OracleSnapshotRecord> | null | undefined;
    const prefix = `snapshots[${i}]`;
    if (!snap || typeof snap !== 'object') {
      errors.push(`${prefix}: must be an object.`);
      continue;
    }
    if (typeof snap.id !== 'string' || snap.id.trim().length === 0) {
      errors.push(`${prefix}: missing or empty string "id".`);
    } else {
      if (seen.has(snap.id)) {
        duplicateIds.push(snap.id);
        errors.push(`${prefix}: duplicate snapshot id "${snap.id}".`);
      }
      seen.add(snap.id);
    }
    if (typeof snap.title !== 'string' || snap.title.trim().length === 0) {
      errors.push(`${prefix} (${snap.id ?? 'unknown'}): missing or empty string "title".`);
    }
    if (snap.game !== 'poe1' && snap.game !== 'poe2') {
      errors.push(`${prefix} (${snap.id ?? 'unknown'}): invalid "game" value "${String(snap.game)}".`);
    }
    if (typeof snap.xml !== 'string' || snap.xml.trim().length === 0) {
      errors.push(`${prefix} (${snap.id ?? 'unknown'}): missing or empty "xml".`);
    }
    if (typeof snap.pobCommit !== 'string' || snap.pobCommit.trim().length === 0) {
      errors.push(`${prefix} (${snap.id ?? 'unknown'}): missing or empty "pobCommit".`);
    }
    if (!snap.oracle || typeof snap.oracle !== 'object' || Array.isArray(snap.oracle)) {
      errors.push(`${prefix} (${snap.id ?? 'unknown'}): missing or invalid "oracle" object.`);
    }
    if (snap.schemaVersion === undefined || snap.schemaVersion === 1) {
      legacyCount++;
    } else if (snap.schemaVersion !== 2) {
      errors.push(
        `${prefix} (${snap.id ?? 'unknown'}): unsupported "schemaVersion" value "${String(snap.schemaVersion)}" (expected 1 or 2).`,
      );
    }
  }

  const effectiveMinCount = options.minCount ?? 1;
  if (snapshots.length < effectiveMinCount) {
    errors.push(`Expected at least ${effectiveMinCount} snapshots, found ${snapshots.length}.`);
  }

  if (options.expectedIds) {
    for (const expectedId of options.expectedIds) {
      if (!seen.has(expectedId)) {
        missingIds.push(expectedId);
        errors.push(`Missing expected snapshot id "${expectedId}".`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    count: snapshots.length,
    duplicateIds,
    missingIds,
    legacyCount,
    errors,
  };
}

function normalizeSkillLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateSkillContext(
  snapshot: OracleSnapshotRecord,
  build: Build,
  out: CalcOutput,
): OracleContextCheckResult {
  const errors: string[] = [];
  const gameMatches = build.game === snapshot.game && out.game === snapshot.game;
  if (!gameMatches) {
    errors.push(`Game mismatch: snapshot=${snapshot.game}, build=${build.game}, calc=${out.game}.`);
  }

  const actualSkillName = out.offence.mainSkillName?.en?.trim() || null;
  const expectedSkillName = snapshot.context?.activeSkillName?.trim() || null;
  const isV2 = snapshot.schemaVersion === 2;
  let skillMatches = true;

  if (isV2) {
    if (!snapshot.context || typeof snapshot.context !== 'object') {
      skillMatches = false;
      errors.push('schemaVersion 2 snapshot is missing required "context" metadata.');
    } else {
      if (!expectedSkillName) {
        skillMatches = false;
        errors.push('schemaVersion 2 snapshot is missing required "context.activeSkillName".');
      }
      if (snapshot.context.outputSource !== 'player' && snapshot.context.outputSource !== 'minion') {
        errors.push(
          `schemaVersion 2 snapshot has missing or invalid "context.outputSource" (${String(snapshot.context.outputSource)}).`,
        );
      }
      const expectedMainSocketGroup = snapshot.context.mainSocketGroup;
      if (
        typeof expectedMainSocketGroup !== 'number' ||
        !Number.isInteger(expectedMainSocketGroup) ||
        expectedMainSocketGroup < 1
      ) {
        errors.push(
          `schemaVersion 2 snapshot has missing or invalid "context.mainSocketGroup" (${String(expectedMainSocketGroup)}).`,
        );
      } else {
        const selectedIdx = build.skills.findIndex((g) => g.id === build.mainSkillGroupId);
        const actualMainSocketGroup = selectedIdx >= 0 ? selectedIdx + 1 : null;
        if (actualMainSocketGroup !== expectedMainSocketGroup) {
          errors.push(
            `Main socket group mismatch: expected #${expectedMainSocketGroup}, got ${actualMainSocketGroup === null ? '<none>' : `#${actualMainSocketGroup}`}.`,
          );
        }
      }
    }
  }

  if (expectedSkillName) {
    if (!actualSkillName || normalizeSkillLabel(actualSkillName) !== normalizeSkillLabel(expectedSkillName)) {
      skillMatches = false;
      errors.push(
        `Active skill mismatch: expected "${expectedSkillName}", got "${actualSkillName ?? '<none>'}".`,
      );
    }
  } else if (!actualSkillName) {
    skillMatches = false;
    errors.push('WebPoB produced an empty mainSkillName.');
  }

  const provenance: 'v2_hardened' | 'legacy_unverified' = isV2 ? 'v2_hardened' : 'legacy_unverified';
  // CalcOutput does not expose a separate minion offense source, so only player-source v2 records can be verified for certification.
  const outputSourceVerified = isV2 && snapshot.context?.outputSource === 'player';

  return {
    valid: errors.length === 0,
    gameMatches,
    skillMatches,
    outputSourceVerified,
    expectedSkillName,
    actualSkillName,
    provenance,
    errors,
  };
}

export function evaluateMetric(
  spec: OracleMetricSpec,
  snapshot: OracleSnapshotRecord,
  build: Build,
  out: CalcOutput,
): OracleMetricResult {
  const applicable = spec.isApplicable ? spec.isApplicable({ snapshot, build, out }) : true;
  if (!applicable) {
    return {
      metric: spec.metric,
      oracleKey: spec.oracleKey,
      tier: spec.tier,
      unit: spec.unit,
      status: 'not_applicable',
      oracle: null,
      actual: null,
      absDiff: null,
      relDiffPct: null,
      reason: 'Not applicable to this build/game context',
    };
  }

  const rawOracle = spec.getOracle(snapshot.oracle, snapshot);
  const rawActual = spec.getActual(out);
  const parsedOracle = parseOracleNumeric(rawOracle);
  const parsedActual = parseActualNumeric(rawActual);

  if (parsedOracle.kind === 'invalid' || parsedActual.kind === 'invalid') {
    const reasons: string[] = [];
    if (parsedOracle.kind === 'invalid') reasons.push(`oracle ${spec.oracleKey}=${String(rawOracle)}`);
    if (parsedActual.kind === 'invalid') reasons.push(`actual ${spec.metric}=${String(rawActual)}`);
    return {
      metric: spec.metric,
      oracleKey: spec.oracleKey,
      tier: spec.tier,
      unit: spec.unit,
      status: 'invalid',
      oracle: parsedOracle.kind === 'number' ? parsedOracle.value : null,
      actual: parsedActual.kind === 'number' ? parsedActual.value : null,
      rawOracle,
      rawActual,
      absDiff: null,
      relDiffPct: null,
      reason: `Non-finite or invalid value (${reasons.join(', ')})`,
    };
  }

  if (parsedOracle.kind === 'missing' || parsedActual.kind === 'missing') {
    const reasons: string[] = [];
    if (parsedOracle.kind === 'missing') reasons.push(`oracle ${spec.oracleKey} is missing`);
    if (parsedActual.kind === 'missing') reasons.push(`actual ${spec.metric} is missing`);
    return {
      metric: spec.metric,
      oracleKey: spec.oracleKey,
      tier: spec.tier,
      unit: spec.unit,
      status: 'missing',
      oracle: parsedOracle.kind === 'number' ? parsedOracle.value : null,
      actual: parsedActual.kind === 'number' ? parsedActual.value : null,
      rawOracle,
      rawActual,
      absDiff: null,
      relDiffPct: null,
      reason: reasons.join('; '),
    };
  }

  const cmp = compareNumericValues(parsedOracle.value, parsedActual.value, spec.tolerance);
  return {
    metric: spec.metric,
    oracleKey: spec.oracleKey,
    tier: spec.tier,
    unit: spec.unit,
    status: cmp.passed ? 'pass' : 'mismatch',
    oracle: Math.round(parsedOracle.value * 10000) / 10000,
    actual: Math.round(parsedActual.value * 10000) / 10000,
    absDiff: cmp.absDiff,
    relDiffPct: cmp.relDiffPct,
    reason: cmp.passed ? undefined : `Out of tolerance (diff=${cmp.absDiff}, rel=${cmp.relDiffPct}%)`,
  };
}

export function evaluateSnapshot(
  snapshot: OracleSnapshotRecord,
  build: Build,
  out: CalcOutput,
  specs: readonly OracleMetricSpec[] = ORACLE_METRIC_SPECS,
): OracleSnapshotEvaluation {
  const context = validateSkillContext(snapshot, build, out);
  const metrics = specs.map((spec) => evaluateMetric(spec, snapshot, build, out));

  const isFailing = (m: OracleMetricResult) =>
    m.status === 'mismatch' || m.status === 'missing' || m.status === 'invalid' || m.status === 'unsupported';

  const coreMetrics = metrics.filter((m) => m.tier === 'core');
  const corePassed = context.valid && coreMetrics.length > 0 && coreMetrics.every((m) => !isFailing(m));
  const strictPassed = context.valid && metrics.length > 0 && metrics.every((m) => !isFailing(m));
  const usesCanonicalSpecs = specs === ORACLE_METRIC_SPECS;
  const certified =
    strictPassed && usesCanonicalSpecs && context.provenance === 'v2_hardened' && context.outputSourceVerified;

  return {
    id: snapshot.id,
    title: snapshot.title,
    game: snapshot.game,
    pobCommit: snapshot.pobCommit,
    context,
    metrics,
    corePassed,
    strictPassed,
    certified,
  };
}

export function evaluateOracleSuite(
  payload: unknown,
  evaluateBuildFn: (xml: string) => { build: Build; out: CalcOutput },
  options: CorpusValidationOptions = {},
  specs: readonly OracleMetricSpec[] = ORACLE_METRIC_SPECS,
): OracleSuiteEvaluation {
  const corpus = validateSnapshotCorpus(payload, options);
  const statusCounts: Record<OracleMetricStatus, number> = {
    pass: 0,
    mismatch: 0,
    missing: 0,
    invalid: 0,
    not_applicable: 0,
    unsupported: 0,
  };

  const summaryMap = new Map<string, OracleMetricSummary>();
  for (const spec of specs) {
    summaryMap.set(spec.metric, {
      metric: spec.metric,
      tier: spec.tier,
      pass: 0,
      mismatch: 0,
      missing: 0,
      invalid: 0,
      not_applicable: 0,
      unsupported: 0,
    });
  }

  const snapshots: OracleSnapshotEvaluation[] = [];
  const rawSnapshots =
    payload && typeof payload === 'object' && Array.isArray((payload as OracleSnapshotFile).snapshots)
      ? (payload as OracleSnapshotFile).snapshots
      : [];

  for (const snap of rawSnapshots) {
    if (!snap || typeof snap !== 'object' || typeof snap.xml !== 'string' || !snap.oracle) {
      continue;
    }
    const { build, out } = evaluateBuildFn(snap.xml);
    const evaluation = evaluateSnapshot(snap, build, out, specs);
    snapshots.push(evaluation);

    for (const m of evaluation.metrics) {
      statusCounts[m.status]++;
      const entry = summaryMap.get(m.metric);
      if (entry) {
        entry[m.status]++;
      }
    }
  }

  const hasSnapshots = snapshots.length > 0;
  const corePassed = corpus.valid && hasSnapshots && snapshots.every((s) => s.corePassed);
  const strictPassed = corpus.valid && hasSnapshots && snapshots.every((s) => s.strictPassed);
  const certified =
    corpus.valid && hasSnapshots && corpus.legacyCount === 0 && snapshots.every((s) => s.certified);

  return {
    corpus,
    snapshots,
    statusCounts,
    metricSummaries: Array.from(summaryMap.values()),
    corePassed,
    strictPassed,
    certified,
  };
}
