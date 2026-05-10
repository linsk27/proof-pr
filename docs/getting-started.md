# 快速开始

这份文档只讲怎么安装和怎么跑起来。

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

## 你应该选哪种方式？

大多数用户应该选择 GitHub Action。

- 你想让某个 GitHub 仓库的 PR 自动生成 ProofPR 报告：使用 GitHub Action。
- 你想在本地手动扫描一个 git diff：使用 CLI。
- 你只是想参与开发 ProofPR 本身：从源码运行。

## 方式一：安装到 GitHub 仓库

在你的目标仓库中创建文件：

```txt
.github/workflows/proofpr.yml
```

写入：

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
      - uses: linsk27/proof-pr@v0.1.3
        with:
          fail-on: high
          comment: "true"
```

提交这个文件后，打开一个 PR。ProofPR 会在 PR 中自动生成报告评论。

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

默认示例使用 `fail-on: high`，所以只有整体风险为 `high` 时才会阻止检查通过。这个失败不是说代码一定有 bug，而是说 PR 需要更认真地 review。

## 方式二：添加配置文件

配置文件不是必须的，但建议添加。

在目标仓库根目录创建：

```txt
.proofpr.yml
```

写入：

```yaml
locale: zh-CN

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

## 方式三：本地使用 CLI

可以直接通过 npm 使用：

```bash
npx proof-pr@latest init
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

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

初始化配置和 workflow：

```bash
proof-pr init
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
proof-pr scan --base origin/main --format json
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
- 报告里有 `风险等级`、`证据概览`、`风险发现` 三块内容。

如果没有出现评论，先检查 workflow 权限是否包含：

```yaml
permissions:
  contents: read
  pull-requests: write
```
