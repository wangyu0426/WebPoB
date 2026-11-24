# WebPoB

[简体中文](./README.zh-CN.md) | **English**

An open-source, pure-TypeScript web port of [Path of Building Community](https://github.com/PathOfBuildingCommunity/PathOfBuilding), built from the ground up for **Path of Exile 1 & Path of Exile 2** with first-class **English & Chinese (中英文)** support.

## Goals & Principles

- **100% Pure TypeScript**: Calculation engine (`ModDB`, `ModParser`, `CalcOffence`, `CalcDefence`), PoB build codec, passive skill tree graph engine, and React UI are all written in strongly typed TypeScript.
- **PoE 1 & PoE 2 Dual-Game Architecture**: Shared calculation core with game-specific rulesets (`poe1` and `poe2`) handling key differences — e.g. PoE 1 linked item sockets / Flasks / Spell Suppression vs. PoE 2 Weapon Set passives / Spirit reservation / independent skill gems / Charms.
- **Full Bilingual (EN / ZH-CN)**: Instant language toggle across UI, passive nodes, skill gems, items, and modifier lines, plus a **bilingual item & modifier parser** that understands both English and Chinese (`Ctrl+C`) in-game item text.
- **Static Client-First**: Runs entirely in the browser (deployable to Cloudflare Pages / GitHub Pages / Vercel) with an optional lightweight Cloudflare Worker CORS proxy for fetching `pobb.in`, `pastebin`, and GGG character profiles.
- **Open Source (MIT)**: Community-driven, modular monorepo with automated data synchronization pipelines for upstream PoB data and bilingual PoEDB/community dictionaries.

## Monorepo Architecture

```text
WebPoB/
├── packages/
│   ├── core/        # @webpob/core  - Shared types, Build/Tree/Skill/Item/Mod/Calc schemas, GameRuleset
│   ├── i18n/        # @webpob/i18n  - EN/ZH-CN UI translations, game glossary, bilingual mod normalizer
│   ├── data/        # @webpob/data  - PoE 1 & PoE 2 rulesets, classes, passive trees, gems, items, sample builds
│   ├── codec/       # @webpob/codec - Official PoB Base64URL+zlib XML codec & CN/EN item clipboard parser
│   └── calc/        # @webpob/calc  - Pure TS PoB calculation engine (ModDB, ModParser, Offence, Defence, Node Power)
├── apps/
│   ├── web/         # @webpob/web   - React + Vite + Tailwind web application with Canvas Passive Skill Tree
│   └── cors-proxy/  # Optional Cloudflare Worker CORS proxy for pobb.in / pastebin / GGG APIs
└── scripts/
    └── sync-data/   # Upstream PathOfBuilding & PoEDB/community dictionary sync pipeline
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run development server
pnpm dev

# 3. Run unit tests & typecheck
pnpm test
pnpm typecheck

# 4. Production build
pnpm build
```

## Roadmap

- [x] **Phase 1 — Foundation & MVP**
  - Monorepo architecture, MIT open-source setup, CI workflow
  - Dual-game (`poe1` / `poe2`) domain model & ruleset abstraction
  - Pure TS `ModDB`, `ModParser` (EN + ZH), `CalcOffence`, `CalcDefence`, and Passive Node Power delta calculator
  - Official PoB Build Code (`Base64URL + zlib <-> XML`) import/export for PoE 1 & PoE 2
  - Bilingual (`EN` & `ZH-CN`) clipboard item parser & UI
  - Interactive HTML5 Canvas Passive Skill Tree (pan/zoom, shortest-path allocation, search, PoE 2 Weapon Set passives)
  - Optional Cloudflare Worker CORS proxy & data sync pipeline scaffold
- [ ] **Phase 2 — Full Upstream Data & Differential Verification**
  - Complete upstream PoE 1 & PoE 2 passive tree JSON & sprite atlas ingestion
  - Full gem scaling tables, unique items, cluster jewels, and masteries
  - Automated differential test suite comparing `@webpob/calc` outputs against upstream PoB Lua `HeadlessWrapper`
- [ ] **Phase 3 — Advanced Mechanics & Community Tooling**
  - Timeless jewels, full DoT/ailment/minion/totem/trap/mine/trigger calculations
  - Trade search link generator & character import from GGG / Tencent CN servers
  - Browser Web Worker background computation & IndexedDB build library

## License

MIT License — see [LICENSE](./LICENSE). Inspired by and compatible with [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding).
