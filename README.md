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
│   ├── web/         # @webpob/web   - React + Vite + Tailwind web app, 60fps Canvas Tree, Web Worker & IndexedDB Library
│   └── cors-proxy/  # Optional Cloudflare Worker CORS proxy for pobb.in / pastebin / GGG APIs
├── fixtures/
│   └── oracle/      # Official LuaJIT PathOfBuilding Golden Snapshots (30 PoE 1 3.30 & PoE 2 0.5 benchmarks)
└── scripts/
    ├── sync-data/   # Upstream PathOfBuilding & PoeCharm/PoeCharm2 bilingual sync + LuaJIT skill/base exporter
    └── oracle-diff/ # Automated differential verification harness against official PathOfBuilding LuaJIT
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run development server
pnpm dev

# 3. Run unit tests, official PoB Oracle regression tests & typecheck
pnpm test
pnpm typecheck

# 4. Production build
pnpm build

# 5. (Optional) Re-sync upstream trees / Lua skill & base tables / Oracle diff
pnpm sync:data
pnpm sync:lua
pnpm oracle:diff
```

## Official PathOfBuilding Verification (Differential Oracle)

WebPoB's pure TypeScript calculation engine is continuously regression-tested against **official upstream [PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding) (PoE 1 `3.30`)** and **[PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2) (PoE 2 `0.5`)** running headlessly in LuaJIT (`HeadlessWrapper.lua`):

- **30 Golden Benchmarks** (`fixtures/oracle/snapshots.json`) covering Attributes, Life, Mana, Energy Shield, **Ward** (Runic Crown/Gauntlets/Sabatons), Armour, Evasion, Resistances, Crit Confirmation, PoE 1 & PoE 2 Accuracy/Hit Chance, **Local Rare Weapon & Armour scaling**, **Dual-Wielding**, **Impale Support DPS**, **Cast On Critical Strike (CoC) 0.033s server-tick CDR breakpoints**, **Timeless Jewel Keystones** (`Corrupted Soul`, `Divine Flesh`, `Inner Conviction`), **Cluster Jewels** (308 official Notables), **Endgame Combat Buffs/Debuffs** (`Low Life Pain Attunement`, `Arcane Surge`, `Tailwind`, `Intimidated`, `Unnerved`, `Withered 0–15`, `Elemental Exposure + Mastermind of Discord`), **Curses & Marks**, **Socketed Tree Jewels**, **Unique Items**, **Endgame Keystones**, **Spell Totem**, **Ascendancy**, **Utility Flasks**, **Fireball Ignite**, **Lv.21 Gem Scaling**, and **PoE 2 Sorceress Spark/Comet, Monk Quarterstaff Ice Strike & Ranger Bow Lightning Arrow**.
- **0.00% – 0.18% Hit DPS error** across all 30 official benchmarks, locked into CI via `packages/calc/src/oracle.test.ts`.

## Roadmap

- [x] **Phase 1 — Foundation & MVP**
  - Monorepo architecture, MIT open-source setup, CI workflow
  - Dual-game (`poe1` / `poe2`) domain model & ruleset abstraction
  - Pure TS `ModDB`, `ModParser` (EN + ZH), `CalcOffence`, `CalcDefence`, and Passive Node Power delta calculator
  - Official PoB Build Code (`Base64URL + zlib <-> XML`) import/export for PoE 1 & PoE 2
  - Bilingual (`EN` & `ZH-CN`) clipboard item parser & UI
  - Interactive HTML5 Canvas Passive Skill Tree (pan/zoom, shortest-path allocation, search, PoE 2 Weapon Set passives)
  - Optional Cloudflare Worker CORS proxy & data sync pipeline scaffold
- [x] **Phase 2 — Full Upstream Data & High-Performance 5,000-Node Tree**
  - Automated `pnpm sync:data` pipeline ingesting official **PoE 1 (`3.30`, 2,750 nodes)** & **PoE 2 (`0.5`, 4,524 nodes)** passive trees plus **1,797 official gems** (`836` PoE 1 + `961` PoE 2)
  - Merged PoeCharm / PoeCharm2 `zh-rCN` Chinese dictionaries (~99% passive node & gem translation coverage)
  - Lazy-loaded compact JSON assets (`/data/*.json`) keeping the main JS bundle ~148 KB gzipped
  - 60fps HTML5 Canvas engine with viewport frustum culling, `O(1)` spatial hash hit-testing, authentic curved orbit arcs, PoE 1 Mastery picker modal, and bilingual search jump-to-match
- [x] **Phase 3 — Differential Oracle Parity, Full Upstream Skills/Bases, Ascendancy & Flasks**
  - Automated LuaJIT differential oracle against official PoB 1 (`3.30`) & PoB-PoE2 (`0.5`) — **12/12 benchmarks at `0.00%–0.04%` Hit DPS parity**
  - LuaJIT upstream exporter (`pnpm sync:lua`) exporting **1,794 official Lv.1–30 skill tables** (`835` PoE 1 + `959` PoE 2) and **2,631 official base items** (`989` PoE 1 + `1,642` PoE 2)
  - Interactive **Ascendancy sub-tree allocation** with golden medallion backdrop, multi-root shortest-path/pruning, and ascendancy point counter (`0/8`)
  - **Active Utility Flasks** (`<Slot active="true">`), **Mind Over Matter** (40% MoM EHP), and **Ignite / Bleed / Poison** ailment DPS calculations
- [x] **Phase 4 — Web-Native UX & Performance**
  - Dedicated **ES Module Web Worker** powering live **Node Power Heatmap** (`Power / 热力图`) across hundreds of unallocated Notables/Keystones at 60fps
  - **Offline IndexedDB Multi-Build Library** (`Save / Save Copy / Load / Delete / Filter by PoE 1 & PoE 2`)
  - One-click **URL-Hash Shareable Builds** (`#pob=<Base64URL-code>`) with auto-load on open
- [x] **Phase 5 — Endgame Mechanics, Official Unique Catalog & Deployment**
  - **1,731 official bilingual Unique items** (`1,304` PoE 1 + `427` PoE 2, ~99% ZH names) searchable & equippable right inside the Items tab
  - **PoB-authentic Local Weapon & Local Armour computation** (multiplicative quality, local flat/inc phys, local AS/Crit, local ES/Armour/Evasion)
  - **Curses & Marks** (`Conductivity`, `Flammability`, `Frostbite`, `Elemental Weakness`, `Despair`, `Vulnerability`, `Assassin's Mark`, `Sniper's Mark`), **Mana Reservation Efficiency**, **Totem/Trap supports**, and **Endgame Keystones** (`Iron Reflexes`, `Avatar of Fire`, `Elemental Overload`)
  - **Interactive Passive Tree Jewel Sockets** (`<Sockets><Socket/>` PoB XML import/export + in-canvas Jewel picker modal)
  - **Trade Search Link Helper** (International PoE 1/2 & Tencent CN) + GitHub Pages & Cloudflare Pages static deployment workflows
- [x] **Phase 6 — Cluster Jewels, Dual-Wielding, Endgame Combat Configs, Character Import & Build Compare**
  - **308 official PoE 1 `3.30` Cluster Jewel Notables** (`301` ZH) exported with an interactive **Cluster Jewel Builder** inside the Passive Tree Jewel Socket modal (`Large / Medium / Small`, enchant, `% increased effect`, up to 3 searchable bilingual Notables)
  - **Dual-Wielding** (`+10% more Attack Speed`, `+20% Attack Block`, harmonic-mean alternating APS & avg weapon damage) & **PoE 2 `0.5` Hit Chance / Quarterstaff** parity
  - **Endgame Combat Conditions** (`Low Life / Pain Attunement`, `Arcane Surge`, `Tailwind`, `Intimidated`, `Unnerved`, `Withered 0–15`, `Fire/Cold/Lightning Exposure` + Elementalist extra `-25%`, `Double Damage Chance`)
  - **Character Profile Importer** supporting GGG International (`pathofexile.com`), Tencent CN (`poe.game.qq.com`), and **Zero-Proxy Direct JSON Paste** (`get-passive-skills` + `get-items`)
  - **Side-by-Side Build Compare** inside the Calcs tab comparing current build vs IndexedDB saved builds / baselines with live `ΔDPS`, `ΔLife`, `ΔES`, `ΔEHP` deltas
  - **25/25 official LuaJIT PoB Oracle benchmarks** passing within `<= 0.18%` Hit DPS parity
- [x] **Phase 7 — Visual Cluster Sub-Graphs, Ward, Impale, CoC Server-Tick Triggers & Timeless Keystones**
  - **Visual Cluster Jewel Sub-Graphs** rendered dynamically on the 60fps HTML5 Canvas around socketed outer sockets (radial golden arcs, small passives, notable medallions with live bilingual tooltips, and sub-sockets)
  - **Expedition Ward** (`Runic Crown / Gauntlets / Sabatons` exported in `2,701` total base items) + local/global Ward scaling & EHP buffer
  - **Impale Support DPS** (60% chance, 28% effect, 5 base hits) + **Cast On Critical Strike (CoC)** `0.033s` server-tick CDR breakpoints & multi-active skill selector
  - **Timeless Jewel Keystones** (`Corrupted Soul`, `Divine Flesh`, `Inner Conviction`, `The Agnostic`) + one-click **Timeless Jewel Picker** inside the Tree Jewel Socket modal
  - **30/30 official LuaJIT PoB Oracle benchmarks** (`42/42` Vitest tests) passing within `<= 0.18%` Hit DPS parity (including **PoE 2 `0.5` Ranger Bow Lightning Arrow**)

## License

MIT License — see [LICENSE](./LICENSE). Inspired by and compatible with [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding).
