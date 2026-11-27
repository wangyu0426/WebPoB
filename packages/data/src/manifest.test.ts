import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CharacterClassDef, GameId, PassiveNode, PassiveTreeData } from '@webpob/core';
import {
  clearRegisteredClasses,
  getClassesForGame,
  getClassDef,
  hasRegisteredClasses,
  POE1_CLASSES,
  POE2_CLASSES,
  registerClassesData,
} from './classes.js';
import {
  getLatestTreeVersion,
  getLoadedTreeVersions,
  getTreeForGame,
  hasOfficialTreeLoaded,
  normalizeTreeVersion,
  registerTreeData,
  setLatestTreeVersion,
} from './trees.js';
import {
  getDataManifest,
  loadDataManifest,
  loadOfficialClasses,
  loadOfficialTree,
  registerDataManifest,
  resolveTreeFileFromManifest,
  type DataManifest,
} from './treeLoader.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DATA_DIR = path.resolve(currentDir, '../../../apps/web/public/data');
const manifestPath = path.join(PUBLIC_DATA_DIR, 'manifest.json');

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

/* ----------------------------- manifest.json ----------------------------- */

describe('manifest.json data contract', () => {
  it('exists and has the expected schema', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = readJson<DataManifest>(manifestPath);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.source).toBe('ggg-official');
    expect(Number.isNaN(Date.parse(manifest.generatedAt))).toBe(false);
    expect(Object.keys(manifest.games).sort()).toEqual(['poe1', 'poe2']);
  });

  it('declares latest tree versions and matching tree entries', () => {
    const manifest = readJson<DataManifest>(manifestPath);
    const poe1 = manifest.games.poe1;
    const poe2 = manifest.games.poe2;
    expect(poe1.latestTreeVersion).toBe('3_30');
    expect(poe1.trees[poe1.latestTreeVersion]).toBe('poe1-tree-3_30.json');
    expect(poe2.latestTreeVersion).toBe('0_5');
    expect(poe2.trees[poe2.latestTreeVersion]).toBe('poe2-tree-0_5.json');
  });

  it('every referenced data file exists under apps/web/public/data', () => {
    const manifest = readJson<DataManifest>(manifestPath);
    const missing: string[] = [];
    for (const [game, entry] of Object.entries(manifest.games)) {
      for (const [version, file] of Object.entries(entry.trees)) {
        if (!fs.existsSync(path.join(PUBLIC_DATA_DIR, file))) missing.push(`${game} tree ${version}: ${file}`);
      }
      for (const field of ['classes', 'gems', 'bases', 'uniques'] as const) {
        const file = entry[field];
        if (!fs.existsSync(path.join(PUBLIC_DATA_DIR, file))) missing.push(`${game} ${field}: ${file}`);
      }
      if (entry.ascendancyArt && !fs.existsSync(path.join(PUBLIC_DATA_DIR, entry.ascendancyArt))) {
        missing.push(`${game} ascendancyArt: ${entry.ascendancyArt}`);
      }
      if (entry.clusters && !fs.existsSync(path.join(PUBLIC_DATA_DIR, entry.clusters))) {
        missing.push(`${game} clusters: ${entry.clusters}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('references tree payloads whose game/version match the manifest keys', () => {
    const manifest = readJson<DataManifest>(manifestPath);
    for (const [game, entry] of Object.entries(manifest.games) as Array<[GameId, DataManifest['games'][GameId]]>) {
      for (const [version, file] of Object.entries(entry.trees)) {
        const payload = readJson<{ game?: string; version?: string; nodes?: unknown[] }>(
          path.join(PUBLIC_DATA_DIR, file),
        );
        expect(payload.game).toBe(game);
        expect(normalizeTreeVersion(payload.version)).toBe(normalizeTreeVersion(version));
        expect(Array.isArray(payload.nodes)).toBe(true);
      }
    }
  });
});

/* ------------------------------ classes json ----------------------------- */

const assertClassesPayload = (
  file: string,
  expectedGame: GameId,
  fallback: CharacterClassDef[],
) => {
  const payload = readJson<{ game?: string; version?: string; classes?: CharacterClassDef[] }>(
    path.join(PUBLIC_DATA_DIR, file),
  );
  expect(payload.game).toBe(expectedGame);
  expect(typeof payload.version).toBe('string');
  expect(Array.isArray(payload.classes)).toBe(true);
  const classes = payload.classes!;
  expect(classes.length).toBeGreaterThan(0);
  expect(classes.map((c) => c.id)).toEqual(fallback.map((c) => c.id));

  for (const cls of classes) {
    expect(cls.id.length).toBeGreaterThan(0);
    expect(cls.name.en.length).toBeGreaterThan(0);
    // Chinese names must be present, non-empty, and actually CJK text.
    expect(cls.name.zh.trim().length).toBeGreaterThan(0);
    expect(/[\u4e00-\u9fff]/.test(cls.name.zh)).toBe(true);
    expect(cls.ascendancies.length).toBeGreaterThan(0);
    for (const asc of cls.ascendancies) {
      expect(asc.id.length).toBeGreaterThan(0);
      expect(/[\u4e00-\u9fff]/.test(asc.name.zh)).toBe(true);
    }
  }
};

describe('poe1-classes.json / poe2-classes.json', () => {
  it('poe1 classes payload is valid with Chinese names', () => {
    assertClassesPayload('poe1-classes.json', 'poe1', POE1_CLASSES);
  });

  it('poe2 classes payload is valid with Chinese names', () => {
    assertClassesPayload('poe2-classes.json', 'poe2', POE2_CLASSES);
  });
});

/* --------------------------- dynamic classes ---------------------------- */

describe('registerClassesData', () => {
  afterEach(() => clearRegisteredClasses());

  it('overrides the offline fallback when registered', () => {
    expect(getClassesForGame('poe1')).toEqual(POE1_CLASSES);
    const custom: CharacterClassDef[] = [
      {
        id: 'Warden2',
        name: { en: 'Warden II', zh: '守望者二' },
        baseStr: 10,
        baseDex: 30,
        baseInt: 10,
        ascendancies: [
          { id: 'Bark', name: { en: 'Bark', zh: '树皮' }, summary: { en: 'x', zh: 'x' } },
        ],
      },
    ];
    registerClassesData('poe1', custom);
    expect(hasRegisteredClasses('poe1')).toBe(true);
    expect(getClassesForGame('poe1')).toEqual(custom);
    expect(getClassDef('poe1', 'Warden2').name.zh).toBe('守望者二');
    expect(getClassDef('poe1', 'DoesNotExist').id).toBe('Warden2');
  });

  it('clears back to the fallback on empty registration', () => {
    registerClassesData('poe2', [{ ...POE2_CLASSES[0]!, id: 'Temp' }]);
    expect(getClassesForGame('poe2')[0]!.id).toBe('Temp');
    registerClassesData('poe2', []);
    expect(getClassesForGame('poe2')).toEqual(POE2_CLASSES);
    expect(hasRegisteredClasses('poe2')).toBe(false);
  });

  it('is scoped per game', () => {
    registerClassesData('poe1', [{ ...POE1_CLASSES[0]!, id: 'ScopedOne' }]);
    expect(getClassesForGame('poe2')).toEqual(POE2_CLASSES);
    expect(getClassesForGame('poe1')[0]!.id).toBe('ScopedOne');
  });
});

/* ---------------------------- multi-version trees ----------------------- */

const makeTree = (game: GameId, version: string): PassiveTreeData => {
  const node: PassiveNode = {
    id: 1,
    name: { en: `Node ${version}`, zh: `节点${version}` },
    kind: 'small',
    x: 1,
    y: 2,
    stats: [],
    adjacent: [],
  };
  return {
    game,
    version,
    isOfficialFull: true,
    nodes: { 1: node },
    classStartNodeIds: { Witch: 1 },
  };
};

describe('multi-version tree registry', () => {
  const freshGame = (): GameId => 'poe2';

  beforeEach(() => {
    // Clear any prior registrations so each test starts from the sample fallback.
    const game = freshGame();
    for (const version of getLoadedTreeVersions(game)) {
      registerTreeData({ ...makeTree(game, version), isOfficialFull: false });
    }
    registerDataManifest(null);
  });

  it('normalizes version keys consistently', () => {
    expect(normalizeTreeVersion('3.30')).toBe('3_30');
    expect(normalizeTreeVersion('3-30')).toBe('3_30');
    expect(normalizeTreeVersion('v3_30')).toBe('3_30');
    expect(normalizeTreeVersion('  0_5 ')).toBe('0_5');
    expect(normalizeTreeVersion(undefined)).toBe('');
  });

  it('stores multiple versions and returns each exactly', () => {
    const game = freshGame();
    const v05 = makeTree(game, '0_5');
    const v10 = makeTree(game, '1_0');
    registerTreeData(v10);
    registerTreeData(v05);
    setLatestTreeVersion(game, '1_0');

    expect(hasOfficialTreeLoaded(game)).toBe(true);
    expect(hasOfficialTreeLoaded(game, '0_5')).toBe(true);
    expect(hasOfficialTreeLoaded(game, '1.0')).toBe(true);
    expect(getLoadedTreeVersions(game).sort()).toEqual(['0_5', '1_0']);

    expect(getTreeForGame(game, '0_5').version).toBe('0_5');
    expect(getTreeForGame(game, '1.0').version).toBe('1_0');
    expect(getLatestTreeVersion(game)).toBe('1_0');
  });

  it('falls back to the latest official tree when a version is missing', () => {
    const game = freshGame();
    registerTreeData(makeTree(game, '0_5'));
    const v10 = makeTree(game, '1_0');
    registerTreeData(v10);
    setLatestTreeVersion(game, '1_0');
    expect(getTreeForGame(game, '9_9').version).toBe('1_0');
  });

  it('returns the sample tree when no official tree is loaded', () => {
    const game = freshGame();
    for (const version of getLoadedTreeVersions(game)) {
      registerTreeData({ ...makeTree(game, version), isOfficialFull: false });
    }
    expect(hasOfficialTreeLoaded(game)).toBe(false);
    expect(getTreeForGame(game).nodes[1]).toBeUndefined();
  });
});

/* ------------------------------ manifest utils -------------------------- */

const sampleManifest = (): DataManifest => ({
  schemaVersion: 1,
  generatedAt: '2026-11-27T00:00:00.000Z',
  source: 'ggg-official',
  games: {
    poe1: {
      latestTreeVersion: '3_30',
      trees: { '3_30': 'poe1-tree-3_30.json', '3_25': 'poe1-tree-3_25.json' },
      classes: 'poe1-classes.json',
      gems: 'poe1-gems.json',
      bases: 'poe1-bases.json',
      uniques: 'poe1-uniques.json',
      clusters: 'poe1-clusters.json',
      ascendancyArt: 'ascendancy-art.json',
    },
    poe2: {
      latestTreeVersion: '0_5',
      trees: { '0_5': 'poe2-tree-0_5.json' },
      classes: 'poe2-classes.json',
      gems: 'poe2-gems.json',
      bases: 'poe2-bases.json',
      uniques: 'poe2-uniques.json',
      ascendancyArt: 'ascendancy-art.json',
    },
  },
});

describe('manifest loading helpers', () => {
  beforeEach(() => registerDataManifest(null));

  it('registerDataManifest / getDataManifest round-trip', () => {
    expect(getDataManifest()).toBeNull();
    const manifest = sampleManifest();
    registerDataManifest(manifest);
    expect(getDataManifest()).toBe(manifest);
  });

  it('loadDataManifest returns null without throwing when fetch is unavailable', async () => {
    const original = globalThis.fetch;
    // @ts-expect-error intentionally remove fetch to simulate offline/unit-test env
    delete globalThis.fetch;
    try {
      const manifest = await loadDataManifest('/does-not-matter');
      expect(manifest).toBeNull();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('loadDataManifest fetches and caches manifest.json', async () => {
    const manifest = sampleManifest();
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    try {
      const loaded = await loadDataManifest('/data');
      expect(loaded?.games.poe1.latestTreeVersion).toBe('3_30');
      expect(getDataManifest()).toBe(loaded);
      // Cached: a second call must not re-fetch.
      await loadDataManifest('/data');
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('resolveTreeFileFromManifest', () => {
  it('resolves an exact historical version', () => {
    expect(resolveTreeFileFromManifest(sampleManifest(), 'poe1', '3_25')).toBe('poe1-tree-3_25.json');
    expect(resolveTreeFileFromManifest(sampleManifest(), 'poe1', '3.25')).toBe('poe1-tree-3_25.json');
  });

  it('falls back to latestTreeVersion for a missing/omitted version', () => {
    expect(resolveTreeFileFromManifest(sampleManifest(), 'poe1')).toBe('poe1-tree-3_30.json');
    expect(resolveTreeFileFromManifest(sampleManifest(), 'poe2', '9_9')).toBe('poe2-tree-0_5.json');
  });

  it('returns undefined when the manifest or game entry is missing', () => {
    expect(resolveTreeFileFromManifest(null, 'poe1')).toBeUndefined();
    const manifest = sampleManifest();
    delete (manifest.games as Partial<DataManifest['games']>).poe2;
    expect(resolveTreeFileFromManifest(manifest, 'poe2')).toBeUndefined();
  });
});

/* ------------------------ end-to-end loaders (fetch) --------------------- */

const makeCompactPayload = (game: GameId, version: string) => ({
  game,
  version,
  bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
  classStartNodeIds: { Witch: 7 },
  groups: {},
  nodes: [
    {
      id: 7,
      en: `Start ${version}`,
      zh: `起点${version}`,
      k: 's' as const,
      x: 0,
      y: 0,
      adj: [] as number[],
    },
  ],
});

describe('loadOfficialTree / loadOfficialClasses manifest resolution', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    registerDataManifest(sampleManifest());
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    registerDataManifest(null);
    clearRegisteredClasses();
  });

  it('loadOfficialTree resolves the filename from the manifest for a historical version', async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      requestedUrls.push(url);
      // Historical 3_25 tree from the sample manifest.
      return new Response(JSON.stringify(makeCompactPayload('poe1', '3_25')), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const tree = await loadOfficialTree('poe1', '/data', '3_25');
    expect(requestedUrls).toContain('/data/poe1-tree-3_25.json');
    expect(tree.version).toBe('3_25');
    expect(hasOfficialTreeLoaded('poe1', '3_25')).toBe(true);
    expect(getTreeForGame('poe1', '3_25').nodes[7]?.name.en).toBe('Start 3_25');
  });

  it('loadOfficialTree honours the requested version even if the payload version differs', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(makeCompactPayload('poe1', '3_24')), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    const tree = await loadOfficialTree('poe1', '/data', '3_25');
    expect(tree.version).toBe('3_25');
    expect(getTreeForGame('poe1', '3_25').nodes[7]).toBeDefined();
  });

  it('loadOfficialClasses registers manifest-provided classes', async () => {
    const classes: CharacterClassDef[] = [
      {
        id: 'ManifestWitch',
        name: { en: 'Manifest Witch', zh: '清单女巫' },
        baseStr: 14,
        baseDex: 14,
        baseInt: 32,
        ascendancies: [{ id: 'Asc', name: { en: 'Asc', zh: '升华' }, summary: { en: 'x', zh: 'x' } }],
      },
    ];
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ game: 'poe1', version: '3_25', classes }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    const loaded = await loadOfficialClasses('poe1', '/data');
    expect(loaded.map((c) => c.id)).toEqual(['ManifestWitch']);
    expect(getClassesForGame('poe1')[0]!.name.zh).toBe('清单女巫');
  });

  it('loadOfficialClasses falls back to offline defaults on a failed fetch', async () => {
    globalThis.fetch = (async () => new Response('nope', { status: 404 })) as typeof fetch;
    const loaded = await loadOfficialClasses('poe1', '/data');
    expect(loaded).toEqual(POE1_CLASSES);
  });
});
