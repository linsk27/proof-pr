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

## `evidence-contract:*`

当 `.proofpr.yml` 中配置的 Evidence Contract 被命中，但 PR 描述缺少必需证据时触发。

例如：

```yaml
evidence:
  contracts:
    - id: ui-screenshot
      paths:
        - "src/components/**"
      requires:
        - screenshot
        - verification
      severity: medium
```

如果 PR 修改 `src/components/Button.tsx`，但正文没有截图或验证说明，就会触发 `evidence-contract:ui-screenshot`。

## `secret-detected:*`

在新增代码行中标记常见硬编码凭证。报告输出会对疑似敏感值做脱敏。

## `dependency-added`

标记依赖清单中的新增依赖或依赖版本变更。

## `dependency-major-upgrade`

标记依赖跨越大版本边界的升级，例如 `react` 从 `18.x` 升到 `19.x`。这类变化通常需要核查 changelog、迁移说明、peer dependencies 和测试覆盖。

## `dependency-lifecycle-script`

标记 `package.json` 中新增或修改 `preinstall`、`install`、`postinstall`、`prepare`、`prepublish`、`prepublishOnly` 等包生命周期脚本。它们可能在安装或发布阶段自动执行代码，是供应链风险里很值得维护者提前看的信号。

## `dependency-non-registry-source`

标记不通过普通包注册表解析的依赖来源，例如 npm 的 `git+`、`github:`、`http(s):`、`file:`、`link:`、`portal:`，Python direct URL，以及 Cargo `git` / `path` 依赖。

这类依赖不是一定有问题，但维护者应该确认来源、权限边界和是否固定到不可变 commit 或版本。

## `dependency-unpinned-version`

标记 `latest`、`*`、空版本、`>=0` 等不可复现或过宽的版本声明。它不会把正常的 `^1.2.3` 或 `~1.2.3` 直接当成问题，目标是先抓明显会让依赖解析不稳定的写法。

## `dependency-lockfile-missing`

当依赖 manifest 发生变化，但同生态 lockfile 没有同步出现在 diff 中时触发。

当前会检查：

- npm：`package.json` 对应 `package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`。
- Rust：`Cargo.toml` 对应 `Cargo.lock`。
- Go：`go.mod` 对应 `go.sum`。

Python 的 `requirements.txt` 和 `pyproject.toml` 仍会参与依赖来源、版本和敏感路径检查，但本轮不强制要求某一种 Python lockfile。

## `dependency-lockfile-only-change`

当 lockfile 变化但没有对应 manifest 依赖变化时触发。常见原因可能是重新安装、包管理器版本变化或传递依赖解析变化。ProofPR 不直接判断对错，只提醒维护者核查 package graph 是否符合预期。

## `dependency-resolution-override`

标记 npm `overrides`、Yarn `resolutions` 和 pnpm overrides 相关改动。解析覆盖会改变传递依赖选择，容易影响运行时行为和供应链边界，应该要求贡献者说明原因并确认 lockfile。

## `workflow-permission-change`

标记 GitHub Actions 写权限或 OIDC 权限变化，例如 `permissions: write-all`、`contents: write`、`packages: write`、`id-token: write` 或 `pull-requests: write`。只读权限如 `contents: read` 不会被当成权限升级。

## `workflow-dangerous-trigger`

标记新增 `pull_request_target` 的 GitHub Actions workflow。这个触发器会在 base repository 上下文运行，如果同时执行不可信 PR 代码、使用高权限 token 或读取 secret，风险会很高。

## `workflow-untrusted-checkout`

标记 workflow 中 checkout PR head 代码的行为，例如 `github.event.pull_request.head.sha`、`github.event.pull_request.head.repo.full_name` 或 `github.head_ref`。

如果它和 `pull_request_target` 同时出现，ProofPR 会把它视为高风险组合，因为这可能让不可信 PR 代码在高权限上下文中运行。

## `mcp-credential-risk`

标记 MCP 配置中涉及 command、args、环境变量或凭证相关字段的改动。
