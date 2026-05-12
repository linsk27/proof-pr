# proof-pr

ProofPR 是给开源维护者和工程团队使用的 PR 证据门禁。它在投入深度 review 之前，先检查 PR 是否提供了足够证据：测试、复现、截图、changelog、权限理由，以及是否触碰敏感路径、依赖、workflow、MCP 或 secret 风险。

它不依赖大模型，不上传代码，只基于 diff、PR 描述和配置做确定性判断。

## 快速使用

确认 latest 版本：

```bash
npx proof-pr@latest --version
```

当前应输出 `0.1.15`。

不知道用哪个功能时：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

不接入仓库，先体验报告：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
npx proof-pr@latest demo --list
```

初始化配置和 GitHub Action：

```bash
npx proof-pr@latest init
```

这个命令会生成 `.proofpr.yml`、`.github/workflows/proofpr.yml` 和 `.github/pull_request_template.md`，提交后打开 PR 即可看到报告。

已接入仓库单独补 PR 模板：

```bash
npx proof-pr@latest template
```

体检接入状态：

```bash
npx proof-pr@latest doctor
```

这个命令会检查配置文件、workflow、PR 模板、Action 版本、PR 权限和本地 diff 是否可读。

本地扫描当前分支：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

扫描内置案例：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

生成独立 HTML 可视化报告：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html
```

运行 benchmark：

```bash
npx proof-pr@latest benchmark --cases benchmarks/cases
```

## GitHub Action

```yaml
- uses: linsk27/proof-pr@v0.1.15
  with:
    fail-on: high
    comment: "true"
    annotations: "true"
```

## 输出什么

- 风险等级：`low`、`medium`、`high`。
- 证据评分：0-100 分。
- Review 门禁：正常 review、重点 review、先补证据、风险处理前不要合并。
- Review 行动清单：维护者可直接执行的 checklist。
- 可选输出：GitHub annotations、SARIF、benchmark report、独立 HTML 可视化报告；CLI 可用 `--output` 直接写文件。

## 常用预设

- `open-source-maintainer`：开源仓库推荐。
- `security-strict`：安全敏感项目。
- `ai-generated-pr`：AI 生成 PR 较多的仓库。
- `mcp-security`：关注 MCP / agent 配置。
- `dependency-careful`：关注依赖和锁文件变化。

完整中文文档、截图和从 0 到 1 教程见仓库 README：

https://github.com/linsk27/proof-pr
