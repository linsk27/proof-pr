# 变更记录

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
