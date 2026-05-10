# ProofPR 文档

这里是 ProofPR 的中文文档入口。

## 新用户先看

- [快速开始](getting-started.md)：安装 GitHub Action、本地 CLI 使用方式、如何判断安装成功。
- [配置说明](configuration.md)：`.proofpr.yml` 的字段说明和示例配置。
- [规则说明](rules.md)：每条内置规则会检查什么、为什么触发。
- [实现原理](how-it-works.md)：ProofPR 如何解析 diff、执行规则、评分并输出报告。
- README 里的“什么时候会自动检测”和“在哪里看报告”适合第一次安装时直接对照检查。

## 当前发布

- GitHub Release：[`v0.1.3`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.3)
- npm：[`proof-pr@0.1.3`](https://www.npmjs.com/package/proof-pr)

## 真实运行截图

PR 评论截图来自 [demo PR #1](https://github.com/linsk27/proof-pr/pull/1)，由 GitHub Action 真实生成：

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

CLI 输出截图来自本机 `AI-Vue3-python-flask-Blog` 项目，使用 `npx proof-pr@latest scan --base HEAD~5 --head HEAD --locale zh-CN` 真实扫描生成：

![ProofPR 真实 CLI 输出截图](screenshots/ai-vue-flask-cli-output.png)

中文报告可以通过 `.proofpr.yml` 配置：

```yaml
locale: zh-CN
```

## 示意图

下面这些 SVG 是说明流程和界面的示意图，不是真实截图：

- [PR 评论示意图](assets/proofpr-pr-comment.svg)
- [CLI 输出示意图](assets/proofpr-cli-output.svg)
- [工作流示意图](assets/proofpr-flow.svg)

## 当前定位

ProofPR 是一个给开源维护者使用的 PR 证据检查器。它关注的是“这个 PR 有没有足够证据值得 review”，而不是猜测“代码是不是 AI 写的”。

核心关键词：

- PR evidence scanner
- pull request review
- PR triage
- maintainer tools
- AI coding review
- MCP security
- secrets scanning
- GitHub Actions security
