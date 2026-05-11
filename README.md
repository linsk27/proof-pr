# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/linsk27/proof-pr)](https://github.com/linsk27/proof-pr/releases)
[![npm](https://img.shields.io/npm/v/proof-pr)](https://www.npmjs.com/package/proof-pr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

看证据，不看感觉。

ProofPR 是给开源维护者和工程团队使用的 **PR 证据门禁**。它会在 Pull Request 中检查改动范围、PR 描述、测试证据、敏感路径、依赖变化、GitHub Actions 权限、MCP 配置和疑似 secret，然后输出风险等级、证据评分、Review 门禁和维护者行动清单。

它不依赖大模型，不猜代码是不是 AI 写的。它只回答一个更适合 CI 的问题：**这个 PR 有没有足够证据值得维护者投入 review 时间？**

## 现在能用吗

- GitHub Release：[`v0.1.7`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.7)
- npm：[`proof-pr@0.1.7`](https://www.npmjs.com/package/proof-pr)
- GitHub Action：`linsk27/proof-pr@v0.1.7`
- 当前 benchmark：`14/14 passed`

## 它解决什么问题

| 常见 PR 问题 | ProofPR 给维护者什么 |
| --- | --- |
| PR 描述很薄，只写了 fixed bug。 | 判断描述质量，要求补充动机、复现、验证和影响。 |
| 改了代码但没有测试，也没有手动验证说明。 | 输出 `needs-evidence`，让维护者先要证据再深度 review。 |
| 改了 `.github/workflows/**`、依赖、`.env`、MCP 配置。 | 把敏感文件列出来，给出重点 review 清单。 |
| 新增依赖、大版本升级、`postinstall` 脚本。 | 提醒核查供应链风险、changelog、迁移说明和 lockfile。 |
| 使用 `pull_request_target` 并 checkout PR head。 | 标记为高风险组合，避免高权限上下文运行不可信 PR 代码。 |
| 团队想要求 UI 改动必须有截图。 | 用 Evidence Contract 声明路径级证据要求。 |

## 从 0 到 1

### 1. 初始化配置

```bash
npx proof-pr@latest init --preset open-source-maintainer
```

![ProofPR 初始化输出](docs/screenshots/proofpr-init-output.png)

这个命令会生成：

- `.proofpr.yml`
- `.github/workflows/proofpr.yml`

### 2. 安装 GitHub Action

如果你想手动创建 workflow，可以复制下面的最小配置：

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
      - uses: linsk27/proof-pr@v0.1.7
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
```

### 3. 打开或更新 PR

ProofPR 会在这些时机运行：

- PR opened：第一次打开 PR。
- PR synchronize：PR 分支继续 push。
- PR reopened：重新打开 PR。

### 4. 看报告

真实 PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)：

![ProofPR 真实 PR 评论截图](docs/screenshots/proofpr-demo-pr-comment.png)

本地 CLI 扫描真实项目 `AI-Vue3-python-flask-Blog` 的输出：

![ProofPR 在 AI-Vue3-python-flask-Blog 中的真实 CLI 输出](docs/screenshots/ai-vue-flask-cli-output.png)

新增的 workflow 供应链风险案例输出：

![ProofPR workflow 风险扫描输出](docs/screenshots/proofpr-workflow-risk-output.png)

Benchmark 输出，证明规则样本仍按预期命中：

![ProofPR benchmark 输出](docs/screenshots/proofpr-benchmark-output.png)

说明：上面的 PR 评论和 CLI 图片来自真实运行；终端风格图片由当前仓库命令输出渲染生成，不是手写 mock。下面的 SVG 是帮助理解流程的示意图。

![ProofPR 输出位置示意图](docs/assets/proofpr-output-locations.svg)

![ProofPR 报告结构示意图](docs/assets/proofpr-report-anatomy.svg)

## 报告怎么看

报告优先看四个结论：

| 输出 | 含义 |
| --- | --- |
| `Risk` / `风险等级` | `low`、`medium`、`high`，表示整体 review 风险。 |
| `Evidence score` / `证据评分` | 0-100 分，越高代表 PR 证据越充分。 |
| `Review gate` / `Review 门禁` | 建议正常 review、重点 review、先补证据，或风险处理前不要合并。 |
| `Review Plan` / `Review 行动清单` | 可直接执行的维护者 checklist 和重点文件。 |

报告会出现在：

- PR `Conversation` 评论区。
- GitHub Actions job summary。
- Workflow annotations / PR 文件视图。
- 可选 GitHub Code Scanning，见 [SARIF 文档](docs/sarif-code-scanning.md)。

## 它会检查什么

| 检查项 | 触发信号 |
| --- | --- |
| 改动规模 | 文件数、增删行数过大。 |
| PR 描述质量 | body 缺失或过薄。 |
| 测试和验证证据 | 代码改动没有测试文件，也没有验证说明。 |
| 复现上下文 | 缺少复现步骤、before/after、预期/实际结果。 |
| Evidence Contract | 命中仓库自定义路径，但缺少要求的截图、验证、changelog 或权限理由。 |
| 敏感路径 | `.github/workflows/**`、`.env*`、依赖文件、Dockerfile、MCP 配置等。 |
| secrets | 常见 API key、token、数据库连接串。 |
| 依赖变化 | 新增依赖、依赖大版本升级、lockfile 风险。 |
| 包生命周期脚本 | `preinstall`、`install`、`postinstall`、`prepare` 等。 |
| GitHub Actions 风险 | 写权限、OIDC、`pull_request_target`、PR head checkout 高风险组合。 |
| MCP 风险 | `command`、`args`、`env`、token、secret、password 等配置。 |

## 本地 CLI

扫描当前分支 diff：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

扫描内置案例：

```bash
npx proof-pr@latest scan --diff-file examples/cases/missing-tests.diff --locale zh-CN
npx proof-pr@latest scan --diff-file examples/cases/workflow-untrusted-checkout.diff --locale zh-CN
npx proof-pr@latest scan --diff-file examples/cases/secret-leak.diff --format sarif
```

运行 benchmark：

```bash
npx proof-pr@latest benchmark --cases benchmarks/cases
```

## 配置示例

开源仓库推荐先用：

```yaml
locale: zh-CN
preset: open-source-maintainer

comment:
  enabled: true
```

如果 UI 改动必须有截图和验证说明，可以加 Evidence Contract：

```yaml
evidence:
  contracts:
    - id: ui-screenshot
      paths:
        - "src/components/**"
        - "app/**"
      requires:
        - screenshot
        - verification
      severity: medium
```

内置预设：

| 预设 | 适合场景 |
| --- | --- |
| `balanced` | 低噪音试用。 |
| `open-source-maintainer` | 开源仓库推荐。 |
| `security-strict` | 安全敏感项目。 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库。 |
| `mcp-security` | 关注 MCP、Cursor、VS Code、本地 agent 配置。 |
| `dependency-careful` | 关注依赖和锁文件变化。 |

## 准确性边界

ProofPR 的准确性不是“能不能发现所有代码 bug”。它做的是 **确定性 PR triage**：

- 不调用大模型，不上传代码。
- 不判断作者是不是用了 AI。
- 不替代人工代码 review。
- 只基于 diff、PR 描述和配置里的规则做可复现判断。
- 用 benchmark case 验证规则命中、风险等级和 Review 门禁是否符合预期。

这让它适合作为开源仓库的第一道门：先过滤“证据不足、风险边界不清”的 PR，让维护者把时间花在真正值得 review 的改动上。

## 文档

- [从 0 到 1 安装和验证](docs/zero-to-one.md)
- [快速开始](docs/getting-started.md)
- [配置说明](docs/configuration.md)
- [规则说明](docs/rules.md)
- [Benchmark 和准确性边界](benchmarks/README.md) / [当前报告](benchmarks/report.md)
- [真实案例库](docs/cases.md)
- [实现原理](docs/how-it-works.md)
- [SARIF / Code Scanning](docs/sarif-code-scanning.md)
- [GitHub Marketplace 安装说明](docs/marketplace.md)
- [路线图](docs/roadmap.md)

## 下一步

- 上架 GitHub Marketplace。
- 增加 Issue 质量检查模式。
- 做规则插件系统，让团队可以写自己的规则。
- 可选集成 OpenSSF Scorecard、gitleaks、GitHub dependency-review。
- 可选 AI summary，但核心评分继续保持确定性、可复现、不上传代码。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm benchmark
pnpm build
pnpm release:check
```

重新生成 README 截图：

```powershell
pnpm docs:screenshots
```

## License

MIT
