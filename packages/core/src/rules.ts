import type { DiffFile, Finding, ProofPRConfig, PullRequestContext, ScanSummary } from "./types.js";
import { analyzeEvidence } from "./evidence.js";
import { matchesAny, isCodePath, isDependencyManifest, isMcpConfigPath, isTestPath, isWorkflowPath } from "./path-utils.js";
import { detectSecrets } from "./secrets.js";

export function analyzeDiffFiles(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): Finding[] {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));
  const findings: Finding[] = [];

  findings.push(...analyzeChangeSize(activeFiles));
  findings.push(...analyzeSensitivePaths(activeFiles, config));
  findings.push(...analyzeMissingTests(activeFiles, config, pullRequest));
  findings.push(...analyzePullRequestEvidence(activeFiles, pullRequest));
  findings.push(...analyzeDependencyChanges(activeFiles, config));
  findings.push(...analyzeWorkflowPermissions(activeFiles));
  findings.push(...analyzeMcpConfigs(activeFiles));

  if (config.secrets.enabled) {
    for (const file of activeFiles) {
      findings.push(...detectSecrets(file.path, file.addedLines));
    }
  }

  return findings;
}

export function summarizeDiffFiles(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): ScanSummary {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));
  const evidence = analyzeEvidence(pullRequest);

  return {
    filesChanged: activeFiles.length,
    additions: activeFiles.reduce((sum, file) => sum + file.added, 0),
    deletions: activeFiles.reduce((sum, file) => sum + file.removed, 0),
    testFilesChanged: activeFiles.filter((file) => isTestPath(file.path)).length,
    sensitiveFilesChanged: activeFiles.filter((file) => matchesAny(file.path, config.sensitivePaths)).length,
    pullRequestDescription: evidence.descriptionState,
    verificationEvidence: evidence.verificationEvidence,
    reproductionEvidence: evidence.reproductionEvidence
  };
}

function analyzeChangeSize(files: DiffFile[]): Finding[] {
  const filesChanged = files.length;
  const changedLines = files.reduce((sum, file) => sum + file.added + file.removed, 0);

  if (filesChanged >= 20 || changedLines >= 800) {
    return [
      {
        ruleId: "change-size",
        title: "Large review surface",
        message: `This change touches ${filesChanged} files and ${changedLines} changed lines.`,
        severity: "high",
        evidence: [`files: ${filesChanged}`, `changed lines: ${changedLines}`],
        recommendation:
          "Ask for smaller PRs or a clear review map before maintainers spend deep review time."
      }
    ];
  }

  if (filesChanged >= 10 || changedLines >= 250) {
    return [
      {
        ruleId: "change-size",
        title: "Broad review surface",
        message: `This change touches ${filesChanged} files and ${changedLines} changed lines.`,
        severity: "medium",
        evidence: [`files: ${filesChanged}`, `changed lines: ${changedLines}`],
        recommendation:
          "Ask the contributor to explain the scope boundaries and identify the files that need the closest review."
      }
    ];
  }

  return [];
}

function analyzeSensitivePaths(files: DiffFile[], config: ProofPRConfig): Finding[] {
  return files
    .filter((file) => matchesAny(file.path, config.sensitivePaths))
    .map((file) => ({
      ruleId: "sensitive-path",
      title: "Sensitive file changed",
      message: `${file.path} is configured as a sensitive path.`,
      severity: sensitivePathSeverity(file.path),
      path: file.path,
      evidence: [`+${file.added} -${file.removed}`],
      recommendation:
        "Review this file deliberately, especially permission, credential, release, and dependency changes."
    }));
}

function analyzeMissingTests(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): Finding[] {
  if (!config.requireTests.enabled) {
    return [];
  }

  const codeFiles = files.filter(
    (file) =>
      isCodePath(file.path) &&
      !isTestPath(file.path) &&
      matchesAny(file.path, config.requireTests.paths)
  );
  const hasTestChanges = files.some((file) => isTestPath(file.path));
  const hasVerificationEvidence = analyzeEvidence(pullRequest).verificationEvidence;

  if (codeFiles.length === 0 || hasTestChanges || hasVerificationEvidence) {
    return [];
  }

  return [
    {
      ruleId: "missing-tests",
      title: "No verification evidence",
      message: `Code changed in ${codeFiles.length} file(s), but no test files or PR verification notes were found.`,
      severity: codeFiles.length >= 5 ? "medium" : "low",
      evidence: codeFiles.slice(0, 5).map((file) => file.path),
      recommendation:
        "Ask for tests or a clear manual verification note before spending deep review time."
    }
  ];
}

function analyzePullRequestEvidence(files: DiffFile[], pullRequest?: PullRequestContext): Finding[] {
  if (!pullRequest) {
    return [];
  }

  const evidence = analyzeEvidence(pullRequest);
  const codeFiles = files.filter((file) => isCodePath(file.path) && !isTestPath(file.path));
  const hasSensitiveChanges = files.some((file) => isWorkflowPath(file.path) || isMcpConfigPath(file.path));
  const findings: Finding[] = [];

  if (evidence.descriptionState === "missing") {
    findings.push({
      ruleId: "thin-pr-description",
      title: "Pull request description is missing",
      message: "The PR body is empty, so maintainers have little context before review.",
      severity: hasSensitiveChanges || codeFiles.length >= 3 ? "medium" : "low",
      recommendation:
        "Ask for the motivation, test evidence, and any rollout or compatibility notes before review."
    });
  } else if (evidence.descriptionState === "thin") {
    findings.push({
      ruleId: "thin-pr-description",
      title: "Pull request description is thin",
      message: "The PR body is short and may not provide enough review context.",
      severity: hasSensitiveChanges ? "medium" : "low",
      recommendation:
        "Ask for a short explanation of why the change is needed and how it was verified."
    });
  }

  if ((hasSensitiveChanges || codeFiles.length >= 5) && !evidence.reproductionEvidence) {
    findings.push({
      ruleId: "missing-reproduction-context",
      title: "No reproduction or before/after context",
      message: "The PR does not mention reproduction steps, expected behavior, actual behavior, or before/after context.",
      severity: hasSensitiveChanges ? "medium" : "low",
      recommendation:
        "Ask for reproduction steps or a before/after note so reviewers can validate the change path."
    });
  }

  return findings;
}

function analyzeDependencyChanges(files: DiffFile[], config: ProofPRConfig): Finding[] {
  if (!config.dependencies.flagNewPackages) {
    return [];
  }

  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isDependencyManifest(candidate.path))) {
    const addedDependencyLines = file.addedLines
      .map((line) => line.value.trim())
      .filter((line) => isDependencyLikeAddition(file.path, line));

    if (addedDependencyLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "dependency-added",
      title: "Dependency manifest changed",
      message: `${file.path} adds or changes dependency-like entries.`,
      severity: "medium",
      path: file.path,
      evidence: addedDependencyLines.slice(0, 5),
      recommendation:
        "Verify package names, licenses, provenance, and whether the lockfile matches the intended dependency change."
    });
  }

  return findings;
}

function isDependencyLikeAddition(path: string, line: string): boolean {
  if (path.endsWith("package.json")) {
    return /^"[@A-Za-z0-9_.-]+"\s*:\s*"(?:\^|~|>=?|<=?|\d|workspace:|npm:|file:|link:|portal:|git\+|https?:|github:)[^"]*"/.test(
      line
    );
  }

  if (path.endsWith("requirements.txt")) {
    return /^[A-Za-z0-9_.-]+(?:\[.*\])?\s*(?:==|>=|<=|~=|>|<)\s*[^#\s]+/.test(line);
  }

  if (path.endsWith("pyproject.toml") || path.endsWith("Cargo.toml")) {
    return /^[A-Za-z0-9_.-]+\s*=\s*"(?:\^|~|>=?|<=?|\d|workspace:|path\s*=|git\s*=)[^"]*"/.test(
      line
    );
  }

  if (path.endsWith("go.mod")) {
    return /^(?:require\s+)?[A-Za-z0-9_.\-/]+\s+v\d+\.\d+\.\d+/.test(line);
  }

  return false;
}

function analyzeWorkflowPermissions(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isWorkflowPath(candidate.path))) {
    const permissionLines = file.addedLines
      .map((line) => line.value.trim())
      .filter((line) => /permissions:|contents:\s*write|packages:\s*write|id-token:\s*write|pull-requests:\s*write/.test(line));

    if (permissionLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "workflow-permission-change",
      title: "Workflow permission changed",
      message: `${file.path} adds or changes GitHub Actions permissions.`,
      severity: "high",
      path: file.path,
      evidence: permissionLines.slice(0, 5),
      recommendation:
        "Check whether the workflow really needs write or token permissions and whether untrusted pull requests can reach it."
    });
  }

  return findings;
}

function analyzeMcpConfigs(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isMcpConfigPath(candidate.path))) {
    const riskyLines = file.addedLines
      .map((line) => line.value.trim())
      .filter((line) => /env|token|secret|password|api[_-]?key|command|args/i.test(line));

    if (riskyLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "mcp-credential-risk",
      title: "MCP configuration needs review",
      message: `${file.path} adds MCP configuration lines related to commands or credentials.`,
      severity: "high",
      path: file.path,
      evidence: riskyLines.slice(0, 5),
      recommendation:
        "Avoid committing credentials in MCP config. Review command and args values as local execution surface."
    });
  }

  return findings;
}

function sensitivePathSeverity(path: string): "medium" | "high" {
  if (
    matchesAny(path, [
      "**/.env*",
      ".github/workflows/**",
      ".github/actions/**",
      "**/mcp*.json",
      "**/*mcp*.json"
    ])
  ) {
    return "high";
  }

  return "medium";
}
