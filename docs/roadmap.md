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

2. npm Trusted Publishing 自动发布验证
   Trusted Publisher 已配置完成。下一次正常发 tag 时验证 GitHub Release workflow 是否能通过 OIDC 自动发布 npm，不再走本地 token 发布。

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
- ProofPR 专注于 review 前置判断：这个 PR 有没有足够证据值得维护者投入时间。

## 下一版优先级

下一步优先验证 `0.1.18` 的自动 npm 发布链路，并用供应链增强规则更新真实 demo PR 截图和 Marketplace 页面。
