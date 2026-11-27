#!/usr/bin/env node
/**
 * WebPoB Release & Instant Rollback CLI (zero-dependency, ESM, Node 22+).
 *
 *   node scripts/release.mjs status
 *   node scripts/release.mjs smoke [--url <baseUrl>] [--expect-version <v>] [--expect-sha <sha>]
 *   node scripts/release.mjs deploy [--bump patch|minor|major|none] [--notes "..."] [--preview]
 *                                   [--skip-tests] [--auto-rollback] [--dry-run] [--allow-dirty]
 *   node scripts/release.mjs rollback [target] [--prev] [--rebuild] [--dry-run]
 *
 * Pure helpers below are exported for unit tests; `main()` only runs when this
 * file is executed directly (`import.meta.url === pathToFileURL(argv[1])`).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CF_PROJECT = 'webpob';
export const PROD_URL = 'https://webpob.pages.dev';
export const PROXY_SMOKE_URL =
  'https://webpob.pages.dev/api/proxy?url=https%3A%2F%2Fpobb.in%2FXii_bN-QbdZn%2Fraw';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const POE2_TREE_PATH = '/data/poe2-tree-0_5.json';
const POE2_TREE_MIN_NODES = 4000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEALTHY_RE = /^(active|previous|live|healthy|preview)$/i;
const UNHEALTHY_RE = /^(failed|broken|error|unhealthy)$/i;

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const APP_DIR = path.join(REPO_ROOT, 'apps/web');
const DIST_DIR = path.join(APP_DIR, 'dist');
const RELEASES_PATH = path.join(REPO_ROOT, 'releases.json');

/* ----------------------------- pure utils ----------------------------- */

const stripV = (v) => String(v ?? '').trim().replace(/^v/i, '');
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v.trim());
const isVersionLike = (v) => /^v?\d+\.\d+\.\d+$/i.test(String(v ?? '').trim());
const sameId = (a, b) => Boolean(a && b) && String(a).toLowerCase() === String(b).toLowerCase();
const idPrefixMatch = (id, q) => Boolean(id && q) && String(id).toLowerCase().startsWith(String(q).toLowerCase());
const isHealthy = (s) => {
  const v = String(s ?? '').trim();
  if (!v) return true;
  if (UNHEALTHY_RE.test(v)) return false;
  return true;
};
const truncate = (t, n) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1))}…`;
};

function renderTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(String(h).length, ...rows.map((r) => String(r[i] ?? '').length), 3));
  const fmt = (row) => row.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ').replace(/\s+$/, '');
  return [`  ${fmt(headers)}`, `  ${widths.map((w) => '-'.repeat(w)).join('  ')}`, ...rows.map((r) => `  ${fmt(r)}`)].join('\n');
}

/**
 * Bumps a MAJOR.MINOR.PATCH semver (optional leading `v`, ignores pre-release/build).
 */
export function bumpSemver(version, bump) {
  const m = String(version ?? '').trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!m) throw new Error(`bumpSemver: invalid semver "${version}"`);
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (bump === 'patch') patch += 1;
  else if (bump === 'minor') { minor += 1; patch = 0; }
  else if (bump === 'major') { major += 1; minor = 0; patch = 0; }
  else if (bump !== 'none') throw new Error(`bumpSemver: unknown bump "${bump}" (patch|minor|major|none)`);
  return `${major}.${minor}.${patch}`;
}

/**
 * Builds the exact payload emitted by `apps/web/vite.config.ts` to /version.json.
 */
export function buildVersionPayload({ version, gitSha = 'dev', gitTag = '', branch = 'main', builtAt } = {}) {
  if (typeof version !== 'string' || !version.trim()) throw new Error('buildVersionPayload: version required');
  return { version, gitSha: gitSha || 'dev', gitTag: gitTag || '', branch: branch || 'main', builtAt: builtAt || new Date().toISOString() };
}

/** Extracts the 32-hex account id from a `dash.cloudflare.com/<id>/pages/...` URL. */
export function extractAccountIdFromDashboardUrl(url) {
  const m = String(url ?? '').match(/dash\.cloudflare\.com\/([0-9a-f]{32})\//i);
  return m ? m[1] : null;
}

function normalizeDeployment(raw) {
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  return {
    id,
    shortId: id.slice(0, 8),
    environment: raw.environment || '',
    branch: raw.branch || '',
    source: raw.source || '',
    url: raw.url || '',
    status: raw.status || '',
    dashboardUrl: raw.dashboardUrl || '',
    accountId: extractAccountIdFromDashboardUrl(raw.dashboardUrl),
  };
}

/**
 * Parses `wrangler pages deployment list` output — JSON (`--json`) or the
 * box-drawing table. Returns newest-first as emitted by wrangler.
 */
export function parseWranglerDeploymentOutput(output) {
  const raw = String(output ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.result) ? parsed.result : [];
      return arr
        .map((d) => normalizeDeployment({
          id: d.Id ?? d.id,
          environment: d.Environment ?? d.environment,
          branch: d.Branch ?? d.branch,
          source: d.Source ?? d.source,
          url: d.Deployment ?? d.url ?? d.deployment,
          status: d.Status ?? d.status,
          dashboardUrl: d.Build ?? d.dashboardUrl ?? d.build,
        }))
        .filter((d) => d.id);
    } catch { /* fall through to table */ }
  }
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!/[│|]/.test(line)) continue;
    const sep = line.includes('│') ? '│' : '|';
    const cells = line.split(sep).map((c) => c.trim());
    while (cells[0] === '') cells.shift();
    while (cells[cells.length - 1] === '') cells.pop();
    if (cells.length < 7 || !isUuid(cells[0])) continue;
    out.push(normalizeDeployment({
      id: cells[0], environment: cells[1], branch: cells[2], source: cells[3],
      url: cells[4], status: cells[5], dashboardUrl: cells[6],
    }));
  }
  return out;
}

export function formatStatusTable(releases, { maxRows = 12, title = 'Recent releases' } = {}) {
  const list = Array.isArray(releases) ? releases : [];
  if (!list.length) return `${title}\n  (no releases recorded)`;
  const rows = list.slice(0, maxRows).map((r) => [
    r.tag ? String(r.tag) : r.version ? `v${stripV(r.version)}` : '-',
    r.deploymentId ? String(r.deploymentId).slice(0, 8) : '-',
    r.commit ? String(r.commit).slice(0, 7) : '-',
    r.status ? String(r.status) : '-',
    truncate(r.notes ?? '', 64),
  ]);
  return `${title}\n${renderTable(['VERSION', 'DEPLOYMENT', 'COMMIT', 'STATUS', 'NOTES'], rows)}`;
}

export function formatDeploymentsTable(deployments, { maxRows = 10, title = 'Recent Cloudflare deployments' } = {}) {
  const list = Array.isArray(deployments) ? deployments : [];
  if (!list.length) return `${title}\n  (none)`;
  const rows = list.slice(0, maxRows).map((d) => [
    d.shortId || (d.id ? String(d.id).slice(0, 8) : '-'),
    d.environment || '-', d.branch || '-', d.source || '-', truncate(d.status, 18), d.url || '-',
  ]);
  return `${title}\n${renderTable(['DEPLOYMENT', 'ENV', 'BRANCH', 'SOURCE', 'WHEN', 'URL'], rows)}`;
}

/**
 * Resolves which deployment a rollback targets.
 *
 *   - explicit version (vX.Y.Z / X.Y.Z) -> releases.json entry, or git tag when `rebuild`
 *   - explicit id (full UUID or 8-char prefix) -> matching Cloudflare deployment
 *   - `--prev` / no target -> most recent healthy production deployment strictly
 *     older than the currently active live deployment.
 *
 * Throws with a clear message when nothing can be resolved.
 */
export function resolveRollbackTarget({
  target,
  rebuild = false,
  releases = [],
  deployments = [],
  liveDeploymentId = null,
} = {}) {
  const rels = Array.isArray(releases) ? releases : [];
  const deps = Array.isArray(deployments) ? deployments : [];
  const relForDep = (id, source) =>
    rels.find((r) => sameId(r.deploymentId, id) || (source && r.commit && sameId(r.commit, source)));
  const fromRelease = (r) => ({
    kind: 'release',
    deploymentId: r.deploymentId || null,
    version: r.version ? stripV(r.version) : null,
    tag: r.tag || (r.version ? `v${stripV(r.version)}` : null),
    commit: r.commit || null,
    gitRef: null,
    source: 'releases.json',
    note: r.tag || (r.version ? `v${stripV(r.version)}` : r.deploymentId || ''),
  });
  const fromDeployment = (d) => {
    const rel = relForDep(d.id, d.source);
    return {
      kind: 'deployment',
      deploymentId: d.id,
      version: rel?.version ? stripV(rel.version) : null,
      tag: rel?.tag || (rel?.version ? `v${stripV(rel.version)}` : null),
      commit: rel?.commit || d.source || null,
      gitRef: null,
      source: 'wrangler deployment list',
      note: rel?.version ? `release v${stripV(rel.version)}` : `deployment ${String(d.id).slice(0, 8)}`,
    };
  };

  const requested = target == null ? '' : String(target).trim();

  if (requested) {
    if (isVersionLike(requested)) {
      const v = stripV(requested);
      const rel = rels.find((r) => stripV(r.version) === v || stripV(r.tag) === v);
      if (rel) return fromRelease(rel);
      if (rebuild) {
        return { kind: 'release', deploymentId: null, version: v, tag: `v${v}`, commit: null, gitRef: `v${v}`, source: 'git tag', note: `git tag v${v}` };
      }
      throw new Error(`no release "${requested}" in releases.json (pass --rebuild to build from git tag v${v})`);
    }

    const dep = deps.find((d) => idPrefixMatch(d.id, requested));
    if (dep) return fromDeployment(dep);

    if (isUuid(requested)) {
      const rel = relForDep(requested);
      return { kind: 'deployment', deploymentId: requested.toLowerCase(), version: rel?.version ? stripV(rel.version) : null, tag: rel?.tag || null, commit: rel?.commit || null, gitRef: null, source: 'explicit deployment id', note: rel?.tag || `deployment ${requested.slice(0, 8)}` };
    }
    const relByPrefix = rels.find((r) => idPrefixMatch(r.deploymentId, requested));
    if (relByPrefix) return fromRelease(relByPrefix);

    throw new Error(`no deployment matching "${requested}" in Cloudflare deployment list or releases.json`);
  }

  const production = deps.filter((d) => !d.environment || /production/i.test(String(d.environment)));
  const activeRel = rels.find((r) => /active|live/i.test(String(r.status || '')));
  const currentId = liveDeploymentId || activeRel?.deploymentId || production[0]?.id || null;

  let chosen = null;
  if (production.length) {
    let idx = currentId ? production.findIndex((d) => sameId(d.id, currentId)) : -1;
    if (idx < 0) idx = 0;
    for (let i = idx + 1; i < production.length; i += 1) {
      const d = production[i];
      if (currentId && sameId(d.id, currentId)) continue;
      if (!isHealthy(relForDep(d.id, d.source)?.status)) continue;
      chosen = fromDeployment(d);
      break;
    }
  }
  if (!chosen && rels.length) {
    const activeIdx = rels.findIndex((r) => (currentId && sameId(r.deploymentId, currentId)) || /active|live/i.test(String(r.status || '')));
    for (let i = (activeIdx >= 0 ? activeIdx + 1 : 1); i < rels.length; i += 1) {
      if (!isHealthy(rels[i].status)) continue;
      if (currentId && sameId(rels[i].deploymentId, currentId)) continue;
      chosen = fromRelease(rels[i]);
      break;
    }
  }
  if (!chosen) throw new Error('no previous healthy production release/deployment found to roll back to');
  return { ...chosen, previousTo: currentId };
}

/* ------------------------- process / fs / net ------------------------- */

function runCapture(command, args, { cwd = REPO_ROOT, timeout = 300000, env = process.env } = {}) {
  const r = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? (r.error ? 1 : 0), stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
}

function runInherit(command, args, { cwd = REPO_ROOT, env = process.env } = {}) {
  const r = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`command failed (exit ${r.status ?? '?'}): ${command} ${args.join(' ')}`);
}

const gitOut = (args) => {
  const r = runCapture('git', args);
  return r.status === 0 ? r.stdout.trim() : '';
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

function normalizeRelease(raw) {
  const version = raw?.version != null ? stripV(raw.version) : '';
  return {
    ...raw,
    version,
    tag: raw?.tag || (version ? `v${version}` : ''),
    deploymentId: raw?.deploymentId ?? raw?.id ?? null,
    previewUrl: raw?.previewUrl ?? raw?.url ?? null,
    commit: raw?.commit ?? null,
    status: raw?.status ?? 'unknown',
    notes: raw?.notes ?? '',
  };
}

function loadReleaseState(file = RELEASES_PATH) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { project: CF_PROJECT, releases: [], rollbacks: [] };
    throw new Error(`cannot read ${file}: ${err.message}`);
  }
  const base = Array.isArray(raw) ? {} : raw || {};
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.releases) ? raw.releases : [];
  return {
    ...base,
    project: base.project ?? CF_PROJECT,
    releases: list.map(normalizeRelease),
    rollbacks: Array.isArray(base.rollbacks) ? base.rollbacks : [],
  };
}

function saveReleaseState(state, file = RELEASES_PATH) {
  writeJson(file, { ...state, updatedAt: new Date().toISOString() });
}

async function fetchWithTimeout(url, { method = 'GET', headers = {}, body, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method, headers, body, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

function listDeployments() {
  const r = runCapture('npx', ['--no-install', 'wrangler', 'pages', 'deployment', 'list', '--project-name', CF_PROJECT, '--json'], { cwd: APP_DIR });
  return parseWranglerDeploymentOutput(r.stdout || r.stderr);
}

function resolveAccountId(deployments) {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && /^[0-9a-f]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID.trim())) {
    return process.env.CLOUDFLARE_ACCOUNT_ID.trim();
  }
  for (const d of deployments) if (d.accountId) return d.accountId;
  const who = runCapture('npx', ['--no-install', 'wrangler', 'whoami'], { cwd: APP_DIR });
  const m = who.stdout.match(/\b([0-9a-f]{32})\b/i);
  if (m) return m[1];
  throw new Error('could not resolve Cloudflare account id (set CLOUDFLARE_ACCOUNT_ID)');
}

/**
 * Resolves an auth header for the Cloudflare API. Prefers CLOUDFLARE_API_TOKEN,
 * then wrangler's OAuth token (refreshing via `wrangler whoami` if needed).
 * The token value is NEVER printed or logged.
 */
function resolveAuthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_API_TOKEN.trim()) {
    return process.env.CLOUDFLARE_API_TOKEN.trim();
  }
  const candidates = [
    path.join(os.homedir(), 'Library/Preferences/.wrangler/config/default.toml'),
    path.join(os.homedir(), '.config/.wrangler/config/default.toml'),
  ];
  const readToken = () => {
    for (const file of candidates) {
      try {
        const text = fs.readFileSync(file, 'utf8');
        const m = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
        if (m) return m[1];
      } catch { /* ignore */ }
    }
    return null;
  };
  let token = readToken();
  if (!token) {
    runCapture('npx', ['--no-install', 'wrangler', 'whoami'], { cwd: APP_DIR });
    token = readToken();
  }
  if (!token) throw new Error('no Cloudflare API token available (set CLOUDFLARE_API_TOKEN or run `wrangler login`)');
  return token;
}

function cloudflareHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/* ------------------------------- smoke -------------------------------- */

/**
 * Runs the four production smoke checks against `<baseUrl>`. Returns
 * `{ ok, checks, errors }`; never throws for ordinary check failures.
 */
async function runSmoke({ baseUrl = PROD_URL, expectVersion, expectSha } = {}) {
  const base = String(baseUrl || PROD_URL).replace(/\/+$/, '');
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  try {
    const root = await fetchWithTimeout(`${base}/`, { timeoutMs: 30000 });
    const ct = root.headers.get('content-type') || '';
    add('root-html', root.status === 200 && /text\/html/i.test(ct), `HTTP ${root.status} ${ct}`);
  } catch (err) {
    add('root-html', false, `request failed: ${err.message}`);
  }

  try {
    const res = await fetchWithTimeout(`${base}/version.json`, { timeoutMs: 30000 });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    // SPA `_redirects` may serve index.html for unknown paths, so JSON + content-type both matter.
    const ok = res.status === 200 && json && /json/i.test(ct);
    add('version-json', ok, ok ? `v${json.version} sha=${json.gitSha}` : `HTTP ${res.status} ${ct} (not valid /version.json)`);
    if (ok && expectVersion && stripV(json.version) !== stripV(expectVersion)) {
      checks[checks.length - 1].ok = false;
      checks[checks.length - 1].detail = `version ${json.version} != expected ${expectVersion}`;
    }
    if (ok && expectSha && String(json.gitSha || '').toLowerCase() !== String(expectSha).toLowerCase()) {
      checks[checks.length - 1].ok = false;
      checks[checks.length - 1].detail = `sha ${json.gitSha} != expected ${expectSha}`;
    }
  } catch (err) {
    add('version-json', false, `request failed: ${err.message}`);
  }

  try {
    const proxyUrl = `${base}/api/proxy?url=https%3A%2F%2Fpobb.in%2FXii_bN-QbdZn%2Fraw`;
    const res = await fetchWithTimeout(proxyUrl, { timeoutMs: 45000 });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    const ok = res.status === 200 && /^text\/plain/i.test(ct) && text.trim().length > 0;
    add('proxy-function', ok, ok ? `HTTP 200 text/plain (${text.length} bytes)` : `HTTP ${res.status} ${ct} (Functions missing?)`);
  } catch (err) {
    add('proxy-function', false, `request failed: ${err.message}`);
  }

  try {
    const res = await fetchWithTimeout(`${base}${POE2_TREE_PATH}`, { timeoutMs: 45000 });
    const text = await res.text();
    let count = 0;
    try {
      const json = JSON.parse(text);
      count = Array.isArray(json?.nodes) ? json.nodes.length : 0;
    } catch { /* not json */ }
    const ok = res.status === 200 && count > POE2_TREE_MIN_NODES;
    add('poe2-tree', ok, ok ? `${count} nodes` : `HTTP ${res.status}, ${count} nodes (need > ${POE2_TREE_MIN_NODES})`);
  } catch (err) {
    add('poe2-tree', false, `request failed: ${err.message}`);
  }

  const errors = checks.filter((c) => !c.ok);
  return { ok: errors.length === 0, baseUrl: base, checks, errors };
}

function printSmoke(result) {
  console.log(`\nSmoke test against ${result.baseUrl}`);
  for (const c of result.checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`);
  if (result.ok) console.log('  ✓ all smoke checks passed');
  else console.log(`  ✗ ${result.errors.length} smoke check(s) failed`);
}

/* ------------------------------- status ------------------------------- */

async function cmdStatus() {
  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));
  const sha = gitOut(['rev-parse', '--short', 'HEAD']) || 'unknown';
  const branch = gitOut(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';
  const tags = gitOut(['tag', '--points-at', 'HEAD']);
  const tagList = tags ? tags.split(/\r?\n/).filter(Boolean) : [];

  console.log(`\nWebPoB release status`);
  console.log(`  local version : ${pkg.version}`);
  console.log(`  git           : ${branch} @ ${sha}${tagList.length ? ` (tag ${tagList.join(', ')})` : ' (no tag)'}`);

  let live = null;
  try {
    const res = await fetchWithTimeout(`${PROD_URL}/version.json`, { timeoutMs: 20000 });
    const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (res.status === 200 && /json/i.test(ct)) live = JSON.parse(text);
  } catch { /* handled below */ }
  if (live) {
    console.log(`  live version  : ${live.version} sha=${live.gitSha} tag=${live.gitTag || '-'} (${live.builtAt || '?'})`);
  } else {
    console.log('  live version  : (no /version.json yet — 404 before first versioned deploy)');
  }

  const deployments = listDeployments();
  console.log(`\n${formatDeploymentsTable(deployments)}`);

  const state = loadReleaseState();
  console.log(`\n${formatStatusTable(state.releases)}`);
  console.log('');
  return 0;
}

/* ------------------------------- args --------------------------------- */

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith('--')) { positional.push(tok); continue; }
    const key = tok.slice(2);
    const eq = key.indexOf('=');
    if (eq >= 0) { flags[key.slice(0, eq)] = key.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i += 1; }
    else flags[key] = true;
  }
  return { positional, flags };
}

const flagTrue = (v) => v === true || v === 'true' || v === '1' || v === '';

/* ------------------------------ rollback ------------------------------ */

function sanitizeMdCell(val) {
  return String(val ?? '-').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '-';
}

function buildDeployRecordFileName(isoTimestamp, action, version) {
  const ts = isoTimestamp.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}).*$/, '$1-$2$3');
  const kindMap = {
    PROD_DEPLOY: 'prod',
    PREVIEW_DEPLOY: 'preview',
    ROLLBACK: 'rollback',
    AUTO_ROLLBACK: 'auto-rollback',
    STAGING: 'staging',
  };
  const kind = kindMap[action] || String(action || 'deploy').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const slug = String(version || 'unknown').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${ts}-${kind}-${slug}.md`;
}

function renderDeployRecordMarkdown(entry) {
  const isRollback = entry.action === 'ROLLBACK' || entry.action === 'AUTO_ROLLBACK';
  const title = isRollback
    ? `# ${entry.action === 'AUTO_ROLLBACK' ? 'Auto-Rollback' : 'Rollback'} Record: Revert to ${entry.version}`
    : `# ${entry.env} Release Record: ${entry.version}`;
  const smokeLines = Array.isArray(entry.smokeChecks) && entry.smokeChecks.length > 0
    ? entry.smokeChecks.map((c) => `- \`${c.name}\`: ${c.ok ? 'PASS' : 'FAIL'} — ${c.detail}`).join('\n')
    : `- ${entry.result}`;

  if (isRollback) {
    return [
      title,
      '',
      `- **Timestamp (UTC)**: ${entry.at}`,
      `- **Action**: \`${entry.action}\``,
      `- **Environment**: ${entry.env} (${PROD_URL})`,
      `- **Replaced Deployment**: \`${entry.replacedDeployment || '-'}\``,
      `- **Restored Target**: \`${entry.version}\` (\`${entry.commit}\` / Deployment \`${entry.deployment}\`)`,
      `- **Method**: \`${entry.method || 'instant'}\``,
      `- **Post-Rollback Smoke**: ${entry.result}`,
      '',
      '## Reason & Postmortem',
      '',
      `- **Trigger / Impact**: ${entry.note || 'Manual rollback triggered.'}`,
      '- **Root Cause**: TBD — update after investigation.',
      '- **Follow-up Fix**: TBD — link fix commit/PR before re-releasing.',
      '',
      '## Smoke Check Details',
      '',
      smokeLines,
      '',
    ].join('\n');
  }

  return [
    title,
    '',
    `- **Timestamp (UTC)**: ${entry.at}`,
    `- **Action**: \`${entry.action}\``,
    `- **Environment**: ${entry.env} (${entry.previewUrl || PROD_URL})`,
    `- **Version / Tag**: \`${entry.version}\``,
    `- **Commit**: \`${entry.commit}\``,
    `- **Deployment**: \`${entry.deployment}\`${entry.previewUrl ? ` (${entry.previewUrl})` : ''}`,
    `- **Smoke Result**: ${entry.result}`,
    '',
    '## Summary',
    '',
    `- ${entry.note || `Release ${entry.version}`}`,
    '',
    '## Smoke Check Details',
    '',
    smokeLines,
    '',
    '## Rollback Command',
    '',
    '```bash',
    'pnpm release:rollback -- --prev --reason "<incident reason>"',
    '```',
    '',
  ].join('\n');
}

function writeDeployRecordAndIndex(docsDir, entry, fileName, recordMarkdown) {
  const deploysDir = path.join(docsDir, 'deploys');
  fs.mkdirSync(deploysDir, { recursive: true });
  fs.writeFileSync(path.join(deploysDir, fileName), recordMarkdown, 'utf8');

  const logPath = path.join(docsDir, 'DEPLOY_LOG.md');
  const header =
    '# WebPoB Deploy & Rollback Index\n\n' +
    'This file is an **index only**. Individual records live under [`docs/deploys/`](./deploys/).\n\n' +
    '| Timestamp (UTC) | Action | Env | Version | Commit | Deployment | Result | Record |\n' +
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';
  const current = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : header;
  const link = `[${fileName}](./deploys/${fileName})`;
  const row = `| ${entry.at} | \`${sanitizeMdCell(entry.action)}\` | ${sanitizeMdCell(entry.env)} | \`${sanitizeMdCell(entry.version)}\` | \`${sanitizeMdCell(entry.commit)}\` | \`${sanitizeMdCell(entry.deployment)}\` | ${sanitizeMdCell(entry.result)} | ${link} |`;
  const lines = current.split('\n');
  const sepIdx = lines.findIndex((l) => l.startsWith('| :---'));
  if (sepIdx >= 0) {
    lines.splice(sepIdx + 1, 0, row);
    fs.writeFileSync(logPath, `${lines.join('\n').trimEnd()}\n`, 'utf8');
  } else {
    fs.writeFileSync(logPath, `${current.trimEnd()}\n${row}\n`, 'utf8');
  }
}

function recordDeployLog(rawEntry) {
  const entry = { at: new Date().toISOString(), ...rawEntry };
  const fileName = buildDeployRecordFileName(entry.at, entry.action, entry.version);
  const recordMarkdown = renderDeployRecordMarkdown(entry);
  writeDeployRecordAndIndex(path.join(REPO_ROOT, 'docs'), entry, fileName, recordMarkdown);
}

function setActiveRelease(state, deploymentId) {
  state.releases = state.releases.map((r) => {
    if (sameId(r.deploymentId, deploymentId)) return { ...r, status: 'active' };
    if (/active$/i.test(String(r.status || ''))) return { ...r, status: 'previous' };
    return r;
  });
}

async function instantRollback({ deploymentId, dryRun = false } = {}) {
  const deployments = listDeployments();
  const accountId = resolveAccountId(deployments);
  if (dryRun) {
    return { dryRun: true, accountId, deploymentId, url: `${CF_API_BASE}/accounts/${accountId}/pages/projects/${CF_PROJECT}/deployments/${deploymentId}/rollback` };
  }
  const token = resolveAuthToken();
  const url = `${CF_API_BASE}/accounts/${accountId}/pages/projects/${CF_PROJECT}/deployments/${deploymentId}/rollback`;
  const res = await fetchWithTimeout(url, { method: 'POST', headers: cloudflareHeaders(token), body: '{}', timeoutMs: 30000 });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success !== true) {
    const detail = body?.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`Cloudflare rollback API failed: ${detail}`);
  }
  return { success: true, accountId, deploymentId, result: body.result };
}

function worktreeRebuild({ release, dryRun = false } = {}) {
  const gitRef = release.gitRef || release.tag || release.commit;
  if (!gitRef) throw new Error('--rebuild requires a git tag/commit (e.g. `rollback v0.1.0 --rebuild`)');
  if (dryRun) {
    const plannedDir = path.join(os.tmpdir(), 'webpob-release-<tmp>');
    return { dryRun: true, gitRef, tmpDir: plannedDir, steps: [`git worktree add --detach ${plannedDir} ${gitRef}`, 'pnpm install && pnpm build', 'wrangler pages deploy dist --project-name webpob --branch main'] };
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webpob-release-'));
  try {
    runInherit('git', ['worktree', 'add', '--detach', tmpDir, gitRef]);
    runInherit('pnpm', ['install', '--prefer-offline'], { cwd: tmpDir });
    runInherit('pnpm', ['-r', 'build'], { cwd: tmpDir });
    runInherit('npx', ['--no-install', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', CF_PROJECT, '--branch', 'main'], { cwd: path.join(tmpDir, 'apps/web') });
    return { success: true, gitRef, tmpDir };
  } finally {
    runCapture('git', ['worktree', 'remove', '--force', tmpDir]);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function cmdRollback(positional, flags) {
  const dryRun = flagTrue(flags['dry-run']);
  const rebuild = flagTrue(flags.rebuild);
  const target = positional[0];
  const state = loadReleaseState();
  const deployments = listDeployments();
  const resolved = resolveRollbackTarget({
    target,
    rebuild,
    releases: state.releases,
    deployments,
  });

  console.log(`\nRollback target: ${resolved.note}`);
  if (resolved.deploymentId) console.log(`  deployment : ${resolved.deploymentId}`);
  if (resolved.commit) console.log(`  commit     : ${resolved.commit}`);
  console.log(`  resolved   : ${resolved.source}${resolved.previousTo ? ` (replacing ${String(resolved.previousTo).slice(0, 8)})` : ''}`);

  if (rebuild) {
    const result = worktreeRebuild({ release: resolved, dryRun });
    if (result.dryRun) {
      console.log('  [dry-run] rebuild steps:');
      for (const s of result.steps) console.log(`    - ${s}`);
      return 0;
    }
    console.log(`  ✓ rebuilt & deployed from ${result.gitRef}`);
    const smoke = await runSmoke({ baseUrl: PROD_URL });
    printSmoke(smoke);
    if (!dryRun) {
      const reason = typeof flags.reason === 'string' && flags.reason ? flags.reason : `rebuild rollback via ${result.gitRef}`;
      state.rollbacks.unshift({ at: new Date().toISOString(), target: resolved.tag || resolved.version || resolved.commit, via: 'rebuild', reason, smokeOk: smoke.ok });
      setActiveRelease(state, resolved.deploymentId);
      saveReleaseState(state);
      recordDeployLog({
        action: flags._auto ? 'AUTO_ROLLBACK' : 'ROLLBACK',
        env: 'Production',
        version: resolved.tag || (resolved.version ? `v${resolved.version}` : '-'),
        commit: resolved.commit || result.gitRef || '-',
        deployment: `rebuild:${result.gitRef}`,
        replacedDeployment: resolved.previousTo ? String(resolved.previousTo).slice(0, 8) : '-',
        method: 'rebuild',
        result: smoke.ok ? `Smoke ${smoke.checks.length}/${smoke.checks.length} PASS` : 'Smoke FAIL',
        smokeChecks: smoke.checks,
        note: reason,
      });
    }
    return smoke.ok ? 0 : 1;
  }

  if (!resolved.deploymentId) throw new Error('resolved target has no deployment id (use --rebuild for git-tag rollbacks)');
  const result = await instantRollback({ deploymentId: resolved.deploymentId, dryRun });
  if (result.dryRun) {
    console.log(`  [dry-run] would POST ${result.url}`);
    return 0;
  }
  console.log(`  ✓ Cloudflare rollback succeeded (${String(resolved.deploymentId).slice(0, 8)})`);

  const smoke = await runSmoke({ baseUrl: PROD_URL });
  printSmoke(smoke);
  const reason = typeof flags.reason === 'string' && flags.reason ? flags.reason : 'instant rollback';
  state.rollbacks.unshift({
    at: new Date().toISOString(),
    target: resolved.tag || resolved.version || String(resolved.deploymentId).slice(0, 8),
    deploymentId: resolved.deploymentId,
    via: 'instant',
    reason,
    smokeOk: smoke.ok,
  });
  setActiveRelease(state, resolved.deploymentId);
  saveReleaseState(state);
  recordDeployLog({
    action: flags._auto ? 'AUTO_ROLLBACK' : 'ROLLBACK',
    env: 'Production',
    version: resolved.tag || (resolved.version ? `v${resolved.version}` : '-'),
    commit: resolved.commit || '-',
    deployment: resolved.previousTo
      ? `${String(resolved.previousTo).slice(0, 8)} -> ${String(resolved.deploymentId).slice(0, 8)}`
      : String(resolved.deploymentId).slice(0, 8),
    replacedDeployment: resolved.previousTo ? String(resolved.previousTo).slice(0, 8) : '-',
    method: 'instant',
    result: smoke.ok ? `Smoke ${smoke.checks.length}/${smoke.checks.length} PASS` : 'Smoke FAIL',
    smokeChecks: smoke.checks,
    note: reason,
  });
  return smoke.ok ? 0 : 1;
}

/* ------------------------------- deploy ------------------------------- */

function isGitDirty() {
  const out = gitOut(['status', '--porcelain']);
  return out.length > 0;
}

function updatePackageVersion(file, version) {
  if (!fs.existsSync(file)) return false;
  const pkg = readJson(file);
  if (!pkg.version) return false;
  pkg.version = version;
  writeJson(file, pkg);
  return true;
}

function prependChangelog(version, notes) {
  const file = path.join(REPO_ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(file)) return false;
  const date = new Date().toISOString().slice(0, 10);
  const current = fs.readFileSync(file, 'utf8');
  const entry = `## v${version} - ${date}\n\n${notes ? `- ${notes}\n` : ''}\n`;
  fs.writeFileSync(file, `${entry}${current}`);
  return true;
}

async function cmdDeploy(flags) {
  const dryRun = flagTrue(flags['dry-run']);
  const preview = flagTrue(flags.preview);
  const skipTests = flagTrue(flags['skip-tests']);
  const autoRollback = flagTrue(flags['auto-rollback']);
  const allowDirty = flagTrue(flags['allow-dirty']);
  const bump = typeof flags.bump === 'string' ? flags.bump : flagTrue(flags.bump) ? 'patch' : 'none';
  const notes = typeof flags.notes === 'string' ? flags.notes : '';

  if (!dryRun && !preview && !allowDirty && isGitDirty()) {
    throw new Error('working tree is dirty — commit/stash first, or pass --preview / --allow-dirty');
  }

  const pkg = readJson(path.join(REPO_ROOT, 'package.json'));
  const nextVersion = bump === 'none' ? pkg.version : bumpSemver(pkg.version, bump);
  const tag = `v${nextVersion}`;
  const branch = preview ? `preview-${gitOut(['rev-parse', '--short', 'HEAD']) || 'local'}` : 'main';
  const shouldVersion = bump !== 'none' && !preview;

  console.log(`\nDeploy plan${dryRun ? ' (dry-run)' : ''}`);
  console.log(`  project   : ${CF_PROJECT}`);
  console.log(`  version   : ${pkg.version}${shouldVersion ? ` -> ${nextVersion}` : ''}`);
  console.log(`  branch    : ${branch}`);
  console.log(`  target    : ${preview ? 'preview' : PROD_URL}`);

  if (dryRun) {
    console.log('  [dry-run] planned steps:');
    if (!skipTests) console.log('    - pnpm typecheck && pnpm test && pnpm build');
    else console.log('    - pnpm build');
    if (shouldVersion) {
      console.log(`    - bump package.json (and apps/web/package.json) to ${nextVersion}`);
      console.log('    - update CHANGELOG.md if present');
      console.log(`    - git commit -m "release: ${tag}" && git tag -a ${tag}`);
    }
    console.log(`    - (cwd apps/web) wrangler pages deploy dist --project-name ${CF_PROJECT} --branch ${branch}`);
    console.log(`    - smoke ${preview ? '<preview-url>' : PROD_URL}`);
    return 0;
  }

  if (!skipTests) {
    console.log('\nRunning typecheck and tests…');
    runInherit('pnpm', ['typecheck']);
    runInherit('pnpm', ['test']);
  }

  // Capture current live production deployment BEFORE deploying so --auto-rollback restores it exactly.
  const prevProdDeploymentId = !preview
    ? listDeployments().find((d) => /^prod/i.test(d.environment))?.id || null
    : null;

  if (shouldVersion) {
    updatePackageVersion(path.join(REPO_ROOT, 'package.json'), nextVersion);
    updatePackageVersion(path.join(APP_DIR, 'package.json'), nextVersion);
    prependChangelog(nextVersion, notes);
    const versionedFiles = ['package.json', 'apps/web/package.json', 'CHANGELOG.md']
      .filter((rel) => fs.existsSync(path.join(REPO_ROOT, rel)));
    runInherit('git', ['add', ...versionedFiles]);
    runInherit('git', ['commit', '-m', `release: ${tag}`, '--allow-empty']);
    runInherit('git', ['tag', '-a', tag, '-m', `release ${tag}`]);
    console.log(`  ✓ tagged ${tag}`);
  }

  // Build AFTER version bump/tag so dist/version.json & __APP_VERSION__ stamp the exact release version & SHA.
  console.log('\nBuilding production bundle…');
  runInherit('pnpm', ['build']);

  if (!fs.existsSync(DIST_DIR)) throw new Error(`missing build output at ${DIST_DIR} (run pnpm build)`);

  // CRITICAL: run wrangler from apps/web so apps/web/functions/api/proxy.ts is bundled.
  const deploy = runCapture('npx', ['--no-install', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', CF_PROJECT, '--branch', branch], { cwd: APP_DIR, timeout: 600000 });
  const combined = `${deploy.stdout}\n${deploy.stderr}`;
  process.stdout.write(combined);
  if (deploy.status !== 0) throw new Error('wrangler pages deploy failed');
  const urlMatch = combined.match(/https:\/\/([0-9a-f]{8})\.webpob\.pages\.dev/i);
  if (!urlMatch) throw new Error('could not parse deployment URL from wrangler output');
  const shortHash = urlMatch[1];
  const previewUrl = `https://${shortHash}.webpob.pages.dev`;

  const deployments = listDeployments();
  const matching = deployments.find((d) => d.shortId === shortHash || idPrefixMatch(d.id, shortHash));
  const deploymentId = matching?.id || null;
  console.log(`  ✓ deployed ${previewUrl} (${deploymentId ? deploymentId.slice(0, 8) : 'id pending'})`);

  const smokeBase = preview ? previewUrl : PROD_URL;
  const sha = gitOut(['rev-parse', '--short', 'HEAD']);
  let smoke = await runSmoke({ baseUrl: smokeBase, expectVersion: preview ? undefined : nextVersion, expectSha: undefined });
  if (!smoke.ok) {
    // Allow 2.5s for Cloudflare Pages edge route propagation before retrying once.
    await new Promise((r) => setTimeout(r, 2500));
    smoke = await runSmoke({ baseUrl: smokeBase, expectVersion: preview ? undefined : nextVersion, expectSha: undefined });
  }
  printSmoke(smoke);

  if (!smoke.ok && !preview && autoRollback) {
    console.log('\n  ⚠ prod smoke failed — auto-rollback to previous healthy release…');
    await cmdRollback(
      prevProdDeploymentId ? [prevProdDeploymentId] : [],
      prevProdDeploymentId
        ? { _auto: true, reason: `auto-rollback: prod smoke failed for v${nextVersion}` }
        : { prev: true, _auto: true, reason: `auto-rollback: prod smoke failed for v${nextVersion}` },
    );
    return 1;
  }

  const state = loadReleaseState();
  if (shouldVersion || preview) {
    if (smoke.ok && !preview) {
      for (const r of state.releases) if (/active$/i.test(String(r.status || ''))) r.status = 'previous';
    }
    state.releases.unshift({
      version: nextVersion,
      tag: shouldVersion ? tag : '',
      commit: sha,
      deploymentId,
      previewUrl,
      branch,
      notes: notes || (preview ? 'preview deploy' : `release ${tag}`),
      status: preview ? 'preview' : smoke.ok ? 'active' : 'smoke-failed',
      deployedAt: new Date().toISOString(),
    });
    saveReleaseState(state);
    recordDeployLog({
      action: preview ? 'PREVIEW_DEPLOY' : 'PROD_DEPLOY',
      env: preview ? 'Preview' : 'Production',
      version: shouldVersion ? tag : `v${nextVersion}`,
      commit: sha || '-',
      deployment: deploymentId ? String(deploymentId).slice(0, 8) : shortHash,
      previewUrl,
      result: smoke.ok ? `Smoke ${smoke.checks.length}/${smoke.checks.length} PASS` : 'Smoke FAIL',
      smokeChecks: smoke.checks,
      note: notes || (preview ? `preview ${previewUrl}` : `release ${tag}`),
    });
  }
  return smoke.ok ? 0 : 1;
}

/* -------------------------------- main -------------------------------- */

async function cmdSmoke(flags) {
  const baseUrl = typeof flags.url === 'string' ? flags.url : PROD_URL;
  const result = await runSmoke({
    baseUrl,
    expectVersion: typeof flags['expect-version'] === 'string' ? flags['expect-version'] : undefined,
    expectSha: typeof flags['expect-sha'] === 'string' ? flags['expect-sha'] : undefined,
  });
  printSmoke(result);
  return result.ok ? 0 : 1;
}

export async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parseArgs(argv);
  const command = positional.shift() || 'status';
  try {
    switch (command) {
      case 'status':
        return await cmdStatus();
      case 'smoke':
        return await cmdSmoke(flags);
      case 'deploy':
        return await cmdDeploy(flags);
      case 'rollback':
        return await cmdRollback(positional, flags);
      case '-h':
      case '--help':
      case 'help':
        console.log('Usage: node scripts/release.mjs <status|smoke|deploy|rollback> [options]');
        return 0;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Usage: node scripts/release.mjs <status|smoke|deploy|rollback> [options]');
        return 2;
    }
  } catch (err) {
    console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main().then((code) => { process.exitCode = code; });
}
