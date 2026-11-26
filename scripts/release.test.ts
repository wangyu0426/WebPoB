// @ts-nocheck
/**
 * Unit tests for scripts/release.mjs pure helpers.
 *
 * NOTE: vitest.config.ts currently only includes `packages/**` and `apps/**`,
 * so `pnpm test` will not pick this file up automatically. It is still runnable
 * and CI-ready via: `npx vitest run scripts/release.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import * as release from './release.mjs';

const {
  CF_PROJECT,
  PROD_URL,
  PROXY_SMOKE_URL,
  bumpSemver,
  buildVersionPayload,
  extractAccountIdFromDashboardUrl,
  parseWranglerDeploymentOutput,
  formatStatusTable,
  formatDeploymentsTable,
  resolveRollbackTarget,
} = release;

const RELEASES = [
  {
    version: '0.1.1',
    tag: 'v0.1.1',
    commit: 'a1b2c3d',
    deploymentId: '11111111-1111-4111-8111-111111111111',
    previewUrl: 'https://11111111.example.test',
    status: 'active',
    notes: 'Full poedb/PoeCharm ZH tree & gem localization',
  },
  {
    version: '0.1.0',
    tag: 'v0.1.0',
    commit: 'b2c3d4e',
    deploymentId: '22222222-2222-4222-8222-222222222222',
    previewUrl: 'https://22222222.example.test',
    status: 'previous',
    notes: 'Mobile RWD overhaul',
  },
  {
    version: '0.0.9',
    tag: 'v0.0.9',
    commit: '0000001',
    deploymentId: 'deadbeef-0000-4000-8000-000000000000',
    status: 'previous',
    notes: 'older',
  },
];

const DEPLOYMENTS = [
  { id: '11111111-1111-4111-8111-111111111111', shortId: '11111111', environment: 'Production', branch: 'main', source: 'a1b2c3d', url: 'https://11111111.example.test', status: '11 minutes ago', accountId: '00000000000000000000000000000001' },
  { id: '22222222-2222-4222-8222-222222222222', shortId: '22222222', environment: 'Production', branch: 'main', source: 'c3d4e5f', url: 'https://22222222.example.test', status: '58 minutes ago', accountId: '00000000000000000000000000000001' },
  { id: '33333333-3333-4333-8333-333333333333', shortId: '33333333', environment: 'Production', branch: 'main', source: 'c3d4e5f', url: 'https://33333333.example.test', status: '1 hour ago', accountId: '00000000000000000000000000000001' },
];

const LIVE_ID = '11111111-1111-4111-8111-111111111111';

describe('constants', () => {
  it('exposes the expected Cloudflare project + URLs', () => {
    expect(CF_PROJECT).toBe('webpob');
    expect(PROD_URL).toBe('https://webpob.pages.dev');
    expect(PROXY_SMOKE_URL).toContain('/api/proxy?url=');
    expect(PROXY_SMOKE_URL).toContain('pobb.in%2FXii_bN-QbdZn%2Fraw');
  });
});

describe('bumpSemver', () => {
  it('bumps patch/minor/major', () => {
    expect(bumpSemver('0.1.0', 'patch')).toBe('0.1.1');
    expect(bumpSemver('0.1.0', 'minor')).toBe('0.2.0');
    expect(bumpSemver('0.1.0', 'major')).toBe('1.0.0');
    expect(bumpSemver('1.9.9', 'patch')).toBe('1.9.10');
    expect(bumpSemver('1.9.9', 'minor')).toBe('1.10.0');
    expect(bumpSemver('1.9.9', 'major')).toBe('2.0.0');
  });
  it('treats none as a no-op', () => {
    expect(bumpSemver('0.1.0', 'none')).toBe('0.1.0');
  });
  it('strips a leading v and ignores pre-release/build metadata', () => {
    expect(bumpSemver('v1.2.3', 'patch')).toBe('1.2.4');
    expect(bumpSemver('v1.2.3-beta.1+build5', 'minor')).toBe('1.3.0');
  });
  it('throws on invalid input or unknown bump', () => {
    expect(() => bumpSemver('nope', 'patch')).toThrow(/invalid semver/);
    expect(() => bumpSemver('1.2', 'patch')).toThrow(/invalid semver/);
    expect(() => bumpSemver('1.2.3', 'huge')).toThrow(/unknown bump/);
  });
});

describe('buildVersionPayload', () => {
  it('produces the full /version.json shape', () => {
    const p = buildVersionPayload({ version: '0.1.2', gitSha: 'abc1234', gitTag: 'v0.1.2', branch: 'main' });
    expect(p).toMatchObject({ version: '0.1.2', gitSha: 'abc1234', gitTag: 'v0.1.2', branch: 'main' });
    expect(typeof p.builtAt).toBe('string');
    expect(Number.isNaN(Date.parse(p.builtAt))).toBe(false);
  });
  it('defaults gitSha to dev and empty tag', () => {
    const p = buildVersionPayload({ version: '1.0.0' });
    expect(p.gitSha).toBe('dev');
    expect(p.gitTag).toBe('');
    expect(p.branch).toBe('main');
  });
  it('throws without a version', () => {
    expect(() => buildVersionPayload({})).toThrow(/version required/);
  });
});

describe('extractAccountIdFromDashboardUrl', () => {
  it('pulls the 32-hex account id out of a dashboard URL', () => {
    const url = 'https://dash.cloudflare.com/00000000000000000000000000000001/pages/view/example-project/11111111';
    expect(extractAccountIdFromDashboardUrl(url)).toBe('00000000000000000000000000000001');
  });
  it('returns null for non-matching input', () => {
    expect(extractAccountIdFromDashboardUrl('')).toBeNull();
    expect(extractAccountIdFromDashboardUrl('https://example.com/foo')).toBeNull();
  });
});

describe('parseWranglerDeploymentOutput', () => {
  it('parses the JSON array form', () => {
    const json = JSON.stringify([
      { Id: '11111111-1111-4111-8111-111111111111', Environment: 'Production', Branch: 'main', Source: 'a1b2c3d', Deployment: 'https://11111111.example.test', Status: '11 minutes ago', Build: 'https://dash.cloudflare.com/00000000000000000000000000000001/pages/view/example-project/11111111' },
    ]);
    const out = parseWranglerDeploymentOutput(json);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      shortId: '11111111',
      environment: 'Production',
      branch: 'main',
      source: 'a1b2c3d',
      url: 'https://11111111.example.test',
      accountId: '00000000000000000000000000000001',
    });
  });
  it('unwraps the {result:[...]} envelope', () => {
    const out = parseWranglerDeploymentOutput(JSON.stringify({ result: [{ id: 'deadbeef-0000-4000-8000-000000000000', environment: 'Production' }] }));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('deadbeef-0000-4000-8000-000000000000');
  });
  it('parses the box-drawing table form', () => {
    const table = [
      '┌──────────────────────────────────────┬─────────────┬────────┬─────────┬───────────────────────────────────┬────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐',
      '│ Id                                   │ Environment │ Branch │ Source  │ Deployment                        │ Status         │ Build                                                                                                               │',
      '├──────────────────────────────────────┼─────────────┼────────┼─────────┼───────────────────────────────────┼────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤',
      '│ 22222222-2222-4222-8222-222222222222 │ Production  │ main   │ c3d4e5f │ https://22222222.example.test │ 58 minutes ago │ https://dash.cloudflare.com/00000000000000000000000000000001/pages/view/example-project/22222222-2222-4222-8222-222222222222 │',
      '└──────────────────────────────────────┴─────────────┴────────┴─────────┴───────────────────────────────────┴────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘',
    ].join('\n');
    const out = parseWranglerDeploymentOutput(table);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: '22222222-2222-4222-8222-222222222222',
      environment: 'Production',
      source: 'c3d4e5f',
      url: 'https://22222222.example.test',
      accountId: '00000000000000000000000000000001',
    });
  });
  it('returns [] for empty output', () => {
    expect(parseWranglerDeploymentOutput('')).toEqual([]);
    expect(parseWranglerDeploymentOutput('   \n')).toEqual([]);
  });
});

describe('resolveRollbackTarget', () => {
  it('--prev picks the most recent healthy prod deployment older than the live one', () => {
    const r = resolveRollbackTarget({ releases: RELEASES, deployments: DEPLOYMENTS, liveDeploymentId: LIVE_ID });
    expect(r.deploymentId).toBe('22222222-2222-4222-8222-222222222222');
    expect(r.version).toBe('0.1.0');
    expect(r.previousTo).toBe(LIVE_ID);
  });
  it('resolves an explicit semver from releases.json', () => {
    const r = resolveRollbackTarget({ target: 'v0.1.0', releases: RELEASES, deployments: DEPLOYMENTS });
    expect(r.deploymentId).toBe('22222222-2222-4222-8222-222222222222');
    expect(r.source).toBe('releases.json');
    expect(r.tag).toBe('v0.1.0');
  });
  it('resolves an explicit 8-char deployment prefix', () => {
    const r = resolveRollbackTarget({ target: '22222222', releases: RELEASES, deployments: DEPLOYMENTS });
    expect(r.deploymentId).toBe('22222222-2222-4222-8222-222222222222');
    expect(r.source).toBe('wrangler deployment list');
  });
  it('resolves an explicit full deployment UUID', () => {
    const r = resolveRollbackTarget({ target: '33333333-3333-4333-8333-333333333333', releases: RELEASES, deployments: DEPLOYMENTS });
    expect(r.deploymentId).toBe('33333333-3333-4333-8333-333333333333');
  });
  it('falls back to a git tag when --rebuild is set for an unknown version', () => {
    const r = resolveRollbackTarget({ target: 'v9.9.9', rebuild: true, releases: RELEASES, deployments: DEPLOYMENTS });
    expect(r.gitRef).toBe('v9.9.9');
    expect(r.source).toBe('git tag');
  });
  it('throws for an unknown target with no rebuild', () => {
    expect(() => resolveRollbackTarget({ target: 'v9.9.9', releases: RELEASES, deployments: DEPLOYMENTS })).toThrow(/no release/);
    expect(() => resolveRollbackTarget({ target: 'zzzzzzzz', releases: RELEASES, deployments: DEPLOYMENTS })).toThrow(/no deployment/);
  });
  it('throws when there is nothing older to roll back to', () => {
    expect(() => resolveRollbackTarget({ releases: [RELEASES[0]], deployments: [DEPLOYMENTS[0]], liveDeploymentId: LIVE_ID })).toThrow(/no previous healthy/);
  });
  it('skips explicitly unhealthy releases when searching', () => {
    const releases = [
      RELEASES[0],
      { ...RELEASES[1], status: 'broken' },
      RELEASES[2],
    ];
    const r = resolveRollbackTarget({ releases, deployments: [], liveDeploymentId: LIVE_ID });
    expect(r.deploymentId).toBe('deadbeef-0000-4000-8000-000000000000');
  });
});

describe('formatStatusTable', () => {
  it('renders rows for each release', () => {
    const out = formatStatusTable(RELEASES);
    expect(out).toContain('VERSION');
    expect(out).toContain('v0.1.1');
    expect(out).toContain('v0.1.0');
    expect(out).toContain('active');
  });
  it('honours maxRows', () => {
    const out = formatStatusTable(RELEASES, { maxRows: 1 });
    expect(out).toContain('v0.1.1');
    expect(out).not.toContain('v0.1.0');
  });
  it('shows a placeholder when empty', () => {
    expect(formatStatusTable([])).toContain('(no releases recorded)');
  });
});

describe('formatDeploymentsTable', () => {
  it('renders short ids and urls', () => {
    const out = formatDeploymentsTable(DEPLOYMENTS);
    expect(out).toContain('DEPLOYMENT');
    expect(out).toContain('11111111');
    expect(out).toContain('https://22222222.example.test');
  });
  it('shows a placeholder when empty', () => {
    expect(formatDeploymentsTable([])).toContain('(none)');
  });
});
