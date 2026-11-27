# AGENTS.md — `WebPoB` Engineering, Privacy, Testing & Release Standard

This document is binding for all AI Agents (Codex, Claude, Antigravity, Orca Workers) operating in the public `WebPoB` repository. Private data extraction, staging QA ops, and internal procedures live in the maintainer runbook outside this repo.

---

## 1. Repository Architecture & Boundaries

`WebPoB` is a **public MIT open-source, zero-backend, bilingual (EN / ZH-CN) Path of Building web viewer & calculation engine** supporting both **Path of Exile 1** and **Path of Exile 2**.

| Path | Responsibility |
| :--- | :--- |
| `packages/core` | Shared TypeScript types (`BuildData`, `GameId`, `PassiveTreeData`, items, skills, calcs). |
| `packages/data` | Data contract loader (`manifest.json`), multi-version passive tree registry, dynamic class/ascendancy & gem/base/unique loaders. |
| `packages/i18n` | Bilingual `en` / `zh-CN` UI dictionaries, locale detection, `?lang=` override, and stat localization helpers. |
| `packages/codec` | PoB base64/zlib XML encode/decode, `pobb.in` / `poe.ninja` / pastebin share-link resolution, and character import. |
| `packages/calc` | Pure-TypeScript stat/DPS/EHP calculation engine, Web Worker entry, LuaJIT Oracle differential tests, and `poe.ninja` regression suite. |
| `apps/web` | React + Vite + Tailwind frontend, Canvas passive tree renderer, multi-spec tree diff, Service Worker (`public/sw.js`), and `_headers`. |
| `apps/web/functions/api/proxy.ts` | Cloudflare Pages Function CORS proxy for live `pobb.in` / `poe.ninja` imports. |
| `apps/web/public/data/` | Versioned static JSON contract (`manifest.json`, trees, classes, gems, bases, uniques, ascendancy art). |
| `scripts/` | Public verification & release tooling (`verify-ninja-e2e.mjs`, `release.mjs`, `release.test.ts`, `sync-data/`, `oracle-diff/`). |

### Core Engineering Invariants

1. **Dual-Game & Bilingual Parity**: Every user-facing feature MUST work for both PoE 1 and PoE 2, and support both `en` and `zh-CN` (never render raw English keys or PoE 2 `[Key|Display]` markup in `zh-CN` UI/drawers; always honor `statsZh` when present).
2. **Mobile & Desktop RWD**: UI changes MUST remain clean at Desktop (`1440×860`) and Mobile (`390×844`) with zero horizontal overflow (`scrollWidth <= clientWidth`).
3. **Backward-Compatible Data Contract**: Never remove or break existing versioned passive tree entries in `apps/web/public/data/manifest.json` — historical shared build URLs depend on them.
4. **Cache Hygiene**: Keep `apps/web/public/sw.js` Network-First for `/data/*` and bump the SW cache version whenever caching strategy changes; keep `/version.json` `Cache-Control: no-store` in `apps/web/public/_headers`.
5. **Cloudflare Pages Function Integrity**: Never deploy `apps/web/dist` from the repo root (`wrangler pages deploy` MUST run from `apps/web` via `scripts/release.mjs`, otherwise `/api/proxy` is dropped).

---

## 2. Mandatory Privacy, PII & Secret Leak Gate

Because `WebPoB` is a **public open-source repository**, every AI Agent MUST pass every check below before any commit, tag, release, or push:

### 2.1 Public Git Identity Check
```bash
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```
- Both MUST show a public maintainer identity or GitHub `noreply` address (e.g., `<id>+<handle>@users.noreply.github.com` or `WebPoB Maintainer <webpob-maintainer@example.invalid>`).
- **Never** commit or tag with a local OS username, `.local` hostname, or personal email. Fix with `git config --local user.name` and `git config --local user.email` first.

### 2.2 Zero-Tolerance Prohibited Content
Across **all** tracked code, test fixtures, docs, commit messages, release `--notes`, and rollback `--reason`:
- Local filesystem paths (`/Users/...`, `/home/...`, `C:\Users\...`), machine hostnames (`.local`), or personal usernames/emails.
- Real cloud account IDs (e.g., 32-hex Cloudflare Account IDs), API tokens, OAuth tokens, cookies, `.env*` / `.dev.vars*`, `.npmrc`, or private keys. Tests and docs MUST use synthetic placeholders (`00000000000000000000000000000001`, `11111111-1111-4111-8111-111111111111`, `example.test`).
- Private repository names, internal staging/ops URLs, or hardcoded sibling paths (log mirroring is strictly opt-in via `WEBPOB_RELEASE_MIRROR_DOCS_DIR`).
- Unredacted screenshots, recordings, or browser dumps containing personal bookmarks, emails, or accounts.

### 2.3 Safe Staging & Staged-Diff Scan
- **Never** run `git add -A` or `git add .` blindly. Stage explicit paths and review `git status -s` + `git diff --cached --stat`.
- Run this scan on staged additions before every commit (excluding documentation regex examples):
```bash
git diff --cached --unified=0 -- ':!AGENTS.md' \
  | grep -E '^\+[^+]' \
  | grep -nE '(/Users/|/home/|C:\\Users\\|\.local\b|dash\.cloudflare\.com/[0-9a-f]{32}|gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|BEGIN .*PRIVATE KEY)' \
  && echo "FAIL: potential privacy/secret leak in staged diff" && exit 1 \
  || echo "PASS: staged diff privacy scan clean"
```

### 2.4 Leak Response Protocol
If personal metadata or a secret is ever committed to a public branch or tag:
1. **Stop immediately** — do not push additional commits on top.
2. **Rotate any exposed credential/token first.**
3. Scrub affected commits and tags cleanly, re-verify `git log --all` and remote refs, and confirm local `.git/config` identity before pushing.

---

## 3. Verification Matrix (Mandatory Before Commit / Release)

| Change Scope | Required Checks |
| :--- | :--- |
| **Any code, test, or data change** | `pnpm typecheck && pnpm test && pnpm build` (100% pass across `calc`, `oracle`, `ninjaRegression`, `codec`, `manifest`, and `release` suites) |
| **UI, passive tree, i18n, RWD, or codec import/export** | Above **+** `BASE_URL=http://127.0.0.1:4173 pnpm test:e2e:ninja` (12 PoE 1 & PoE 2 `poe.ninja` builds across Desktop `1440×860` & Mobile `390×844`, 0 console/page errors, 0 overflow) |
| **Static data / `manifest.json` / tree updates** | Above **+** staging QA release gate (`READY TO RELEASE`) via maintainer runbook |
| **Docs-only (`*.md`)** | Verify relative Markdown links + Privacy Gate (§2) |

---

## 4. Production Release & Rollback SOP

### 4.1 Production Release
1. **Staging Gate First**: For data updates or substantial changes, verify the staging QA gate reports `READY TO RELEASE` via the maintainer runbook.
2. **Pre-Flight**: Confirm clean working tree (`git status`), updated `CHANGELOG.md`, verified public Git identity (§2.1), and 100% passing checks (§3).
3. **Deploy Exclusively via Release CLI with Auto-Rollback**:
   ```bash
   # Use --bump patch | minor | major
   pnpm release:deploy -- --bump patch --notes "<concise public release notes>" --auto-rollback
   ```
4. **Verify & Push**: Confirm post-deploy smoke checks pass (`4/4 PASS`), review generated `releases.json`, `docs/DEPLOY_LOG.md`, and `docs/deploys/<record>.md`, commit if needed, and push:
   ```bash
   git push origin main --follow-tags
   ```

### 4.2 Emergency Rollback (< 10s Mitigation)
If production shows runtime errors, broken imports, localization regressions, or calculation faults, **roll back first and investigate second**:
```bash
# Instant rollback (< 2s via Cloudflare Pages Rollback API, no rebuild):
pnpm release:rollback -- --prev --reason "<concise public incident reason>"

# Target a specific version tag or deployment ID:
pnpm release:rollback -- v0.2.0 --reason "<concise public incident reason>"

# Fallback if historical deployment was pruned (clean git worktree rebuild):
pnpm release:rollback -- v0.2.0 --rebuild --reason "<concise public incident reason>"
```
After rollback, verify `pnpm release:status` and `pnpm release:smoke`, then commit and push `releases.json`, `docs/DEPLOY_LOG.md`, and the generated `docs/deploys/<record>.md`.

---

## 5. Deploy & Rollback Documentation Standard

- **`docs/DEPLOY_LOG.md` is strictly an index table.** Every release (`PROD_DEPLOY` / `PREVIEW_DEPLOY`) and rollback (`ROLLBACK` / `AUTO_ROLLBACK`) MUST have its own standalone Markdown record under `docs/deploys/`.
- `scripts/release.mjs` generates the record and updates the index automatically (and mirrors to a separate ops docs directory only when `WEBPOB_RELEASE_MIRROR_DOCS_DIR` is explicitly set and contains an existing `DEPLOY_LOG.md`).
- **File Naming Convention**:
  - Production release: `docs/deploys/YYYY-MM-DD-HHMM-prod-vX.Y.Z.md`
  - Preview deploy: `docs/deploys/YYYY-MM-DD-HHMM-preview-<version>.md`
  - Manual rollback: `docs/deploys/YYYY-MM-DD-HHMM-rollback-vX.Y.Z.md`
  - Auto rollback: `docs/deploys/YYYY-MM-DD-HHMM-auto-rollback-vX.Y.Z.md`

### Release Record Template (`PROD_DEPLOY`)

````markdown
# Production Release Record: v0.2.2

- **Timestamp (UTC)**: 2026-11-27T08:30:00Z
- **Action**: `PROD_DEPLOY`
- **Environment**: Production (`https://webpob.pages.dev`)
- **Version / Tag**: `v0.2.2`
- **Commit**: `abc1234`
- **Deployment**: `11111111` (`https://11111111.webpob.pages.dev`)
- **Smoke Result**: Smoke 4/4 PASS

## Summary

- Concise summary of user-facing changes included in this release.

## Smoke Check Details

- `root-html`: HTTP 200 text/html
- `version-json`: v0.2.2 (`sha=abc1234`)
- `proxy-function`: HTTP 200 text/plain
- `poe2-tree`: 4524 nodes

## Rollback Command

```bash
pnpm release:rollback -- v0.2.1 --reason "<incident reason>"
```
````

### Rollback Record Template (`ROLLBACK` / `AUTO_ROLLBACK`)

```markdown
# Rollback Record: Revert to v0.2.1

- **Timestamp (UTC)**: 2026-11-27T09:15:00Z
- **Action**: `ROLLBACK`
- **Environment**: Production (`https://webpob.pages.dev`)
- **Replaced Deployment**: `11111111` (`v0.2.2`)
- **Restored Target**: `v0.2.1` (`b2c3d4e` / Deployment `22222222`)
- **Method**: `instant` (Cloudflare Pages Rollback API)
- **Post-Rollback Smoke**: Smoke 4/4 PASS

## Reason & Postmortem

- **Trigger / Impact**: Concise incident summary.
- **Root Cause**: Technical root cause or `TBD — under investigation`.
- **Follow-up Fix**: Planned fix & verification steps before re-releasing.
```
