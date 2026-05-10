# 实现原理

ProofPR 的核心思路是：**不猜作者，不猜动机，只检查证据**。

它不会判断代码是不是 AI 写的。它做的是确定性扫描：读取 PR diff、PR 标题、PR 描述和配置文件，然后用一组规则生成风险等级和维护者建议。

## 整体流程

```txt
Pull Request / git diff
        |
        v
读取配置 .proofpr.yml
        |
        v
解析 unified diff
        |
        v
执行规则引擎
        |
        v
计算风险等级
        |
        v
输出 Markdown / JSON / SARIF
        |
        v
CLI 输出或 GitHub PR 评论
```

## 输入来源

ProofPR 目前有两种运行方式。

### CLI

CLI 会调用本地 git：

```bash
git diff --no-ext-diff --unified=0 <base>...<head>
```

然后把 diff 文本交给 core 扫描。

也可以通过 `--diff-file` 直接传入一个 unified diff 文件。

### GitHub Action

GitHub Action 会读取当前 PR 信息：

- PR diff。
- PR title。
- PR body。
- 仓库里的 `.proofpr.yml`。

然后生成 report：

- 写入 GitHub job summary。
- 如果 `comment: true`，就在 PR 评论区创建或更新 `ProofPR Review` 评论。
- 如果风险达到 `fail-on` 阈值，就让 workflow 失败。

## diff 解析

核心包会解析 unified diff：

- 文件路径。
- 新增行数。
- 删除行数。
- 新增代码行内容。
- 删除代码行内容。
- 文件是否新增或删除。

这些信息会被整理成 `DiffFile[]`，再交给规则引擎。

## 规则引擎

每条规则只基于可解释、可复查的信号。

当前内置规则：

- `change-size`：根据文件数和增删行数判断 review 面积是否过大。
- `sensitive-path`：通过 glob 匹配敏感路径，例如 `.github/workflows/**`、`.env*`、`mcp*.json`、依赖文件。
- `missing-tests`：源码路径变化但没有测试文件变化，也没有 PR 验证说明时触发。
- `thin-pr-description`：PR body 为空或太短时触发。
- `missing-reproduction-context`：缺少复现、预期/实际行为、before/after 说明时触发。
- `secret-detected:*`：用正则检测常见 API key、GitHub token、数据库连接串和 secret 赋值。
- `dependency-added`：检查依赖清单中的新增依赖或依赖变化。
- `workflow-permission-change`：检查 GitHub Actions 是否新增写权限或 OIDC 权限。
- `mcp-credential-risk`：检查 MCP 配置中 command、args、env、token、secret 等高风险字段。

## 风险评分

ProofPR 会把规则 finding 汇总为整体风险：

- 有 `high` finding，整体风险为 `high`。
- 有多个 `medium` finding，整体风险为 `high`。
- 有一个 `medium` finding，整体风险为 `medium`。
- 多个 `low` finding 也会抬升为 `medium`。
- 没有明显风险时为 `low`。

这个评分逻辑故意保持简单，方便维护者理解和调整。

## 报告输出

ProofPR 支持三种输出：

- Markdown：适合 CLI 终端和 GitHub PR 评论。
- JSON：适合脚本、CI 或后续 dashboard。
- SARIF：适合后续接入 GitHub Code Scanning。

GitHub Action 的 PR 评论里带有隐藏 marker：

```html
<!-- proof-pr-report -->
```

这样同一个 PR 多次运行时，ProofPR 会更新旧评论，而不是不断刷屏。

## 为什么不依赖大模型

第一版刻意不依赖 LLM。

原因：

- 开源项目安装门槛更低，不需要 API key。
- 扫描结果稳定，可复现。
- 规则触发原因可解释。
- 不会把代码发到第三方模型服务。
- 更适合作为 CI 门禁。

后续可以加入可选 AI summary，但核心扫描会继续保持确定性。

## 安全边界

ProofPR 的默认行为：

- 不上传你的代码到外部服务。
- 不调用 LLM。
- 不打印完整 secret。
- 对疑似 secret 做脱敏。
- 只基于 diff、PR 文本和配置文件生成报告。

因此它更像一个 PR review 前置检查器，而不是代码审计平台。
