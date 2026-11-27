# Oracle Differential Testing Contract & Baseline Audit

This document defines the shared metric comparison contract implemented in `packages/calc/src/oracleContract.ts` and enforced by `packages/calc/src/oracle.test.ts` and `scripts/oracle-diff/src/diff.ts`.

## 1. Metric Status Semantics

Every evaluated metric produces one of six explicit statuses:

| Status | Meaning | Fail-Closed Gate Impact |
| :--- | :--- | :--- |
| `pass` | Both oracle and actual values are finite numbers within the metric's tolerance rule. | Passes |
| `mismatch` | Both values are finite numbers, but outside tolerance. | Fails |
| `missing` | Either oracle (`null`/`undefined`) or actual (`undefined`/`null`) is absent when the metric is applicable. True `0` is **never** treated as missing, and missing is **never** coerced to `0`. | Fails |
| `invalid` | Either value is non-finite (`NaN`, `Infinity`, `-Infinity`, or string sentinels `"NaN"`, `"Infinity"`, `"-Infinity"`) or non-numeric. | Fails |
| `not_applicable` | Mechanic does not apply to the build/game context (e.g., `SpiritReserved` on PoE 1, `Ward`/`SpellSuppressionChance`/`SpellBlockChance`/`ImpaleDPS` on PoE 2, `FullDPS` when no skill group has `includeInFullDps` and oracle `FullDPS` is `0`/absent). | Neutral |
| `unsupported` | Metric is tracked for audit visibility but not yet qualified for parity. | Fails strict/certify |

## 2. Metric Mapping & Tolerance Rules

| Metric | Oracle Key | WebPoB Output Field | Tier | Unit | Tolerance Rule | Applicability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Str` | `Str` | `defence.str` | `core` | `int` | Exact integer | Always |
| `Dex` | `Dex` | `defence.dex` | `core` | `int` | Exact integer | Always |
| `Int` | `Int` | `defence.int` | `core` | `int` | Exact integer | Always |
| `Life` | `Life` | `defence.life` | `core` | `flat` | `<= 0.1%` or `<= 1` | Always |
| `EnergyShield` | `EnergyShield` | `defence.energyShield` | `core` | `flat` | `<= 0.5%` or `<= 1` | Always |
| `Ward` | `Ward` | `defence.ward ?? 0` | `core` | `flat` | `<= 0.5%` or `<= 1` | PoE 1 |
| `Mana` | `Mana` | `defence.mana` | `core` | `flat` | `<= 0.1%` or `<= 1` | Always |
| `ManaUnreserved` | `ManaUnreserved` | `defence.manaUnreserved` | `extended` | `flat` | `<= 0.5%` or `<= 2` | Always |
| `SpiritReserved` | `SpiritReserved` | `defence.spiritReserved` | `core` | `int` | Exact integer | PoE 2 |
| `Armour` | `Armour` | `defence.armour` | `core` | `flat` | `<= 0.5%` or `<= 1` | Always |
| `Evasion` | `Evasion` | `defence.evasion` | `core` | `flat` | `<= 0.5%` or `<= 1` | Always |
| `SpellSuppressionChance` | `SpellSuppressionChance` | `defence.spellSuppressionChance` | `core` | `pct` | Exact integer | PoE 1 |
| `SpellBlockChance` | `SpellBlockChance` | `defence.spellBlockChance` | `core` | `pct` | Exact integer | PoE 1 |
| `FireResist` | `FireResist` | `defence.fireResist` | `core` | `pct` | Exact integer | Always |
| `ColdResist` | `ColdResist` | `defence.coldResist` | `core` | `pct` | Exact integer | Always |
| `LightningResist` | `LightningResist` | `defence.lightningResist` | `core` | `pct` | Exact integer | Always |
| `ChaosResist` | `ChaosResist` | `defence.chaosResist` | `extended` | `pct` | Exact integer | Always |
| `TotalEHP` | `TotalEHP` | `defence.effectiveHitPool` | `extended` | `ehp` | `<= 5%` or `<= 10` | Always |
| `Speed` | `Speed` | `offence.speed` | `core` | `per_sec` | `<= 0.5%` or `<= 0.02` (`nearZeroFloor=0.01`) | Always |
| `CritChance` | `CritChance` | `offence.critChance` | `core` | `pct` | `<= 0.5%` or `<= 0.05` | Always |
| `CritMultiplier` | `CritMultiplier` | `offence.critMultiplier` | `core` | `pct` | Exact integer (normalizes ratio `<= 10` by `* 100`) | Always |
| `HitChance` | `HitChance` | `offence.hitChance` | `core` | `pct` | Exact integer | Always |
| `AverageDamage` | `AverageDamage \|\| AverageHit` | `offence.averageHit * (hitChance / 100)` | `core` | `damage` | `<= 0.5%` or `<= 1` | Always |
| `HitDPS` | `TotalDPS` | `offence.hitDps` | `core` | `dps` | `<= 0.5%` or `<= 1` | Always |
| `ImpaleDPS` | `ImpaleDPS` | `offence.impaleDps ?? 0` | `core` | `dps` | `<= 0.5%` or `<= 1` | PoE 1 |
| `IgniteDPS` | `IgniteDPS` | `offence.igniteDps` | `extended` | `dps` | `<= 0.5%` or `<= 1` | Always |
| `BleedDPS` | `BleedDPS` | `offence.bleedDps` | `extended` | `dps` | `<= 0.5%` or `<= 1` | Always |
| `PoisonDPS` | `TotalPoisonDPS` | `offence.poisonDps` | `extended` | `dps` | `<= 0.5%` or `<= 1` | Always |
| `CombinedDPS` | `CombinedDPS` | `offence.totalDps` | `extended` | `dps` | `<= 0.5%` or `<= 1` | Always |
| `FullDPS` | `FullDPS` | `offence.fullDps` | `core` | `dps` | `<= 0.5%` or `<= 1` | `oracle.FullDPS > 0` or any enabled skill has `includeInFullDps` |

## 3. Diagnostic vs Strict vs Certification Modes

Run the CLI via:

```bash
# Diagnostic mode (default): fails nonzero on missing/corrupt input, schema errors, or core regressions;
# prints extended metric gaps and certification status honestly.
pnpm oracle:diff

# Strict mode: fails nonzero on any core OR extended metric mismatch/missing/invalid.
pnpm oracle:diff -- --strict

# Certification mode: fails nonzero unless strict parity passes AND all snapshots use schemaVersion=2
# (non-coerced null/NaN/Inf oracle output + skill context metadata).
pnpm oracle:diff -- --certify
```

## 4. Non-Certified Baseline Audit (130 Legacy Snapshots)

The current `fixtures/oracle/snapshots.json` corpus (130 snapshots) was generated before `run_oracle.lua` preserved `null`/`NaN`/`Infinity` and skill context metadata (`schemaVersion: 2`), so **`certified` is `false`**.

Baseline results across all 130 snapshots:

- **Core regression tier**: **130/130 PASS** (including legitimate zero checks on `Ward`, `SpiritReserved`, `SpellSuppressionChance`, `SpellBlockChance`, `ImpaleDPS`, and fail-closed `FullDPS` on all 5 FullDPS builds).
- **Extended tier known engine gaps (explicitly surfaced, not hidden)**:
  - `ChaosResist` (128 pass / 2 mismatch): `poe1_ci_es_witch`, `poe1_ci_discipline_high_es_gear` — PoB keeps `ChaosResist = -60` with Chaos Inoculation immunity; WebPoB reports `100`.
  - `TotalEHP` (7 pass / 123 mismatch): WebPoB uses a simplified EHP approximation rather than PoB's full enemy-hit simulation.
  - `IgniteDPS` (113 pass / 17 mismatch): e.g. `poe1_avatar_of_fire_frostbolt`, `poe1_minion_srs_necromancer`, `poe1_elemental_overload_fireball`.
  - `BleedDPS` (127 pass / 3 mismatch): `poe1_melee_phys_cruelty_lacerate`, `poe1_bleed_lacerate_deadly_ailments`, `poe1_double_strike_rage20_impale_brutality` (WebPoB outputs `0`).
  - `PoisonDPS` (129 pass / 1 mismatch): `poe1_viper_strike_chaos_claw` (oracle `302.78`, WebPoB `0`).
  - `CombinedDPS` (103 pass / 27 mismatch): cascades from Ignite/Bleed/Poison/DoT differences (e.g. `poe1_wither_despair_soulrend`).
  - `ManaUnreserved` (126 pass / 4 mismatch): over-reserved mana clamped to `0` in WebPoB (`poe1_auras_hatred_zealotry_haste`, `poe1_heralds_determination_precision`) plus `poe1_high_impact_mine_arc`.

## 5. Known Unknowns

- Legacy v1 snapshots coerced `nil`, `NaN`, and `±Infinity` from LuaJIT to `0` in `run_oracle.lua`. Until snapshots are regenerated with the hardened v2 `run_oracle.lua` against upstream PoB, `0` values in legacy fixtures cannot be distinguished from absent Lua fields.
- `run_oracle.lua` v2 now emits `null`, `"NaN"`, `"Infinity"`, `"-Infinity"`, and `context: { activeSkillName, mainSocketGroup, outputSource }` so future regenerated fixtures can qualify for `--certify`.
