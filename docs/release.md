# 发布流程

当前最新公开版本是 `0.1.8`。

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

GitHub Release 会先创建；随后 workflow 会检查该版本是否已经存在于 npm。只有 npm 还没有该版本时，才会执行发布步骤。

如果没有配置 `NPM_TOKEN`，GitHub Release 仍然可以创建，但 npm 发布步骤会失败。

## 正式发布命令

确认 `NPM_TOKEN` 已配置后：

```bash
git tag v0.1.8
git push origin v0.1.8
```

发布完成后需要检查：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

## `v0.1.8` 发布状态

`v0.1.8` 已经完成：

- Git tag：`v0.1.8`
- GitHub Release：`v0.1.8`
- npm：`proof-pr@0.1.8`

本次是功能增强版，重点包括：

- CLI 支持 `--format html`，可生成独立 HTML 可视化报告。
- GitHub Action 支持 `html-output`，可把可视化报告上传为 artifact。
- README 和中文文档补充真实截图、从 0 到 1 使用路径和报告解释。
- HTML 报告集中展示风险等级、证据评分、Review 门禁、行动清单、重点文件和扣分原因。

## 发布后动作

可以在 GitHub Release 页面继续执行 Marketplace 上架流程。
