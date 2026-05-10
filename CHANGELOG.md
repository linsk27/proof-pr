# 变更记录

## Unreleased

- 新增 Review Plan：报告会生成维护者行动清单和重点文件列表。
- 新增规则预设：`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。
- `proof-pr init` 支持 `--preset`，初始化配置时可直接选择审查策略。
- 文档补充规则预设、报告查看位置、运行时机和项目定位说明。

## 0.1.4 - 2026-05-10

- 新增 Evidence Score：每份报告输出 0-100 证据评分，并列出证据优势和扣分项。
- 新增 Review Gate：根据风险等级、证据评分和安全 finding 给维护者下一步动作建议。
- JSON 输出新增 `evidenceScore` 和 `reviewDecision` 字段。
- README 和文档补充 ProofPR 作为“PR 证据门禁”的定位、评分逻辑和使用价值。

## 0.1.3 - 2026-05-10

- 新增简体中文 Markdown 报告：`.proofpr.yml` 支持 `locale: zh-CN`，CLI 支持 `--locale zh-CN`。
- GitHub Action 会根据仓库配置输出中文 PR 评论和 job summary。
- `proof-pr init` 默认生成中文报告配置。
- 文档补充中文使用方式、Windows 终端乱码说明和确定性风险评估原理。
- 发布 `proof-pr@0.1.3` 到 npm，并在 README 中补充 npm 发布状态。

## 0.1.2 - 2026-05-10

- 修复 CLI `--version` 输出仍显示 `0.1.0` 的问题。
- 更新文档中的 GitHub Action 示例到 `linsk27/proof-pr@v0.1.2`。

## 0.1.1 - 2026-05-10

- 发布 `proof-pr` CLI 到 npm。
- 更新 README 和快速开始文档，改为 npm 优先安装路径。
- 更新 GitHub Action 示例到 `linsk27/proof-pr@v0.1.1`。
- 增加更清晰的使用说明、搜索关键词和效果图展示。

## 0.1.0 - 2026-05-09

首次公开 MVP。

- 新增确定性的 PR diff 扫描器。
- 新增改动规模、敏感路径、缺少测试、secrets、依赖、workflow 权限和 MCP 配置风险规则。
- 新增 PR title/body 证据分析，用于检查验证说明和复现上下文。
- 新增 GitHub Action，支持 PR 评论和 job summary。
- 新增本地 CLI，包含 `scan` 和 `init` 命令。
- 新增文档、示例配置和 CI。
