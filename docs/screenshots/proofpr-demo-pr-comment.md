<!-- proof-pr-report -->
# ProofPR Review

Risk: **high**

## Evidence

- Files changed: 2
- Additions: 19
- Deletions: 0
- Test files changed: 0
- Sensitive files changed: 1
- PR description: present
- Verification evidence: yes
- Reproduction context: yes

## Findings

### Sensitive file changed
- Rule: `sensitive-path`
- Severity: `high`
- Path: `.github/workflows/demo-risk.yml`
- Detail: .github/workflows/demo-risk.yml is configured as a sensitive path.
- Evidence:
  - `+14 -0`
- Recommendation: Review this file deliberately, especially permission, credential, release, and dependency changes.

### Workflow permission changed
- Rule: `workflow-permission-change`
- Severity: `high`
- Path: `.github/workflows/demo-risk.yml`
- Detail: .github/workflows/demo-risk.yml adds or changes GitHub Actions permissions.
- Evidence:
  - `permissions:`
  - `contents: write`
  - `pull-requests: write`
- Recommendation: Check whether the workflow really needs write or token permissions and whether untrusted pull requests can reach it.

## Maintainer Focus

- Review GitHub Actions permissions before merging.

