# proof-pr

ProofPR 是给开源维护者和工程团队使用的 PR 证据门禁。它只回答一个问题：这个 PR 有没有足够证据，值得维护者开始审查？

它不是 AI code reviewer，也不是漏洞库。它不依赖大模型，不上传代码，只基于 diff、PR 描述和配置做确定性判断。

## 快速使用

确认 latest 版本：

```bash
npx proof-pr@latest --version
```

当前应输出 `0.1.50`。

不知道怎么开始时：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

`npx proof-pr@latest --help` 会显示中文命令说明，底部也会给出四条常用复制命令。
各子命令的 `--help` 默认只显示常用参数，高级参数仍可使用；普通接入不需要先理解完整参数表。

默认只用四条命令。

接入 GitHub PR 自动检查：

```bash
npx proof-pr@latest init
```

这个命令会生成 `.proofpr.yml`、`.github/workflows/proofpr.yml` 和 `.github/pull_request_template.md`，默认配置已经可用，提交后打开 PR 即可看到报告。
重复运行时已有文件会被保留；需要刷新模板时使用 `npx proof-pr@latest init --force`。

体检接入是否正确：

```bash
npx proof-pr@latest doctor
```

`doctor` 会检查配置文件、workflow、PR 模板、Action 版本、PR 权限和本地 diff 是否可读，并直接给出下一步建议。

发 PR 前本地自查：

```bash
npx proof-pr@latest check
```

`check` 会自动选择常见主分支作为 base，并纳入已提交分支 diff、staged、unstaged 和未跟踪新文件。
本地运行时通常没有 PR 标题和描述上下文，报告会提示这一点；打开 PR 后会结合 PR 标题和描述重新评估证据。需要本地模拟 PR 描述时，可以把描述写入 `pr.md` 后运行 `npx proof-pr@latest check --pr-body-file pr.md`；这个命令也会出现在 `check --help` 的常用复制里。
如果当前没有可扫描 diff，它会直接输出短提示，不会再打印完整空报告；刚接入但还没有业务改动时不用处理。

只生成可以发给贡献者的补证请求：

```bash
npx proof-pr@latest request
```

如果当前没有可扫描 diff，它会直接输出短提示，不会生成误导性的补证评论；刚接入但还没有业务改动时不用处理。

需要让本地补证请求参考 PR 描述时，可以运行：

```bash
npx proof-pr@latest request --pr-body-file pr.md
```

这个命令也会出现在 `request --help` 的常用复制里。

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
- uses: linsk27/proof-pr@v0.1.50
  with:
    fail-on: high
    comment: "true"
    annotations: "true"
```

## 输出什么

- 风险等级：`low`、`medium`、`high`。
- 证据评分：0-100 分。
- 审查门禁：常规审查、重点审查、先补证据、风险处理前不要合并。
- 风险雷达：把风险发现归并成证据、供应链、Workflow、密钥和审查范围。
- 审查行动清单：维护者可直接执行的 checklist。
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
