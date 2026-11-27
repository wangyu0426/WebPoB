# AGENTS.md — `WebPoB` Display Layer Engineering, Testing & Release Standard

This document is binding for all AI Agents (Codex, Claude, Antigravity, Orca Workers) operating in the public `WebPoB` repository. Private data extraction, the QA staging gate, and internal operations are documented in the maintainer runbook.

---

## 1. Repository Scope & Core Rules

- This repository is the **public open-source display & calculation layer** (`apps/web`, `packages/{core,i18n,data,codec,calc}`, static data contract `apps/web/public/data/manifest.json`, public regression suites, and release CLI).
- **Never** commit private credentials, internal ops scripts, or unverified partial data into this repo. Keep personal paths, private endpoints, and account identifiers out of public docs, test fixtures, and release notes.
- **Never** break backward compatibility for historical passive trees (`apps/web/public/data/manifest.json` must preserve existing versioned tree mappings).

---

## 2. Mandatory Privacy, PII & Secret Leak Gate

Because `WebPoB` is a **public open-source repository**, every AI Agent MUST enforce these privacy rules before every commit, tag, release, or push:

1. **Verify Public Git Identity (No Local Username / Hostname / Personal Email)**:
   ```bash
   git var GIT_AUTHOR_IDENT
   git var GIT_COMMITTER_IDENT
   ```
   Both MUST show a public maintainer or GitHub `noreply` identity (never a local OS username, `.local` hostname, or personal email). If misconfigured, set `git config --local user.name` and `git config --local user.email` before committing or tagging.
2. **Zero-Tolerance Prohibited Content** (across source code, test fixtures, docs, commit messages, release `--notes`, and rollback `--reason`):
   - Local filesystem paths (`/Users/...`, `/home/...`, `C:\Users\...`), machine hostnames (`.local`), or personal usernames/emails.
   - Real cloud account IDs (e.g., 32-hex Cloudflare Account IDs), API tokens, OAuth tokens, cookies, `.env` / `.dev.vars` files, or private keys. Unit tests and docs MUST use synthetic placeholders (`00000000000000000000000000000001`, `11111111-...`, `example.test`).
   - Private repository names, internal staging/ops URLs, or hardcoded local sibling paths (doc mirroring is strictly opt-in via `WEBPOB_RELEASE_MIRROR_DOCS_DIR`).
   - Personal media exports, browser profile dumps, or unredacted screenshots containing private bookmarks/accounts.
3. **Mandatory Staged-Diff Privacy Scan (Before Every Commit)**:
   ```bash
   git diff --cached | grep -nE '(/Users/|/home/|C:\\Users\\|\.local\b|dash\.cloudflare\.com/[0-9a-f]{32}|gh[pousr]_[A-Za-z0-9_]+|AKIA[0-9A-Z]{16}|BEGIN .*PRIVATE KEY)' && echo "FAIL: privacy leak detected" && exit 1 || echo "PASS: privacy scan clean"
   ```
4. **Leak Response**: If any personal metadata or secret is ever committed to a public branch or tag, **stop immediately**, rotate any exposed credential first, scrub affected commits/tags cleanly, and re-verify `git log --all` before pushing.

---

## 3. Mandatory Pre-Commit & Pre-Release Checks

Every code or data change MUST pass 100% before commit or release:
```bash
pnpm typecheck
pnpm test      # unit tests + 131 LuaJIT Oracle tests + 39 poe.ninja tests + 30 release tests + 23 manifest tests
pnpm build
```
For changes touching UI, passive tree rendering, localization, or codec import/export, also run the dual-viewport real-browser E2E suite:
```bash
BASE_URL=http://127.0.0.1:4173 pnpm test:e2e:ninja
```

---

## 4. Production Release & Rollback Rules

1. **Staging First**: For major changes or data updates, follow the private maintainer runbook to deploy to staging and verify the gate reports `READY TO RELEASE` before promoting to production.
2. **Never Deploy from Repo Root**: Never run `wrangler pages deploy apps/web/dist` from the repository root (it omits `apps/web/functions/api/proxy.ts` and breaks live `pobb.in`/`poe.ninja` imports).
3. **Always Use the Release CLI (with Auto-Rollback)**:
   ```bash
   pnpm release:deploy -- --bump patch --notes "<concise release notes>" --auto-rollback
   git push origin main --follow-tags
   ```
4. **Emergency Rollback (< 10s Mitigation)**:
   ```bash
   pnpm release:rollback -- --prev --reason "<concise incident reason>"
   # Or target a specific version / deployment ID:
   pnpm release:rollback -- v0.2.0 --reason "<concise incident reason>"
   ```

---

## 5. Deploy & Rollback Documentation Standard

- **`docs/DEPLOY_LOG.md` is strictly an index table.** Every release (`PROD_DEPLOY` / `PREVIEW_DEPLOY`) and rollback (`ROLLBACK` / `AUTO_ROLLBACK`) MUST have its own standalone Markdown file under `docs/deploys/`, automatically created by `scripts/release.mjs` (and mirrored when `WEBPOB_RELEASE_MIRROR_DOCS_DIR` points to a docs directory with an existing `DEPLOY_LOG.md`).
- **File naming convention**:
  - Production release: `docs/deploys/YYYY-MM-DD-HHMM-prod-vX.Y.Z.md`
  - Preview deploy: `docs/deploys/YYYY-MM-DD-HHMM-preview-<version>.md`
  - Manual rollback: `docs/deploys/YYYY-MM-DD-HHMM-rollback-vX.Y.Z.md`
  - Auto rollback: `docs/deploys/YYYY-MM-DD-HHMM-auto-rollback-vX.Y.Z.md`
- Always commit and push `releases.json`, `docs/DEPLOY_LOG.md`, and the newly generated `docs/deploys/*.md` file after any release or rollback.

### Release Record Template (`PROD_DEPLOY`)

````markdown
# Production Release Record: v0.2.2

- **Timestamp (UTC)**: 2026-11-27T08:30:00Z
- **Action**: `PROD_DEPLOY`
- **Environment**: Production (`https://webpob.pages.dev`)
- **Version / Tag**: `v0.2.2`
- **Commit**: `abc1234`
- **Deployment**: `12345678` (`https://12345678.webpob.pages.dev`)
- **Smoke Result**: Smoke 4/4 PASS

## Summary

- Concise summary of changes included in this release.

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
- **Replaced Deployment**: `12345678`
- **Restored Target**: `v0.2.1` (`e486295` / Deployment `e9312d4a`)
- **Method**: `instant` (Cloudflare Pages Rollback API)
- **Post-Rollback Smoke**: Smoke 4/4 PASS

## Reason & Postmortem

- **Trigger / Impact**: Concise incident summary.
- **Root Cause**: Technical root cause or `TBD — under investigation`.
- **Follow-up Fix**: Planned fix & verification steps before re-releasing.
```
