# 真实案例库

这里放的是可复现的 ProofPR 场景样例。每个案例都提供一个 unified diff，可以直接用 CLI 扫描，方便用户理解“为什么触发风险”和“维护者应该怎么处理”。

运行方式：

```bash
pnpm build
node packages/cli/dist/index.js scan --diff-file examples/cases/missing-tests.diff --locale zh-CN
```

也可以换成 npm 包：

```bash
npx proof-pr@latest scan --diff-file examples/cases/missing-tests.diff --locale zh-CN
```

## 案例列表

| 案例 | 文件 | 会触发什么 |
| --- | --- | --- |
| 缺少测试证据 | `examples/cases/missing-tests.diff` | `missing-tests`，提醒维护者要求测试或手动验证说明。 |
| Workflow 权限变更 | `examples/cases/workflow-permission.diff` | `sensitive-path` 和 `workflow-permission-change`，建议合并前审查最小权限。 |
| MCP 配置风险 | `examples/cases/mcp-config-risk.diff` | `sensitive-path` 和 `mcp-credential-risk`，提醒审查 command、args、env 和凭证处理。 |
| 疑似 secret | `examples/cases/secret-leak.diff` | `secret-detected:*`，建议移除、轮换并改用 secret manager。 |
| 依赖变更 | `examples/cases/dependency-change.diff` | `dependency-added`，建议审查包名、来源、许可证和 lockfile。 |

## 推荐 PR 描述模板

下面这段可以保存成 `pr-body.md`，再配合 `--pr-body-file pr-body.md` 扫描，用来观察 ProofPR 如何识别验证证据和复现上下文。

```markdown
## 变更说明

修复登录退出后的重定向问题。

## 验证方式

- 本地运行单元测试通过。
- 手动测试 Chrome 登录、退出、再次登录流程通过。

## 复现步骤

1. 登录系统。
2. 点击退出登录。
3. 再次访问需要登录的页面。

预期结果：用户被带回登录页。
实际结果：修复后行为符合预期。
```

## 这些案例的意义

ProofPR 不判断“代码好不好”，也不猜作者是不是用了 AI。它把 review 前最耗时的几个问题提前暴露出来：

- 这个 PR 有没有测试或验证证据？
- 有没有触碰 CI、依赖、secret、MCP 等高风险区域？
- 有没有足够的复现和 before/after 上下文？
- 维护者应该正常 review、重点 review、要求补证据，还是先阻止合并？

这些样例可以直接放在项目文档、issue 回复或贡献指南里，帮助新用户快速理解 ProofPR 的价值。
