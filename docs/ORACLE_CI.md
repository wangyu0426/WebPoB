# Pinned Native PathOfBuilding Oracle

WebPoB runs the official PoE 1 and PoE 2 Path of Building headless runtimes with a locally built LuaJIT and compares their unmodified output with the TypeScript calculator. The checked-in lockfile is scripts/oracle-diff/oracle-pins.json.

## Locked inputs

- PoE 1: PathOfBuildingCommunity/PathOfBuilding at 5606cc64fa9f15694e69001a52b90aa968d01a86 (Release 2.69.0).
- PoE 2: PathOfBuildingCommunity/PathOfBuilding-PoE2 at 601768bd105869618c3d6581b883e5d7aeec91b2 (SimpleGraphic-v2.5.6).
- LuaJIT source: LuaJIT/LuaJIT at 2460b3ff93a1c955de3d62cfc825de7d68dc272e, runtime version 2.1.1784580905.
- UTF-8 dependency: LuaRocks luautf8 0.2.1-1, loaded as lua-utf8, module version 0.2.1.
- Local static data inputs: SHA-256 digests in the same lockfile.

The PoE revisions are WebPoB's independently selected commits. Every checkout and data hash is verified before execution. No PoR code or runtime dependency is used.

## Reproduce locally

Install Node.js 22, pnpm 10.32.1, Git, a C compiler and make, Lua 5.1 headers, LuaRocks, and unzip. Then run:

```sh
pnpm install --frozen-lockfile
pnpm oracle:setup
pnpm oracle:smoke -- --out oracle-smoke-native.json
```

The setup command fetches all pinned commits, builds and verifies the pinned LuaJIT executable, checks the +=, ?., and ?: syntax used by PoB, installs the locked UTF-8 rock into a private tree, and verifies its module version. It fails if a checkout, data hash, runtime version, syntax check, or dependency is missing or differs.

The smoke command runs one PoE 1 and one PoE 2 benchmark twice from the same XML and configuration. It compares all native output and semantic provenance, excluding only generatedAt. It saves the native JSON before calculating WebPoB results, then checks native errors, runtime and input provenance, metric presence, skill context, and core calculator metrics. A failure exits nonzero.

The standard output file contains the actual native measurements. TypeScript results are not used to create or modify oracle values.

## Offline differential checks and snapshot generation

```sh
pnpm oracle:diff
pnpm oracle:diff -- --strict
pnpm oracle:diff -- --certify
```

Offline diagnostics remain usable with the checked-in historical snapshots. Certification requires the complete canonical corpus plus exact lockfile revisions, schema version 2, matching XML and runner digests, complete LuaJIT and UTF-8 provenance, explicit empty native errors, and consistent metric-presence metadata. Historical snapshots remain regression fixtures but cannot be certified.

Regenerate snapshots only after a successful native setup and smoke run:

```sh
pnpm oracle:generate
```

Use --game poe1|poe2 or --id <benchmark-id> to generate a subset. The default output is the canonical fixture file, so review the resulting diff carefully before replacing historical regression data.

## Update procedure

1. Select and verify exact full commit SHAs for the WebPoB PoE 1 and PoE 2 upstreams independently.
2. Update oracle-pins.json; recompute dataFiles hashes when local static data changes.
3. Run pnpm oracle:setup and pnpm oracle:smoke on a clean Linux checkout.
4. Review the native JSON and provenance. Confirm each benchmark is repeatable and has no native errors.
5. Run pnpm typecheck, pnpm test, and pnpm build.
6. Update this guide and submit the reviewed pin change.

## GitHub-hosted CI

.github/workflows/oracle-smoke.yml runs on GitHub-hosted ubuntu-latest with read-only repository permissions, no secrets, and a 15-minute job limit. The cache key includes the lockfile digest; cached source, runtime, and rock are verified against the lock before use. CI runs both game smoke benchmarks twice and uploads their native output JSON as an artifact, including on failure when output exists.

The ordinary offline typecheck, test, and build workflow remains separate. No self-hosted runner, privileged pull-request execution, production asset, or credential is required.
