# WebPoB

**简体中文** | [English](./README.md)

[Path of Building Community](https://github.com/PathOfBuildingCommunity/PathOfBuilding) 的开源纯 TypeScript Web 移植版，从零架构，**同时支持《流放之路 1》(PoE 1) 与《流放之路 2》(PoE 2)**，提供原生**中英文双语**体验。

## 项目目标与核心特性

- **纯 TypeScript 实现**：计算引擎（`ModDB`、`ModParser`、`CalcOffence`、`CalcDefence`）、PoB 分享码编解码器、天赋树图算法与前端界面全部使用强类型 TypeScript 编写，无原生依赖。
- **PoE 1 & PoE 2 双版本原生兼容**：共享核心计算框架，通过游戏规则集（`GameRuleset`）精准隔离两代机制差异（如 PoE 1 的装备孔位连线 / 药剂 / 法术压制 vs. PoE 2 的武器组独立天赋 / 精魂保留 / 独立技能宝石槽 / 护符）。
- **全量中英文双语（EN / ZH-CN）**：
  - 界面、职业、天赋节点、技能宝石、装备、词缀一键切换中英文。
  - **双语装备与词缀解析器**：直接支持在游戏内按 `Ctrl+C` 复制的**国服中文装备文本**或**国际服英文装备文本**，自动归一化为统一词缀参与计算。
- **纯前端静态优先 + 可选轻量代理**：所有计算在浏览器本地完成，可直接部署至 Cloudflare Pages / GitHub Pages；附带极简 Cloudflare Worker 代理模板，用于解决拉取 `pobb.in` / `pastebin` / GGG 角色接口的跨域问题。
- **开源协议（MIT）**：与原版 Path of Building 保持一致的 MIT 开源协议，欢迎社区共建。

## 仓库结构

```text
WebPoB/
├── packages/
│   ├── core/        # @webpob/core  - 共享领域模型（Build/Tree/Skill/Item/Mod/CalcOutput/GameRuleset）
│   ├── i18n/        # @webpob/i18n  - 中英文界面文案、游戏术语双语词库、中文词缀归一化引擎
│   ├── data/        # @webpob/data  - PoE 1 & PoE 2 规则集、职业升华、天赋树数据、技能/装备库与示例 BD
│   ├── codec/       # @webpob/codec - 官方 PoB 分享码编解码（Base64URL+zlib XML）与中/英文装备文本解析器
│   └── calc/        # @webpob/calc  - 纯 TS 计算引擎（ModDB、双语 ModParser、攻防计算、天赋节点收益预测）
├── apps/
│   ├── web/         # @webpob/web   - React + Vite + Tailwind 前端应用与 Canvas 交互式天赋树
│   └── cors-proxy/  # 可选 Cloudflare Worker 轻量 CORS 代理
└── scripts/
    └── sync-data/   # 上游 PathOfBuilding 与 PoEDB/社区汉化词库同步脚本框架
```

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务器
pnpm dev

# 3. 运行单元测试与类型检查
pnpm test
pnpm typecheck

# 4. 生产构建
pnpm build
```

## 开源协议

基于 [MIT License](./LICENSE) 开源。致敬 [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding) 与所有 PoE 中文汉化社区贡献者。
