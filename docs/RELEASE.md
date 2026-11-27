# WebPoB 发布与回滚 SOP

本文档面向维护者，描述 WebPoB 的版本规范、标准上线流程、线上核验与 10 秒应急回滚操作。发布目标为 **Cloudflare Pages** 项目 `webpob`，线上主站为 <https://webpob.pages.dev/>。

## 1. 版本号与发布台账

- **版本号规范**：遵循 [SemVer](https://semver.org/) 的 `MAJOR.MINOR.PATCH`。
  - `PATCH`：缺陷修复、文案与兼容性小改动。
  - `MINOR`：向后兼容的新功能、数据覆盖扩展。
  - `MAJOR`：不兼容的构筑格式、URL 或 API 变更。
- **Git Tag**：每次正式发布必须创建 `vX.Y.Z` 标签（例如 `v0.1.1`），标签指向实际部署的提交。
- **线上验活**：构建产物包含 `/version.json`，用于核对线上版本、提交 SHA、分支、Tag 与构建时间。
- **部署台账**：`releases.json` 记录发布历史与部署 ID；回滚时优先据此定位上一个健康版本。

发布前确认工作区干净、目标提交已推送，并确保 `CHANGELOG.md` 已更新对应版本条目。

- 用 `git var GIT_AUTHOR_IDENT` 和 `git var GIT_COMMITTER_IDENT` 核对公开署名和 GitHub `noreply` 邮箱，避免将私人邮箱、本机主机名写入发布提交或标签。
- `--notes` 和 `--reason` 会写入公开记录，不要包含个人信息、凭据或私有地址。维护者如需将记录同步到私有文档，按私有手册在本机设置 `WEBPOB_RELEASE_MIRROR_DOCS_DIR`，指向已有 `DEPLOY_LOG.md` 的文档目录；未设置则只写本仓库。

## 2. 标准上线流程

```bash
# 1. 查看当前版本、线上版本与台账状态
pnpm release:status

# 2. 本地完整验证（与 CI 保持一致）
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build

# 3. 预发预览：先部署到预览环境验证，不影响线上
pnpm release:preview

# 4. 正式发布：自动递增补丁版本、写入发布说明并启用自动回滚保护
pnpm release:deploy -- --bump patch --notes "修复天赋树中文词条与移动端布局" --auto-rollback
```

> **必须从 `apps/web` 目录部署**：Cloudflare Pages 的 `/api/proxy` 由 `apps/web/functions/api/proxy.ts` 提供。使用发布脚本时请保持其在 `apps/web` 下执行部署（脚本已按此约定处理）；手工部署也必须执行 `cd apps/web && npx wrangler pages deploy dist --project-name webpob`，否则 Functions 会丢失，线上跨域代理与数据加载将失效。

发布完成后创建并推送标签，供 GitHub Release 工作流归档：

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 3. 线上核验

```bash
# 检查线上版本信息：version / gitSha / gitTag / branch / builtAt
curl -sS https://webpob.pages.dev/version.json

# 运行发布冒烟检查
pnpm release:smoke
```

核验要点：

- `version.json` 的 `version` 与本次发布版本一致，`gitSha` 对应目标提交。
- 首页、天赋树、技能、装备、计算等核心页签可正常加载，`/api/proxy` 请求成功。
- 中文（`?lang=zh-CN`）与英文（`?lang=en`）界面无原始 i18n key、`undefined`、`NaN` 或 `[object Object]` 泄漏。
- 桌面（1440×860）与移动端（390×844）无横向溢出、控制台无未捕获异常。

## 4. 10 秒应急回滚 SOP

发生线上故障时，优先回滚到上一个健康版本，再定位根因。以下命令均在仓库根目录执行。

### 4.1 一键回退到上一个健康版本

```bash
pnpm release:rollback -- --prev
```

### 4.2 回退到指定版本或部署 ID

```bash
# 回退到指定 Git Tag / 版本
pnpm release:rollback -- v0.1.0

# 回退到指定 Cloudflare Pages 部署 ID
pnpm release:rollback -- 97494805
```

### 4.3 历史部署失效时的 Git Tag 重建兜底

当目标部署已过期或被清理、无法直接回滚时，从对应 Git Tag 重新构建并部署：

```bash
pnpm release:rollback -- v0.1.0 --rebuild
```

### 4.4 演练模式（不实际改动线上）

```bash
pnpm release:rollback -- --prev --dry-run
```

回滚后立即复查：

```bash
curl -sS https://webpob.pages.dev/version.json
pnpm release:smoke
```

确认 `version.json` 已回到目标版本且核心页面恢复正常，再在 `releases.json` 中记录本次回滚原因与后续修复计划。

## 5. 发布检查清单

- [ ] `CHANGELOG.md` 已更新，版本号与 `package.json` 一致。
- [ ] `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build` 全部通过。
- [ ] 已在 `apps/web` 下完成部署，`/api/proxy` Functions 正常。
- [ ] `curl -sS https://webpob.pages.dev/version.json` 返回预期版本与提交。
- [ ] `pnpm release:smoke` 通过，桌面与移动端核心流程无异常。
- [ ] 已创建并推送 `vX.Y.Z` 标签，GitHub Release 已生成。

