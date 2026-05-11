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
  - "pnpm-lock.yaml"

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

Action 输出项：

| 输出项 | 说明 |
| --- | --- |
| `risk` | 整体风险等级。 |
| `findings` | finding 数量。 |
| `evidence-score` | 0-100 证据评分。 |
| `review-decision` | Review 门禁结论。 |
