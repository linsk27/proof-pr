# ProofPR 文档

这里是 ProofPR 的中文文档入口。

## 新用户先看

- [快速开始](getting-started.md)：安装 GitHub Action、本地 CLI 使用方式、如何判断安装成功。
- [配置说明](configuration.md)：`.proofpr.yml` 的字段说明和示例配置。
- [规则说明](rules.md)：每条内置规则会检查什么、为什么触发。
- [实现原理](how-it-works.md)：ProofPR 如何解析 diff、执行规则、评分并输出报告。
- [路线图](roadmap.md)：后续能力规划，以及它和普通扫描器的区别。
- README 里的“什么时候会自动检测”和“在哪里看报告”适合第一次安装时直接对照检查。

## 当前发布

- GitHub Release：[`v0.1.4`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.4)
- npm 最新公开包：[`proof-pr@0.1.3`](https://www.npmjs.com/package/proof-pr)
- `main` 分支继续开发下一版，包含 Review Plan 和规则预设。

## 真实运行截图

PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)，由 GitHub Action 真实生成：

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

CLI 输出截图来自本机 `AI-Vue3-python-flask-Blog` 项目，使用 `npx proof-pr@latest scan --base HEAD~5 --head HEAD --locale zh-CN` 真实扫描生成：

![ProofPR 真实 CLI 输出截图](screenshots/ai-vue-flask-cli-output.png)

中文报告可以通过 `.proofpr.yml` 配置：

```yaml
locale: zh-CN
preset: open-source-maintainer
```

## 示意图

下面这些 SVG 是说明流程和界面的示意图，不是真实截图：

- [PR 评论示意图](assets/proofpr-pr-comment.svg)
- [CLI 输出示意图](assets/proofpr-cli-output.svg)
- [工作流示意图](assets/proofpr-flow.svg)

## 当前定位

ProofPR 是一个给开源维护者使用的 PR 证据门禁。它关注的是“这个 PR 有没有足够证据值得 review”，而不是猜测“代码是不是 AI 写的”。

核心输出包括：

- 风险等级：判断风险强度。
- 证据评分：用 0-100 分衡量 review 证据是否充分。
- Review 门禁：给维护者下一步动作建议。
- Review 行动清单：给维护者一组可勾选的处理步骤。

核心关键词：

- PR evidence scanner
- pull request review
- PR triage
- maintainer tools
- AI coding review
- MCP security
- secrets scanning
- GitHub Actions security
