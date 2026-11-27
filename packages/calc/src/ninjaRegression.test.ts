import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { DAMAGE_TYPES, type Build, type CalcOutput, type GameId, type PassiveNode } from '@webpob/core';
import {
  getClassesForGame,
  getGemById,
  getTreeForGame,
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
import { encodeBuildToPobCode, importBuildFromCode } from '@webpob/codec';
import { localizeStatLine, localizeText, UI_MESSAGES } from '@webpob/i18n';
import { analyzeBuildDiagnostics, calculateBuild } from './index.js';

interface NinjaBuildExpected {
  minAllocatedNodes: number;
  minItems: number;
  minSkills: number;
  expectPositiveDps: boolean;
  expectPositiveEhp: boolean;
}

interface NinjaBuildEntry {
  id: string;
  title: string;
  sourceUrl: string;
  className: string;
  ascendancyName: string;
  level: number;
  mainSkill: string;
  pobCode: string;
  expected: NinjaBuildExpected;
}

interface NinjaFixtureFile {
  game: GameId;
  collectedAt: string;
  league: string;
  builds: NinjaBuildEntry[];
}

interface LoadedFixture {
  filePath: string;
  expectedGame: GameId;
  exists: boolean;
  parseError?: string;
  data?: NinjaFixtureFile;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../../..');
const ninjaDir = path.join(rootDir, 'fixtures/ninja');

const HAS_CJK_RE = /[\u4e00-\u9fff]/;
const POE2_MARKUP_LEAK_RE = /\[[^\]|]+\|[^\]]+\]/;
const LITERAL_NEWLINE_RE = /\\n/;
const OBJECT_OBJECT_RE = /\[object Object\]/;
const RAW_I18N_KEY_RE =
  /\b(?:topbar|tree|stats|nav|sidebar|skills|items|calcs|config|import|notes)\.[a-zA-Z0-9_]+\b/;
const BAD_TOKEN_RE = /\b(?:NaN|undefined)\b/;

function loadNinjaFixture(filename: string, expectedGame: GameId): LoadedFixture {
  const filePath = path.join(ninjaDir, filename);
  if (!fs.existsSync(filePath)) {
    return { filePath, expectedGame, exists: false };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as NinjaFixtureFile;
    return { filePath, expectedGame, exists: true, data: parsed };
  } catch (err) {
    return {
      filePath,
      expectedGame,
      exists: true,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}

function assertNinjaFixtureSchema(fixture: LoadedFixture): void {
  expect(
    fixture.exists,
    `Missing ninja fixture file: ${fixture.filePath}. Generate fixtures/ninja/${fixture.expectedGame}-builds.json before running this suite.`,
  ).toBe(true);
  expect(
    fixture.parseError,
    `Invalid JSON in ${fixture.filePath}: ${fixture.parseError ?? ''}`,
  ).toBeUndefined();

  const data = fixture.data;
  expect(data, `${fixture.filePath}: fixture data must be an object`).toBeDefined();
  if (!data) return;

  expect(data.game, `Unexpected game field in ${fixture.filePath}`).toBe(fixture.expectedGame);
  expect(typeof data.collectedAt, `${fixture.filePath}: collectedAt must be a string`).toBe('string');
  expect(data.collectedAt.trim().length, `${fixture.filePath}: collectedAt must not be empty`).toBeGreaterThan(0);
  expect(typeof data.league, `${fixture.filePath}: league must be a string`).toBe('string');
  expect(Array.isArray(data.builds), `${fixture.filePath}: builds must be an array`).toBe(true);
  expect(
    data.builds.length,
    `Fixture ${fixture.filePath} must contain at least 1 build`,
  ).toBeGreaterThan(0);

  const seenIds = new Set<string>();
  data.builds.forEach((entry, index) => {
    const context = `${fixture.filePath}.builds[${index}]`;
    for (const field of ['id', 'title', 'sourceUrl', 'className', 'ascendancyName', 'mainSkill', 'pobCode'] as const) {
      expect(typeof entry[field], `${context}.${field} must be a string`).toBe('string');
    }
    expect(entry.id.trim().length, `${context}.id must not be empty`).toBeGreaterThan(0);
    expect(entry.title.trim().length, `${context}.title must not be empty`).toBeGreaterThan(0);
    expect(entry.className.trim().length, `${context}.className must not be empty`).toBeGreaterThan(0);
    expect(entry.mainSkill.trim().length, `${context}.mainSkill must not be empty`).toBeGreaterThan(0);
    expect(entry.pobCode.trim().length, `${context}.pobCode must not be empty`).toBeGreaterThan(0);
    expect(seenIds.has(entry.id), `${context}: duplicate build id "${entry.id}"`).toBe(false);
    seenIds.add(entry.id);

    expect(Number.isInteger(entry.level), `${context}.level must be an integer`).toBe(true);
    expect(entry.level, `${context}.level must be >= 1`).toBeGreaterThanOrEqual(1);
    expect(entry.level, `${context}.level must be <= 100`).toBeLessThanOrEqual(100);

    expect(entry.expected, `${context}.expected must be an object`).toBeDefined();
    const expected = entry.expected;
    if (!expected) return;
    for (const field of ['minAllocatedNodes', 'minItems', 'minSkills'] as const) {
      expect(typeof expected[field], `${context}.expected.${field} must be a number`).toBe('number');
      expect(Number.isInteger(expected[field]), `${context}.expected.${field} must be an integer`).toBe(true);
      expect(expected[field], `${context}.expected.${field} must be >= 0`).toBeGreaterThanOrEqual(0);
    }
    expect(typeof expected.expectPositiveDps, `${context}.expected.expectPositiveDps must be boolean`).toBe('boolean');
    expect(typeof expected.expectPositiveEhp, `${context}.expected.expectPositiveEhp must be boolean`).toBe('boolean');
  });
}

function assertCleanLocalizedLabel(
  text: string,
  context: string,
  opts: { requireCjk?: boolean; checkBadTokens?: boolean } = {},
): void {
  expect(typeof text, `${context}: expected string`).toBe('string');
  expect(text.trim().length, `${context}: must be non-empty`).toBeGreaterThan(0);
  expect(OBJECT_OBJECT_RE.test(text), `${context}: leaked "[object Object]" in "${text}"`).toBe(false);
  expect(RAW_I18N_KEY_RE.test(text), `${context}: leaked raw i18n key in "${text}"`).toBe(false);
  expect(POE2_MARKUP_LEAK_RE.test(text), `${context}: leaked PoE 2 markup in "${text}"`).toBe(false);
  expect(LITERAL_NEWLINE_RE.test(text), `${context}: leaked literal \\n in "${text}"`).toBe(false);
  if (opts.checkBadTokens !== false) {
    expect(BAD_TOKEN_RE.test(text), `${context}: leaked NaN/undefined in "${text}"`).toBe(false);
  }
  if (opts.requireCjk) {
    expect(HAS_CJK_RE.test(text), `${context}: expected Chinese text, got "${text}"`).toBe(true);
  }
}

function assertFiniteNumber(value: number, label: string): void {
  expect(typeof value, `${label} must be a number`).toBe('number');
  expect(Number.isNaN(value), `${label} must not be NaN`).toBe(false);
  expect(Number.isFinite(value), `${label} must be finite (got ${value})`).toBe(true);
}

function getAllAllocatedNodeIds(build: Build): number[] {
  return [
    ...new Set<number>([
      ...build.tree.allocatedNodeIds,
      ...build.tree.weaponSet1NodeIds,
      ...build.tree.weaponSet2NodeIds,
    ]),
  ];
}

function getLocalizedNodeStatsZh(node: PassiveNode): string[] {
  if (node.statsZh && node.statsZh.length > 0) {
    return node.statsZh;
  }
  return node.stats.map((line) => localizeStatLine(line, 'zh-CN'));
}

const poe1Fixture = loadNinjaFixture('poe1-builds.json', 'poe1');
const poe2Fixture = loadNinjaFixture('poe2-builds.json', 'poe2');
const allFixtures: LoadedFixture[] = [poe1Fixture, poe2Fixture];

describe('poe.ninja Imported Build Regression Suite (PoE 1 & PoE 2 Functional + i18n Quality)', () => {
  beforeAll(() => {
    const dataDir = path.join(rootDir, 'apps/web/public/data');
    const poe1Tree = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe1-tree-3_30.json'), 'utf-8'),
    ) as CompactTreePayload;
    const poe2Tree = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe2-tree-0_5.json'), 'utf-8'),
    ) as CompactTreePayload;
    const poe1Gems = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe1-gems.json'), 'utf-8'),
    ) as CompactGemsPayload;
    const poe2Gems = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe2-gems.json'), 'utf-8'),
    ) as CompactGemsPayload;
    const poe1Bases = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe1-bases.json'), 'utf-8'),
    ) as CompactBaseItemsPayload;
    const poe2Bases = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe2-bases.json'), 'utf-8'),
    ) as CompactBaseItemsPayload;
    const poe1Clusters = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'poe1-clusters.json'), 'utf-8'),
    ) as CompactClusterNotablesPayload;

    registerTreeData(hydrateCompactTree(poe1Tree));
    registerTreeData(hydrateCompactTree(poe2Tree));
    registerGemsData('poe1', poe1Gems);
    registerGemsData('poe2', poe2Gems);
    registerBaseItems(poe1Bases);
    registerBaseItems(poe2Bases);
    registerClusterNotables(poe1Clusters);
  });

  describe('Fixture Availability & UI Dictionary Sanity', () => {
    for (const fixture of allFixtures) {
      it(`has non-empty ${fixture.expectedGame} ninja fixture at ${path.relative(rootDir, fixture.filePath)}`, () => {
        assertNinjaFixtureSchema(fixture);
      });
    }

    it('has clean trilingual UI_MESSAGES without raw key or placeholder leaks', () => {
      const enEntries = Object.entries(UI_MESSAGES.en);
      const zhEntries = Object.entries(UI_MESSAGES['zh-CN']);
      const zhTwEntries = Object.entries(UI_MESSAGES['zh-TW']);
      expect(zhEntries.length).toBe(enEntries.length);
      expect(zhTwEntries.length).toBe(enEntries.length);

      for (const [key, value] of enEntries) {
        assertCleanLocalizedLabel(value, `UI_MESSAGES.en["${key}"]`);
      }
      for (const [key, value] of zhEntries) {
        assertCleanLocalizedLabel(value, `UI_MESSAGES["zh-CN"]["${key}"]`);
      }
      for (const [key, value] of zhTwEntries) {
        assertCleanLocalizedLabel(value, `UI_MESSAGES["zh-TW"]["${key}"]`);
      }
    });
  });

  for (const fixture of allFixtures) {
    const builds = fixture.data?.builds ?? [];
    if (builds.length === 0) continue;

    describe(`${fixture.expectedGame.toUpperCase()} poe.ninja builds (${fixture.data?.league ?? 'unknown'} · ${builds.length} builds)`, () => {
      for (const entry of builds) {
        describe(`[${entry.id}] ${entry.title}`, () => {
          let cachedBuild: Build | undefined;
          let cachedCalc: CalcOutput | undefined;

          const getEvaluated = (): { build: Build; calc: CalcOutput } => {
            if (!cachedBuild) {
              const imported = importBuildFromCode(entry.pobCode);
              cachedBuild = imported.build;
            }
            if (!cachedCalc) {
              cachedCalc = calculateBuild(cachedBuild);
            }
            return { build: cachedBuild, calc: cachedCalc };
          };

          it('passes import & codec round-trip functional integrity', () => {
            expect(entry.pobCode.trim().length, `${entry.id}: pobCode must not be empty`).toBeGreaterThan(0);

            const { build } = importBuildFromCode(entry.pobCode);
            cachedBuild = build;

            expect(build.game, `${entry.id}: detected wrong game`).toBe(fixture.expectedGame);

            const classes = getClassesForGame(build.game);
            const validClassIds = new Set(classes.map((c) => c.id));
            expect(
              validClassIds.has(build.classId),
              `${entry.id}: invalid classId "${build.classId}" for ${build.game}`,
            ).toBe(true);

            expect(Number.isInteger(build.level), `${entry.id}: level should be integer`).toBe(true);
            expect(build.level, `${entry.id}: level must be >= 1`).toBeGreaterThanOrEqual(1);
            expect(build.level, `${entry.id}: level must be <= 100`).toBeLessThanOrEqual(100);

            // Fixture metadata must match what the PoB code actually imports
            const importedClass = classes.find((c) => c.id === build.classId);
            expect(importedClass, `${entry.id}: imported class "${build.classId}" not found`).toBeDefined();
            const classMatches =
              entry.className === build.classId ||
              entry.className === importedClass?.name.en ||
              entry.className === importedClass?.name.zh;
            expect(
              classMatches,
              `${entry.id}: fixture className "${entry.className}" does not match imported class "${build.classId}"`,
            ).toBe(true);

            const expectedAscendancy = entry.ascendancyName?.trim() || '';
            if (expectedAscendancy && expectedAscendancy.toLowerCase() !== 'none') {
              const importedAsc = importedClass?.ascendancies.find(
                (a) => a.id.toLowerCase() === build.ascendancyId.toLowerCase(),
              );
              expect(
                importedAsc,
                `${entry.id}: imported ascendancy "${build.ascendancyId}" not found under "${build.classId}"`,
              ).toBeDefined();
              const ascMatches =
                expectedAscendancy === build.ascendancyId ||
                expectedAscendancy === importedAsc?.name.en ||
                expectedAscendancy === importedAsc?.name.zh;
              expect(
                ascMatches,
                `${entry.id}: fixture ascendancyName "${expectedAscendancy}" does not match imported "${build.ascendancyId}"`,
              ).toBe(true);
            }

            expect(
              build.level,
              `${entry.id}: fixture level ${entry.level} does not match imported level ${build.level}`,
            ).toBe(entry.level);
            expect(
              build.mainSkillGroupId.trim().length,
              `${entry.id}: imported mainSkillGroupId must not be empty`,
            ).toBeGreaterThan(0);
            expect(
              build.skills.some((group) => group.id === build.mainSkillGroupId),
              `${entry.id}: mainSkillGroupId "${build.mainSkillGroupId}" does not resolve to a skill group`,
            ).toBe(true);

            expect(
              build.tree.allocatedNodeIds.length,
              `${entry.id}: allocatedNodeIds (${build.tree.allocatedNodeIds.length}) < minAllocatedNodes (${entry.expected.minAllocatedNodes})`,
            ).toBeGreaterThanOrEqual(entry.expected.minAllocatedNodes);

            const itemCount = Object.keys(build.items).length;
            expect(
              itemCount,
              `${entry.id}: item count (${itemCount}) < minItems (${entry.expected.minItems})`,
            ).toBeGreaterThanOrEqual(entry.expected.minItems);

            expect(
              build.skills.length,
              `${entry.id}: skill groups (${build.skills.length}) < minSkills (${entry.expected.minSkills})`,
            ).toBeGreaterThanOrEqual(entry.expected.minSkills);
            const totalGems = build.skills.reduce((sum, group) => sum + group.gems.length, 0);
            expect(
              totalGems,
              `${entry.id}: expected at least 1 gem instance across skill groups, found ${totalGems}`,
            ).toBeGreaterThanOrEqual(1);

            // Every allocated node ID (shared + weapon sets) must exist in the hydrated official tree
            const tree = getTreeForGame(build.game);
            expect(tree.isOfficialFull, `${entry.id}: official ${build.game} tree must be hydrated`).toBe(true);
            const missingNodeIds = getAllAllocatedNodeIds(build).filter((nodeId) => !tree.nodes[nodeId]);
            expect(
              missingNodeIds,
              `${entry.id}: allocated node IDs missing from official ${build.game} tree`,
            ).toEqual([]);

            // Round-trip encode -> import preserves core build metadata & tree allocations
            const reencoded = encodeBuildToPobCode(build);
            expect(reencoded.length).toBeGreaterThan(20);
            const { build: roundTripped } = importBuildFromCode(reencoded);

            expect(roundTripped.game).toBe(build.game);
            expect(roundTripped.classId).toBe(build.classId);
            expect(roundTripped.ascendancyId).toBe(build.ascendancyId);
            expect(roundTripped.level).toBe(build.level);
            expect(roundTripped.tree.allocatedNodeIds.length).toBe(
              new Set(build.tree.allocatedNodeIds).size,
            );
            expect(roundTripped.tree.weaponSet1NodeIds.length).toBe(
              new Set(build.tree.weaponSet1NodeIds).size,
            );
            expect(roundTripped.tree.weaponSet2NodeIds.length).toBe(
              new Set(build.tree.weaponSet2NodeIds).size,
            );

            // Round-trip must preserve exact node identities, not just counts
            const sortIds = (ids: number[]) => [...ids].sort((a, b) => a - b);
            expect(
              [...new Set(roundTripped.tree.allocatedNodeIds)].sort((a, b) => a - b),
              `${entry.id}: round-trip changed allocated node IDs`,
            ).toEqual(sortIds([...new Set(build.tree.allocatedNodeIds)]));
            expect(
              [...new Set(roundTripped.tree.weaponSet1NodeIds)],
              `${entry.id}: round-trip changed weapon set 1 node IDs`,
            ).toEqual([...new Set(build.tree.weaponSet1NodeIds)]);
            expect(
              [...new Set(roundTripped.tree.weaponSet2NodeIds)],
              `${entry.id}: round-trip changed weapon set 2 node IDs`,
            ).toEqual([...new Set(build.tree.weaponSet2NodeIds)]);
            expect(
              Object.keys(roundTripped.items).length,
              `${entry.id}: round-trip lost equipped items`,
            ).toBe(itemCount);
            expect(
              roundTripped.skills.length,
              `${entry.id}: round-trip lost skill groups`,
            ).toBe(build.skills.length);
            expect(
              Object.keys(roundTripped.equipped).sort(),
              `${entry.id}: round-trip changed equipped item slots`,
            ).toEqual(Object.keys(build.equipped).sort());

            // PoE 2 must preserve weapon-set allocation + Spirit reservation handling
            if (build.game === 'poe2') {
              const weaponSetIds = new Set([
                ...build.tree.weaponSet1NodeIds,
                ...build.tree.weaponSet2NodeIds,
              ]);
              const sharedIds = new Set(build.tree.allocatedNodeIds);
              for (const nodeId of weaponSetIds) {
                expect(
                  sharedIds.has(nodeId),
                  `${entry.id}: weapon-set node ${nodeId} must not be duplicated in shared allocatedNodeIds`,
                ).toBe(false);
              }
              for (const nodeId of weaponSetIds) {
                expect(
                  tree.nodes[nodeId],
                  `${entry.id}: weapon-set node ${nodeId} missing from official PoE 2 tree`,
                ).toBeDefined();
              }
            }
          });

          it('passes calculation & diagnostics functional integrity', () => {
            const { build, calc } = getEvaluated();

            expect(calc.game).toBe(build.game);

            // Offence numeric sanity (no NaN / Infinity)
            const offenceFields = [
              'totalDps',
              'hitDps',
              'averageHit',
              'speed',
              'critChance',
              'critMultiplier',
              'hitChance',
              'effectiveCritMultiplier',
              'igniteDps',
              'bleedDps',
              'poisonDps',
              'manaCost',
              'manaPerSecond',
            ] as const;
            for (const key of offenceFields) {
              assertFiniteNumber(calc.offence[key], `${entry.id}.offence.${key}`);
            }
            if (calc.offence.fullDps !== undefined) {
              assertFiniteNumber(calc.offence.fullDps, `${entry.id}.offence.fullDps`);
            }
            if (calc.offence.impaleDps !== undefined) {
              assertFiniteNumber(calc.offence.impaleDps, `${entry.id}.offence.impaleDps`);
            }
            if (calc.offence.triggerRate !== undefined) {
              assertFiniteNumber(calc.offence.triggerRate, `${entry.id}.offence.triggerRate`);
            }

            // Defence numeric sanity (no NaN / Infinity)
            const defenceFields = [
              'life',
              'lifeUnreserved',
              'lifeRegen',
              'energyShield',
              'esRegen',
              'mana',
              'manaUnreserved',
              'manaRegen',
              'spirit',
              'spiritReserved',
              'spiritUnreserved',
              'armour',
              'physDamageReduction',
              'evasion',
              'evadeChance',
              'blockChance',
              'spellBlockChance',
              'spellSuppressionChance',
              'effectiveHitPool',
              'maxPhysHitTaken',
              'maxEleHitTaken',
              'fireResist',
              'coldResist',
              'lightningResist',
              'chaosResist',
              'str',
              'dex',
              'int',
              'movementSpeedPct',
            ] as const;
            for (const key of defenceFields) {
              assertFiniteNumber(calc.defence[key], `${entry.id}.defence.${key}`);
            }
            if (calc.defence.ward !== undefined) {
              assertFiniteNumber(calc.defence.ward, `${entry.id}.defence.ward`);
            }

            // Damage type breakdown must be finite for every damage type
            for (const damageType of DAMAGE_TYPES) {
              const range = calc.offence.damageByType[damageType];
              expect(range, `${entry.id}.offence.damageByType.${damageType} missing`).toBeDefined();
              if (!range) continue;
              assertFiniteNumber(range.min, `${entry.id}.damageByType.${damageType}.min`);
              assertFiniteNumber(range.max, `${entry.id}.damageByType.${damageType}.max`);
              assertFiniteNumber(range.average, `${entry.id}.damageByType.${damageType}.average`);
              expect(range.min, `${entry.id}.damageByType.${damageType}.min must be >= 0`).toBeGreaterThanOrEqual(0);
              expect(range.max, `${entry.id}.damageByType.${damageType}.max must be >= 0`).toBeGreaterThanOrEqual(0);
              expect(range.average, `${entry.id}.damageByType.${damageType}.average must be >= 0`).toBeGreaterThanOrEqual(0);
            }

            // PoE 2 Spirit reservation invariants
            if (build.game === 'poe2') {
              expect(calc.defence.spirit, `${entry.id}: PoE 2 spirit total must be finite`).toBeGreaterThanOrEqual(0);
              expect(calc.defence.spiritReserved, `${entry.id}: spiritReserved must be >= 0`).toBeGreaterThanOrEqual(0);
              expect(
                calc.defence.spiritUnreserved,
                `${entry.id}: spiritUnreserved must equal spirit - spiritReserved`,
              ).toBe(calc.defence.spirit - calc.defence.spiritReserved);
            }

            // Positive EHP & non-negative / positive DPS expectations
            if (entry.expected.expectPositiveEhp) {
              expect(
                calc.defence.effectiveHitPool,
                `${entry.id}: expected positive EHP`,
              ).toBeGreaterThan(0);
            }
            expect(
              calc.defence.effectiveHitPool,
              `${entry.id}: effectiveHitPool must be > 0`,
            ).toBeGreaterThan(0);

            expect(
              calc.offence.totalDps,
              `${entry.id}: totalDps must be non-negative`,
            ).toBeGreaterThanOrEqual(0);
            if (entry.expected.expectPositiveDps) {
              const effectiveDps = Math.max(calc.offence.totalDps, calc.offence.fullDps ?? 0);
              expect(
                effectiveDps,
                `${entry.id}: expected positive DPS (totalDps=${calc.offence.totalDps}, fullDps=${calc.offence.fullDps ?? 'n/a'})`,
              ).toBeGreaterThan(0);
            }

            // Diagnostics execution & bilingual shape
            const diagnostics = analyzeBuildDiagnostics(build, calc);
            expect(Array.isArray(diagnostics)).toBe(true);
            for (const diag of diagnostics) {
              expect(diag.id.trim().length).toBeGreaterThan(0);
              expect(['critical', 'warning', 'tip']).toContain(diag.severity);
              assertCleanLocalizedLabel(
                localizeText(diag.title, 'en'),
                `${entry.id}.diagnostics[${diag.id}].title.en`,
              );
              assertCleanLocalizedLabel(
                localizeText(diag.title, 'zh-CN'),
                `${entry.id}.diagnostics[${diag.id}].title.zh`,
                { requireCjk: true },
              );
              assertCleanLocalizedLabel(
                localizeText(diag.detail, 'en'),
                `${entry.id}.diagnostics[${diag.id}].detail.en`,
              );
              assertCleanLocalizedLabel(
                localizeText(diag.detail, 'zh-CN'),
                `${entry.id}.diagnostics[${diag.id}].detail.zh`,
                { requireCjk: true },
              );
            }
          });

          it('passes zh-CN & en text and localization quality', () => {
            const { build, calc } = getEvaluated();

            // 1. Class & Ascendancy bilingual localization
            const classes = getClassesForGame(build.game);
            const classDef = classes.find((c) => c.id === build.classId);
            expect(classDef, `${entry.id}: classDef not found for ${build.classId}`).toBeDefined();

            assertCleanLocalizedLabel(
              localizeText(classDef!.name, 'en'),
              `${entry.id}.class.en`,
            );
            assertCleanLocalizedLabel(
              localizeText(classDef!.name, 'zh-CN'),
              `${entry.id}.class.zh`,
              { requireCjk: true },
            );

            if (build.ascendancyId && build.ascendancyId !== 'None') {
              const ascDef = classDef!.ascendancies.find(
                (a) => a.id.toLowerCase() === build.ascendancyId.toLowerCase(),
              );
              expect(
                ascDef,
                `${entry.id}: ascendancy "${build.ascendancyId}" not found under class "${build.classId}"`,
              ).toBeDefined();
              assertCleanLocalizedLabel(
                localizeText(ascDef!.name, 'en'),
                `${entry.id}.ascendancy.en`,
              );
              assertCleanLocalizedLabel(
                localizeText(ascDef!.name, 'zh-CN'),
                `${entry.id}.ascendancy.zh`,
                { requireCjk: true },
              );
            }

            // 2. Allocated passive tree nodes: 100% Chinese names, >= 95% Chinese stats, 0 markup / \n leaks
            const tree = getTreeForGame(build.game);
            const allocatedIds = getAllAllocatedNodeIds(build);
            const missingZhNameNodes: string[] = [];
            const untranslatedStatNodes: string[] = [];
            const markupOrEscapeLeaks: string[] = [];
            let nodesWithStats = 0;

            for (const nodeId of allocatedIds) {
              const node = tree.nodes[nodeId];
              expect(node, `${entry.id}: missing tree node ${nodeId}`).toBeDefined();
              if (!node) continue;

              const enName = localizeText(node.name, 'en');
              const zhName = localizeText(node.name, 'zh-CN');
              assertCleanLocalizedLabel(enName, `${entry.id}.node[${nodeId}].name.en`);
              assertCleanLocalizedLabel(zhName, `${entry.id}.node[${nodeId}].name.zh`);

              if (!HAS_CJK_RE.test(zhName)) {
                missingZhNameNodes.push(`${nodeId}:${enName}->${zhName}`);
              }

              if (node.stats.length > 0) {
                nodesWithStats++;
                const zhStats = getLocalizedNodeStatsZh(node);

                for (const line of [...node.stats, ...zhStats]) {
                  if (
                    POE2_MARKUP_LEAK_RE.test(line) ||
                    LITERAL_NEWLINE_RE.test(line) ||
                    BAD_TOKEN_RE.test(line) ||
                    OBJECT_OBJECT_RE.test(line) ||
                    RAW_I18N_KEY_RE.test(line)
                  ) {
                    markupOrEscapeLeaks.push(`${nodeId}(${enName}): ${line}`);
                  }
                }

                const hasZhTranslation =
                  zhStats.length > 0 && zhStats.some((line) => HAS_CJK_RE.test(line));
                if (!hasZhTranslation) {
                  untranslatedStatNodes.push(`${nodeId}(${enName}): ${node.stats.join(' | ')}`);
                }
              }
            }

            expect(
              missingZhNameNodes,
              `${entry.id}: 100% of allocated passive nodes must have Chinese names`,
            ).toEqual([]);
            expect(
              markupOrEscapeLeaks,
              `${entry.id}: ZERO PoE 2 markup leaks ([Keyword|...]) or literal \\n sequences allowed`,
            ).toEqual([]);

            if (nodesWithStats > 0) {
              const translatedRatio = (nodesWithStats - untranslatedStatNodes.length) / nodesWithStats;
              expect(
                translatedRatio,
                `${entry.id}: Chinese passive stat coverage ${(translatedRatio * 100).toFixed(1)}% < 95% (untranslated: ${untranslatedStatNodes.slice(0, 5).join('; ')})`,
              ).toBeGreaterThanOrEqual(0.95);
            }

            // 3. Equipped skill gems: >= 90% of resolved gems have Chinese names, no undefined/NaN/empty
            const resolvedGems = build.skills
              .flatMap((group) => group.gems)
              .map((inst) => getGemById(build.game, inst.gemId))
              .filter((def): def is NonNullable<typeof def> => Boolean(def));

            expect(
              resolvedGems.length,
              `${entry.id}: expected at least 1 resolved skill gem`,
            ).toBeGreaterThan(0);

            const untranslatedGems: string[] = [];
            for (const gem of resolvedGems) {
              const enGem = localizeText(gem.name, 'en');
              const zhGem = localizeText(gem.name, 'zh-CN');
              assertCleanLocalizedLabel(enGem, `${entry.id}.gem[${gem.id}].en`);
              assertCleanLocalizedLabel(zhGem, `${entry.id}.gem[${gem.id}].zh`);
              for (const statLine of gem.stats ?? []) {
                assertCleanLocalizedLabel(
                  localizeStatLine(statLine, 'zh-CN'),
                  `${entry.id}.gem[${gem.id}].stat`,
                );
              }
              if (!HAS_CJK_RE.test(zhGem)) {
                untranslatedGems.push(`${gem.id}:${enGem}->${zhGem}`);
              }
            }

            const zhGemRatio = (resolvedGems.length - untranslatedGems.length) / resolvedGems.length;
            expect(
              zhGemRatio,
              `${entry.id}: Chinese gem name coverage ${(zhGemRatio * 100).toFixed(1)}% < 90% (untranslated: ${untranslatedGems.join(', ')})`,
            ).toBeGreaterThanOrEqual(0.9);

            // 4. Calculation output localized labels (mainSkillName, warnings, breakdowns)
            assertCleanLocalizedLabel(
              localizeText(calc.offence.mainSkillName, 'en'),
              `${entry.id}.calc.mainSkillName.en`,
            );
            assertCleanLocalizedLabel(
              localizeText(calc.offence.mainSkillName, 'zh-CN'),
              `${entry.id}.calc.mainSkillName.zh`,
            );

            for (const warn of calc.warnings) {
              assertCleanLocalizedLabel(
                localizeText(warn.message, 'en'),
                `${entry.id}.calc.warning[${warn.code}].en`,
              );
              assertCleanLocalizedLabel(
                localizeText(warn.message, 'zh-CN'),
                `${entry.id}.calc.warning[${warn.code}].zh`,
                { requireCjk: true },
              );
            }

            for (const row of calc.breakdowns) {
              assertCleanLocalizedLabel(row.label, `${entry.id}.calc.breakdown.en`);
              assertCleanLocalizedLabel(row.labelZh, `${entry.id}.calc.breakdown.zh`, {
                requireCjk: true,
              });
            }
          });
        });
      }
    });
  }
});
