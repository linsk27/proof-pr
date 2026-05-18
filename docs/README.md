# ProofPR 文档

这里是 ProofPR 的中文文档入口。ProofPR 1.0 的核心定位是 AI PR 初审门禁：先判断一个 PR 是否值得维护者投入人工 review，再进入代码细节。

它不面向个人开发者的日常 git 管理，也不替代 AI code reviewer。它更适合开源维护者、团队 reviewer，以及 AI 生成 PR、外部贡献和供应链改动较多的仓库。

第一次使用建议先看“快速开始”，它只保留最短安装路径。

## 推荐阅读顺序

1. [快速开始](getting-started.md)
2. [功能和命令速查](commands.md)
3. [从 0 到 1 安装和验证](zero-to-one.md)
4. [配置说明](configuration.md)
5. [规则说明](rules.md)
6. [Benchmark 和准确性边界](../benchmarks/README.md) / [当前报告](../benchmarks/report.md)
7. [真实案例库](cases.md)
8. [实现原理](how-it-works.md)

## 当前发布

- GitHub Release：[`v1.0.0`](https://github.com/linsk27/proof-pr/releases/tag/v1.0.0)
- npm：[`proof-pr@1.0.0`](https://www.npmjs.com/package/proof-pr)
- 核心能力：判断 PR 是否值得人工 review、指出缺失证据、标出高风险改动区域，并生成维护者行动清单。
- 辅助能力：HTML 报告、GitHub annotations、SARIF、benchmark、真实案例库和 npm Trusted Publishing 发布流程。

确认本机拿到的 latest：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

当前都应输出 `1.0.0`。

不知道怎么开始时：

```bash
npx proof-pr@latest
# 或
npx proof-pr@latest guide
```

## 图示和截图

真实运行截图：

![ProofPR demo 输出](screenshots/proofpr-demo-output.png)

![ProofPR 中文功能菜单](screenshots/proofpr-guide-output.png)

![ProofPR doctor 体检输出](screenshots/proofpr-doctor-output.png)

![ProofPR 初始化输出](screenshots/proofpr-init-output.png)

![ProofPR 真实 PR 评论截图](screenshots/proofpr-demo-pr-comment.png)

![ProofPR 真实 CLI 输出截图](screenshots/ai-vue-flask-cli-output.png)

![ProofPR workflow 风险扫描输出](screenshots/proofpr-workflow-risk-output.png)

![ProofPR HTML 可视化报告](screenshots/proofpr-visual-report.png)

![ProofPR benchmark 输出](screenshots/proofpr-benchmark-output.png)

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

ProofPR 是一个给开源维护者使用的 AI PR 初审门禁。它关注的是“这个 PR 现在值不值得人工 review”，不是猜测“代码是不是 AI 写的”。

它的核心输出只有三类：

- **能不能开始审查**：风险等级、证据评分和审查门禁建议。
- **缺什么证据**：测试、复现、截图、变更说明、权限理由。
- **先看哪里**：风险雷达、重点文件和维护者行动清单。

HTML、SARIF、benchmark 和 annotations 都是交付形态，不是项目本身的定位。
