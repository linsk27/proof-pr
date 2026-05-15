# 功能和命令速查

如果不知道该用哪个功能，先运行：

```bash
npx proof-pr@latest
```

或显式打开功能菜单：

```bash
npx proof-pr@latest guide
```

![ProofPR 中文功能菜单](screenshots/proofpr-guide-output.png)

## 最常用路径

| 你想做什么 | 什么时候用 | 复制这条命令 | 结果在哪里看 |
| --- | --- | --- | --- |
| 不接入仓库，先体验报告 | 第一次了解 ProofPR | `npx proof-pr@latest demo workflow --locale zh-CN` | 当前终端 |
| 接入 GitHub PR 自动检查 | 第一次给仓库安装 ProofPR | `npx proof-pr@latest init` | PR 评论、Actions summary、Checks、HTML artifact |
| 体检接入状态 | 安装后不知道是否配置正确 | `npx proof-pr@latest doctor` | 当前终端 |
| 单独补 PR 模板 | 已接入仓库但缺少 PR 模板 | `npx proof-pr@latest template` | `.github/pull_request_template.md` |
| 本地检查当前分支 | 发 PR 前自查 | `npx proof-pr@latest check` | 当前终端 |
| 生成 HTML 可视化报告 | 想把报告保存、筛选风险、复制补证清单或上传 artifact | `npx proof-pr@latest check --format html --output proofpr-report.html` | `proofpr-report.html` |
| 生成 SARIF | 想接入 GitHub Code Scanning | `npx proof-pr@latest check --format sarif --output proofpr.sarif` | `proofpr.sarif` / Code Scanning |
| 查看所有内置案例 | 想快速理解它会抓什么 | `npx proof-pr@latest demo --list` | 当前终端 |
| 跑 benchmark | 维护规则或发版前回归 | `npx proof-pr@latest benchmark --cases benchmarks/cases` | 当前终端 |
| 调整审查强度 | 想更严格检查安全、依赖或 MCP | 修改 `.proofpr.yml` 里的 `preset` | 下一次扫描报告 |

## 1. 不接入仓库，先体验报告

执行：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

![ProofPR demo 输出](screenshots/proofpr-demo-output.png)

这个命令不需要你的项目里存在 `.proofpr.yml`，也不需要 clone ProofPR 仓库。它会直接运行一个内置 workflow 风险案例。

查看全部内置案例：

```bash
npx proof-pr@latest demo --list
```

常用案例：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
npx proof-pr@latest demo secret --locale zh-CN
npx proof-pr@latest demo dependency --locale zh-CN
npx proof-pr@latest demo mcp --locale zh-CN
npx proof-pr@latest demo ui-evidence --locale zh-CN
```

## 2. 接入 GitHub PR 自动检查

执行：

```bash
npx proof-pr@latest init
```

它会生成：

- `.proofpr.yml`
- `.github/workflows/proofpr.yml`
- `.github/pull_request_template.md`

提交这些文件后，打开或更新 Pull Request，ProofPR 会自动运行。默认结果会出现在 PR 评论、Actions summary、workflow annotations 和 `proofpr-report` artifact。PR 模板会提醒贡献者补充验证、复现、截图、changelog 和权限理由。

如果你的仓库已经接入过 ProofPR，只想单独补 PR 模板：

```bash
npx proof-pr@latest template
```

默认触发时机是：

- PR opened：第一次打开 PR。
- PR synchronize：PR 分支继续 push。
- PR reopened：关闭后重新打开。

## 3. 体检接入状态

执行：

```bash
npx proof-pr@latest doctor
```

![ProofPR doctor 体检输出](screenshots/proofpr-doctor-output.png)

它会检查：

- `.proofpr.yml` 是否存在并能解析。
- `.github/workflows/proofpr.yml` 是否存在。
- `.github/pull_request_template.md` 是否存在，以及是否提示验证、复现、截图或权限理由。
- workflow 是否监听 `pull_request`。
- workflow 是否使用当前推荐的 `linsk27/proof-pr@v0.1.20`。
- 是否具备 `pull-requests: write` 和 `contents: read` 权限。
- 是否启用了 `html-output` 和 `actions/upload-artifact`，方便下载 HTML 可视化报告。
- 当前目录是否在 Git 仓库里，以及 `origin/main...HEAD` diff 是否可读。

如果你的主分支不是 `main`，可以这样指定：

```bash
npx proof-pr@latest doctor --base origin/master
```

## 4. 本地扫描当前分支

执行：

```bash
npx proof-pr@latest check
```

适合在发 PR 前自查。它会自动选择 `origin/main`、`origin/master`、`main` 或 `master` 作为 base，并扫描当前工作区相对 base 的最终状态：已提交分支 diff、staged、unstaged 和未跟踪新文件都会纳入。输出包括风险等级、证据评分、Review 门禁和行动清单。

如果你的主分支不是常见名字，可以显式传 base：

```bash
npx proof-pr@latest check --base origin/dev
```

## 5. 生成 HTML 可视化报告

执行：

```bash
npx proof-pr@latest check --format html --output proofpr-report.html
```

生成后，用浏览器打开 `proofpr-report.html`。这个文件适合：

- 发给同事快速看风险。
- 放进 CI artifact。
- 截图放进文档或 issue。
- 在页面里按高/中/低风险筛选，搜索规则、文件或详情。
- 一键复制“补证清单”，发给贡献者补 PR 描述。

## 6. 生成 SARIF

执行：

```bash
npx proof-pr@latest check --format sarif --output proofpr.sarif
```

SARIF 主要给 GitHub Code Scanning 或其他安全平台读取。完整接入方式见 [SARIF / Code Scanning](sarif-code-scanning.md)。

## 7. 跑内置风险案例

执行：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

这个命令不需要修改你的项目，也不需要 examples 文件，适合快速理解 ProofPR 会如何判断 workflow、供应链依赖、secret、测试证据这些风险。依赖案例会展示大版本升级、非注册表来源、未固定版本和 lockfile 提示。

## 8. 跑 benchmark

执行：

```bash
npx proof-pr@latest benchmark --cases benchmarks/cases
```

benchmark 用来验证规则样本是否仍按预期命中。普通使用者不必每天跑它；维护 ProofPR 规则、准备发版或怀疑规则退化时再跑。

## 9. 调整审查强度

打开 `.proofpr.yml`，修改 `preset`：

```yaml
locale: zh-CN
preset: open-source-maintainer

comment:
  enabled: true
```

常用值：

| preset | 适合场景 |
| --- | --- |
| `open-source-maintainer` | 开源仓库默认推荐 |
| `security-strict` | 安全敏感项目 |
| `dependency-careful` | 特别关注依赖、lockfile 和供应链来源 |
| `mcp-security` | 特别关注 MCP / agent 配置 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库 |
