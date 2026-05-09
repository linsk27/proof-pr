# Rules

ProofPR rules are designed to answer one maintainer question: what evidence should I check before spending deep review time?

## `change-size`

Flags pull requests with a broad review surface.

## `sensitive-path`

Flags paths that often change project trust boundaries, such as CI workflows, dependency manifests, lockfiles, Dockerfiles, `.env` files, and MCP configuration.

## `missing-tests`

Flags code changes under configured source paths when no test files changed.

## `secret-detected:*`

Flags common hardcoded credential patterns in added lines. Findings are redacted in output.

## `dependency-added`

Flags dependency-like additions in dependency manifests.

## `workflow-permission-change`

Flags GitHub Actions permission changes such as `contents: write`, `packages: write`, `id-token: write`, or `pull-requests: write`.

## `mcp-credential-risk`

Flags MCP configuration changes involving commands, args, environment variables, or credential-like keys.
