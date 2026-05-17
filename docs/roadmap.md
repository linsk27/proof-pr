# 路线图

ProofPR 的长期定位不是“又一个代码扫描器”，而是 **AI 时代的 PR 证据门禁**。核心目标是帮助维护者先判断 PR 是否值得投入审查时间，再进入代码细节。

## 已经完成

- GitHub Action：在 PR opened、synchronize、reopened 时自动运行。
- CLI：支持本地扫描 git diff。
- 中文报告：支持 `locale: zh-CN` 和 `--locale zh-CN`。
- 风险等级：`low`、`medium`、`high`。
- Evidence Score：0-100 证据评分。
- 审查门禁：维护者下一步动作建议。
- 审查行动清单：可勾选行动清单和重点文件。
- 规则预设：`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。
- GitHub Check annotations：在 workflow annotations / PR 文件视图标出风险发现。
- SARIF / Code Scanning：CLI 可输出 SARIF，Action 可写出 `sarif-output`。
- 真实案例库：提供可复现的 diff 样例。
- Evidence Contract：仓库可以定义路径级证据要求。
- Benchmark：用样本 case 验证规则命中、风险等级和审查门禁，并在 CI 中自动运行。
- Doctor：一条命令体检 `.proofpr.yml`、workflow、Action 版本、PR 权限和本地 diff。
- Demo：无需 clone 仓库即可运行内置案例，适合首次体验和文档传播。
- PR 模板：`init` 默认生成模板，`template` 可单独补模板，帮助贡献者提前提供证据。
- 可交互 HTML 报告：支持风险筛选、搜索 finding、折叠详情和复制补证清单。
- npm 发布自动化：npm Trusted Publishing 已绑定 `linsk27/proof-pr` + `release.yml`，Release workflow 使用 GitHub OIDC 发布。
- Marketplace 准备：补充 action branding、安装说明和上架文案。
- 内置规则：改动规模、敏感路径、缺少测试、PR 描述、复现上下文、secret、依赖、大版本升级、非注册表依赖来源、未固定版本、lockfile 一致性、解析覆盖、包生命周期脚本、workflow 权限、`pull_request_target`、PR head checkout、MCP 配置。

## 短期方向

1. GitHub Marketplace 上架
   代码侧材料已准备好，下一步需要仓库所有者在 GitHub 网页上确认发布。

2. 发布链路稳定性
   Trusted Publisher 已配置并通过 `v0.1.21` 到 `v0.1.44` 验证。后续重点是保持 release workflow 简单可审计，避免回退到本地 token 发布。

3. 真实截图刷新
   用供应链增强规则重新跑一个 demo PR，补充新版依赖风险、HTML 报告和 benchmark 效果图。

4. 真实项目样例扩展
   继续补充 React、Python、Go、Rust 等不同生态的真实 diff 示例，让用户能更快理解规则价值。

## 中期方向

1. Benchmark 扩充
   当前已覆盖 22 个样本和 `supply-chain` 分类。后续继续补充真实/模拟 PR 样本，标注预期 finding、误报和漏报原因。

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
- ProofPR 专注于审查前置判断：这个 PR 有没有足够证据值得维护者投入时间。

## 下一版优先级

下一步优先补充真实项目案例和 Marketplace 上架材料，继续保持默认路径只围绕 `init`、`check`、`request`、`doctor` 四个入口。
