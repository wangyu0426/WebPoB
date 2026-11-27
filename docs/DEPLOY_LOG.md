# WebPoB 生产上线与回滚台账（Deploy & Rollback Log）

本文件由 [scripts/release.mjs](../scripts/release.mjs) 自动维护，记录每一次正式发布（`PROD_DEPLOY` / `PREVIEW_DEPLOY`）与回滚（`ROLLBACK` / `AUTO_ROLLBACK`）操作。

| 时间 (UTC) | 操作 | 环境 | 版本 | Commit | Deployment | 冒烟结果 | 备注 / 原因 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-11-27T05:01:35Z | `PROD_DEPLOY` | Production | `v0.2.1` | `e486295` | `e9312d4a` | Smoke 4/4 PASS | 上线 manifest.json 数据契约、多版本历史天赋树支持与动态职业升华加载；增强 Ninja E2E 结构化报告与公网跳转稳健性 |
| 2026-11-26T16:08:31Z | `PROD_DEPLOY` | Production | `v0.2.0` | `6c1c6a4` | `f1996f9a` | Smoke 4/4 PASS | 版本管理与秒级回滚系统上线；修复 Service Worker (`sw.js v4`) 缓存旧天赋树 JSON 导致老用户看到未汉化节点的问题 |
| 2026-11-26T16:06:45Z | `AUTO_ROLLBACK` | Production | `v0.1.0` | `a313388` | `cb3f1033 -> 97494805` | Smoke 4/4 PASS | 首次 `v0.2.0` 发布冒烟检测到 `version.json` 仍为 `0.1.0`，触发自动秒级回滚（随后修复构建顺序重发成功） |
| 2026-11-26T15:49:06Z | `PROD_DEPLOY` | Production | `v0.1.1` | `fd67782` | `1a732a05` | Proxy 200 + ZH 100% | 编年史全量中文化（PoE 2 词缀 100% / PoE 1 基石 48/48）+ 12 套 `poe.ninja` 回归测试 |
| 2026-11-26T15:02:47Z | `PROD_DEPLOY` | Production | `v0.1.0` | `a313388` | `97494805` | RWD 验收 + Proxy 200 | 手机端 RWD 专项升级（紧凑顶栏、单行天赋树 HUD、自动全景框选、装备页防折行） |
