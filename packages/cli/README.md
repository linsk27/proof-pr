# proof-pr

ProofPR 的命令行工具。

ProofPR 帮助维护者在投入深入 review 之前，先检查 PR 的证据、范围和安全风险。报告会输出风险等级、0-100 证据评分，以及 Review 门禁建议。

## 它什么时候运行？

作为 GitHub Action 使用时，ProofPR 默认在 PR 打开、PR 分支更新、PR 重新打开时运行。普通分支 push 不会单独生成报告。

报告会出现在 PR 评论区、GitHub Actions job summary 和 PR checks 状态里。
`v0.1.5` 起还可以输出 GitHub annotations，并通过 `sarif-output` 写出 SARIF 文件。当前版本还会识别依赖大版本升级、包生命周期脚本和 `pull_request_target` workflow 触发器。

## 使用

可以直接通过 npm 使用：

```bash
npx proof-pr@latest init
npx proof-pr@latest init --preset security-strict
npx proof-pr@latest scan --base origin/main --head HEAD
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
npx proof-pr@latest scan --base origin/main --pr-body-file pr-body.md --format json
npx proof-pr@latest benchmark --cases benchmarks/cases
```

可用预设：`balanced`、`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。

## GitHub Action

```yaml
- uses: linsk27/proof-pr@v0.1.5
  with:
    fail-on: high
    comment: "true"
    annotations: "true"
```

完整文档见仓库 README：

https://github.com/linsk27/proof-pr
