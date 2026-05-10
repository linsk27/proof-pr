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

配置感知型集成使用的默认风险阈值。GitHub Action 也提供了 `fail-on` 输入项。

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

## `comment`

控制支持评论的集成是否发布报告评论。
