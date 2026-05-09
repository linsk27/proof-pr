# Configuration

ProofPR reads `.proofpr.yml` by default.

```yaml
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

## `riskThreshold`

The default risk threshold used by configuration-aware integrations. The GitHub Action also has a `fail-on` input.

## `ignorePaths`

Paths excluded from analysis.

## `sensitivePaths`

Paths that should always receive explicit maintainer attention.

## `requireTests`

Controls whether source changes should be flagged when no test files changed.

## `secrets`

Controls built-in secret pattern checks.

## `dependencies`

Controls dependency manifest checks.

## `comment`

Controls whether integrations should post a report comment when supported.
