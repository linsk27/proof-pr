# 配置

ProofPR 默认读取 `.proofpr.yml`。

```yaml
locale: zh-CN

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
