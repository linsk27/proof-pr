# ProofPR 文档

这里是 ProofPR 的中文文档入口。第一次使用建议先看“从 0 到 1”，只想复制安装配置可以看“快速开始”。

## 推荐阅读顺序

1. [从 0 到 1 安装和验证](zero-to-one.md)
2. [快速开始](getting-started.md)
3. [配置说明](configuration.md)
4. [规则说明](rules.md)
5. [Benchmark 和准确性边界](../benchmarks/README.md) / [当前报告](../benchmarks/report.md)
6. [真实案例库](cases.md)
7. [实现原理](how-it-works.md)

## 当前发布

- GitHub Release：[`v0.1.6`](https://github.com/linsk27/proof-pr/releases/tag/v0.1.6)
- npm：[`proof-pr@0.1.6`](https://www.npmjs.com/package/proof-pr)
- 核心能力：Review Plan、规则预设、Evidence Contract、GitHub annotations、SARIF、benchmark、真实案例库、依赖大版本升级检查、包生命周期脚本检查、`pull_request_target` / PR head checkout 检查、Marketplace 准备材料。

## 图示和截图

真实截图：

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

![ProofPR 真实 CLI 输出截图](screenshots/ai-vue-flask-cli-output.png)

流程示意图：

![ProofPR 从 0 到 1 使用流程示意图](assets/proofpr-zero-to-one.svg)

![ProofPR 输出位置示意图](assets/proofpr-output-locations.svg)

![ProofPR 报告结构示意图](assets/proofpr-report-anatomy.svg)

## 专题文档

- [SARIF / Code Scanning](sarif-code-scanning.md)
- [GitHub Marketplace 安装说明](marketplace.md)
- [发布流程](release.md)
- [路线图](roadmap.md)

## 项目定位

ProofPR 是一个给开源维护者使用的 PR 证据门禁。它关注的是“这个 PR 有没有足够证据值得 review”，不是猜测“代码是不是 AI 写的”。

它的核心输出包括：

- 风险等级。
- 0-100 证据评分。
- Review 门禁建议。
- Review 行动清单。
- Evidence Contract。
- Benchmark case。
- CI benchmark report。
- GitHub annotations。
- SARIF / Code Scanning 输出。
