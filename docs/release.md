# 发布流程

当前 `main` 分支已经准备好 `0.1.5`。正式发布需要仓库维护者确认后再打 tag。

## 发布前检查

```bash
pnpm release:check
```

这个命令会执行：

- TypeScript 类型检查。
- 单元测试。
- CLI 和 GitHub Action 打包。
- `npm pack --dry-run`，验证 npm 包内容。

## npm 自动发布条件

`.github/workflows/release.yml` 已经支持 tag 发布时自动发布 npm 包：

- 触发条件：推送 `v*.*.*` tag。
- npm 包：`proof-pr`。
- 发布命令：`npm publish --access public --provenance`。
- 需要仓库 secret：`NPM_TOKEN`。

如果没有配置 `NPM_TOKEN`，GitHub Release 可以创建，但 npm 发布步骤会失败。

## 正式发布命令

确认 `NPM_TOKEN` 已配置后：

```bash
git tag v0.1.5
git push origin v0.1.5
```

发布完成后需要检查：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

## 发布后文档更新

发布成功后，把 README 的发布状态改成：

- GitHub Release：`v0.1.5`
- npm 最新公开包：`proof-pr@0.1.5`

然后可以在 GitHub Release 页面继续执行 Marketplace 上架流程。
