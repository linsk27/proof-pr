# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/linsk27/proof-pr)](https://github.com/linsk27/proof-pr/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

看证据，不看感觉。

ProofPR 是一个面向开源维护者的 **PR 证据检查器 / PR 风险扫描器**。它可以作为 GitHub Action 自动运行，在每个 Pull Request 中生成一份风险报告，帮助维护者快速判断这个 PR 是否值得深入 review。

它不会猜代码是不是 AI 写的。它只检查一件更可靠的事：**这个贡献有没有足够的测试、复现、权限、依赖和安全证据。**

## 真实运行截图

下面两张图来自真实运行结果，不是手绘 mock：

- PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)，由 GitHub Action 真实生成。
- CLI 输出截图来自本机 `AI-Vue3-python-flask-Blog` 项目，使用 `npx proof-pr@latest scan --base HEAD~5 --head HEAD` 真实扫描生成。

![ProofPR 真实 PR 评论截图](docs/screenshots/proofpr-demo-pr-comment.png)

![ProofPR 在 AI-Vue3-python-flask-Blog 中的真实 CLI 输出](docs/screenshots/ai-vue-flask-cli-output.png)

## 适合谁

- 维护开源项目，经常收到社区 PR 的开发者。
- 担心 AI 生成 PR、低质量 PR、安全噪音占用 review 时间的维护者。
- 想在 GitHub Actions 中增加 PR 质量门禁的团队。
- 关注 secrets、CI 权限、MCP 配置、依赖风险的工程团队。

## 它会检查什么

ProofPR 会扫描 PR diff 和 PR 描述，生成 `low`、`medium`、`high` 风险等级。

| 检查项 | 作用 |
| --- | --- |
| 改动规模 | 判断 PR 是否过大、是否应该拆分 |
| 敏感路径 | 标记 `.github/workflows/**`、`.env*`、`mcp*.json`、依赖文件等 |
| 测试证据 | 检查是否有测试文件变化或 PR 验证说明 |
| PR 描述 | 检查是否有复现步骤、before/after、验证信息 |
| secrets | 检测疑似 API key、token、数据库连接串 |
| 依赖变化 | 标记新增依赖或依赖清单变化 |
| CI 权限 | 标记 GitHub Actions 写权限、OIDC 权限变化 |
| MCP 风险 | 标记 MCP command、args、env、credential 风险 |

## 三步安装到你的 GitHub 仓库

这是目前最推荐的使用方式。

### 1. 创建 workflow 文件

在你的目标仓库中创建：

```txt
.github/workflows/proofpr.yml
```

### 2. 写入下面的内容

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
      - uses: linsk27/proof-pr@v0.1.2
        with:
          fail-on: high
          comment: "true"
```

### 3. 打开一个 PR

ProofPR 会自动运行，并在 PR 评论区生成 `ProofPR Review` 报告。

## 可选配置

不创建配置文件也可以运行。想自定义规则时，在仓库根目录添加：

```txt
.proofpr.yml
```

示例：

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

## 本地 CLI 使用

从 npm 直接使用：

```bash
npx proof-pr init
proof-pr scan --base origin/main --head HEAD
```

全局安装：

```bash
npm install -g proof-pr
proof-pr scan --base origin/main --head HEAD
```

从源码运行：

```bash
git clone https://github.com/linsk27/proof-pr.git
cd proof-pr
pnpm install
pnpm build
node packages/cli/dist/index.js scan --base origin/main --head HEAD
```

CLI 真实输出截图：

![ProofPR 在 AI-Vue3-python-flask-Blog 中的真实 CLI 输出](docs/screenshots/ai-vue-flask-cli-output.png)

常用命令：

```bash
proof-pr init
proof-pr scan
proof-pr scan --base origin/main --head HEAD
proof-pr scan --base origin/main --format json
proof-pr scan --base origin/main --pr-body-file pr-body.md
proof-pr scan --base origin/main --fail-on medium
```

## 工作流示意图

这张是帮助理解流程的示意图，不是截图。

![ProofPR 工作流示意图](docs/assets/proofpr-flow.svg)

## 报告怎么看

ProofPR 报告主要看三块：

1. `Risk`：整体风险等级，可能是 `low`、`medium`、`high`。
2. `Evidence`：文件数量、增删行数、测试文件变化、敏感文件变化、PR 描述质量。
3. `Findings`：具体风险点和维护者应该重点 review 的地方。

## 当前开发进度

当前版本：`v0.1.2`

已经完成：

- GitHub Action 自动扫描 PR。
- PR 评论报告和 GitHub job summary。
- 本地 CLI 扫描 git diff。
- Markdown、JSON、SARIF 输出。
- PR title/body 证据分析。
- 改动规模、敏感路径、缺少测试、secrets、依赖、workflow 权限、MCP 配置风险规则。
- GitHub Release，附带 CLI tarball。

还没完成：

- npm 安装体验和发布自动化优化。
- GitHub Check annotations。
- Issue 质量检查模式。
- 规则插件系统。

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

## 文档

- [快速开始](docs/getting-started.md)
- [配置说明](docs/configuration.md)
- [规则说明](docs/rules.md)
- [实现原理](docs/how-it-works.md)
- [贡献指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)
- [变更记录](CHANGELOG.md)

## 搜索关键词

GitHub Action、Pull Request、PR review、PR triage、code review、maintainer tools、open source maintainer、AI coding、AI-generated PR、MCP security、secrets scanning、GitHub Actions security、dependency review、TypeScript CLI。

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
