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
│   ├── web/         # @webpob/web   - React + Vite + Tailwind 前端应用、60fps 天赋树、Web Worker 热力图与 IndexedDB BD 库
│   └── cors-proxy/  # 可选 Cloudflare Worker 轻量 CORS 代理
├── fixtures/
│   └── oracle/      # 官方 LuaJIT PathOfBuilding 黄金基准快照（25 组 PoE 1 3.30 & PoE 2 0.5 差分测试）
└── scripts/
    ├── sync-data/   # 上游 PathOfBuilding 与 PoeCharm 汉化同步脚本 + LuaJIT 全量技能/基底导出器
    └── oracle-diff/ # 对照原版 PathOfBuilding LuaJIT 的自动化差分验证框架
```

## 原版 Path of Building 自动化差分验证（Oracle）

WebPoB 的纯 TypeScript 计算引擎通过本地 LuaJIT 直接驱动上游原版 [PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding)（PoE 1 `3.30`）与 [PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)（PoE 2 `0.5`）的 `HeadlessWrapper.lua`，生成 **25 组官方黄金基准快照**并固化在 CI 回归测试（`packages/calc/src/oracle.test.ts`）中：

- 覆盖属性、生命、魔力、能量护盾、护甲、闪避、元素抗性、PoE 1 & PoE 2 命中与二次暴击检定、**稀有武器与护甲局部词缀计算**、**双持武器（10% 更多攻速 / +20% 格挡 / 交替攻击均值）**、**星团珠宝（308 个官方核心天赋 + 小天赋效果缩放）**、**终局战斗条件（低血苦痛灵曲 / 秘术增强 / 顺风 / 恐吓 / 胆怯 / 凋零 0–15 层 / 元素曝露 + 元素使额外 -25%）**、**诅咒与印记（导电/绝望/刺客印记）**、**天赋树镶嵌珠宝**、**传奇暗金装备**、核心基石（CI / RT / 40% MoM / 霸体 / 火之化身）、**法术图腾辅助**、元素使升华、功能药剂启用、火球点燃、Lv.21 宝石成长曲线以及 **PoE 2 魔巫电球/彗星与武僧细杖寒冰打击**等核心场景。
- **全部 25 组官方基准 Hit DPS 误差控制在 `0.00% – 0.18%`**。

## 已完成核心功能

- **官方全量数据**：PoE 1 `3.30`（2,750 天赋点）& PoE 2 `0.5`（4,524 天赋点）+ **1,794 颗 Lv.1–30 官方技能宝石数值** + **2,631 种官方装备基底** + **1,731 件中英文官方传奇暗金库** + **308 个官方星团珠宝核心天赋（301 条中文）** + PoeCharm 双语汉化。
- **60fps 交互式天赋树、升华、珠宝与星团工坊**：支持视口裁剪、弧线轨道、PoE 1 专精弹窗、**升华子天赋树独立点选与聚焦**、**珠宝插槽镶嵌与星团珠宝工坊（大/中/小星团 + 附魔 + 308 双语核心天赋）**、PoE 2 武器组独立天赋涂色、**Web Worker 后台节点收益热力图**。
- **Web 原生工作流**：**IndexedDB 本地多 BD 离线库**、**BD 属性对比面板（Calcs 页实时对比 DPS/生命/护盾/EHP 差值）**、**GGG 国际服 / 腾讯国服角色导入（支持代理拉取与免代理 JSON 粘贴）**、一键生成 **`#pob=` 直达分享链接**、功能药剂开关、中英文 `Ctrl+C` 装备粘贴解析、**国服/国际服市集直达搜索**以及 GitHub Pages / Cloudflare Pages 静态部署配置。

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务器
pnpm dev

# 3. 运行单元测试、官方 PoB 差分回归测试与类型检查
pnpm test
pnpm typecheck

# 4. 生产构建
pnpm build

# 5. （可选）同步上游天赋/技能基底或运行 LuaJIT 差分报告
pnpm sync:data
pnpm sync:lua
pnpm oracle:diff
```

## 开源协议

基于 [MIT License](./LICENSE) 开源。致敬 [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding) 与所有 PoE 中文汉化社区贡献者。
