# proof-pr

ProofPR 是给开源维护者和工程团队使用的 PR 证据门禁。它只回答一个问题：这个 PR 有没有足够证据，值得维护者开始 review？

它不是 AI code reviewer，也不是漏洞库。它不依赖大模型，不上传代码，只基于 diff、PR 描述和配置做确定性判断。

## 快速使用

确认 latest 版本：

```bash
npx proof-pr@latest --version
```

当前应输出 `0.1.29`。

不知道怎么开始时：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

默认只用三条命令。

接入 GitHub PR 自动检查：

```bash
npx proof-pr@latest init
```

这个命令会生成 `.proofpr.yml`、`.github/workflows/proofpr.yml` 和 `.github/pull_request_template.md`，提交后打开 PR 即可看到报告。
重复运行时已有文件会被保留；需要刷新模板时使用 `npx proof-pr@latest init --force`。

发 PR 前本地自查：

```bash
npx proof-pr@latest check
```

`check` 会自动选择常见主分支作为 base，并纳入已提交分支 diff、staged、unstaged 和未跟踪新文件。
如果当前没有可扫描 diff，它会直接输出短提示，不会再打印完整空报告。

只生成可以发给贡献者的补证请求：

```bash
npx proof-pr@latest request
```

也可以写入文件：

```bash
npx proof-pr@latest request --output proofpr-request.md
```

默认输出是短评论。如果需要完整补证模板：

```bash
npx proof-pr@latest request --full
```

## 辅助命令

先看效果，不改仓库：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

不确定是否装好：

```bash
npx proof-pr@latest doctor
```

这个命令会检查配置文件、workflow、PR 模板、Action 版本、PR 权限和本地 diff 是否可读，并自动识别常见主分支作为 base。报告顶部会直接给出一句话建议，告诉你下一步是打开 PR、运行 `check`，还是用 `doctor --fix` 修复接入。

想自动修复常见接入问题：

```bash
npx proof-pr@latest doctor --fix
```

它只会创建或刷新 ProofPR 自己的接入文件，不会改业务代码。

已接入仓库单独补 PR 模板：

```bash
npx proof-pr@latest template
```

查看所有内置案例：

```bash
npx proof-pr@latest demo --list
```

生成独立 HTML 可视化报告：

```bash
npx proof-pr@latest check --format html --output proofpr-report.html
```

HTML 报告支持筛选风险、搜索规则/文件/详情，并复制补证清单。

运行 benchmark：

```bash
npx proof-pr@latest benchmark --cases benchmarks/cases
```

## GitHub Action

```yaml
- uses: linsk27/proof-pr@v0.1.29
  with:
    fail-on: high
    comment: "true"
    annotations: "true"
```

## 输出什么

- 风险等级：`low`、`medium`、`high`。
- 证据评分：0-100 分。
- Review 门禁：正常 review、重点 review、先补证据、风险处理前不要合并。
- 风险雷达：把 findings 归并成证据、供应链、Workflow、Secret 和 Review 面。
- Review 行动清单：维护者可直接执行的 checklist。
- Contributor Request：一段可直接发给贡献者的补证请求，可用 `proof-pr request` 单独输出。
- 可选输出：GitHub annotations、SARIF、benchmark report、可筛选并可复制补证清单的独立 HTML 可视化报告；CLI 可用 `--output` 直接写文件。

## 常用预设

- `open-source-maintainer`：开源仓库推荐。
- `security-strict`：安全敏感项目。
- `ai-generated-pr`：AI 生成 PR 较多的仓库。
- `mcp-security`：关注 MCP / agent 配置。
- `dependency-careful`：关注依赖、锁文件和供应链变化。

完整中文文档、截图和从 0 到 1 教程见仓库 README：

https://github.com/linsk27/proof-pr
