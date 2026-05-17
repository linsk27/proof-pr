# SARIF 和 GitHub Code Scanning

ProofPR 支持两种接入 Code Scanning 的方式：

1. 用 CLI 输出 SARIF。
2. 用 GitHub Action 的 `sarif-output` 输入写出 SARIF 文件。

## 方式一：CLI 输出 SARIF

```bash
npx proof-pr@latest check --format sarif --output proofpr.sarif
```

然后用 GitHub 官方上传动作：

```yaml
name: ProofPR Code Scanning

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  security-events: write

jobs:
  proofpr-sarif:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx proof-pr@latest check --format sarif --output proofpr.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: proofpr.sarif
```

## 方式二：ProofPR Action 写出 SARIF

从 `v0.1.5` 开始，Action 支持 `sarif-output`：

```yaml
name: ProofPR Code Scanning

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  proofpr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: linsk27/proof-pr@v0.1.41
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
          sarif-output: proofpr.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: proofpr.sarif
```

## 会看到什么

上传成功后，GitHub 会在仓库的 `Security` -> `Code scanning` 页面显示 ProofPR 风险发现。带 `path` 的发现会关联到具体文件，例如：

- `.github/workflows/release.yml` 的 workflow 权限变化。
- `.env` 的疑似 secret。
- `.cursor/mcp.json` 的 MCP 配置风险。
- `package.json` 的依赖变更。

SARIF 适合需要统一安全看板的团队；普通开源项目可以先使用 PR 评论和 annotations。
