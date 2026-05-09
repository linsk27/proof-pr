# proof-pr

ProofPR 的命令行工具。

ProofPR 帮助维护者在投入深入 review 之前，先检查 PR 的证据、范围和安全风险。

## 使用

```bash
npx proof-pr init
npx proof-pr scan --base origin/main --head HEAD
npx proof-pr scan --base origin/main --pr-body-file pr-body.md --format json
```

## GitHub Action

```yaml
- uses: linsk27/proof-pr@v0.1.0
  with:
    fail-on: high
```

完整文档见仓库 README：

https://github.com/linsk27/proof-pr
