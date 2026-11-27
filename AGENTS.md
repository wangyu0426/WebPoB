# AGENTS.md — `WebPoB` 展示层 Agent 开发、测试与上线规范

本文件约束所有在 `WebPoB` 仓库工作的 AI Agent（Codex / Claude / Antigravity / Orca Workers）。完整的数据同步与预发布流水线见维护者手册。

---

## 1. 仓库定位与基本原则

- 本仓库为 **WebPoB 开源展示与计算层**（`apps/web`、`packages/{core,i18n,data,codec,calc}`、静态数据契约 `apps/web/public/data/manifest.json`、公开回归测试与发版脚本）。
- **严禁**将私有凭证、内部运营脚本或未验证的半成品数据提交到本仓库。
- **严禁**破坏历史版本天赋树兼容性（`apps/web/public/data/manifest.json` 必须保留既有历史树映射）。

---

## 2. 提交与测试门禁（必须全部通过）

任何改动提交或发版前必须执行并 100% 通过：
```bash
pnpm typecheck
pnpm test      # 含单元测试 + 131 条 LuaJIT Oracle 对拍 + 39 条 poe.ninja 回归 + 27 条发版单测 + 23 条 manifest 契约单测
pnpm build
```
涉及 UI、天赋树渲染、中文词库或编解码改动时，还应执行双端真实浏览器 E2E 回归：
```bash
BASE_URL=http://127.0.0.1:4173 pnpm test:e2e:ninja
```

---

## 3. 正式上线与回滚铁律

1. **先预发再生产**：重大改动或数据更新须按维护者手册部署到预发并通过 QA 门禁后再发生产。
2. **禁止裸跑根目录 `wrangler`**：严禁从仓库根目录运行 `wrangler pages deploy apps/web/dist`（会遗漏 `apps/web/functions/api/proxy.ts` 导致线上 `pobb.in / poe.ninja` 导入全挂）。
3. **统一走发版 CLI（带自动回滚）**：
   ```bash
   pnpm release:deploy -- --bump patch --notes "<本次上线说明>" --auto-rollback
   git push origin main --follow-tags
   ```
4. **线上异常 10 秒止血回滚**：
   ```bash
   pnpm release:rollback -- --prev --reason "<回滚原因>"
   # 或指定版本 / 部署 ID：
   pnpm release:rollback -- v0.2.0 --reason "<回滚原因>"
   ```
5. **全量台账留档**：`pnpm release:deploy` 与 `pnpm release:rollback` 会自动更新 [releases.json](./releases.json) 和 [docs/DEPLOY_LOG.md](./docs/DEPLOY_LOG.md)。操作结束后务必提交并推送台账更新。
