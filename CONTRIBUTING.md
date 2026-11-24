# Contributing to WebPoB / 参与贡献

Thank you for your interest in contributing to **WebPoB**!
感谢你对 **WebPoB** 开源项目的关注与支持！

## Development Setup / 开发环境

- Node.js >= 22
- pnpm >= 10

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
```

## Key Contribution Areas / 欢迎贡献的方向

1. **Calculation Engine (`packages/calc`)**: Adding missing modifier patterns in `ModParser`, porting PoE 1 & PoE 2 skill/ailment/defence formulas, and writing regression tests against upstream Path of Building outputs.
2. **Game Data & Sync Pipeline (`packages/data`, `scripts/sync-data`)**: Expanding passive tree datasets, gem scaling tables, unique items, and automated upstream ingestion.
3. **Bilingual Dictionaries (`packages/i18n`)**: Improving Chinese (`zh-CN` / `zh-TW`) translations and CN<->EN modifier normalization rules for in-game item copy-paste.
4. **Web UI (`apps/web`)**: Canvas passive tree visuals, item crafting editor, calcs breakdown tooltips, mobile/tablet responsiveness.

## Pull Request Checklist

- All tests pass (`pnpm test`)
- Zero TypeScript errors (`pnpm typecheck`)
- Bilingual strings updated in both `en` and `zh-CN` catalogs when adding UI text
- New calculation rules include unit tests covering both PoE 1 and/or PoE 2 where applicable
