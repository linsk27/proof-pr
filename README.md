# ProofPR

[![CI](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/linsk27/proof-pr/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/linsk27/proof-pr)](https://github.com/linsk27/proof-pr/releases)
[![npm](https://img.shields.io/npm/v/proof-pr)](https://www.npmjs.com/package/proof-pr)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

先要证据，再看代码。

ProofPR 是给开源维护者和工程团队使用的 **PR 证据门禁**。

它不是 AI code reviewer，也不是漏洞库。它只在 review 开始前回答一个问题：

> 这个 PR 有没有足够证据，值得维护者开始 review？

ProofPR 会读取 PR diff、PR 描述和仓库配置，判断贡献者是否补齐了测试、复现、截图、changelog、权限理由，以及这次改动是否碰到依赖、workflow、secret、MCP 或其他高风险区域。输出结果会收敛成三类信息：

- **能不能开始 review**：继续 review、先补证据，还是高风险先别合并。
- **缺什么证据**：测试、复现、截图、changelog、权限理由。
- **先看哪里**：风险雷达把问题归到证据完整性、供应链、Workflow 权限、Secret 泄露和 Review 面。

## 现在能用吗

- GitHub Release：[`v0.1.35`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.35)
- npm：[`proof-pr@0.1.35`](https://www.npmjs.com/package/proof-pr)
- GitHub Action：`linsk27/proof-pr@v0.1.35`
- 当前源码 benchmark：`22/22 passed`
- 默认接入：`npx proof-pr@latest init`
- 本地自查：`npx proof-pr@latest check`
- 补证请求：`npx proof-pr@latest request`
- 可视化报告：`init` 生成的 workflow 会自动上传 `proofpr-report.html` artifact

项目当前状态：

- **已可正式试用**：CLI、GitHub Action、npm 包、GitHub Release、中文文档和截图都已经打通。
- **核心边界明确**：ProofPR 不做通用代码审查，不判断代码好不好；它只做确定性 PR 证据门禁，帮助维护者先判断是否值得 review。
- **发布链路已验证**：npm Trusted Publishing 已绑定 `linsk27/proof-pr` + `release.yml`，`v0.1.21` 到 `v0.1.35` 已通过 GitHub OIDC 自动发布到 npm。
- **下一步增长点**：继续减少首屏概念，补充真实 PR 案例和 Marketplace 上架材料。

验证你拿到的是最新版本：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

这两个命令当前都应输出 `0.1.35`。

不知道怎么开始时，直接运行中文向导：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

如果你习惯先看帮助，`npx proof-pr@latest --help` 会显示中文命令说明，并在底部给出三条常用复制命令。

![ProofPR 中文功能菜单](docs/screenshots/proofpr-guide-output.png)

默认只需要三条命令：

| 目标 | 命令 |
| --- | --- |
| 接入 GitHub PR 自动检查 | `npx proof-pr@latest init` |
| 本地检查当前分支 | `npx proof-pr@latest check` |
| 生成贡献者补证请求 | `npx proof-pr@latest request` |

其他能力是辅助项，不是理解 ProofPR 的入口：

| 场景 | 命令 |
| --- | --- |
| 不确定是否装好 | `npx proof-pr@latest doctor` |
| 自动修复常见接入问题 | `npx proof-pr@latest doctor --fix` |
| 不接入仓库，先体验报告 | `npx proof-pr@latest demo workflow --locale zh-CN` |
| 把补证请求写入文件 | `npx proof-pr@latest request --output proofpr-request.md` |
| 输出完整补证模板 | `npx proof-pr@latest request --full` |
| 生成 HTML 可视化报告 | `npx proof-pr@latest check --format html --output proofpr-report.html` |
| 生成 SARIF | `npx proof-pr@latest check --format sarif --output proofpr.sarif` |
| 查看内置案例 | `npx proof-pr@latest demo --list` |

## 它解决什么问题

| 常见 PR 问题 | ProofPR 给维护者什么 |
| --- | --- |
| PR 描述很薄，只写了 fixed bug。 | 判断描述质量，要求补充动机、复现、验证和影响。 |
| 改了代码但没有测试，也没有手动验证说明。 | 输出 `needs-evidence`，让维护者先要证据再深度 review。 |
| 改了 `.github/workflows/**`、依赖、`.env`、MCP 配置。 | 把敏感文件列出来，给出重点 review 清单。 |
| 新增依赖、大版本升级、非注册表来源、未固定版本、`postinstall` 脚本。 | 提醒核查供应链来源、changelog、迁移说明、解析覆盖和 lockfile 是否同步。 |
| 使用 `pull_request_target` 并 checkout PR head。 | 标记为高风险组合，避免高权限上下文运行不可信 PR 代码。 |
| 团队想要求 UI 改动必须有截图。 | 用 Evidence Contract 声明路径级证据要求。 |
| 想把扫描结果做成可分享页面。 | 输出可搜索、可筛选、可复制补证清单的独立 HTML 风险面板。 |

## 最快开始

### 0. 先体验，不改仓库

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

![ProofPR demo 输出](docs/screenshots/proofpr-demo-output.png)

想看所有内置案例：

```bash
npx proof-pr@latest demo --list
```

### 1. 生成配置和 workflow

```bash
npx proof-pr@latest init
```

![ProofPR 初始化输出](docs/screenshots/proofpr-init-output.png)

这个命令会一次生成三份接入文件：

- `.proofpr.yml`
- `.github/workflows/proofpr.yml`
- `.github/pull_request_template.md`

默认配置已经适合开源仓库试用；PR 模板会引导贡献者补充验证、复现、截图、changelog 和权限理由。
生成的 workflow 还会默认保存 `proofpr-report.html` artifact，维护者可以在 Actions 页面直接下载可视化报告。
如果仓库里已经有这些文件，`init` 默认会保留不覆盖，并告诉你哪些文件已存在；需要刷新到当前模板时再加 `--force`。

### 2. 体检接入状态

```bash
npx proof-pr@latest doctor
```

![ProofPR doctor 体检输出](docs/screenshots/proofpr-doctor-output.png)

`doctor` 会检查 `.proofpr.yml`、`.github/workflows/proofpr.yml`、PR 模板、Action 版本、PR 事件、评论权限和本地 diff 是否可读。它会像 `check` 一样自动识别常见主分支，并在报告顶部给出一句话建议，目标是告诉新用户“装好了吗，下一步做什么”。

### 3. 提交并打开 PR

```bash
git add .proofpr.yml .github/workflows/proofpr.yml .github/pull_request_template.md
git commit -m "chore: add ProofPR"
```

ProofPR 会在这些时机运行：

- PR opened：第一次打开 PR。
- PR synchronize：PR 分支继续 push。
- PR reopened：重新打开 PR。

### 4. 看报告或生成补证请求

报告主要出现在 PR 评论区、GitHub Actions summary、workflow annotations 和 `proofpr-report` artifact。想先本地试跑，也可以直接执行：

```bash
npx proof-pr@latest check
```

如果当前分支没有可扫描 diff，`check` 会输出短提示并告诉你下一步运行 `doctor`、`demo`，或提交改动后再检查。

如果你只想得到一段可以直接发给贡献者的补证说明：

```bash
npx proof-pr@latest request
```

如果当前分支没有可扫描 diff，`request` 也会输出短提示，不会生成误导性的补证评论。

真实 PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)：

![ProofPR 真实 PR 评论截图](docs/screenshots/proofpr-demo-pr-comment.png)

本地 CLI 扫描真实项目 `AI-Vue3-python-flask-Blog` 的输出：

![ProofPR 在 AI-Vue3-python-flask-Blog 中的真实 CLI 输出](docs/screenshots/ai-vue-flask-cli-output.png)

新增的 workflow 供应链风险案例输出：

![ProofPR workflow 风险扫描输出](docs/screenshots/proofpr-workflow-risk-output.png)

独立 HTML 可视化报告：

![ProofPR HTML 可视化报告](docs/screenshots/proofpr-visual-report.png)

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
| `Risk Radar` / `风险雷达` | 把 rule id 归并成证据完整性、供应链、Workflow 权限、Secret 泄露和 Review 面，先告诉维护者该从哪里看。 |
| `Review Plan` / `Review 行动清单` | 可直接执行的维护者 checklist 和重点文件。 |
| `一键补证建议` | 可复制给贡献者的 PR 描述补充模板，减少来回追问。 |

报告会出现在：

- PR `Conversation` 评论区。
- GitHub Actions job summary。
- Workflow annotations / PR 文件视图。
- GitHub Actions artifact：默认的 `proofpr-report.html` 可视化报告。
- 可选 GitHub Code Scanning，见 [SARIF 文档](docs/sarif-code-scanning.md)。
- 本地 HTML 可视化报告；报告里可以按严重程度筛选、搜索文件/规则，并复制补证清单。

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
| 依赖变化 | 新增依赖、大版本升级、非注册表来源、未固定版本、manifest/lockfile 不一致、lockfile-only 变更、解析覆盖。 |
| 包生命周期脚本 | `preinstall`、`install`、`postinstall`、`prepare` 等。 |
| GitHub Actions 风险 | 写权限、OIDC、`pull_request_target`、PR head checkout 高风险组合。 |
| MCP 风险 | `command`、`args`、`env`、token、secret、password 等配置。 |

## 本地 CLI

先看中文向导：

```bash
npx proof-pr@latest guide
```

体检仓库是否接入正确：

```bash
npx proof-pr@latest doctor
```

扫描当前分支 diff：

```bash
npx proof-pr@latest check
```

`check` 会自动选择 `origin/main`、`origin/master`、`main` 或 `master` 作为对比基准，并扫描当前工作区相对 base 的最终状态：已提交分支 diff、staged、unstaged 和未跟踪新文件都会纳入。主分支不是这些名字时再显式指定：

```bash
npx proof-pr@latest check --base origin/dev
```

扫描内置案例：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
npx proof-pr@latest demo secret --locale zh-CN
npx proof-pr@latest demo ui-evidence --locale zh-CN
```

生成独立 HTML 可视化报告：

```bash
npx proof-pr@latest check --format html --output proofpr-report.html
```

HTML 报告不是静态截图：它可以按高/中/低风险筛选、搜索规则或文件，并把“需要贡献者补什么”一键复制到 PR 描述或评论里。

维护规则或发版前再运行 benchmark：

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

`init` 默认已经会在 GitHub Action 里保存 HTML 面板，对应 workflow 片段如下：

```yaml
- uses: linsk27/proof-pr@v0.1.35
  with:
    html-output: proofpr-report.html
- uses: actions/upload-artifact@v4
  with:
    name: proofpr-report
    path: proofpr-report.html
```

内置预设：

| 预设 | 适合场景 |
| --- | --- |
| `balanced` | 低噪音试用。 |
| `open-source-maintainer` | 开源仓库推荐。 |
| `security-strict` | 安全敏感项目。 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库。 |
| `mcp-security` | 关注 MCP、Cursor、VS Code、本地 agent 配置。 |
| `dependency-careful` | 关注依赖清单、锁文件、多语言包管理配置和供应链风险。 |

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
- [功能和命令速查](docs/commands.md)
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
