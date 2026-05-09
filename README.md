# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

看证据，不看感觉。

ProofPR 是一个 GitHub Action 和 CLI，帮助开源维护者在深入 review 之前，先判断一个 PR 是否范围清晰、可验证、可复现、值得投入维护者时间。

它不会猜代码是不是 AI 写的。ProofPR 只检查贡献是否提供了足够的证据。

## 为什么做这个项目

AI 编程工具让创建代码、PR、Issue 和安全报告变得非常便宜，但维护者的注意力并没有因此变便宜。

ProofPR 给维护者一份第一轮证据报告，用来快速回答这些问题：

- 这个改动有没有测试或验证证据？
- PR 描述有没有说明如何验证？
- 是否改动了安全敏感文件？
- 是否新增依赖或修改 CI 权限？
- 是否暴露了 secrets 或危险的 MCP 配置？
- review 面积是否异常大？

## 安装

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
```

当前仓库内本地运行：

```bash
pnpm install
pnpm --filter proof-pr build
pnpm --filter proof-pr exec proof-pr scan --format markdown
```

npm 包发布后，可以这样使用：

```bash
npx proof-pr init
npx proof-pr scan --base origin/main --head HEAD
```

## 报告示例

```md
# ProofPR Review

Risk: high

## Evidence

- Files changed: 12
- Additions: 480
- Deletions: 120
- Test files changed: 0
- Sensitive files changed: 2
- PR description: thin
- Verification evidence: no
- Reproduction context: no

## Findings

### Workflow permission changed

- Rule: `workflow-permission-change`
- Severity: `high`
- Path: `.github/workflows/release.yml`
- Detail: `.github/workflows/release.yml` adds or changes GitHub Actions permissions.
- Recommendation: Check whether the workflow really needs write or token permissions.
```

## 配置

创建 `.proofpr.yml`：

```yaml
riskThreshold: high

sensitivePaths:
  - ".github/workflows/**"
  - "**/.env*"
  - "**/mcp*.json"
  - "package.json"
  - "pnpm-lock.yaml"

requireTests:
  enabled: true
  paths:
    - "src/**"
    - "packages/**/src/**"

secrets:
  enabled: true

dependencies:
  flagNewPackages: true
  flagMajorUpgrades: true

comment:
  enabled: true
```

## MVP 内置规则

- `change-size`：标记 review 面积过大的 PR。
- `sensitive-path`：标记 CI、依赖、secret、Docker、MCP 等敏感文件改动。
- `missing-tests`：标记没有测试文件或验证说明的代码改动。
- `thin-pr-description`：标记为空或过薄的 PR 描述。
- `missing-reproduction-context`：标记缺少复现、预期/实际行为或 before/after 说明的高风险改动。
- `secret-detected:*`：标记常见 API key、token、数据库连接串和 secret 赋值。
- `dependency-added`：标记依赖清单中的新增依赖。
- `workflow-permission-change`：标记 GitHub Actions 权限变化。
- `mcp-credential-risk`：标记 MCP command、args、env 和凭证相关风险。

## CLI

```bash
proof-pr init
proof-pr scan --base origin/main --head HEAD
proof-pr scan --base origin/main --pr-body-file pr-body.md --format json
proof-pr scan --base origin/main --fail-on medium
```

## 设计原则

- 看证据，不猜作者。
- 先做确定性检查，再考虑可选 AI。
- 输出要对维护者友好。
- 核心扫描不需要任何 API key。
- 本地、CI、GitHub Action 都能跑。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 路线图

- 发布 `proof-pr` CLI 到 npm。
- GitHub Check annotations。
- SARIF 上传示例。
- Issue 复现质量检查模式。
- 规则插件系统。
- 可选 AI 摘要 provider。
- 集成 OpenSSF Scorecard 和 gitleaks。

## License

MIT
