# 路线图

ProofPR 的长期定位不是“又一个代码扫描器”，而是 **AI 时代的 PR 证据门禁**。核心目标是帮助维护者先判断 PR 是否值得投入 review 时间，再进入代码细节。

## 已经完成

- GitHub Action：在 PR opened、synchronize、reopened 时自动运行。
- CLI：支持本地扫描 git diff。
- 中文报告：支持 `locale: zh-CN` 和 `--locale zh-CN`。
- 风险等级：`low`、`medium`、`high`。
- Evidence Score：0-100 证据评分。
- Review Gate：维护者下一步动作建议。
- Review Plan：可勾选行动清单和重点文件。
- 规则预设：`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。
- GitHub Check annotations：在 workflow annotations / PR 文件视图标出风险 finding。
- SARIF / Code Scanning：CLI 可输出 SARIF，Action 可写出 `sarif-output`。
- 真实案例库：提供可复现的 diff 样例。
- Evidence Contract：仓库可以定义路径级证据要求。
- Benchmark：用样本 case 验证规则命中、风险等级和 Review 门禁，并在 CI 中自动运行。
- Marketplace 准备：补充 action branding、安装说明和上架文案。
- 内置规则：改动规模、敏感路径、缺少测试、PR 描述、复现上下文、secret、依赖、大版本升级、包生命周期脚本、workflow 权限、`pull_request_target`、PR head checkout、MCP 配置。

## 短期方向

1. GitHub Marketplace 上架
   代码侧材料已准备好，下一步需要仓库所有者在 GitHub 网页上确认发布。

2. 真实截图刷新
   用 `v0.1.8` 的 annotations / SARIF 能力重新跑一个 demo PR，补充新版效果图。

3. 真实项目样例扩展
   继续补充 React、Python、Go、Rust 等不同生态的真实 diff 示例，让用户能更快理解规则价值。

4. GitHub Release 页面发布说明自动化
   当前 npm 已发布，后续要让 release workflow 在 npm 失败时也能创建 GitHub Release 页面。

## 中期方向

1. Benchmark 扩充
   继续补充真实/模拟 PR 样本，标注预期 finding、误报和漏报原因。

2. Issue 质量检查
   扫描 issue 是否包含复现步骤、环境信息、预期/实际结果。

3. 规则插件系统
   允许项目自定义组织内部规则。

4. 可选 AI 摘要
   核心评分继续保持确定性，AI 只做可选摘要和措辞优化。

## 与其他工具的区别

- gitleaks 更擅长 secret 扫描。
- GitHub dependency-review 更擅长依赖漏洞检查。
- AI code reviewer 更擅长解释代码或提出修改建议。
- ProofPR 专注于 review 前置判断：这个 PR 有没有足够证据值得维护者投入时间。

## 下一版优先级

下一步优先用真实 demo PR 更新截图和 Marketplace 页面。代码能力已经比 MVP 更完整，后续重点应该转向传播、案例和低门槛安装体验。
