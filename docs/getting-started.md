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

默认配置已经可用。把这些文件提交到仓库，打开或更新 PR，就会自动生成报告。默认会同时输出 PR 评论、Actions summary、workflow annotations 和 `proofpr-report.html` artifact。PR 模板会提醒贡献者写清验证、复现、截图、变更说明和权限理由。

`init` 可以重复运行。已有文件默认不会被覆盖；如果你想升级到当前版本模板，再运行 `npx proof-pr@latest init --force`。

安装后可以先体检一次：

```bash
npx proof-pr@latest doctor
```

![ProofPR doctor 体检输出](screenshots/proofpr-doctor-output.png)

如果你不确定下一步该做什么，可以直接看中文向导。它会把默认路径收敛成“接入仓库、本地自查、生成补证请求”三个动作：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

如果你习惯先看帮助，`npx proof-pr@latest --help` 会显示中文命令说明，底部也会给出三条常用复制命令。

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
      - uses: linsk27/proof-pr@v0.1.41
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
          html-output: proofpr-report.html
      - name: Upload ProofPR visual report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: proofpr-report
          path: proofpr-report.html
```

这个默认配置已经够试用：只在 PR 事件运行，风险达到 `high` 时才让检查失败，并把 HTML 可视化报告保存成 workflow artifact。

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
- 报告里的 `风险雷达`：把风险归并成证据、供应链、Workflow、密钥和审查范围，帮助你先决定看哪里。
- GitHub annotations：`v0.1.5` 起会把 finding 输出为 workflow annotations，方便在 PR 文件视图里定位。
- Actions artifact：默认会上传 `proofpr-report`，里面是可搜索、可筛选、可复制补证清单的 `proofpr-report.html`。

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
npx proof-pr@latest check
npx proof-pr@latest request
```

`check` 会自动选择常见主分支作为 base，并纳入已提交分支 diff、staged、unstaged 和未跟踪新文件。当前没有可扫描 diff 时，它只输出短提示和下一步建议。

如果第一行输出 `0.1.41`，说明你正在使用当前最新发布版。

也可以全局安装：

```bash
npm install -g proof-pr
proof-pr check
```

也可以从源码运行：

```bash
git clone https://github.com/linsk27/proof-pr.git
cd proof-pr
pnpm install
pnpm build
node packages/cli/dist/index.js check
```

## 辅助命令

不确定是否装好：

```bash
proof-pr doctor
```

想自动修复常见接入问题：

```bash
proof-pr doctor --fix
```

它只会创建或刷新 ProofPR 自己的接入文件：`.proofpr.yml`、`.github/workflows/proofpr.yml` 和 PR 模板，不会修改业务代码。

`doctor` 报告顶部会直接给一句话建议，告诉你下一步是打开 PR、运行 `check`，还是用 `doctor --fix` 修复接入。

已接入仓库但缺少 PR 模板：

```bash
proof-pr template
```

只生成可以发给贡献者的补证请求：

```bash
proof-pr request
proof-pr request --output proofpr-request.md
proof-pr request --full
```

当前没有可扫描 diff 时，`request` 会输出短提示，不会生成误导性的补证评论。

生成独立 HTML 可视化报告：

```bash
proof-pr check --format html --output proofpr-report.html
```

HTML 报告支持按风险严重程度筛选、搜索规则/文件/详情，并复制“补证清单”给贡献者。

![ProofPR HTML 可视化报告](screenshots/proofpr-visual-report.png)

查看所有内置案例：

```bash
proof-pr demo --list
```

运行 benchmark，确认规则样本仍按预期命中：

```bash
proof-pr benchmark --cases benchmarks/cases
```

![ProofPR benchmark 输出](screenshots/proofpr-benchmark-output.png)

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

需要机器可读结果时再使用 JSON：

```bash
proof-pr check --format json --output proofpr-report.json
```

需要精确指定 base、PR 标题或 PR 描述时，再使用底层 `scan` 命令：

```bash
proof-pr scan --base origin/main --pr-title "Fix login redirect" --pr-body-file pr-body.md
```

风险达到 medium 或 high 时让进程失败：

```bash
proof-pr check --fail-on medium
```

## 怎么判断安装成功？

GitHub Action 安装成功后，你会在 PR 页面看到：

- Actions 中出现 `ProofPR` workflow。
- PR 评论区出现 `ProofPR 审查报告`。
- 报告里有 `风险等级`、`证据评分`、`审查门禁`、`审查行动清单`、`证据概览`、`风险发现`。

其中 `证据评分` 是 0-100 分，用来判断 PR 是否提供了足够审查证据；`审查门禁` 会给出下一步建议，例如常规审查、要求补充证据，或在风险处理前不建议合并；`审查行动清单` 可以直接当成维护者处理 PR 的 checklist。

如果没有出现评论，先检查 workflow 权限是否包含：

```yaml
permissions:
  contents: read
  pull-requests: write
```
