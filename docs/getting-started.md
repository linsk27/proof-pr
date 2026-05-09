# Getting Started

ProofPR can run as a GitHub Action or as a local CLI.

## GitHub Action

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
          comment: "true"
```

## Local CLI

Initialize ProofPR in a repository:

```bash
proof-pr init
```

Scan the current working tree diff:

```bash
proof-pr scan
```

Scan a pull-request-style diff:

```bash
proof-pr scan --base origin/main --head HEAD
```

Emit JSON:

```bash
proof-pr scan --base origin/main --format json
```

Include PR description evidence checks:

```bash
proof-pr scan --base origin/main --pr-title "Fix login redirect" --pr-body-file pr-body.md
```

Fail the process on medium or high risk:

```bash
proof-pr scan --base origin/main --fail-on medium
```
