import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { isFullGitSha } from '@webpob/calc';
import {
  DEFAULT_PINS_PATH,
  ROOT_DIR,
  loadOraclePins,
  sha256Buffer,
  validateOraclePinsSchema,
  validateSnapshotProvenance,
  verifyPinnedCheckout,
  verifyPinnedDataFiles,
} from './pins.js';
import { compareRepeatability, writeNativeSnapshots } from './smoke.js';
import type { OracleGoldenSnapshot } from './generate.js';

const execFileAsync = promisify(execFile);

describe('Oracle Pin Lockfile & Provenance Verification (Offline)', () => {
  it('loads the exact independent PoE and runtime pins', async () => {
    const pins = await loadOraclePins(DEFAULT_PINS_PATH);
    expect(isFullGitSha(pins.upstream.poe1.commit)).toBe(true);
    expect(isFullGitSha(pins.upstream.poe2.commit)).toBe(true);
    expect(pins.runtime.luajit.repository).toBe('https://github.com/LuaJIT/LuaJIT.git');
    expect(pins.runtime.luajit.revision).toBe('2460b3ff93a1c955de3d62cfc825de7d68dc272e');
    expect(pins.runtime.luajit.version).toBe('2.1.1784580905');
    expect(pins.runtime.luajit.utf8Module).toEqual({
      name: 'lua-utf8',
      version: '0.2.1',
      rock: 'luautf8',
      rockVersion: '0.2.1-1',
    });
    expect(Object.keys(pins.dataFiles).length).toBeGreaterThanOrEqual(8);
  });

  it('verifies all pinned local data file SHA-256 hashes match disk', async () => {
    const pins = await loadOraclePins(DEFAULT_PINS_PATH);
    const result = await verifyPinnedDataFiles(pins, ROOT_DIR);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a dirty tracked Lua file anywhere in the pinned checkout', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webpob-pinned-checkout-test-'));
    const git = (args: string[]) => execFileAsync('git', args, { cwd: tmpDir });
    try {
      await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'runtime/lua'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'src/main.lua'), 'return true\n');
      await fs.writeFile(path.join(tmpDir, 'runtime/lua/HeadlessWrapper.lua'), 'return true\n');
      await git(['init', '-q']);
      await git(['config', 'user.name', 'Fixture Maintainer']);
      await git(['config', 'user.email', 'fixture@example.test']);
      await git(['add', 'src/main.lua', 'runtime/lua/HeadlessWrapper.lua']);
      await git(['commit', '-m', 'Create synthetic pinned checkout']);
      await git(['remote', 'add', 'origin', 'https://example.test/PathOfBuilding.git']);
      const { stdout: commit } = await git(['rev-parse', 'HEAD']);

      expect(await verifyPinnedCheckout(
        tmpDir,
        commit.trim(),
        'fixture',
        'https://example.test/PathOfBuilding.git',
      )).toBe(commit.trim());

      await fs.writeFile(path.join(tmpDir, 'runtime/lua/HeadlessWrapper.lua'), 'return false\n');
      await expect(verifyPinnedCheckout(
        tmpDir,
        commit.trim(),
        'fixture',
        'https://example.test/PathOfBuilding.git',
      )).rejects.toThrow('Pinned checkout is dirty for fixture.');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects floating refs, abbreviated SHAs, missing runtime pins, and invalid data hashes', () => {
    const bad = validateOraclePinsSchema({
      schemaVersion: 1,
      upstream: {
        poe1: { repo: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding.git', commit: 'master' },
        poe2: { repo: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2.git', commit: '601768b' },
      },
      runtime: {
        luajit: { repository: 'https://github.com/LuaJIT/LuaJIT.git', revision: '2460b3f', version: '2.1' },
      },
      dataFiles: {
        '../escape.json': 'not-a-sha256',
      },
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('upstream.poe1.commit'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('upstream.poe2.commit'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('runtime.luajit.revision'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('runtime.luajit.utf8Module'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('repo-relative'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('sha256'))).toBe(true);
  });

  it('fails closed when a pinned data file is missing or tampered', async () => {
    const pins = await loadOraclePins(DEFAULT_PINS_PATH);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webpob-pin-test-'));
    try {
      const result = await verifyPinnedDataFiles(pins, tmpDir);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(Object.keys(pins.dataFiles).length);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('validates exact native runtime, input, runner, error, and metric-presence provenance', async () => {
    const pins = await loadOraclePins(DEFAULT_PINS_PATH);
    const xml = '<PathOfBuilding/>';
    const runnerScriptDigest = 'a'.repeat(64);
    const runtime = pins.runtime.luajit;
    const inputDigest = sha256Buffer(xml);
    const base: OracleGoldenSnapshot = {
      id: 'poe1_smoke',
      title: 'Smoke',
      game: 'poe1',
      xml,
      pobCommit: pins.upstream.poe1.commit,
      inputDigest,
      generatedAt: '2026-11-28T00:00:00.000Z',
      schemaVersion: 2,
      context: {
        activeSkillName: 'Fireball',
        mainSocketGroup: 1,
        outputSource: 'player',
        luaVersion: 'LuaJIT ' + runtime.version,
        luaUtf8Version: runtime.utf8Module.version,
      },
      provenance: {
        pobRepo: pins.upstream.poe1.repo,
        pobCommit: pins.upstream.poe1.commit,
        luaJitRepository: runtime.repository,
        luaJitRevision: runtime.revision,
        luaJitVersion: 'LuaJIT ' + runtime.version,
        luaUtf8Rock: runtime.utf8Module.rock,
        luaUtf8RockVersion: runtime.utf8Module.rockVersion,
        luaUtf8Module: runtime.utf8Module.name,
        luaUtf8Version: runtime.utf8Module.version,
        inputDigest,
        runnerScriptDigest,
      },
      presence: { presentCount: 1, missingCount: 1, presentFields: ['Life'], missingFields: ['EnergyShield'] },
      nativeErrors: [],
      oracle: { Life: 1125 },
    };

    expect(validateSnapshotProvenance(base, pins, runnerScriptDigest)).toEqual([]);

    const invalidSnapshots: unknown[] = [
      { ...base, pobCommit: '5606cc6' },
      { ...base, inputDigest: 'b'.repeat(64) },
      { ...base, provenance: { ...base.provenance, luaJitRevision: '2460b3f' } },
      { ...base, provenance: { ...base.provenance, runnerScriptDigest: 'b'.repeat(64) } },
      { ...base, nativeErrors: ['OnFrame failed'] },
      { ...base, nativeErrors: undefined },
      { ...base, presence: undefined },
    ];
    for (const invalid of invalidSnapshots) {
      expect(validateSnapshotProvenance(invalid, pins, runnerScriptDigest).length).toBeGreaterThan(0);
    }
  });

  it('checks repeatability excluding declared nonsemantic generatedAt timestamp', () => {
    const base: OracleGoldenSnapshot = {
      id: 'poe1_smoke',
      title: 'Smoke',
      game: 'poe1',
      xml: '<PathOfBuilding/>',
      pobCommit: '5606cc64fa9f15694e69001a52b90aa968d01a86',
      inputDigest: '0'.repeat(64),
      generatedAt: '2026-11-28T00:00:00.000Z',
      schemaVersion: 2,
      context: { activeSkillName: 'Fireball', mainSocketGroup: 1, outputSource: 'player' },
      provenance: {
        pobRepo: 'https://github.com/PathOfBuildingCommunity/PathOfBuilding.git',
        pobCommit: '5606cc64fa9f15694e69001a52b90aa968d01a86',
      },
      presence: { presentCount: 1, missingCount: 0, presentFields: ['Life'], missingFields: [] },
      nativeErrors: [],
      oracle: { Life: 1125 },
    };

    const sameSemantic = { ...base, generatedAt: '2026-11-28T00:05:00.000Z' };
    expect(compareRepeatability(base, sameSemantic)).toEqual({ repeatable: true, diffs: [] });

    const drifted = { ...base, generatedAt: '2026-11-28T00:05:00.000Z', oracle: { Life: 1126 } };
    const driftRes = compareRepeatability(base, drifted);
    expect(driftRes.repeatable).toBe(false);
    expect(driftRes.diffs.some((d) => d.includes('oracle'))).toBe(true);
  });

  it('retains marker-delimited native error output in smoke failure evidence', async () => {
    const pins = await loadOraclePins(DEFAULT_PINS_PATH);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'webpob-native-evidence-test-'));
    const outPath = path.join(tmpDir, 'native-smoke.json');
    const snapshot: OracleGoldenSnapshot = {
      id: 'poe1_native_failure',
      title: 'Native failure evidence',
      game: 'poe1',
      xml: '<PathOfBuilding/>',
      pobCommit: pins.upstream.poe1.commit,
      inputDigest: sha256Buffer('<PathOfBuilding/>'),
      generatedAt: '2026-11-28T00:00:00.000Z',
      schemaVersion: 2,
      context: { luaVersion: pins.runtime.luajit.version, luaUtf8Version: pins.runtime.luajit.utf8Module.version },
      provenance: { pobRepo: pins.upstream.poe1.repo, pobCommit: pins.upstream.poe1.commit },
      presence: { presentCount: 1, missingCount: 0, presentFields: ['Life'], missingFields: [] },
      nativeErrors: ['OnFrame failed'],
      oracle: { Life: 1125 },
    };

    try {
      await writeNativeSnapshots(outPath, pins, [], { benchmarkId: snapshot.id, runNumber: 1, snapshot });
      const evidence = JSON.parse(await fs.readFile(outPath, 'utf-8')) as {
        failedRun?: { benchmarkId: string; runNumber: number; snapshot: OracleGoldenSnapshot };
      };
      expect(evidence.failedRun?.benchmarkId).toBe(snapshot.id);
      expect(evidence.failedRun?.snapshot.nativeErrors).toEqual(['OnFrame failed']);
      expect(evidence.failedRun?.snapshot.oracle).toEqual({ Life: 1125 });
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

});
