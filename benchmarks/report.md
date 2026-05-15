# ProofPR Benchmark

**Summary:** 22/22 passed (100%)

## Categories

| Category | Passed | Total | Pass rate |
| --- | ---: | ---: | ---: |
| agent-security | 1 | 1 | 100% |
| dependency | 3 | 3 | 100% |
| evidence | 1 | 1 | 100% |
| evidence-contract | 4 | 4 | 100% |
| low-risk | 1 | 1 | 100% |
| security | 1 | 1 | 100% |
| supply-chain | 8 | 8 | 100% |
| workflow-security | 3 | 3 | 100% |

## Finding Coverage

| Rule | Cases |
| --- | ---: |
| `sensitive-path` | 18 |
| `dependency-lockfile-missing` | 8 |
| `dependency-added` | 6 |
| `dependency-non-registry-source` | 3 |
| `workflow-permission-change` | 3 |
| `missing-reproduction-context` | 2 |
| `missing-tests` | 2 |
| `workflow-dangerous-trigger` | 2 |
| `dependency-lifecycle-script` | 1 |
| `dependency-lockfile-only-change` | 1 |
| `dependency-major-upgrade` | 1 |
| `dependency-resolution-override` | 1 |
| `dependency-unpinned-version` | 1 |
| `evidence-contract:ui-screenshot` | 1 |
| `evidence-contract:workflow-permission-rationale` | 1 |
| `mcp-credential-risk` | 1 |
| `secret-detected:database-url` | 1 |
| `secret-detected:openai-key` | 1 |
| `thin-pr-description` | 1 |
| `workflow-untrusted-checkout` | 1 |

## Cases

| Result | Case | Category | Actual risk | Gate |
| --- | --- | --- | --- | --- |
| PASS | `dependency-change` | dependency | high | block-merge |
| PASS | `dependency-major-upgrade` | dependency | high | block-merge |
| PASS | `docs-only-low-risk` | low-risk | low | ready |
| PASS | `evidence-contract-missing` | evidence-contract | medium | needs-evidence |
| PASS | `evidence-contract-satisfied` | evidence-contract | low | ready |
| PASS | `mcp-config-risk` | agent-security | high | block-merge |
| PASS | `missing-tests` | evidence | low | needs-evidence |
| PASS | `package-lifecycle-script` | dependency | high | block-merge |
| PASS | `secret-leak` | security | high | block-merge |
| PASS | `security-strict-workflow-contract-satisfied` | evidence-contract | high | block-merge |
| PASS | `security-strict-workflow-contract` | evidence-contract | high | block-merge |
| PASS | `supply-chain-go-lockfile-missing` | supply-chain | high | block-merge |
| PASS | `supply-chain-lockfile-missing` | supply-chain | high | block-merge |
| PASS | `supply-chain-lockfile-only-change` | supply-chain | high | block-merge |
| PASS | `supply-chain-npm-non-registry-source` | supply-chain | high | block-merge |
| PASS | `supply-chain-npm-unpinned-version` | supply-chain | high | block-merge |
| PASS | `supply-chain-python-direct-url` | supply-chain | high | block-merge |
| PASS | `supply-chain-resolution-override` | supply-chain | high | block-merge |
| PASS | `supply-chain-rust-git-source` | supply-chain | high | block-merge |
| PASS | `workflow-dangerous-trigger` | workflow-security | high | block-merge |
| PASS | `workflow-permission` | workflow-security | high | block-merge |
| PASS | `workflow-untrusted-checkout` | workflow-security | high | block-merge |
