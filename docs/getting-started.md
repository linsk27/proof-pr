# 快速开始

ProofPR 可以作为 GitHub Action 运行，也可以作为本地 CLI 使用。

## GitHub Action

在仓库中添加 `.github/workflows/proofpr.yml`：

```yaml
name: ProofPR

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  proofpr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: linsk27/proof-pr@v0.1.0
        with:
          fail-on: high
          comment: "true"
```

## 本地 CLI

初始化 ProofPR 配置：

```bash
proof-pr init
```

扫描当前工作区 diff：

```bash
proof-pr scan
```

扫描类似 PR 的 diff：

```bash
proof-pr scan --base origin/main --head HEAD
```

输出 JSON：

```bash
proof-pr scan --base origin/main --format json
```

加入 PR 描述证据检查：

```bash
proof-pr scan --base origin/main --pr-title "Fix login redirect" --pr-body-file pr-body.md
```

当风险达到 medium 或 high 时让进程失败：

```bash
proof-pr scan --base origin/main --fail-on medium
```
