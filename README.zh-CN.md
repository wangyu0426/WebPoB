<div align="center">

# WebPoB（网页版 PoB）

**永久免费开源、免安装、浏览器直开的《流放之路 1 & 2》纯前端 Path of Building 查看与构筑工具。**

**简体中文** · [English](./README.md)

[![在线主站](https://img.shields.io/badge/在线主站-webpob.pages.dev-e5be6d?style=for-the-badge&logo=cloudflarepages&logoColor=111)](https://webpob.pages.dev/?lang=zh)
[![PoE2 示例](https://img.shields.io/badge/PoE2_一键体验-Lv.99_神谕者彗星落-38bdf8?style=for-the-badge)](https://webpob.pages.dev/?lang=zh&import=https://pobb.in/Xii_bN-QbdZn)
[![开源协议](https://img.shields.io/badge/License-MIT-4ade80?style=for-the-badge)](./LICENSE)
[![基准测试](https://img.shields.io/badge/原版PoB差分基准-131_组全绿_(174_测试)-818cf8?style=for-the-badge)](#原版-path-of-building-自动化差分验证)

</div>

<p align="center">
  <img src="./docs/images/webpob-poe2-diff-zh.jpg" alt="WebPoB PoE 2 全中文天赋树与多套方案差异高亮对比" width="100%" />
</p>

## 在线体验与一键直开

- **在线主站（自动识别浏览器中/英文）：** https://webpob.pages.dev/
- **PoE 2 示例 BD 一键直开（Lv.99 神谕者暴击施放彗星落 · 内含 12 套过渡/终局天赋）：** https://webpob.pages.dev/?lang=zh&import=https://pobb.in/Xii_bN-QbdZn
- **攻略作者 / 群友分享技巧：** 把任意 `pobb.in` 或 `poe.ninja` 链接拼在 `?import=` 后面发给好友，在手机、iPad、Mac 或电脑浏览器点开即可看全中文天赋树、装备与技能：

```text
https://webpob.pages.dev/?import=https://pobb.in/你的BD短码
https://webpob.pages.dev/?lang=zh&import=https://poe.ninja/poe2/pob/你的短码
```

---

## 核心特性

| 模块 | 亮点说明 |
|---|---|
| **PoE 1 & PoE 2 双端支持** | 同步支持 **流放之路 1（`3.30` · 2,750 天赋点）** 与 **流放之路 2（`0.5` · 4,524 天赋点 · 全 8/8 职业）**，精准隔离两代机制差异 |
| **主流链接一键导入** | 直接粘贴 `pobb.in` 链接、`poe.ninja`（PoE1/PoE2）链接、PoB 导出码（`Base64URL+zlib`）、XML 文件或国际服/国服角色导入 |
| **60fps 交互式天赋树** | 支持手机双指捏合缩放、最短路径点选、PoE 2 **武器组 I / II** 独立天赋涂色、升华子天赋树、星团珠宝画布子图与 Web Worker **节点收益热力图** |
| **多套天赋差异对比（Tree Diff）** | 开荒到终局多套方案切换时，画布直接以 **翠绿（新增） / 玫红虚线（移除）** 高亮差异节点，抄作业一目了然 |
| **原生中英文双语** | 根据浏览器语言自动切换中/英文（支持 `?lang=zh` / `?lang=en`），内置 PoeCharm 双语词库与**国服中文/国际服英文 `Ctrl+C` 装备解析器** |
| **纯前端离线友好** | 零登录、无广告，支持 **PWA 离线缓存**、**IndexedDB 本地多 BD 库**（可 JSON 备份/恢复）、`#pob=` 分享码、高清 PNG/Markdown 构筑卡片导出、命令面板（`Ctrl/Cmd+K`）与 40 步撤销/重做 |

<p align="center">
  <img src="./docs/images/webpob-poe2-en.jpg" alt="WebPoB English UI for Path of Exile 2" width="100%" />
  <br />
  <sub>内置原生中/英一键切换，方便同步查看国际服词缀与海外 BD。</sub>
</p>

---

## 原版 Path of Building 自动化差分验证

WebPoB 的纯 TypeScript 计算引擎（`@webpob/calc`）通过本地 LuaJIT 直接驱动上游原版 [PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding)（PoE 1 `3.30`）与 [PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2)（PoE 2 `0.5`）的 `HeadlessWrapper.lua`，持续进行自动化差分回归测试：

- **131 组官方黄金基准快照**（`fixtures/oracle/snapshots.json`）+ **174/174 Vitest 单元测试** 固化在 CI 中。
- 全部基准 **Hit DPS 与 Full DPS 误差 `<= 0.5%`**，覆盖 **PoE 2 `0.5` 全 8/8 官方职业**、精魂保留、大法师、双武器组天赋、多辅助宝石联结，以及 PoE 1 `3.30` 核心终局机制（完整元素转化链、光环/诅咒效果、怒火与启蒙保留、众神殿、偷取速率、防卫技能、护体、结界、法术压制、双持与穿刺、CoC、陷阱/地雷、召唤物、多技能 Full DPS、星团/永恒珠宝及主流升华）。
- **坦诚说明**：WebPoB 目前非常适合在手机/Mac/浏览器快速看 BD、对比多套过渡天赋和分享直开链接；桌面原版 PoB 中极冷门的特殊技能交互仍在持续补齐。如果遇到某个 BD 导入异常或数值偏差，欢迎直接提 Issue 附上 `pobb.in` 链接！

---

## 仓库结构

```text
WebPoB/
├── packages/
│   ├── core/        # @webpob/core  - 共享领域模型（Build/Tree/Skill/Item/Mod/CalcOutput/GameRuleset）
│   ├── i18n/        # @webpob/i18n  - 中英文界面文案、游戏术语双语词库、中文词缀归一化引擎
│   ├── data/        # @webpob/data  - PoE 1 & PoE 2 规则集、职业升华、天赋树、技能/基底/暗金库与模板
│   ├── codec/       # @webpob/codec - 官方 PoB 分享码编解码（Base64URL+zlib XML）与中/英文装备解析器
│   └── calc/        # @webpob/calc  - 纯 TS 计算引擎（ModDB、双语 ModParser、攻防计算、节点收益）
├── apps/
│   ├── web/         # @webpob/web   - React + Vite + Tailwind 前端应用、60fps 天赋树、Pages /api/proxy
│   └── cors-proxy/  # 可选独立 Cloudflare Worker CORS 代理（含边缘缓存）
├── fixtures/
│   └── oracle/      # 官方 LuaJIT PathOfBuilding 黄金基准快照（131 组 PoE 1 & PoE 2 差分测试）
└── scripts/
    ├── sync-data/   # 上游 PathOfBuilding 与 PoeCharm 汉化同步脚本 + LuaJIT 全量技能/基底导出器
    └── oracle-diff/ # 对照原版 PathOfBuilding LuaJIT 的自动化差分验证框架
```

## 本地开发与部署

```bash
# 1. 安装依赖（Node.js 20+ & pnpm）
pnpm install

# 2. 启动本地开发服务器
pnpm dev

# 3. 运行单元测试、原版 PoB 差分测试与类型检查
pnpm test
pnpm typecheck

# 4. 生产构建
pnpm build

# 5. （可选）同步上游天赋/技能基底或运行 LuaJIT 差分报告
pnpm sync:data
pnpm sync:lua
pnpm oracle:diff
```

### 部署到 Cloudflare Pages

项目为纯静态架构，内置 `apps/web/functions/api/proxy.ts` 边缘缓存代理，构建后在 `apps/web` 目录部署即可：

```bash
pnpm build
cd apps/web && npx wrangler pages deploy dist --project-name webpob
```

---

## 完整迭代记录

<details>
<summary><strong>点击展开 Phase 1–20 与性能优化完整里程碑</strong></summary>

- **性能优化与体验升级**：`/api/proxy` 接入 Cloudflare 边缘缓存、首屏两阶段按需加载（优先 `tree + gems`，按需加载 `bases/uniques/clusters`）、消除 `?import=` 双重数据拉取、PoE 2 升华美术 WebP/渐进式 JPEG 压缩、秒出深色加载骨架、Service Worker v3 立即注册、新增 `poe.ninja/poe1/pob/` 支持与自动识别浏览器语言（`?lang=en` / `?lang=zh`）。
- **官方全量数据（Phase 1–12）**：PoE 1 `3.30`（2,750 节点）& PoE 2 `0.5`（4,524 节点）+ 1,794 颗 Lv.1–30 技能曲线 + 2,706 种装备基底 + 1,731 件中英文官方暗金 + 308 个星团珠宝核心天赋 + PoeCharm 双语词库。
- **高级天赋树与交互（Phase 4–19）**：视口裁剪 60fps 画布、已点天赋汇总抽屉与悬停单点效率（`+X%/pt`）、基石/插槽快捷搜索抽屉与「框选已点」、多套天赋差异高亮叠加、一键导出高清树图 PNG、手机单指拖拽与双指捏合缩放、升华子天赋树、星团画布子图、PoE 2 武器组涂色、Web Worker 热力图与高收益大点排行。
- **Web 原生构筑工具链（Phase 6–20）**：全局命令面板（`Ctrl/Cmd+K`）与快捷键表（`?`）、40 步全局撤销/重做、装备属性汇总抽屉 + 智能集市升级搜索构建器 + 左右对比弹窗 + 多套配装 + 暗金升级推荐 + 稀有制作台、技能组实时 DPS/Full DPS 占比条 + 20/20 预设 + 辅助宝石推荐、众神殿/防卫技能/终局配置、6 套经典开荒/终局模板 + XML 源码查看器、PoB 色标笔记编辑器、伤害构成条 + 防御全景面板 + 成长曲线 + What-If 模拟、构筑健康体检诊断、IndexedDB 本地多 BD 库与 JSON 备份。

</details>

## 反馈与开源协议

本人非常喜欢《流放之路》极高的 BD 自由度，后续也会持续维护和开发更多流放之路相关的开源免费工具。欢迎提交 Issue（附带 `pobb.in` 链接或导出码最方便复现）、翻译修正或 Pull Request，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

基于 [MIT License](./LICENSE) 开源。致敬 [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding)、[PathOfBuilding-PoE2](https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2) 及所有 PoE 开源与中文汉化社区贡献者。
