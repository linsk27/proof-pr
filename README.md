# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

看证据，不看感觉。

ProofPR 是一个给开源维护者用的 PR 风险和证据检查工具。它会在 PR 里自动生成报告，帮助维护者快速判断：这个 PR 有没有测试证据、是否改了敏感文件、是否可能泄露 secret、是否值得马上深入 review。

它不会猜代码是不是 AI 写的。ProofPR 只检查贡献是否提供了足够的证据。

## 当前开发进度

当前版本：`v0.1.0`

已经完成：

- GitHub Action：可以安装到任意 GitHub 仓库，在 PR 中自动运行。
- CLI：可以本地扫描 git diff。
- PR 报告：可以输出 Markdown、JSON、SARIF。
- PR 证据分析：检查 PR 标题/正文里是否有测试、验证、复现、before/after 信息。
- 内置规则：改动规模、敏感路径、缺少测试、secret、依赖、workflow 权限、MCP 配置风险。
- GitHub Release：已发布 `v0.1.0`，并附带 CLI tarball。

还没完成：

- npm 包还没有发布，所以现在不要使用 `npx proof-pr` 作为主要安装方式。
- GitHub Check annotations 还没做。
- Issue 质量检查模式还没做。
- 规则插件系统还没做。

## 最推荐的安装方式：GitHub Action

如果你想在自己的某个 GitHub 仓库里使用 ProofPR，只需要添加一个 workflow 文件。

在目标仓库中创建文件：

```txt
.github/workflows/proofpr.yml
```

内容如下：

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

然后打开一个 PR，ProofPR 就会自动运行，并在 PR 页面写入一条风险报告评论。

## 可选配置

在目标仓库根目录创建 `.proofpr.yml`：

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

不创建 `.proofpr.yml` 也可以运行，ProofPR 会使用默认配置。

## 本地 CLI 使用

目前 CLI 还没有发布到 npm。现在有两种方式可以本地使用。

方式一：从 GitHub Release 安装：

```bash
npm install -g https://github.com/linsk27/proof-pr/releases/download/v0.1.0/proof-pr-0.1.0.tgz
proof-pr scan --base origin/main --head HEAD
```

方式二：从源码运行：

```bash
git clone https://github.com/linsk27/proof-pr.git
cd proof-pr
pnpm install
pnpm build
node packages/cli/dist/index.js scan --base origin/main --head HEAD
```

常用 CLI 命令：

```bash
proof-pr init
proof-pr scan
proof-pr scan --base origin/main --head HEAD
proof-pr scan --base origin/main --format json
proof-pr scan --base origin/main --pr-body-file pr-body.md
proof-pr scan --base origin/main --fail-on medium
```

## 报告怎么看

ProofPR 报告主要看三块：

1. `Risk`：整体风险等级，可能是 `low`、`medium`、`high`。
2. `Evidence`：改动文件数、增删行数、测试文件变化、敏感文件变化、PR 描述质量。
3. `Findings`：具体风险点和维护者应该重点 review 的地方。

报告示例：

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

## 内置规则

- `change-size`：标记 review 面积过大的 PR。
- `sensitive-path`：标记 CI、依赖、secret、Docker、MCP 等敏感文件改动。
- `missing-tests`：标记没有测试文件或验证说明的代码改动。
- `thin-pr-description`：标记为空或过薄的 PR 描述。
- `missing-reproduction-context`：标记缺少复现、预期/实际行为或 before/after 说明的高风险改动。
- `secret-detected:*`：标记常见 API key、token、数据库连接串和 secret 赋值。
- `dependency-added`：标记依赖清单中的新增依赖。
- `workflow-permission-change`：标记 GitHub Actions 权限变化。
- `mcp-credential-risk`：标记 MCP command、args、env 和凭证相关风险。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

发布前检查：

```bash
pnpm release:check
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
