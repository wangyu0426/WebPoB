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
│   └── oracle/      # 官方 LuaJIT PathOfBuilding 黄金基准快照（45 组 PoE 1 3.30 & PoE 2 0.5 差分测试）
└── scripts/
    ├── sync-data/   # 上游 PathOfBuilding 与 PoeCharm 汉化同步脚本 + LuaJIT 全量技能/基底导出器
    └── oracle-diff/ # 对照原版 PathOfBuilding LuaJIT 的自动化差分验证框架
```

## 原版 Path of Building 自动化差分验证（Oracle）

WebPoB 的纯 TypeScript 计算引擎通过本地 LuaJIT 直接驱动上游原版 [PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding)（PoE 1 `3.30`）与 [PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)（PoE 2 `0.5`）的 `HeadlessWrapper.lua`，生成 **45 组官方黄金基准快照**并固化在 CI 回归测试（`packages/calc/src/oracle.test.ts`）中：

- 覆盖属性、生命、魔力、能量护盾、**结界（Ward）**、护甲、闪避、**法术压制**、元素抗性、PoE 1 & PoE 2 命中与二次暴击检定、**暴击与非暴击物理护甲独立减伤**、**PoE 2 `ArmourRatio = 10`**、**稀有武器与护甲局部词缀**、**PoE 1 物理转伤继承 vs PoE 2 终态转伤**、**双持武器**、**召唤物 DPS（愤怒狂灵 SRS + 召唤物伤害 + 愤怒光环）**、**全套光环与捷（坚定/精准/优雅/憎恨/奋锐/迅捷/灰烬之捷/寒冰之捷）**、**异常与近战/投射物核心辅助（致命异常/极速腐化/虚空操纵/邪恶投掷/近战物理伤害/凌厉/几率点燃）**、**穿刺（Impale）DPS**、**暴击时施放（CoC）`0.033s` 帧档位**、**永恒珠宝基石**、**星团珠宝（308 个官方核心天赋）**、**终局战斗条件**、**诅咒与印记**、**天赋树镶嵌珠宝**、**传奇暗金装备**、核心基石（CI / RT / 40% MoM / 霸体 / 火之化身 / 元素超载 EO）、法术图腾、升华、功能药剂、Lv.21 宝石成长，以及 **PoE 2 `0.5` 大法师精魂保留（每 100 最大魔力附加 4% 额外闪电伤害）**、**PoE 2 `<WeaponSet1>`/`<WeaponSet2>` 双武器套装天赋切换**与 **PoE 2 六大职业构筑（魔巫电球/大法师/彗星/火球、女巫画地为牢、武僧寒冰打击、游侠闪电箭矢/毒爆箭、战士熔岩裂隙）**。
- **全部 45 组官方基准 Hit DPS 误差控制在 `<= 0.5%`（58/58 单元测试全绿）**。

## 已完成核心功能

- **官方全量数据**：PoE 1 `3.30`（2,750 天赋点）& PoE 2 `0.5`（4,524 天赋点）+ **1,794 颗 Lv.1–30 官方技能宝石数值** + **2,701 种官方装备基底（含全部先祖结界装备）** + **1,731 件中英文官方传奇暗金库** + **308 个官方星团珠宝核心天赋（301 条中文）** + PoeCharm 双语汉化。
- **60fps 交互式天赋树、升华、珠宝、星团子图与节点收益排行**：支持视口裁剪、弧线轨道、PoE 1 专精弹窗、**升华子天赋树独立点选与聚焦**、**星团珠宝画布可视化子图渲染与悬停双语提示**、**星团珠宝工坊与永恒珠宝快速镶嵌**、**PoE 2 武器组独立天赋涂色与非激活武器组视觉暗化（官方 PoB2 XML 双向兼容）**、**Web Worker 后台热力图 + 高收益天赋大点排行抽屉（支持 `DPS/点` / `总DPS` / `EHP/点` / `总EHP` 排序、一键定位与一键最短路径分配）**。
- **Web 原生构筑工具链**：**技能页按实时 DPS 收益排序的智能辅助宝石推荐**、**装备页交互式稀有装备制作台（2,701 基底 + 6 词缀 + 装备前实时 ΔDPS/Δ生命/ΔEHP 预览）**、**IndexedDB 本地多 BD 离线库**、**BD 属性对比面板**、**GGG 国际服 / 腾讯国服角色导入（代理拉取 + 免代理 JSON 粘贴）**、一键 **`#pob=` 直达分享链接**、**离线 PWA 安装与资源缓存**、中英文 `Ctrl+C` 装备解析以及国服/国际服市集直达搜索。

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
