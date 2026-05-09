# proof-pr

ProofPR 的命令行工具。

ProofPR 帮助维护者在投入深入 review 之前，先检查 PR 的证据、范围和安全风险。

## 使用

当前 CLI 还没有发布到 npm。可以先从 GitHub Release 安装：

```bash
npm install -g https://github.com/linsk27/proof-pr/releases/download/v0.1.0/proof-pr-0.1.0.tgz
proof-pr init
proof-pr scan --base origin/main --head HEAD
proof-pr scan --base origin/main --pr-body-file pr-body.md --format json
```

## GitHub Action

```yaml
- uses: linsk27/proof-pr@v0.1.0
  with:
    fail-on: high
```

完整文档见仓库 README：

https://github.com/linsk27/proof-pr
