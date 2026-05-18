# 实现原理

ProofPR 1.0 的核心思路是：**不猜作者，不猜动机，只检查 PR 是否已经具备人工 review 的最低证据**。

它不会判断代码是不是 AI 写的，也不会替代 AI code reviewer 判断业务逻辑对错。它做的是确定性扫描：读取 PR diff、PR 标题、PR 描述和配置文件，然后用一组规则生成风险等级和维护者建议。

## 整体流程

```txt
Pull Request / git diff
        |
        v
读取配置 .proofpr.yml
        |
        v
应用 preset 预设和用户覆盖项
        |
        v
解析 unified diff
        |
        v
执行规则引擎
        |
        v
计算风险等级、证据评分和审查门禁
        |
        v
输出 Markdown / JSON / SARIF / annotations
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
- 如果 `annotations: true`，把 finding 输出成 GitHub workflow annotations。
- 如果配置 `sarif-output`，写出 SARIF 文件，供 Code Scanning 上传。
- 如果风险达到 `fail-on` 阈值，就让 workflow 失败。

默认 workflow 监听这些 PR 事件：

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

因此普通分支 push 不会单独生成报告。只有打开 PR、向已打开的 PR 分支继续推送、或重新打开 PR 时，GitHub Action 才会运行。这个设计是为了让报告围绕审查场景出现，而不是让每一次分支推送都产生噪音。

报告可以在 PR 评论区、GitHub Actions job summary 和 PR checks 状态里看到。同一个 PR 多次运行时，ProofPR 会更新已有评论，而不是每次新建一条评论。

## 规则预设

`.proofpr.yml` 可以通过 `preset` 选择内置模式：

```yaml
locale: zh-CN
preset: open-source-maintainer
```

预设本质上是一组确定性的默认配置，不是大模型提示词。ProofPR 会先应用预设，再应用用户写在配置文件里的覆盖项。因此你可以先选 `security-strict`，再单独覆盖 `ignorePaths`、`sensitivePaths` 或 `requireTests.paths`。

当前内置预设包括 `balanced`、`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security` 和 `dependency-careful`。

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

- `change-size`：根据文件数和增删行数判断审查范围是否过大。
- `sensitive-path`：通过 glob 匹配敏感路径，例如 `.github/workflows/**`、`.env*`、`mcp*.json`、依赖文件。
- `missing-tests`：源码路径变化但没有测试文件变化，也没有 PR 验证说明时触发。
- `thin-pr-description`：PR body 为空或太短时触发。
- `missing-reproduction-context`：缺少复现、预期/实际行为、before/after 说明时触发。
- `evidence-contract:*`：仓库自定义证据契约未满足时触发。
- `secret-detected:*`：用正则检测常见 API key、GitHub token、数据库连接串和 secret 赋值。
- `dependency-added`：检查依赖清单中的新增依赖或依赖变化。
- `dependency-major-upgrade`：检查依赖是否跨越大版本边界。
- `dependency-lifecycle-script`：检查 `package.json` 中安装或发布阶段会自动执行的包生命周期脚本。
- `dependency-non-registry-source`：检查 git、GitHub、URL、file/link/portal、Python direct URL、Cargo git/path 等非普通注册表来源。
- `dependency-unpinned-version`：检查 `latest`、`*`、空版本、`>=0` 等不可复现依赖声明。
- `dependency-lockfile-missing`：检查 npm / Rust / Go manifest 变更是否缺少对应 lockfile。
- `dependency-lockfile-only-change`：检查 lockfile 变化是否没有对应 manifest 依赖变化。
- `dependency-resolution-override`：检查 npm `overrides`、Yarn `resolutions`、pnpm overrides。
- `workflow-permission-change`：检查 GitHub Actions 是否新增写权限或 OIDC 权限。
- `workflow-dangerous-trigger`：检查是否新增 `pull_request_target` 这类高权限 PR 触发器。
- `workflow-untrusted-checkout`：检查 workflow 是否 checkout PR head 代码，尤其是和 `pull_request_target` 同时出现时。
- `mcp-credential-risk`：检查 MCP 配置中 command、args、env、token、secret 等高风险字段。

其中 `change-size` 的默认阈值是：

- 变更文件数大于等于 10，或变更行数大于等于 250：触发 `medium`。
- 变更文件数大于等于 20，或变更行数大于等于 800：触发 `high`。

敏感路径、依赖、workflow 权限、PR head checkout、MCP 和 secret 规则会基于路径、added line、正则和 glob 做确定性匹配。它们不调用大模型，也不会查询在线漏洞库；依赖漏洞信息应继续交给 GitHub dependency-review、OSV、Snyk 等专门工具。

## Evidence Contract

Evidence Contract 用来解决“固定规则不够贴合我的仓库”的问题。维护者可以在 `.proofpr.yml` 中声明某类路径必须提供哪些证据：

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

当 PR 命中这些路径时，ProofPR 会在 PR 标题和正文中寻找对应证据信号：

- `verification`：测试、CI、手动验证，或测试文件变化。
- `reproduction`：复现步骤、before/after、预期/实际行为。
- `screenshot`：截图、录屏、效果图、前后对比。
- `changelog`：变更说明、release notes、迁移说明、破坏性变更说明。
- `permission-rationale`：最小权限、写权限、OIDC、不可信 PR 或 token 权限说明。

这让 ProofPR 更像“仓库维护策略执行器”，而不是只靠固定规则猜测风险。

## 风险评分

ProofPR 会把规则命中的风险发现汇总为整体风险：

- 有 `high` 风险发现，整体风险为 `high`。
- 有多个 `medium` 风险发现，整体风险为 `high`。
- 有一个 `medium` 风险发现，整体风险为 `medium`。
- 多个 `low` 风险发现也会抬升为 `medium`。
- 没有明显风险时为 `low`。

这个评分逻辑故意保持简单，方便维护者理解和调整。

## 证据评分

风险等级回答的是“这个 PR 有多危险”，证据评分回答的是“这个 PR 提供的审查证据够不够”。

ProofPR 会从 100 分开始，根据缺失的证据和触发的规则扣分：

- PR 描述缺失：扣 25 分。
- PR 描述过薄：扣 15 分。
- 扫描时没有 PR 上下文：扣 10 分。
- 需要验证证据但没有测试、CI、截图或手动验证说明：扣 20 分。
- 敏感或较大改动缺少复现、before/after、预期/实际结果：扣 15 分。
- 大型 PR：扣 10-20 分。
- 敏感路径变更：扣 10-20 分。
- 依赖清单变更：扣 10 分。
- 依赖大版本升级：扣 15 分。
- 包生命周期脚本风险：扣 25 分。
- 非注册表依赖来源：扣 25 分。
- 未固定依赖版本：扣 15 分。
- manifest/lockfile 不一致：扣 15 分。
- 依赖解析覆盖：扣 25 分。
- workflow 权限或 MCP 配置风险：扣 25 分。
- `pull_request_target` 高权限触发器：扣 30 分。
- Evidence Contract 未满足：扣 15-25 分。
- 疑似提交 secret：扣 40 分。

分数会映射为四档：

- `strong`：85-100，证据充分。
- `adequate`：70-84，基本充分。
- `thin`：50-69，证据偏薄。
- `risky`：0-49，证据不足。

## 审查门禁

审查门禁把风险等级和证据评分合并成一个维护者动作建议：

- `ready`：可以进入常规审查。
- `review-carefully`：带着重点进入审查。
- `needs-evidence`：先要求贡献者补充测试、复现、截图或说明。
- `block-merge`：处理风险前不建议合并。

这一步是 ProofPR 和普通扫描器的核心区别：它不是只告诉你“哪里有风险”，还告诉维护者“下一步应该怎么处理这个 PR”。

## 审查行动清单

审查行动清单会把风险发现和证据评分转换成可执行 checklist，例如：

- 要求补充测试或手动验证证据。
- 要求补充复现步骤或 before/after 上下文。
- 要求拆分 PR 或提供逐文件审查说明。
- 要求解释 workflow 权限变更。
- 要求轮换并移除疑似暴露的 secret。

如果 finding 指向具体文件，ProofPR 还会生成重点文件列表，帮助维护者决定第一轮应该先看哪里。

## 中文和编码

ProofPR 支持中文 Markdown 报告：

```yaml
locale: zh-CN
```

或在 CLI 中使用：

```bash
proof-pr check
```

如果 Windows PowerShell 里出现 `????` 或中文乱码，通常是终端或脚本写入 GitHub API 时没有按 UTF-8 处理。ProofPR 的源码和报告内容使用 UTF-8；建议使用 Windows Terminal / PowerShell 7，或在命令前执行：

```powershell
chcp 65001
```

在 GitHub Actions 的 Ubuntu runner 中，默认环境通常已经是 UTF-8。

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

## Benchmark 和准确性边界

ProofPR 的准确性不是“发现代码 bug 的准确率”，而是“规则是否按维护者定义的证据策略稳定命中”。因此项目提供 benchmark：

```bash
pnpm benchmark
```

Benchmark case 会声明输入 diff、PR 描述、配置和期望风险发现。命令会输出通过/失败结果，帮助维护者讨论误报、漏报和规则调整。

这也是 ProofPR 当前更诚实的边界：它能提高 PR triage 的一致性，但不能替代人工代码审查，也不能保证业务逻辑正确。

## 项目价值

ProofPR 的价值不在于“自动判断代码好坏”，而在于帮助维护者把人工 review 之前的问题标准化：

- PR 是否太大，是否应该拆分。
- 是否触碰了 CI、依赖、secret、MCP 等高风险区域。
- 是否有测试、复现步骤、before/after 或手动验证说明。
- 是否存在疑似凭证泄露。
- 是否应该让检查失败，提醒维护者先处理风险再合并。

这对开源项目和团队 review 有用，因为维护者时间有限，外部贡献和 AI 生成 PR 的质量差异很大。ProofPR 让维护者先看到结构化证据，再决定是否投入审查时间。

如果一个项目主要是个人开发、自己写自己合并，ProofPR 的价值会明显下降。这是 1.0 的明确边界，不再把它包装成所有开发者都需要的工具。

## 安全边界

ProofPR 的默认行为：

- 不上传你的代码到外部服务。
- 不调用 LLM。
- 不打印完整 secret。
- 对疑似 secret 做脱敏。
- 只基于 diff、PR 文本和配置文件生成报告。

因此它更像一个 PR 审查前置检查器，而不是代码审计平台。
