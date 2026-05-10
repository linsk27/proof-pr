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
- 内置规则：改动规模、敏感路径、缺少测试、PR 描述、复现上下文、secret、依赖、workflow 权限、MCP 配置。

## 短期方向

1. GitHub Check annotations
   在 PR Files changed 页面直接标出高风险文件，让维护者不用只看评论。

2. GitHub Marketplace
   上架 GitHub Marketplace，降低安装门槛，并提升项目可信度。

3. 真实案例库
   文档展示典型 PR 场景：
   - 大 PR
   - 缺少测试
   - workflow 权限变化
   - 疑似 secret
   - MCP 配置风险

## 中期方向

1. Issue 质量检查
   扫描 issue 是否包含复现步骤、环境信息、预期/实际结果。

2. SARIF / Code Scanning 集成
   将高风险 finding 输出到 GitHub Code Scanning。

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

下一版优先做 GitHub Check annotations、真实案例库和 GitHub Marketplace 安装体验。这些能力最容易让用户感受到“安装后马上有用”，也更适合后续扩大开源传播。
