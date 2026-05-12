# 真实案例库

这里放的是可复现的 ProofPR 场景样例，用来回答一个问题：它到底会抓什么，为什么对维护者有用。

## 最简单的试用方式

不需要 clone 仓库，也不需要找 `examples/cases/*.diff`：

```bash
npx proof-pr@latest demo workflow --locale zh-CN
```

查看全部内置案例：

```bash
npx proof-pr@latest demo --list
```

常用内置案例：

| 案例 | 命令 | 会触发什么 |
| --- | --- | --- |
| 高权限 workflow | `npx proof-pr@latest demo workflow --locale zh-CN` | `pull_request_target` + PR head checkout 高风险组合 |
| 疑似 secret | `npx proof-pr@latest demo secret --locale zh-CN` | API key、数据库连接串、`.env` 敏感路径 |
| 依赖大版本升级 | `npx proof-pr@latest demo dependency --locale zh-CN` | major upgrade，需要 changelog、迁移说明和验证证据 |
| MCP 配置风险 | `npx proof-pr@latest demo mcp --locale zh-CN` | `command`、`args`、`env` 和凭据面 |
| UI 证据要求 | `npx proof-pr@latest demo ui-evidence --locale zh-CN` | Evidence Contract 要求截图和验证说明 |

## 源码仓库里的 diff 样例

如果你正在开发 ProofPR 本身，也可以直接扫描 `examples/cases` 里的 diff 文件：

```bash
pnpm build
node packages/cli/dist/index.js scan --diff-file examples/cases/workflow-untrusted-checkout.diff --locale zh-CN
```

| 文件 | 说明 |
| --- | --- |
| `examples/cases/missing-tests.diff` | 代码改动缺少测试或手动验证证据 |
| `examples/cases/workflow-permission.diff` | GitHub Actions 权限变更 |
| `examples/cases/workflow-untrusted-checkout.diff` | 高权限 workflow checkout 不可信 PR head |
| `examples/cases/mcp-config-risk.diff` | MCP / agent 配置风险 |
| `examples/cases/secret-leak.diff` | 疑似 secret 泄漏 |
| `examples/cases/dependency-change.diff` | 新增依赖 |
| `examples/cases/dependency-major-upgrade.diff` | 依赖大版本升级 |
| `examples/cases/package-lifecycle-script.diff` | 包生命周期脚本 |
| `examples/cases/ui-change.diff` | UI 改动，可配合 Evidence Contract |

## Benchmark

项目内置 benchmark case，用来验证规则是否按预期命中：

```bash
pnpm benchmark
```

当前 benchmark 覆盖依赖大版本升级、包生命周期脚本、`pull_request_target`、PR head checkout、MCP 配置、secret、缺少测试和 Evidence Contract。

## 这些案例的意义

ProofPR 不判断“代码好不好”，也不猜作者是不是用了 AI。它把 review 前最耗时的几个问题提前暴露出来：

- 这个 PR 有没有测试或验证证据？
- 有没有触碰 CI、依赖、secret、MCP 等高风险区域？
- 有没有足够的复现、before/after 或权限说明？
- 维护者应该正常 review、重点 review、要求补证据，还是先阻止合并？

这些案例可以直接放在项目文档、issue 回复或贡献指南里，帮助新用户快速理解 ProofPR 的价值。
