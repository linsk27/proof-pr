# 路线图

ProofPR 1.0 是一个收口版本。它不再扩展成面向个人开发者的通用 git 工具，也不和 AI code reviewer 正面竞争。

当前定位只保留一句话：

> AI PR 初审门禁：在维护者投入人工 review 前，判断这个 PR 是否已经具备足够证据。

## 1.0 已完成

- GitHub Action：在 PR opened、synchronize、reopened 时自动运行。
- CLI：支持 `init`、`doctor`、`check`、`request` 四个公开主入口。
- 中文报告：支持 `locale: zh-CN` 和 `--locale zh-CN`。
- 风险等级：`low`、`medium`、`high`。
- Evidence Score：0-100 证据评分。
- 审查门禁：输出维护者下一步动作建议。
- 审查行动清单：生成可勾选 checklist 和重点文件。
- 规则预设：`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。
- GitHub Check annotations：在 workflow annotations / PR 文件视图标出风险发现。
- SARIF / Code Scanning：CLI 可输出 SARIF，Action 可写出 `sarif-output`。
- Evidence Contract：仓库可以定义路径级证据要求。
- HTML 报告：支持风险筛选、搜索 finding、折叠详情和复制补证清单。
- Doctor：一条命令体检 `.proofpr.yml`、workflow、Action 版本、PR 权限和本地 diff。
- Demo：无需接入仓库即可运行内置案例。
- Benchmark：22 个样本覆盖证据、供应链、workflow、安全和低风险场景。
- npm Trusted Publishing：Release workflow 使用 GitHub OIDC 自动发布，不需要本地 token。

## 1.0 后维护策略

ProofPR 暂时进入维护模式。

优先做：

- 修 bug。
- 修文档错误。
- 保持 npm / GitHub Action 发布链路可用。
- 补少量真实案例，帮助用户判断是否适合自己的仓库。

暂时不做：

- 不继续堆复杂 CLI 命令。
- 不做通用 AI code review。
- 不做个人开发者本地工作树 UI。
- 不把它扩展成大而全安全平台。

## 如果以后继续

只有两个方向值得继续投入：

1. **AI PR Intake**
   专注 AI 生成 PR 进入人工 review 前的验收：是否跑过测试、是否有复现、是否说明影响、是否触碰高风险区域。

2. **PR Supply Chain Firewall**
   专注依赖、lockfile、workflow、secret、发布脚本、MCP 配置这些高风险 diff。这个方向更确定、更容易解释，也更适合保持无 AI、可复现的规则引擎。

## 与其他工具的区别

- Git / VSCode 更适合开发者查看自己改了什么。
- AI code reviewer 更适合尝试发现代码 bug 或给修改建议。
- gitleaks 更擅长 secret 扫描。
- GitHub dependency-review 更擅长依赖漏洞检查。
- OpenSSF Scorecard 更擅长仓库整体安全健康评分。
- ProofPR 只做 PR 进入人工 review 前的初审判断。

## 当前结论

ProofPR 不是高频个人开发者工具。它的真实价值只在维护者、团队 review 和外部贡献场景里成立。

因此 1.0 后不再继续盲目扩功能。新的开源潜力项目应该从更高频、更直接的个人开发痛点重新选择。
