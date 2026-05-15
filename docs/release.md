# 发布流程

当前最新公开版本是 `0.1.17`。

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
- 发布命令：`npm publish --access public`。
- 推荐认证方式：npm Trusted Publishing，通过 GitHub OIDC 发布，不需要长期 npm token。
- 不再依赖仓库 secret `NPM_TOKEN`。如果仓库里仍残留旧 token，release workflow 也会忽略它，避免旧 token 把发布带到 token fallback。

GitHub Release 会先创建；随后 workflow 会检查该版本是否已经存在于 npm。只有 npm 还没有该版本时，才会执行发布步骤。

workflow 使用 Node 24 和 npm 11，并通过 GitHub OIDC 使用 npm Trusted Publishing。如果 npm 包没有配置 trusted publisher，发布步骤会失败，需要先在 npm 包设置页补齐 publisher。

## npm Trusted Publishing 设置

在 npm 网站给 `proof-pr` 配置 trusted publisher：

- Provider：GitHub Actions
- Repository：`linsk27/proof-pr`
- Workflow file：`release.yml`
- Environment：留空，除非以后给 release job 配 GitHub environment

也可以在本机用 npm CLI 配置：

```bash
npm install -g npm@^11.10.0
npm trust github proof-pr --repo linsk27/proof-pr --file release.yml
```

npm 官方要求 trusted publishing 使用 npm 11.5.1+ 和 Node 22.14+；`npm trust` 命令需要 npm 11.10+。配置完成后，后续推 tag 应该能自动发布 npm，不再需要本地粘贴 token。

## 正式发布命令

确认 trusted publisher 已配置后：

```bash
git tag v0.1.17
git push origin v0.1.17
```

发布完成后需要检查：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

当前验证结果：

```txt
npm view proof-pr version -> 0.1.17
npx proof-pr@latest --version -> 0.1.17
```

## `v0.1.17` 发布状态

`v0.1.17` 是小版本功能增强，重点包括：

- `proof-pr init` 生成的 GitHub workflow 默认写出 `proofpr-report.html` 并上传为 `proofpr-report` artifact。
- `proof-pr init` 新增 `--no-html-report` 和 `--html-output <path>`，需要精简 workflow 时可以关闭或改路径。
- `proof-pr doctor` 新增 HTML artifact 检查，能提示 workflow 是否启用了 `html-output` 和 `actions/upload-artifact`。
- 项目自身 `.github/workflows/proofpr.yml` 已同步到 `linsk27/proof-pr@v0.1.17`，并启用 annotations 和 HTML artifact。
- README、快速开始、从 0 到 1 文档、命令速查和示意图同步说明 artifact 查看路径。

## `v0.1.16` 发布状态

`v0.1.16` 已经完成：

- Git tag：`v0.1.16`
- GitHub Release：`v0.1.16`
- npm：`proof-pr@0.1.16`
- npm dist-tag：`latest -> 0.1.16`
- GitHub Actions：main CI 已通过；Release workflow 创建 GitHub Release 成功，但旧发布逻辑在 npm token fallback 步骤失败，npm 已通过本地安全 token 发布。

本次是功能增强版，重点包括：

- HTML 可视化报告新增“一键补证建议”，可以直接复制给贡献者补 PR 描述。
- HTML 风险发现支持按高/中/低/信息筛选，支持搜索规则、文件和详情。
- PR 评论 Markdown 报告新增总览表和可复制补证清单，维护者更容易判断下一步。
- 修复 CLI `--version` 仍显示旧版本的问题。
- `proof-pr init` 生成的 GitHub Action 示例同步到 `v0.1.16`。
- 新增 `proof-pr guide`；直接运行 `proof-pr` 也会显示中文功能菜单，按目标给出命令和结果位置。
- 新增 `proof-pr doctor`，可检查配置、workflow、Action 版本、PR 权限和本地 diff 可读性。
- 新增 `proof-pr demo`，无需 clone 仓库即可运行内置风险案例。
- 新增 `proof-pr template`，并让 `proof-pr init` 默认生成 PR 模板，帮助贡献者提前补充证据。
- Release workflow 已改为 OIDC trusted publishing 发布，不再依赖 `NPM_TOKEN`。
- CLI 支持 `--format html`，可生成独立 HTML 可视化报告。
- CLI `scan` 支持 `--output`，可直接把 HTML、SARIF、JSON 或 Markdown 报告写入文件。
- GitHub Action 支持 `html-output`，可把可视化报告上传为 artifact。
- README 和中文文档补充真实截图、从 0 到 1 使用路径和报告解释。
- HTML 报告集中展示风险等级、证据评分、Review 门禁、行动清单、重点文件、扣分原因和可执行补证建议。

## 版本说明

`0.1.8` 已经发布到 npm，但 CLI `--version` 仍显示旧版本。`0.1.17` 继承了后续修复，并且是当前推荐使用版本。

## 发布后动作

可以在 GitHub Release 页面继续执行 Marketplace 上架流程。
