import type { DiffFile, Finding, ProofPRConfig, ScanSummary } from "./types.js";
import { matchesAny, isCodePath, isDependencyManifest, isMcpConfigPath, isTestPath, isWorkflowPath } from "./path-utils.js";
import { detectSecrets } from "./secrets.js";

export function analyzeDiffFiles(files: DiffFile[], config: ProofPRConfig): Finding[] {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));
  const findings: Finding[] = [];

  findings.push(...analyzeChangeSize(activeFiles));
  findings.push(...analyzeSensitivePaths(activeFiles, config));
  findings.push(...analyzeMissingTests(activeFiles, config));
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

export function summarizeDiffFiles(files: DiffFile[], config: ProofPRConfig): ScanSummary {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));

  return {
    filesChanged: activeFiles.length,
    additions: activeFiles.reduce((sum, file) => sum + file.added, 0),
    deletions: activeFiles.reduce((sum, file) => sum + file.removed, 0),
    testFilesChanged: activeFiles.filter((file) => isTestPath(file.path)).length,
    sensitiveFilesChanged: activeFiles.filter((file) => matchesAny(file.path, config.sensitivePaths)).length
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

function analyzeMissingTests(files: DiffFile[], config: ProofPRConfig): Finding[] {
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

  if (codeFiles.length === 0 || hasTestChanges) {
    return [];
  }

  return [
    {
      ruleId: "missing-tests",
      title: "No test evidence in changed files",
      message: `Code changed in ${codeFiles.length} file(s), but no test files changed.`,
      severity: codeFiles.length >= 5 ? "medium" : "low",
      evidence: codeFiles.slice(0, 5).map((file) => file.path),
      recommendation:
        "Ask for tests or a clear manual verification note before spending deep review time."
    }
  ];
}

function analyzeDependencyChanges(files: DiffFile[], config: ProofPRConfig): Finding[] {
  if (!config.dependencies.flagNewPackages) {
    return [];
  }

  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isDependencyManifest(candidate.path))) {
    const addedDependencyLines = file.addedLines
      .map((line) => line.value.trim())
      .filter((line) => /^["']?[@A-Za-z0-9_.-]+["']?\s*[:=]\s*["'][^"']+["']/.test(line));

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
