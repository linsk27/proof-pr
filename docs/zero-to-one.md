# 从 0 到 1 安装和验证 ProofPR

这份文档面向第一次使用 ProofPR 的用户。照着做完，你会知道它什么时候运行、在哪里看结果、报告每一块是什么意思。

![ProofPR 从 0 到 1 使用流程示意图](assets/proofpr-zero-to-one.svg)

## 第 0 步：你会得到什么

安装后，每个 Pull Request 会得到：

- 一条 `ProofPR 审查报告` PR 评论。
- 一份 GitHub Actions job summary。
- 一组 GitHub annotations，用来定位具体 finding。
- 可选的 SARIF 文件，上传到 GitHub Code Scanning。

![ProofPR 输出位置示意图](assets/proofpr-output-locations.svg)

初始化成功时，你会看到类似输出：

![ProofPR 初始化输出](screenshots/proofpr-init-output.png)

## 第 1 步：添加 GitHub Action

在目标仓库创建文件：

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
      - uses: linsk27/proof-pr@v0.1.7
        with:
          fail-on: high
          comment: "true"
          annotations: "true"
```

提交这个文件后，ProofPR 只会在 PR 场景运行，不会因为普通分支 push 就刷屏。

## 第 2 步：添加中文配置

在仓库根目录创建：

```txt
.proofpr.yml
```

推荐先用开源维护者预设：

```yaml
locale: zh-CN
preset: open-source-maintainer

comment:
  enabled: true
```

如果你的项目更关注安全、依赖或 MCP，可以换成：

```yaml
preset: security-strict
```

```yaml
preset: dependency-careful
```

```yaml
preset: mcp-security
```

如果你想让仓库自己定义证据要求，可以加 Evidence Contract。比如 UI 改动必须有截图和验证说明：

```yaml
evidence:
  contracts:
    - id: ui-screenshot
      paths:
        - "src/components/**"
      requires:
        - screenshot
        - verification
      severity: medium
```

## 第 3 步：打开一个测试 PR

你可以在测试分支里做一个很小的改动，比如修改一个源码文件但不加测试。打开 PR 后，ProofPR 会在这些事件触发：

- PR opened：首次打开。
- PR synchronize：PR 分支继续 push 新提交。
- PR reopened：关闭后重新打开。

## 第 4 步：看 PR 评论

进入 PR 的 `Conversation`，找到 `ProofPR 审查报告`。

真实 PR 评论截图：

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

优先看四块：

![ProofPR 报告结构示意图](assets/proofpr-report-anatomy.svg)

- `Risk`：整体风险。
- `Evidence score`：证据是否充分。
- `Review gate`：下一步动作建议。
- `Review Plan`：维护者 checklist。

## 第 5 步：看 Actions 和 annotations

进入仓库 `Actions`，点击 `ProofPR` workflow。

你会看到：

- job summary：完整 Markdown 报告。
- annotations：高风险 finding 会变成 GitHub 注解。
- 如果 finding 有行号，例如 MCP 的 `command`、`args`、`env`，annotation 会尽量定位到具体行。

## 第 6 步：本地 CLI 试跑

不用开 PR，也可以本地扫描：

```bash
npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
```

扫描内置案例：

```bash
npx proof-pr@latest scan --diff-file examples/cases/missing-tests.diff --locale zh-CN
npx proof-pr@latest scan --diff-file examples/cases/mcp-config-risk.diff --locale zh-CN
npx proof-pr@latest scan --diff-file examples/cases/secret-leak.diff --locale zh-CN
```

真实 CLI 输出截图：

![ProofPR 真实 CLI 输出截图](screenshots/ai-vue-flask-cli-output.png)

如果你想快速理解高风险 workflow finding，可以扫描内置案例：

```bash
npx proof-pr@latest scan --diff-file examples/cases/workflow-untrusted-checkout.diff --locale zh-CN
```

![ProofPR workflow 风险扫描输出](screenshots/proofpr-workflow-risk-output.png)

验证规则样本是否仍按预期命中：

```bash
npx proof-pr@latest benchmark --cases benchmarks/cases
```

![ProofPR benchmark 输出](screenshots/proofpr-benchmark-output.png)

## 第 7 步：可选接入 Code Scanning

如果你想让 finding 进入 GitHub 的安全看板，可以配置 SARIF：

```yaml
permissions:
  contents: read
  pull-requests: write
  security-events: write

steps:
  - uses: actions/checkout@v4
  - uses: linsk27/proof-pr@v0.1.7
    with:
      fail-on: high
      comment: "true"
      annotations: "true"
      sarif-output: proofpr.sarif
  - uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: proofpr.sarif
```

完整说明见 [SARIF / Code Scanning](sarif-code-scanning.md)。

## 安装成功的判断标准

如果下面三件事都出现了，就说明安装成功：

- PR 评论区有 `ProofPR 审查报告`。
- Actions 的 `ProofPR` workflow 成功运行。
- 报告里有 `风险等级`、`证据评分`、`Review 门禁`、`Review 行动清单`。

如果没有评论，优先检查 workflow 权限：

```yaml
permissions:
  contents: read
  pull-requests: write
```

如果中文在 Windows PowerShell 里显示成一串问号或乱码，通常是终端编码问题。建议使用 Windows Terminal / PowerShell 7，或运行：

```powershell
chcp 65001
```
