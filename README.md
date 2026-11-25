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
│   └── oracle/      # Official LuaJIT PathOfBuilding Golden Snapshots (115 PoE 1 3.30 & PoE 2 0.5 benchmarks)
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

- **115 Golden Benchmarks** (`fixtures/oracle/snapshots.json`) covering Attributes, Life, Mana, Energy Shield, **Ward**, Armour, Evasion, **Block & Spell Block (`Tempest Shield`)**, **Spell Suppression**, **Fortification (`1% less Hit Damage Taken` / stack)**, **Purity of Elements / Fire / Ice / Lightning (`+4%` Max Resistances)**, **`+N% to all maximum Elemental Resistances`**, **Inquisitor `Inevitable Judgement` & `Righteous Providence`**, **Berserker `Aspect of Carnage` & `Crave the Slaughter`**, **Juggernaut `Unbreakable` (Doubled Body Armour + Armour-to-Elemental Mitigation)**, **Trickster `Escape Artist` & `Polymath`**, **Slayer `Overwhelm` (`8%` Base Weapon Crit)**, **Flat Base Crit Chance (`+N% to Critical Strike Chance`)**, **Necromancer `Mindless Aggression`**, **`Iron Will` / `Iron Grip`**, **`Eldritch Battery`**, **Enemy Blinded (`-20%` Enemy Accuracy)**, **Chaos Penetration**, Dual-Resistance Two-Stone Rings, Crit Confirmation, **Separate Non-Crit & Crit Enemy Armour Mitigation**, PoE 1 & PoE 2 Accuracy/Hit Chance (`(level - 1) * accuracyPerLevel`), **PoE 2 `ArmourRatio = 10`**, **Rage (`1% more Attack Damage` per stack in PoE 1 `3.30` & PoE 2 `0.5` + PoE 1 `Rage Support` `>=10 Rage` Attack Speed)**, **Enlighten Support & Exact Mana Reservation (`Lv.1–7` + `+Socketed Support Gems` + flat aura reservations)**, **Multi-Spec `<Tree activeSpec="N">`, Multi-ItemSet `<Items activeItemSet="N">`, & Multi-SkillSet `<Skills activeSkillSet="N">` XML parity**, **PoE 2 `0.5` Multi-Support Gems (`Controlled Destruction`, `Brutality I`, `Elemental Focus`, `Concentrated Area`, `Rapid Attacks I`, `Rapid Casting I`, `Rage I`)**, **Skill Gem Level & Quality Scaling (`+N to Level of all [Tag] Skill Gems / Skills`, `+N to Level of Socketed [...] Gems`, `Ashes of the Stars`, `Empower` / `Enhance`, Aura Lv.1–30 scaling, Arc dynamic remaining-chain scaling)**, **PoB-compatible `Full DPS` multi-skill / multi-entity aggregation** (`20× SRS Minions`, `4× Arc Spell Totems`, `3× Ballista Totems`, `PoE 2 Dual-Skill Spark + Comet`), **Local Rare Weapon & Armour scaling + Native Elemental Weapon Bases (`Crackling Quarterstaff`)**, **Trap (`0.6s`) & Mine (`0.3s`) Throw Speeds & Cooldown-Gated Skills (`5s` Explosive Grenade)**, **Bandits (`Alira`)**, **PoE 1 Phys-conversion inheritance vs PoE 2 final-type conversion**, **Dual-Wielding**, **Minion DPS & Minion Ignite**, **Auras & Heralds**, **Ailment & Support parity**, **Impale Support DPS**, **Cast On Critical Strike (CoC)**, **Timeless Jewel Keystones**, **Cluster Jewels** (308 Notables), **Endgame Combat Buffs/Debuffs (`buffOnslaught`)**, **Curses & Marks**, **Socketed Tree Jewels**, **Unique Items**, **Endgame Keystones**, **Ascendancy**, **Utility Flasks**, **PoE 2 `0.5` Spirit Reservation & Archmage**, **PoE 2 `<WeaponSet1>`/`<WeaponSet2>` Passive Swap**, and **all 8/8 official PoE 2 `0.5` classes** (`Sorceress`, `Witch`, `Monk`, `Ranger`, `Warrior`, `Huntress`, `Druid`, `Mercenary`).
- **<= 0.5% Hit DPS & Full DPS parity** across all **115 official benchmarks**, locked into CI via `packages/calc/src/oracle.test.ts` (`139/139` Vitest tests).

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
- [x] **Phase 8 — Smart Support Gem Optimizer, Rare Item Crafting Bench, Minion Engine & Offline PWA**
  - **Smart Support Gem Optimizer** (`rankSupportGemsForGroup`) inside the Skills tab sorting compatible Lv.20 Support Gems by live simulated `ΔTotal DPS` with one-click equip
  - **Interactive Rare Item Crafting Bench** inside the Items tab supporting all `2,701` official bases, `0–30%` quality, up to 6 bilingual T1/T2 affixes, and **live `ΔDPS / ΔLife / ΔES / ΔWard / ΔEHP` upgrade preview** before equipping
  - **Minion Combat Engine** (`Summon Raging Spirit`, `Raise Zombie`, `Minion Damage`, 130% minion crit multi, Aura attack flat scaling) & **PoE 1 authentic Physical-conversion inheritance**
  - **Offline PWA Support** (`manifest.webmanifest` + Service Worker caching `/data/*.json` & static chunks)
  - **35/35 official LuaJIT PoB Oracle benchmarks** (`48/48` Vitest tests) passing within `<= 0.18%` Hit DPS parity (including **PoE 2 `0.5` Warrior Volcanic Fissure**)
- [x] **Phase 9 — Top Power Notables Efficiency Report, PoE 2 Archmage & Weapon Set XML Parity, 45 Oracle Benchmarks**
  - **Top Power Notables Efficiency Drawer** inside the Passive Tree powered by Web Worker BFS path-cost simulation (`DPS/Pt`, `Total DPS`, `EHP/Pt`, `Total EHP`), with instant jump-to-node camera panning and one-click shortest-path allocation
  - **PoE 2 `0.5` Authentic Mechanics**: official `Archmage` (`100 Spirit`, `4% Extra Lightning per 100 Max Mana`), `ArmourRatio = 10`, `<WeaponSet1>`/`<WeaponSet2>` + `useSecondWeaponSet` official PoB2 XML round-trip & inactive weapon-set visual dimming on canvas
  - **Deep Combat Precision**: separate Non-Crit vs Crit Physical Enemy Armour mitigation (both PoE 1 & PoE 2), full Lua DoT/Ailment/Hit/Minion flag export across all 1,794 gems (`Deadly Ailments`, `Swift Affliction`, `Melee Physical Damage`, `Vicious Projectiles`, `Heavy Strike` Double Damage), Heralds (`Ash`/`Ice`/`Thunder`), `Determination`, `Precision`, `Spell Suppression`
  - **45/45 official LuaJIT PoB/PoB2 Oracle benchmarks** (`58/58` Vitest tests) passing within `<= 0.5%` Hit DPS parity
- [x] **Phase 10 — Multi-Skill `Full DPS`, Authentic Ailment Scaling, PNG/Markdown Build Cards & 55 Oracle Benchmarks**
  - **PoB-Authentic `Full DPS` Aggregation**: `includeInFullDPS` per skill group & `×Count` active instance multiplier (e.g., `20× SRS`, `4× Spell Totems`, multi-skill combos) with official PoB XML round-trip & live sidebar per-skill breakdown
  - **Authentic Ailment Base Damage**: Ignite / Bleed / Poison computed independently from Hit/Spell/Penetration/Armour modifiers (plus `Elemental Focus` `Cannot inflict Elemental Ailments` & Minion Ignite scaling)
  - **One-Click Build Summary Card Exporter** (`PNG` high-DPI poster via HTML5 Canvas + bilingual `Markdown` table copy) & global `1–7` workspace tab keyboard shortcuts
  - **55/55 official LuaJIT PoB/PoB2 Oracle benchmarks** (`68/68` Vitest tests) spanning **7 PoE 2 `0.5` classes** (adding `Huntress Lightning Spear` & `Druid Volcano`) passing within `<= 0.5%` Hit & Full DPS parity
- [x] **Phase 11 — Unique Upgrade Advisor, Mobile/Touch Support, Trap/Mine/Cooldown Engine & 65 Oracle Benchmarks (8/8 PoE 2 Classes)**
  - **Smart Unique Upgrade Advisor** (`rankUniqueUpgradesForSlot`) inside the Items tab simulating all compatible official Uniques for the selected slot, ranking top upgrades by **DPS** or **EHP** with live `ΔDPS% / ΔEHP% / ΔLife / ΔES` badges and one-click equip
  - **Responsive Mobile Layout & Touch Pinch-to-Zoom**: slide-over sidebar stats drawer on narrow screens + native 1-finger pan, tap-to-allocate, and 2-finger midpoint pinch-to-zoom on the 60fps HTML5 Canvas tree
  - **Engine & Data Completeness**: Trap (`0.6s`) & Mine (`0.3s`) throw times, skill cooldown rate caps (`Explosive Grenade` `5s`), native elemental weapon base damage (`2,706` total bases including `Crackling Quarterstaff`), and PoB `3.30` `<Config>` Bandit support
  - **65/65 official LuaJIT PoB/PoB2 Oracle benchmarks** (`79/79` Vitest tests) achieving **100% 8/8 PoE 2 `0.5` class coverage** (adding `Mercenary Crossbow Explosive Grenade`, `Monk Storm Wave`, `Warrior Shield Sunder`, `Sorceress Arc`, plus PoE 1 `Ice Trap`, `High-Impact Mine`, `3× Ballista Totems`, `Essence Drain`, `2H Sword Impale Cyclone`, `Alira Bandit`)
- [x] **Phase 12 — Skill Gem Level/Quality & Empower Engine, Quick Scenario What-If Simulator, Code Splitting & 75 Oracle Benchmarks**
  - **Skill Gem Level & Quality Bonus Engine (`gemBonus.ts`)**: full bilingual support for global `+N to Level of all [Tag] Skill Gems / Skills`, `+N% to Quality of all Skill Gems` (`Ashes of the Stars`), slot-scoped `+N to Level of Socketed [...] Gems`, `Empower` & `Enhance` Support (including `+Socketed Support Gems` stacking), Aura/Curse Lv.1–30 scaling, full exact Lv.20–30 Lua gem snapshots, and PoE 1 `Arc` dynamic chain scaling (`Lv` + `Quality`)
  - **Quick Combat Scenario & What-If Simulator** in the Calcs tab showing live `ΔDPS%` / `ΔEHP%` across `+2 All Skill Gems`, `Pinnacle Boss`, `Mapping Mob`, `No Charges`, `Full Charges + Onslaught + Shock`, and `All Flasks Active` + boosted gem level badges in Sidebar & Calcs
  - **Vite Route & Vendor Code Splitting**: `React.lazy` tab chunks + `manualChunks` eliminating all >500 kB bundle warnings
  - **75/75 official LuaJIT PoB/PoB2 Oracle benchmarks** (`90/90` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity (adding 10 new PoE 1 & PoE 2 `+Gem Level` / `Ashes of the Stars` / `Empower` / `Socketed` / PoE 2 `+4 Lightning Wand`, `+3 Chaos Wand`, `+3 Projectile Bow`, `+2 Melee Quarterstaff` benchmarks)
- [x] **Phase 13 — Rage, Enlighten & Spell Block Engine, Smart Build Health Diagnostics, Tree PNG Export & 85 Oracle Benchmarks**
  - **Rage & Reservation Engine**: official PoE 1 `3.30` & PoE 2 `0.5` Rage (`1% more Attack Damage` per stack, `<Input name="multiplierRage"/>` XML round-trip, PoE 1 `Rage Support` `>=10 Rage` Attack Speed), `Enlighten Support` exact reservation multipliers (`Lv.1–7` + `+Socketed Support Gems`), flat mana reservation (`Precision`/`Clarity`/`Vitality`), and `Tempest Shield` Spell Block export
  - **Smart Build Health Diagnostics (`diagnostics.ts`)**: live sidebar health audit detecting uncapped resists (with exact missing %), low hit chance, over-reserved Mana/Spirit, empty allocated Jewel Sockets, inactive equipped Flasks (with one-click enable), low Life+ES pool, and missing Ascendancy — with direct jump-to-tab quick fixes
  - **Passive Tree PNG Snapshot Exporter**: one-click HiDPI PNG export of the live Passive Skill Tree canvas with build metadata watermark
  - **85/85 official LuaJIT PoB/PoB2 Oracle benchmarks** (`101/101` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity (adding 10 benchmarks for PoE 1 `Rage`, `Enlighten Lv.4` & `+3 Socketed Enlighten Lv.6`, `Tempest Shield` Spell Block, `Glacial Cascade`, `Double Strike Impale Rage` + PoE 2 `0.5` Multi-Support Gems)
- [x] **Phase 14 — 100/100 Oracle Benchmark Milestone, Multi-Spec Tree Diff Overlay, Multi-Item Sets & Purity/Fortify Engine**
  - **Multi-Spec Passive Trees & Visual Canvas Diff Overlay**: full PoB `<Tree activeSpec="N">` multi-`<Spec>` XML import/export + bottom-right Tree Spec Switcher (`Clone`, `Switch`, `Delete`) and live **Visual Diff Overlay** highlighting added nodes (`+` emerald ring) & removed nodes (`-` rose dashed ring) directly on the 60fps HTML5 Canvas
  - **Multi-Item Loadout Sets (`Item Sets`)**: full PoB `<Items activeItemSet="N">` multi-`<ItemSet>` XML import/export + Items tab loadout switcher with live `ΔDPS% / ΔEHP%` comparison against the baseline gear set
  - **Purity Auras & Fortification Engine**: Lua export of all 4 Purity auras (`Purity of Elements / Fire / Ice / Lightning`, including `+4%` Max Elemental Resistances), Two-Stone Ring dual-resistance parsing, and `Fortified` (`1% less Hit Damage Taken` / stack) with PoB XML round-trip & Config UI
  - **100/100 official LuaJIT PoB/PoB2 Oracle benchmarks milestone** (`117/117` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity across both PoE 1 `3.30` and PoE 2 `0.5` (all 8/8 PoE 2 classes)
- [x] **Phase 15 — Global Undo/Redo, Multi-Skill Sets, Library JSON Backup & Ascendancy/Keystone Parity (105 Oracle Benchmarks)**
  - **Global Undo / Redo (`Ctrl/Cmd+Z` & `Ctrl/Cmd+Y / Shift+Z`)**: 40-step immutable build history stack in Zustand with TopBar icon controls covering passive tree, skills, gear, and config edits
  - **Multi-Skill Sets (`<Skills activeSkillSet="N">`)**: full PoB multi-`<SkillSet>` XML import/export + Skills tab loadout switcher (`Clone`, `Switch`, `Delete`) for Clear vs Boss gem setups
  - **IndexedDB Library Backup & Restore (`.json`)**: one-click full local build library JSON export & import inside `BuildLibraryModal` + bilingual SEO/OpenGraph metadata & PWA cache v2
  - **Endgame Ascendancy & Keystone Mechanics**: Inquisitor `Inevitable Judgement` (crits ignore enemy elemental resists, non-crits penetrate 10%) & `Righteous Providence` (`1% inc Crit Chance` per lower Str/Int), `+N% to all maximum Elemental Resistances` (bilingual), `Eldritch Battery`, `Enemy Blinded` (`-20%` enemy accuracy), and exact PoB Pinnacle Boss resistance alignment
  - **105/105 official LuaJIT PoB/PoB2 Oracle benchmarks** (`124/124` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity
- [x] **Phase 16 — Level & Gem Progression Curve, Iconic Ascendancies (Berserker/Slayer/Necromancer), Iron Will & 110 Oracle Benchmarks**
  - **Level & Main Gem Progression Scaling Curve (`CalcsTab.tsx`)**: interactive ROI chart comparing live DPS, ΔDPS%, and EHP across **Main Gem Lv.18–30** and **Character Lv.60–100** with visual progress bars & `NOW` highlight
  - **Iconic Endgame Ascendancies & Keystones**: Berserker `Aspect of Carnage` (`40% more Damage` / `10% increased Damage taken`) & `Crave the Slaughter` (`Every Rage grants +1% Attack Speed`), Slayer `Overwhelm` (`Base Critical Strike Chance for Attacks with Weapons is 8%`), Necromancer `Mindless Aggression` (`10% more Minion Damage`), `Iron Will` / `Iron Grip` (Strength bonus applied to Spell / Projectile Attack Damage), `Chaos Penetration`, and official PoB/PoB2 `buffOnslaught` XML alignment
  - **110/110 official LuaJIT PoB/PoB2 Oracle benchmarks** (`130/130` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity
- [x] **Phase 17 — Item Compare & Affix Editor Modal, Tree Quick-Jump Drawer, Juggernaut/Trickster Mechanics & 115 Oracle Benchmarks**
  - **Item Compare & Quick Affix Editor Modal (`ItemCompareModal.tsx`)**: side-by-side Equipped vs Candidate diff inspector with live `ΔDPS / ΔLife / ΔES / ΔEHP / ΔResistances` banner, inline bilingual affix editing, direct `Ctrl+C` paste comparison, and one-click **Enable All / Disable All Flasks** toggle in `ItemsTab.tsx`
  - **Passive Tree Keystone/Socket Quick-Jump Drawer & Fit-Allocated Framing (`PassiveTreeCanvas.tsx`)**: searchable bilingual quick-jump drawer (`Keystones`, `Jewel Sockets`, `Allocated Notables`) with smooth camera pan & highlight, **Fit Allocated** smart zoom button, plus EHP-scaled bar & `Life / ΔEHP%` readouts in `CalcsTab.tsx`
  - **Juggernaut & Trickster Mechanics**: `Unbreakable` (Doubled Body Armour + Armour-to-Elemental Mitigation), `Escape Artist` (Body Evasion → ES & Helmet ES → Evasion), `Polymath` (`more Damage` per unique allocated Mastery), Flat Base Crit (`+N% to Critical Strike Chance`), and Max Charge mods with full EN/ZH normalization
  - **115/115 official LuaJIT PoB/PoB2 Oracle benchmarks** (`139/139` Vitest tests) passing within `<= 0.5%` Hit & Full DPS parity

## License

MIT License — see [LICENSE](./LICENSE). Inspired by and compatible with [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding).
