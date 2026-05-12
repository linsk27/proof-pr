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
| 接入 GitHub PR 自动检查 | 第一次给仓库安装 ProofPR | `npx proof-pr@latest init` | PR 评论、Actions summary、Checks |
| 体检接入状态 | 安装后不知道是否配置正确 | `npx proof-pr@latest doctor` | 当前终端 |
| 本地检查当前分支 | 发 PR 前自查 | `npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN` | 当前终端 |
| 生成 HTML 可视化报告 | 想把报告保存、发给别人或上传 artifact | `npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html` | `proofpr-report.html` |
| 生成 SARIF | 想接入 GitHub Code Scanning | `npx proof-pr@latest scan --base origin/main --head HEAD --format sarif --output proofpr.sarif` | `proofpr.sarif` / Code Scanning |
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

提交这两个文件后，打开或更新 Pull Request，ProofPR 会自动运行。默认触发时机是：

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
- workflow 是否监听 `pull_request`。
- workflow 是否使用当前推荐的 `linsk27/proof-pr@v0.1.14`。
- 是否具备 `pull-requests: write` 和 `contents: read` 权限。
- 当前目录是否在 Git 仓库里，以及 `origin/main...HEAD` diff 是否可读。

如果你的主分支不是 `main`，可以这样指定：

```bash
npx proof-pr@latest doctor --base origin/master
```

## 4. 本地扫描当前分支

执行：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

适合在发 PR 前自查。它会对比 `origin/main...HEAD`，输出风险等级、证据评分、Review 门禁和行动清单。

如果你的主分支叫 `master`，把 `origin/main` 换成 `origin/master`。

## 5. 生成 HTML 可视化报告

执行：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html
```

生成后，用浏览器打开 `proofpr-report.html`。这个文件适合：

- 发给同事快速看风险。
- 放进 CI artifact。
- 截图放进文档或 issue。

## 6. 生成 SARIF

执行：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --format sarif --output proofpr.sarif
```

SARIF 主要给 GitHub Code Scanning 或其他安全平台读取。完整接入方式见 [SARIF / Code Scanning](sarif-code-scanning.md)。

## 7. 跑内置风险案例

执行：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

这个命令不需要修改你的项目，也不需要 examples 文件，适合快速理解 ProofPR 会如何判断 workflow、依赖、secret、测试证据这些风险。

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
| `dependency-careful` | 特别关注依赖和 lockfile |
| `mcp-security` | 特别关注 MCP / agent 配置 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库 |
