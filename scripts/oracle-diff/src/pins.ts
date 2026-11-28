import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../../..');
export const DEFAULT_PINS_PATH = path.resolve(__dirname, '../oracle-pins.json');

export const FULL_GIT_SHA_RE = /^[0-9a-f]{40}$/;
export const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export interface UpstreamRepoPin {
  repo: string;
  commit: string;
  releaseLabel?: string;
}

export interface LuaUtf8ModulePin {
  name: string;
  version: string;
  rock: string;
  rockVersion: string;
}

export interface LuaJitPin {
  repository: string;
  revision: string;
  version: string;
  utf8Module: LuaUtf8ModulePin;
}

export interface OraclePinsFile {
  schemaVersion: 1;
  upstream: {
    poe1: UpstreamRepoPin;
    poe2: UpstreamRepoPin;
  };
  runtime: {
    luajit: LuaJitPin;
  };
  dataFiles: Record<string, string>;
}

export interface PinValidationResult {
  valid: boolean;
  errors: string[];
}

export function isFullGitSha(value: unknown): value is string {
  return typeof value === 'string' && FULL_GIT_SHA_RE.test(value);
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX_RE.test(value);
}

export function sha256Buffer(buf: Buffer | string): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function validateOraclePinsSchema(raw: unknown): PinValidationResult {
  const errors: string[] = [];
  const root = asRecord(raw);
  if (!root) {
    return { valid: false, errors: ['oracle-pins.json must be a JSON object.'] };
  }
  const pins = root as Partial<OraclePinsFile>;
  if (pins.schemaVersion !== 1) {
    errors.push('Unsupported oracle-pins schemaVersion: ' + String(pins.schemaVersion) + ' (expected 1).');
  }

  for (const game of ['poe1', 'poe2'] as const) {
    const entry = pins.upstream?.[game];
    if (!entry || typeof entry !== 'object') {
      errors.push('Missing upstream.' + game + ' pin.');
      continue;
    }
    if (typeof entry.repo !== 'string' || !entry.repo.startsWith('https://')) {
      errors.push('upstream.' + game + '.repo must be an https:// URL.');
    }
    if (!isFullGitSha(entry.commit)) {
      errors.push('upstream.' + game + '.commit must be a full 40-char lowercase hex SHA (got "' + String(entry.commit) + '").');
    }
  }

  const luajit = pins.runtime?.luajit;
  if (!luajit || typeof luajit !== 'object') {
    errors.push('Missing runtime.luajit pin.');
  } else {
    if (typeof luajit.repository !== 'string' || !luajit.repository.startsWith('https://')) {
      errors.push('runtime.luajit.repository must be an https:// URL.');
    }
    if (!isFullGitSha(luajit.revision)) {
      errors.push('runtime.luajit.revision must be a full 40-char lowercase hex SHA.');
    }
    if (typeof luajit.version !== 'string' || !luajit.version.trim()) {
      errors.push('runtime.luajit.version must be a non-empty exact version.');
    }
    const utf8 = luajit.utf8Module;
    if (!utf8 || typeof utf8 !== 'object') {
      errors.push('Missing runtime.luajit.utf8Module pin.');
    } else {
      for (const key of ['name', 'version', 'rock', 'rockVersion'] as const) {
        if (typeof utf8[key] !== 'string' || !utf8[key].trim()) {
          errors.push('runtime.luajit.utf8Module.' + key + ' must be a non-empty string.');
        }
      }
    }
  }

  if (!pins.dataFiles || typeof pins.dataFiles !== 'object' || Object.keys(pins.dataFiles).length === 0) {
    errors.push('dataFiles must be a non-empty map of relative path -> sha256.');
  } else {
    for (const [relPath, expectedHash] of Object.entries(pins.dataFiles)) {
      const parts = relPath.replace(/\\/g, '/').split('/');
      if (path.isAbsolute(relPath) || parts.includes('..') || relPath.includes('\\')) {
        errors.push('dataFiles key "' + relPath + '" must be a clean repo-relative path.');
      }
      if (!isSha256Hex(expectedHash)) {
        errors.push('dataFiles["' + relPath + '"] must be a 64-char lowercase sha256 hex digest.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function loadOraclePins(pinsPath = DEFAULT_PINS_PATH): Promise<OraclePinsFile> {
  const rawText = await fs.readFile(pinsPath, 'utf-8');
  const parsed = JSON.parse(rawText) as unknown;
  const check = validateOraclePinsSchema(parsed);
  if (!check.valid) {
    throw new Error('Invalid oracle-pins.json (' + pinsPath + '):\n  - ' + check.errors.join('\n  - '));
  }
  return parsed as OraclePinsFile;
}

export async function verifyPinnedDataFiles(
  pins: OraclePinsFile,
  rootDir = ROOT_DIR,
): Promise<{ valid: boolean; errors: string[]; hashes: Record<string, string> }> {
  const errors: string[] = [];
  const hashes: Record<string, string> = {};
  const rootPath = path.resolve(rootDir);
  for (const [relPath, expectedHash] of Object.entries(pins.dataFiles)) {
    const absPath = path.resolve(rootPath, relPath);
    if (!absPath.startsWith(rootPath + path.sep)) {
      errors.push('Pinned data path escapes repository root: ' + relPath);
      continue;
    }
    try {
      const content = await fs.readFile(absPath);
      const actual = sha256Buffer(content);
      hashes[relPath] = actual;
      if (actual !== expectedHash) {
        errors.push('Data hash mismatch for ' + relPath + ': expected ' + expectedHash + ', got ' + actual);
      }
    } catch (err) {
      errors.push('Missing pinned data file ' + relPath + ': ' + (err as Error).message);
    }
  }
  return { valid: errors.length === 0, errors, hashes };
}

export async function getFullGitHead(repoDir: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoDir });
  const rev = stdout.trim();
  if (!isFullGitSha(rev)) {
    throw new Error('Expected full 40-char git SHA in ' + repoDir + ', got "' + rev + '".');
  }
  return rev;
}

function normalizeRepoUrl(value: string): string {
  return value.trim().replace(/\.git$/, '').replace(/\/$/, '');
}

export async function verifyPinnedCheckout(
  repoDir: string,
  expectedCommit: string,
  label: string,
  expectedRepo?: string,
): Promise<string> {
  let actual: string;
  try {
    actual = await getFullGitHead(repoDir);
  } catch (err) {
    throw new Error('Missing or invalid git checkout for ' + label + ' at ' + repoDir + ': ' + (err as Error).message);
  }
  if (actual !== expectedCommit) {
    throw new Error('Pinned commit mismatch for ' + label + ': expected ' + expectedCommit + ', got ' + actual + '.');
  }
  if (expectedRepo) {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: repoDir });
    if (normalizeRepoUrl(stdout) !== normalizeRepoUrl(expectedRepo)) {
      throw new Error('Pinned repository mismatch for ' + label + ': expected ' + expectedRepo + ', got ' + stdout.trim() + '.');
    }
  }
  const { stdout: status } = await execFileAsync(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', 'src'],
    { cwd: repoDir },
  );
  if (status.trim()) {
    throw new Error('Pinned source tree is dirty for ' + label + '.');
  }
  return actual;
}

export function validateSnapshotProvenance(
  snapshot: unknown,
  pins: OraclePinsFile,
  expectedRunnerScriptDigest: string,
): string[] {
  const errors: string[] = [];
  const record = asRecord(snapshot);
  if (!record) return ['snapshot must be an object.'];
  const id = typeof record.id === 'string' ? record.id : 'unknown';
  const add = (message: string) => errors.push('[' + id + '] ' + message);

  const game = record.game === 'poe1' || record.game === 'poe2' ? record.game : undefined;
  if (!game) add('game must be poe1 or poe2.');
  const upstream = game ? pins.upstream[game] : undefined;
  if (upstream && record.pobCommit !== upstream.commit) {
    add('pobCommit does not match the locked ' + game + ' revision.');
  }
  if (record.schemaVersion !== 2) add('schemaVersion must be 2.');
  if (typeof record.xml !== 'string' || record.xml.length === 0) {
    add('input XML is missing.');
  }

  const inputDigest = record.inputDigest;
  if (!isSha256Hex(inputDigest)) {
    add('inputDigest must be a 64-char SHA-256 digest.');
  } else if (typeof record.xml === 'string' && sha256Buffer(record.xml) !== inputDigest) {
    add('inputDigest does not match the input XML.');
  }

  const provenance = asRecord(record.provenance);
  if (!provenance) {
    add('native provenance metadata is missing.');
  } else {
    if (upstream && provenance.pobRepo !== upstream.repo) add('provenance.pobRepo does not match the locked repository.');
    if (provenance.pobCommit !== record.pobCommit) add('provenance.pobCommit does not match pobCommit.');
    if (provenance.inputDigest !== inputDigest) add('provenance.inputDigest does not match inputDigest.');
    if (provenance.runnerScriptDigest !== expectedRunnerScriptDigest || !isSha256Hex(expectedRunnerScriptDigest)) {
      add('runnerScriptDigest does not match the current Lua runner.');
    }
    const runtime = pins.runtime.luajit;
    if (provenance.luaJitRepository !== runtime.repository) add('luaJitRepository does not match the lockfile.');
    if (provenance.luaJitRevision !== runtime.revision) add('luaJitRevision does not match the lockfile.');
    if (typeof provenance.luaJitVersion !== 'string' || !provenance.luaJitVersion.includes(runtime.version)) {
      add('luaJitVersion does not match the locked runtime version.');
    }
    const utf8 = runtime.utf8Module;
    if (provenance.luaUtf8Rock !== utf8.rock) add('luaUtf8Rock does not match the lockfile.');
    if (provenance.luaUtf8RockVersion !== utf8.rockVersion) add('luaUtf8RockVersion does not match the lockfile.');
    if (provenance.luaUtf8Module !== utf8.name) add('luaUtf8Module does not match the lockfile.');
    if (provenance.luaUtf8Version !== utf8.version) add('luaUtf8Version does not match the lockfile.');
  }

  const context = asRecord(record.context);
  const runtime = pins.runtime.luajit;
  if (!context || typeof context.luaVersion !== 'string' || !context.luaVersion.includes(runtime.version)) {
    add('context.luaVersion does not identify the pinned LuaJIT runtime.');
  }
  if (!context || context.luaUtf8Version !== runtime.utf8Module.version) {
    add('context.luaUtf8Version does not identify the pinned UTF-8 module.');
  }

  if (!Array.isArray(record.nativeErrors) || record.nativeErrors.length !== 0) {
    add('nativeErrors must be an explicit empty array.');
  }

  const presence = asRecord(record.presence);
  if (!presence) {
    add('metric presence metadata is missing.');
  } else {
    const presentFields = presence.presentFields;
    const missingFields = presence.missingFields;
    if (
      !Array.isArray(presentFields) ||
      !Array.isArray(missingFields) ||
      presence.presentCount !== presentFields.length ||
      presence.missingCount !== missingFields.length ||
      (presentFields.length + missingFields.length) === 0
    ) {
      add('metric presence metadata is inconsistent.');
    }
  }

  return errors;
}
