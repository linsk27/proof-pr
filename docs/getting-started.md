# 快速开始

这份文档只讲怎么安装和怎么跑起来。

如果你想看完整图文流程，先看 [从 0 到 1 安装和验证 ProofPR](zero-to-one.md)。

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

ProofPR 初始化输出：

![ProofPR 初始化输出](screenshots/proofpr-init-output.png)

## 最短路径

只是想先看效果，不想改仓库：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

![ProofPR demo 输出](screenshots/proofpr-demo-output.png)

真正接入仓库时，大多数用户只需要一条命令：

```bash
npx proof-pr@latest init
```

它会生成：

- `.proofpr.yml`
- `.github/workflows/proofpr.yml`
- `.github/pull_request_template.md`

把这些文件提交到仓库，打开或更新 PR，就会自动生成报告。PR 模板会提醒贡献者写清验证、复现、截图、changelog 和权限理由。

安装后可以先体检一次：

```bash
npx proof-pr@latest doctor
```

![ProofPR doctor 体检输出](screenshots/proofpr-doctor-output.png)

如果你不确定下一步该用哪个功能，可以直接看中文功能菜单：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

![ProofPR 中文功能菜单](screenshots/proofpr-guide-output.png)

更完整的复制式命令表见 [功能和命令速查](commands.md)。

## 生成的 workflow

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
      - uses: linsk27/proof-pr@v0.1.15
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
```

这个默认配置已经够试用：只在 PR 事件运行，风险达到 `high` 时才让检查失败。

## 它什么时候运行？

ProofPR 的 GitHub Action 默认监听的是 PR 事件，不是普通分支 push。

- 新建分支并推送到 GitHub：不会立刻生成报告。
- 打开 Pull Request：会生成第一份报告。
- PR 打开后继续推送新提交：会重新检测，并更新同一条报告评论。
- 关闭后重新打开 PR：会重新检测。

这由 workflow 中的配置控制：

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

## 在哪里看报告？

安装成功后，主要看三个地方：

- PR 页面 `Conversation`：这里会出现 `ProofPR 审查报告` 评论。
- 仓库 `Actions` 页面：这里可以看到 `ProofPR` workflow 的运行日志和 job summary。
- PR 顶部的 checks 状态：如果风险达到 `fail-on` 阈值，检查项会失败，提醒维护者先处理风险。
- GitHub annotations：`v0.1.5` 起会把 finding 输出为 workflow annotations，方便在 PR 文件视图里定位。

## 生成的配置

```yaml
locale: zh-CN
preset: open-source-maintainer

comment:
  enabled: true
```

想更严格时，只改 `preset` 即可，例如 `security-strict`、`dependency-careful` 或 `mcp-security`。高级配置见 [配置说明](configuration.md)。

## 本地使用 CLI

可以直接通过 npm 使用：

```bash
npx proof-pr@latest --version
npx proof-pr@latest guide
npx proof-pr@latest demo workflow --locale zh-CN
npx proof-pr@latest init
npx proof-pr@latest doctor
npx proof-pr@latest template
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

如果第一行输出 `0.1.15`，说明你正在使用当前最新发布版。

也可以全局安装：

```bash
npm install -g proof-pr
proof-pr scan --base origin/main --head HEAD --locale zh-CN
```

也可以从源码运行：

```bash
git clone https://github.com/linsk27/proof-pr.git
cd proof-pr
pnpm install
pnpm build
node packages/cli/dist/index.js scan --base origin/main --head HEAD --locale zh-CN
```

## 常用命令

查看功能菜单：

```bash
proof-pr guide
```

体检接入状态：

```bash
proof-pr doctor
```

单独补 PR 模板：

```bash
proof-pr template
```

运行内置案例：

```bash
proof-pr demo workflow --locale zh-CN
proof-pr demo --list
```

初始化配置和 workflow：

```bash
proof-pr init
```

运行 benchmark，确认规则样本仍按预期命中：

```bash
proof-pr benchmark --cases benchmarks/cases
```

![ProofPR benchmark 输出](screenshots/proofpr-benchmark-output.png)

生成独立 HTML 可视化报告：

```bash
proof-pr scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html
```

![ProofPR HTML 可视化报告](screenshots/proofpr-visual-report.png)

如果你的仓库更关注安全、MCP 或依赖风险，可以换成：

```bash
proof-pr init --preset security-strict
proof-pr init --preset mcp-security
proof-pr init --preset dependency-careful
```

当前 `main` 分支源码版也可以这样运行：

```bash
pnpm build
node packages/cli/dist/index.js init --preset security-strict
```

扫描当前工作区 diff：

```bash
proof-pr scan
```

扫描指定 base/head：

```bash
proof-pr scan --base origin/main --head HEAD
```

输出中文报告：
```bash
proof-pr scan --base origin/main --head HEAD --locale zh-CN
```

输出 JSON：

```bash
proof-pr scan --base origin/main --format json --output proofpr-report.json
```

加入 PR 描述证据检查：

```bash
proof-pr scan --base origin/main --pr-title "Fix login redirect" --pr-body-file pr-body.md
```

风险达到 medium 或 high 时让进程失败：

```bash
proof-pr scan --base origin/main --fail-on medium
```

## 怎么判断安装成功？

GitHub Action 安装成功后，你会在 PR 页面看到：

- Actions 中出现 `ProofPR` workflow。
- PR 评论区出现 `ProofPR 审查报告`。
- 报告里有 `风险等级`、`证据评分`、`Review 门禁`、`Review 行动清单`、`证据概览`、`风险发现`。

其中 `证据评分` 是 0-100 分，用来判断 PR 是否提供了足够 review 证据；`Review 门禁` 会给出下一步建议，例如正常 review、要求补充证据，或在风险处理前不建议合并；`Review 行动清单` 可以直接当成维护者处理 PR 的 checklist。

如果没有出现评论，先检查 workflow 权限是否包含：

```yaml
permissions:
  contents: read
  pull-requests: write
```
