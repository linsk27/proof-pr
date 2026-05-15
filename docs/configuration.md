# 配置

ProofPR 默认读取 `.proofpr.yml`。

```yaml
locale: zh-CN
preset: open-source-maintainer

riskThreshold: high

ignorePaths:
  - "docs/generated/**"

sensitivePaths:
  - ".github/workflows/**"
  - "**/.env*"
  - "**/mcp*.json"
  - "package.json"
  - "**/package.json"
  - "pnpm-lock.yaml"
  - "**/pnpm-lock.yaml"

requireTests:
  enabled: true
  paths:
    - "src/**"
    - "packages/**/src/**"

secrets:
  enabled: true

dependencies:
  flagNewPackages: true
  flagMajorUpgrades: true
  flagLifecycleScripts: true

evidence:
  contracts:
    - id: ui-screenshot
      title: UI changes need screenshots
      paths:
        - "src/components/**"
        - "app/**"
      requires:
        - screenshot
        - verification
      severity: medium

comment:
  enabled: true
```

## `locale`

控制 Markdown 报告语言。

- `en`：英文，默认值。
- `zh-CN`：简体中文，适合中文仓库、中文团队和中文 PR 评论。

CLI 也可以临时指定：

```bash
proof-pr scan --base origin/main --head HEAD --locale zh-CN
```

如果要把报告保存成文件，使用 `--output`：

```bash
proof-pr scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html
proof-pr scan --base origin/main --head HEAD --format sarif --output proofpr.sarif
```

## `preset`

选择内置规则预设。预设会自动设置风险阈值、敏感路径和需要测试覆盖的源码路径，你也可以在同一个 `.proofpr.yml` 里继续覆盖具体字段。

可选值：

| 预设 | 适合场景 |
| --- | --- |
| `balanced` | 默认均衡模式，适合先低噪音试用。 |
| `open-source-maintainer` | 开源仓库推荐，关注 PR 描述、测试证据、CI、依赖和 secret 风险。 |
| `security-strict` | 安全敏感项目，更多路径会被视为敏感，默认风险阈值为 `medium`。 |
| `ai-generated-pr` | AI 生成 PR 较多的仓库，重点要求验证证据和清晰 PR 描述。 |
| `mcp-security` | 关注 MCP、Cursor、VS Code、本地 agent 配置和凭证风险。 |
| `dependency-careful` | 关注依赖清单、锁文件和多语言包管理配置变化。 |

`security-strict` 会内置 workflow 权限理由证据契约。`dependency-careful` 会内置依赖变更证据契约，并额外把 Poetry / Pipenv / Maven / Gradle / Ruby Bundler 文件作为敏感路径。Java 和 Ruby 本轮先做敏感路径提醒，不做深度依赖解析。

示例：

```yaml
locale: zh-CN
preset: security-strict
```

## `riskThreshold`

配置感知型集成使用的默认风险阈值。GitHub Action 如果没有显式传 `fail-on`，会使用这里的值。

## `ignorePaths`

从分析中排除的路径。

## `sensitivePaths`

需要维护者显式关注的敏感路径。

## `requireTests`

控制源码改动在没有测试文件变更时是否触发提示。

## `secrets`

控制内置 secret 模式检查。

## `dependencies`

控制依赖清单检查。

- `flagNewPackages`：标记新增依赖或依赖条目变化。
- `flagMajorUpgrades`：标记跨大版本升级，例如 `18.x` 到 `19.x`。
- `flagLifecycleScripts`：标记 `preinstall`、`postinstall`、`prepare` 等安装/发布阶段脚本。

供应链增强规则默认随依赖检查启用，不新增配置项，避免用户为了开启基础保护还要理解一堆开关。当前会额外标记：

- `dependency-non-registry-source`：git、GitHub、URL、file/link/portal、Python direct URL、Cargo git/path 等非普通注册表来源。
- `dependency-unpinned-version`：`latest`、`*`、空版本、`>=0` 等不可复现依赖声明。
- `dependency-lockfile-missing`：npm / Rust / Go manifest 改了，但对应 lockfile 没有同步变化。
- `dependency-lockfile-only-change`：lockfile 改了，但没有对应 manifest 依赖变化。
- `dependency-resolution-override`：npm `overrides`、Yarn `resolutions`、pnpm overrides。

## `evidence.contracts`

Evidence Contract 是仓库自定义证据契约。它不会判断代码 bug，而是要求命中特定路径的 PR 必须在 PR 描述里提供指定证据。

示例：UI 改动必须有截图和验证说明。

```yaml
evidence:
  contracts:
    - id: ui-screenshot
      title: UI changes need screenshots
      paths:
        - "src/components/**"
        - "app/**"
      requires:
        - screenshot
        - verification
      severity: medium
      recommendation: "请补充 before/after 截图和测试命令。"
```

可用 `requires`：

| 值 | ProofPR 会寻找什么 |
| --- | --- |
| `verification` | 测试命令、CI、手动验证、测试文件变更。 |
| `reproduction` | 复现步骤、before/after、预期/实际行为。 |
| `screenshot` | 截图、录屏、效果图、前后对比图。 |
| `changelog` | changelog、release notes、迁移说明、破坏性变更说明。 |
| `permission-rationale` | 权限理由、最小权限、OIDC、写权限、不可信 PR 说明。 |

## `comment`

控制支持评论的集成是否发布报告评论。

## GitHub Action 输入项

除了 `.proofpr.yml`，GitHub Action 还支持这些 workflow 输入：

| 输入项 | 默认值 | 说明 |
| --- | --- | --- |
| `github-token` | `${{ github.token }}` | 读取 PR diff、发布评论、更新评论。 |
| `config-path` | `.proofpr.yml` | 配置文件路径。 |
| `fail-on` | 配置文件的 `riskThreshold` | 达到哪个风险等级时让 workflow 失败，可选 `low`、`medium`、`high`、`never`。 |
| `comment` | `true` | 是否创建或更新 PR 评论。 |
| `annotations` | `true` | `v0.1.5` 起可用，是否输出 GitHub workflow annotations。 |
| `sarif-output` | 空 | `v0.1.5` 起可用，写出 SARIF 文件路径，例如 `proofpr.sarif`。 |
| `html-output` | 空 | 写出独立 HTML 可视化报告路径，例如 `proofpr-report.html`。 |

Action 输出项：

| 输出项 | 说明 |
| --- | --- |
| `risk` | 整体风险等级。 |
| `findings` | finding 数量。 |
| `evidence-score` | 0-100 证据评分。 |
| `review-decision` | Review 门禁结论。 |
