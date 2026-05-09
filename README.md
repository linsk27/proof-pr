# ProofPR

Review evidence, not vibes.

ProofPR is a GitHub Action and CLI that helps maintainers triage pull requests by checking whether a contribution is scoped, testable, reproducible, and safe to review.

It does not guess whether code was written by AI. It checks whether the contribution provides enough evidence to deserve maintainer time.

## Why

AI coding tools made it cheap to create code, pull requests, issue reports, and security claims. They did not make maintainer attention cheap.

ProofPR gives maintainers a first-pass evidence report before deep review:

- Did the change include tests or verification evidence?
- Does the PR description explain how it was verified?
- Did it touch security-sensitive files?
- Did it add dependencies or change CI permissions?
- Did it expose secrets or risky MCP configuration?
- Is the review surface unusually large?

## Install

Add this workflow to `.github/workflows/proofpr.yml`:

```yaml
name: ProofPR

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  proofpr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: proof-pr/proof-pr@v1
        with:
          fail-on: high
```

For local use:

```bash
pnpm install
pnpm --filter proof-pr build
pnpm --filter proof-pr exec proof-pr scan --format markdown
```

After publishing to npm, local use becomes:

```bash
npx proof-pr init
npx proof-pr scan --base origin/main --head HEAD
```

## Example Report

```md
# ProofPR Review

Risk: high

## Evidence

- Files changed: 12
- Additions: 480
- Deletions: 120
- Test files changed: 0
- Sensitive files changed: 2
- PR description: thin
- Verification evidence: no
- Reproduction context: no

## Findings

### Workflow permission changed

- Rule: `workflow-permission-change`
- Severity: `high`
- Path: `.github/workflows/release.yml`
- Detail: `.github/workflows/release.yml` adds or changes GitHub Actions permissions.
- Recommendation: Check whether the workflow really needs write or token permissions.
```

## Configuration

Create `.proofpr.yml`:

```yaml
riskThreshold: high

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

## Rules In The MVP

- `change-size`: flags unusually broad review surfaces.
- `sensitive-path`: flags changes to CI, dependency, secret, Docker, and MCP files.
- `missing-tests`: flags code changes without test-file changes.
- `thin-pr-description`: flags empty or thin PR descriptions.
- `missing-reproduction-context`: flags broad or sensitive changes without reproduction or before/after context.
- `secret-detected:*`: flags common API keys, tokens, database URLs, and generic secret assignments.
- `dependency-added`: flags dependency-like entries in manifests.
- `workflow-permission-change`: flags GitHub Actions permission changes.
- `mcp-credential-risk`: flags MCP command, args, env, and credential surfaces.

## CLI

```bash
proof-pr init
proof-pr scan --base origin/main --head HEAD
proof-pr scan --base origin/main --pr-body-file pr-body.md --format json
proof-pr scan --base origin/main --fail-on medium
```

## Design Principles

- Evidence over authorship guesses.
- Deterministic checks before optional AI.
- Maintainer-friendly output.
- Zero API key required for the core scanner.
- Easy to run locally, in CI, or as a GitHub Action.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Roadmap

- GitHub Check annotations.
- SARIF upload examples.
- Issue triage mode for reproduction quality.
- Rule plugins.
- Optional AI summary provider.
- OpenSSF Scorecard and gitleaks integration.

## License

MIT
