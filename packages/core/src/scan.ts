import { parseConfig } from "./config.js";
import { parseUnifiedDiff } from "./diff.js";
import { analyzeDiffFiles, summarizeDiffFiles } from "./rules.js";
import type {
  EvidenceScore,
  EvidenceScoreGrade,
  Finding,
  ProofPRConfig,
  PullRequestContext,
  ReviewDecision,
  RiskLevel,
  ScanResult,
  ScanSummary
} from "./types.js";

export interface ScanOptions {
  config?: Partial<ProofPRConfig> | ProofPRConfig;
  pullRequest?: PullRequestContext;
}

export function scanDiff(diffText: string, options: ScanOptions = {}): ScanResult {
  const config = parseConfig(options.config ?? {});
  const files = parseUnifiedDiff(diffText);
  const findings = dedupeFindings(analyzeDiffFiles(files, config, options.pullRequest));
  const summary = summarizeDiffFiles(files, config, options.pullRequest);
  const risk = calculateRisk(findings);
  const evidenceScore = calculateEvidenceScore(summary, findings);

  return {
    risk,
    evidenceScore,
    reviewDecision: calculateReviewDecision(risk, evidenceScore, findings),
    summary,
    findings
  };
}

function calculateRisk(findings: Finding[]): RiskLevel {
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = findings.filter((finding) => finding.severity === "medium").length;
  const lowCount = findings.filter((finding) => finding.severity === "low").length;

  if (highCount > 0 || mediumCount >= 2) {
    return "high";
  }

  if (mediumCount === 1 || lowCount >= 3) {
    return "medium";
  }

  return "low";
}

function calculateEvidenceScore(summary: ScanSummary, findings: Finding[]): EvidenceScore {
  const deductions = new Map<string, { message: string; points: number }>();

  const addDeduction = (reasonId: string, points: number, message: string): void => {
    const existing = deductions.get(reasonId);

    if (existing) {
      existing.points = Math.max(existing.points, points);
      return;
    }

    deductions.set(reasonId, { message, points });
  };

  if (summary.pullRequestDescription === "missing") {
    addDeduction("missing-pr-description", 25, "PR description is missing.");
  } else if (summary.pullRequestDescription === "thin") {
    addDeduction("thin-pr-description", 15, "PR description is too thin for confident review.");
  } else if (summary.pullRequestDescription === "unavailable") {
    addDeduction("no-pr-context", 10, "PR description was not available to the scanner.");
  }

  const needsVerificationEvidence = findings.some((finding) =>
    [
      "change-size",
      "sensitive-path",
      "missing-tests",
      "dependency-added",
      "workflow-permission-change",
      "mcp-credential-risk"
    ].includes(finding.ruleId)
  );

  if (needsVerificationEvidence && !summary.verificationEvidence) {
    addDeduction("missing-verification", 20, "No test or manual verification evidence was found.");
  }

  if ((summary.sensitiveFilesChanged > 0 || summary.filesChanged >= 5) && !summary.reproductionEvidence) {
    addDeduction("missing-reproduction-context", 15, "No reproduction, before/after, or expected/actual context was found.");
  }

  for (const finding of findings) {
    if (finding.ruleId.startsWith("secret-detected")) {
      addDeduction("secret-detected", 40, "Possible committed secret detected.");
    } else if (finding.ruleId === "workflow-permission-change") {
      addDeduction("workflow-permission-change", 25, "Workflow permission changes need deliberate review.");
    } else if (finding.ruleId === "mcp-credential-risk") {
      addDeduction("mcp-credential-risk", 25, "MCP configuration expands local execution or credential risk.");
    } else if (finding.ruleId === "change-size") {
      addDeduction(
        finding.severity === "high" ? "large-review-surface" : "broad-review-surface",
        finding.severity === "high" ? 20 : 10,
        finding.severity === "high"
          ? "The PR is large enough that normal review is likely unreliable."
          : "The PR has a broad review surface."
      );
    } else if (finding.ruleId === "sensitive-path") {
      addDeduction(
        `sensitive-path-${finding.severity}`,
        finding.severity === "high" ? 20 : 10,
        "Sensitive files changed and need focused review."
      );
    } else if (finding.ruleId === "dependency-added") {
      addDeduction("dependency-change", 10, "Dependency manifest changed.");
    } else if (finding.ruleId === "missing-tests") {
      addDeduction("missing-tests", finding.severity === "medium" ? 20 : 12, "Code changed without test changes or verification notes.");
    }
  }

  const strengths = collectEvidenceStrengths(summary);
  const value = clampScore(100 - [...deductions.values()].reduce((sum, item) => sum + item.points, 0));

  return {
    value,
    grade: gradeEvidenceScore(value),
    strengths,
    deductions: [...deductions.entries()].map(([reasonId, item]) => ({
      reasonId,
      message: item.message,
      points: item.points
    }))
  };
}

function collectEvidenceStrengths(summary: ScanSummary): string[] {
  const strengths: string[] = [];

  if (summary.pullRequestDescription === "present") {
    strengths.push("PR description provides review context.");
  }

  if (summary.verificationEvidence) {
    strengths.push("Verification evidence was found.");
  }

  if (summary.reproductionEvidence) {
    strengths.push("Reproduction or before/after context was found.");
  }

  if (summary.testFilesChanged > 0) {
    strengths.push("Test files changed with the PR.");
  }

  if (summary.filesChanged > 0 && summary.sensitiveFilesChanged === 0) {
    strengths.push("No configured sensitive files changed.");
  }

  return strengths;
}

function gradeEvidenceScore(value: number): EvidenceScoreGrade {
  if (value >= 85) {
    return "strong";
  }

  if (value >= 70) {
    return "adequate";
  }

  if (value >= 50) {
    return "thin";
  }

  return "risky";
}

function calculateReviewDecision(
  risk: RiskLevel,
  evidenceScore: EvidenceScore,
  findings: Finding[]
): ReviewDecision {
  const hasBlockingSecurityFinding = findings.some(
    (finding) =>
      finding.ruleId.startsWith("secret-detected") ||
      finding.ruleId === "workflow-permission-change" ||
      finding.ruleId === "mcp-credential-risk"
  );

  if (hasBlockingSecurityFinding || evidenceScore.value < 50 || risk === "high") {
    return "block-merge";
  }

  if (evidenceScore.value < 70 || findings.some((finding) => finding.ruleId === "missing-tests" || finding.ruleId === "thin-pr-description")) {
    return "needs-evidence";
  }

  if (risk === "medium") {
    return "review-carefully";
  }

  return "ready";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const unique: Finding[] = [];

  for (const finding of findings) {
    const key = [finding.ruleId, finding.path ?? "", finding.message].join("\0");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(finding);
  }

  return unique;
}
