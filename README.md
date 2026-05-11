# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/linsk27/proof-pr)](https://github.com/linsk27/proof-pr/releases)
[![npm](https://img.shields.io/npm/v/proof-pr)](https://www.npmjs.com/package/proof-pr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

看证据，不看感觉。

ProofPR 是给开源维护者使用的 **PR 证据门禁**。它在 Pull Request 里自动检查改动范围、测试证据、PR 描述、敏感路径、依赖、CI 权限、MCP 配置和疑似 secret，然后给出风险等级、证据评分、Review 门禁和可执行的维护者行动清单。

它不依赖大模型，不猜作者是不是用了 AI。它只回答一个更可靠的问题：**这个 PR 有没有足够证据值得维护者投入 review 时间？**

## 当前发布

- GitHub Release：[`v0.1.6`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.6)
- npm：[`proof-pr@0.1.6`](https://www.npmjs.com/package/proof-pr)
- 主要能力：Review Plan、规则预设、Evidence Contract、GitHub annotations、SARIF 输出、benchmark、真实案例库、依赖大版本升级、包生命周期脚本、`pull_request_target` 和 PR head checkout 风险检测。

## 30 秒安装

在你的仓库里创建 `.github/workflows/proofpr.yml`：

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
      - uses: linsk27/proof-pr@v0.1.6
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
```

提交后打开一个 PR，ProofPR 会自动生成报告评论，并在 Actions / PR 文件视图中输出 annotations。

## 从 0 到 1

![ProofPR 从 0 到 1 使用流程示意图](docs/assets/proofpr-zero-to-one.svg)

完整教程看这里：[从 0 到 1 安装和验证 ProofPR](docs/zero-to-one.md)。

教程会带你完成：

- 在 GitHub 仓库安装 Action。
- 添加中文配置和规则预设。
- 打开一个测试 PR。
- 在 PR 评论、Actions、annotations、Code Scanning 中查看结果。
- 用本地 CLI 扫描真实 diff。

## 效果图

下面两张是真实运行截图，不是手绘 mock。

PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)：

![ProofPR 真实 PR 评论截图](docs/screenshots/proofpr-demo-pr-comment.png)

CLI 输出截图来自本机 `AI-Vue3-python-flask-Blog` 项目：

![ProofPR 在 AI-Vue3-python-flask-Blog 中的真实 CLI 输出](docs/screenshots/ai-vue-flask-cli-output.png)

下面是帮助理解产品的示意图：

![ProofPR 输出位置示意图](docs/assets/proofpr-output-locations.svg)

![ProofPR 报告结构示意图](docs/assets/proofpr-report-anatomy.svg)

## 它会检查什么

| 检查项 | 维护者得到什么 |
| --- | --- |
| 改动规模 | 判断 PR 是否过大，是否应该拆分。 |
| 测试和验证证据 | 发现“改了代码但没有测试、CI、截图或手动验证说明”的 PR。 |
| PR 描述质量 | 检查是否缺少动机、复现步骤、before/after、预期/实际结果。 |
| Evidence Contract | 按仓库自定义规则要求截图、验证、changelog、权限理由等证据。 |
| 敏感路径 | 标记 `.github/workflows/**`、`.env*`、`mcp*.json`、依赖文件等高关注区域。 |
| secrets | 检测疑似 API key、token、数据库连接串。 |
| 依赖变化 | 标记新增依赖、依赖大版本升级和 lockfile 相关风险。 |
| 包生命周期脚本 | 标记 `preinstall`、`postinstall`、`prepare` 等安装/发布阶段脚本。 |
| CI 权限和触发器 | 标记 GitHub Actions 写权限、OIDC 权限、`pull_request_target` 和 PR head checkout 高风险组合。 |
| MCP 风险 | 标记 MCP command、args、env、credential 相关风险。 |

## 报告怎么看

ProofPR 报告重点看四个结论：

| 输出 | 含义 |
| --- | --- |
| `Risk` | 整体风险等级：`low`、`medium`、`high`。 |
| `Evidence score` | 0-100 证据评分，越高代表 review 证据越充分。 |
| `Review gate` | 建议正常 review、重点 review、先补证据，或风险处理前不要合并。 |
| `Review Plan` | 可直接执行的维护者 checklist 和重点文件列表。 |

报告会出现在：

- PR `Conversation` 评论区。
- GitHub Actions job summary。
- Workflow annotations / PR 文件视图。
- 可选的 GitHub Code Scanning 页面，见 [SARIF 文档](docs/sarif-code-scanning.md)。

## 本地 CLI

不想先接 GitHub Action，也可以本地试：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

扫描案例库：

```bash
npx proof-pr@latest scan --diff-file examples/cases/mcp-config-risk.diff --locale zh-CN
npx proof-pr@latest scan --diff-file examples/cases/secret-leak.diff --format sarif
npx proof-pr@latest benchmark --cases benchmarks/cases
```

初始化配置：

```bash
npx proof-pr@latest init --preset open-source-maintainer
npx proof-pr@latest init --preset security-strict
```

## 规则预设

| 预设 | 适合场景 |
| --- | --- |
| `balanced` | 默认均衡模式，适合先低噪音试用。 |
| `open-source-maintainer` | 开源仓库推荐，关注 PR 描述、测试证据、CI、依赖和 secret 风险。 |
| `security-strict` | 安全敏感项目，更多路径会被视为敏感，默认风险阈值为 `medium`。 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库，重点要求验证证据和清晰 PR 描述。 |
| `mcp-security` | 关注 MCP、Cursor、VS Code、本地 agent 配置和凭证风险。 |
| `dependency-careful` | 关注依赖清单、锁文件和多语言包管理配置变化。 |

## 文档导航

- [从 0 到 1 安装和验证](docs/zero-to-one.md)
- [快速开始](docs/getting-started.md)
- [配置说明](docs/configuration.md)
- [规则说明](docs/rules.md)
- [Benchmark](benchmarks/README.md) / [当前报告](benchmarks/report.md)
- [真实案例库](docs/cases.md)
- [实现原理](docs/how-it-works.md)
- [SARIF / Code Scanning](docs/sarif-code-scanning.md)
- [GitHub Marketplace 安装说明](docs/marketplace.md)
- [发布流程](docs/release.md)
- [路线图](docs/roadmap.md)

## 现在还差什么

项目已经具备可用的 Action、CLI、npm 包、Release、annotations、SARIF、Evidence Contract、benchmark、案例库和中文文档。下一步更像“产品化”和“传播”工作：

- 每次 CI 会运行 benchmark，并把报告写入 GitHub Actions Summary。
- 刷新一组 `v0.1.6` 的真实截图，展示 annotations 和 Code Scanning。
- 上架 GitHub Marketplace。
- 增加 Issue 质量检查模式。
- 做规则插件系统，让团队可以写自己的规则。
- 可选集成 OpenSSF Scorecard、gitleaks、GitHub dependency-review。
- 可选 AI summary，但核心评分继续保持确定性、可复现、不上传代码。

## 搜索关键词

GitHub Action、Pull Request、PR review、PR triage、code review、maintainer tools、open source maintainer、AI coding、AI-generated PR、MCP security、secrets scanning、GitHub Actions security、dependency review、SARIF、Code Scanning、GitHub annotations、GitHub Marketplace、TypeScript CLI。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm benchmark
pnpm build
pnpm release:check
```

## License

MIT
