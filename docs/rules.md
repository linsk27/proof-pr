# 规则

ProofPR 的规则只回答一个维护者真正关心的问题：在深入 review 之前，我应该先检查哪些证据？

## `change-size`

标记 review 面积过大的 PR。改动文件太多或改动行数太大时，维护者通常需要先要求拆分 PR 或补充 review map。

## `sensitive-path`

标记经常改变项目信任边界的路径，例如 CI workflow、依赖清单、lockfile、Dockerfile、`.env` 文件和 MCP 配置。

## `missing-tests`

当配置的源码路径发生代码改动，但没有测试文件变更，也没有 PR 验证说明时触发。

## `thin-pr-description`

当 PR body 为空或过短时触发。维护者需要足够的背景信息才能判断是否值得深入 review。

## `missing-reproduction-context`

当 PR 改动较大或涉及敏感文件，但没有提到复现步骤、预期行为、实际行为或 before/after 信息时触发。

## `secret-detected:*`

在新增代码行中标记常见硬编码凭证。报告输出会对疑似敏感值做脱敏。

## `dependency-added`

标记依赖清单中的新增依赖或依赖版本变更。

## `workflow-permission-change`

标记 GitHub Actions 权限变化，例如 `contents: write`、`packages: write`、`id-token: write` 或 `pull-requests: write`。

## `mcp-credential-risk`

标记 MCP 配置中涉及 command、args、环境变量或凭证相关字段的改动。
