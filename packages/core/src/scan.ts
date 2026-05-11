import { parseConfig } from "./config.js";
import { parseUnifiedDiff } from "./diff.js";
import { analyzeDiffFiles, summarizeDiffFiles } from "./rules.js";
import type {
  EvidenceScore,
  EvidenceScoreGrade,
  Finding,
  ProofPRConfig,
  PullRequestContext,
  ReviewAction,
  ReviewDecision,
  ReviewFocusFile,
  ReviewPlan,
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
  const reviewDecision = calculateReviewDecision(risk, evidenceScore, findings);

  return {
    risk,
    evidenceScore,
    reviewDecision,
    reviewPlan: buildReviewPlan(reviewDecision, findings, evidenceScore),
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
      "dependency-major-upgrade",
      "dependency-lifecycle-script",
      "workflow-permission-change",
      "workflow-dangerous-trigger",
      "mcp-credential-risk"
    ].includes(finding.ruleId)
  );

  if (needsVerificationEvidence && !summary.verificationEvidence) {
    addDeduction("missing-verification", 20, "No test or manual verification evidence was found.");
  }

  if ((summary.sensitiveFilesChanged > 0 || summary.filesChanged >= 5) && !summary.reproductionEvidence) {
    addDeduction(
      "missing-reproduction-context",
      15,
      "No reproduction, before/after, or expected/actual context was found."
    );
  }

  for (const finding of findings) {
    if (finding.ruleId.startsWith("secret-detected")) {
      addDeduction("secret-detected", 40, "Possible committed secret detected.");
    } else if (finding.ruleId === "workflow-permission-change") {
      addDeduction("workflow-permission-change", 25, "Workflow permission changes need deliberate review.");
    } else if (finding.ruleId === "workflow-dangerous-trigger") {
      addDeduction("workflow-dangerous-trigger", 30, "pull_request_target workflows need privileged trigger review.");
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
    } else if (finding.ruleId === "dependency-major-upgrade") {
      addDeduction("dependency-major-upgrade", 15, "Dependency major version changed.");
    } else if (finding.ruleId === "dependency-lifecycle-script") {
      addDeduction(
        "dependency-lifecycle-script",
        25,
        "Package lifecycle scripts can run during install or publish."
      );
    } else if (finding.ruleId === "missing-tests") {
      addDeduction(
        "missing-tests",
        finding.severity === "medium" ? 20 : 12,
        "Code changed without test changes or verification notes."
      );
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
      finding.ruleId === "workflow-dangerous-trigger" ||
      finding.ruleId === "dependency-lifecycle-script" ||
      finding.ruleId === "mcp-credential-risk"
  );

  if (hasBlockingSecurityFinding || evidenceScore.value < 50 || risk === "high") {
    return "block-merge";
  }

  if (
    evidenceScore.value < 70 ||
    findings.some(
      (finding) => finding.ruleId === "missing-tests" || finding.ruleId === "thin-pr-description"
    )
  ) {
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

function buildReviewPlan(
  reviewDecision: ReviewDecision,
  findings: Finding[],
  evidenceScore: EvidenceScore
): ReviewPlan {
  const actionItems = dedupeReviewActions([
    ...reviewDecisionActions(reviewDecision),
    ...evidenceScoreActions(evidenceScore),
    ...findings.flatMap((finding) => reviewActionsForFinding(finding))
  ]);

  const focusFiles = dedupeFocusFiles(
    findings
      .filter((finding) => finding.path)
      .map((finding) => ({
        path: finding.path as string,
        reasonId: finding.ruleId,
        reason: finding.title,
        priority: finding.severity === "high" ? "high" : finding.severity === "medium" ? "medium" : "low"
      }))
  );

  return {
    actionItems: actionItems.slice(0, 8),
    focusFiles: focusFiles.slice(0, 8)
  };
}

function reviewDecisionActions(reviewDecision: ReviewDecision): ReviewAction[] {
  if (reviewDecision === "block-merge") {
    return [
      {
        actionId: "block-merge-until-resolved",
        title: "Block merge until the flagged risks are handled.",
        detail: "Treat this PR as not ready for merge until the high-risk findings are explained, reduced, or removed.",
        priority: "high",
        relatedRuleIds: []
      }
    ];
  }

  if (reviewDecision === "needs-evidence") {
    return [
      {
        actionId: "ask-for-evidence-before-review",
        title: "Ask for missing evidence before deep review.",
        detail: "Request tests, screenshots, reproduction steps, or a clearer PR description before spending detailed review time.",
        priority: "medium",
        relatedRuleIds: []
      }
    ];
  }

  if (reviewDecision === "review-carefully") {
    return [
      {
        actionId: "review-with-focus",
        title: "Review with a focused checklist.",
        detail: "Use the findings and focus files below as the first-pass review map.",
        priority: "medium",
        relatedRuleIds: []
      }
    ];
  }

  return [
    {
      actionId: "normal-review",
      title: "Proceed with normal review.",
      detail: "The PR has enough evidence for a standard maintainer review pass.",
      priority: "low",
      relatedRuleIds: []
    }
  ];
}

function evidenceScoreActions(evidenceScore: EvidenceScore): ReviewAction[] {
  return evidenceScore.deductions.flatMap((deduction) => {
    if (
      deduction.reasonId === "missing-pr-description" ||
      deduction.reasonId === "thin-pr-description" ||
      deduction.reasonId === "no-pr-context"
    ) {
      return [
        {
          actionId: "improve-pr-description",
          title: "Ask for a clearer PR description.",
          detail: "The contributor should explain why the change is needed, what changed, how it was verified, and any rollout or compatibility risk.",
          priority: "medium",
          relatedRuleIds: ["thin-pr-description"]
        }
      ];
    }

    if (deduction.reasonId === "missing-verification" || deduction.reasonId === "missing-tests") {
      return [
        {
          actionId: "add-verification-evidence",
          title: "Ask for test or manual verification evidence.",
          detail: "Require test output, CI links, screenshots, or a short manual verification note before approving.",
          priority: "medium",
          relatedRuleIds: ["missing-tests"]
        }
      ];
    }

    if (deduction.reasonId === "missing-reproduction-context") {
      return [
        {
          actionId: "add-reproduction-context",
          title: "Ask for reproduction or before/after context.",
          detail: "The PR should include steps to reproduce, expected and actual behavior, or before/after screenshots where relevant.",
          priority: "medium",
          relatedRuleIds: ["missing-reproduction-context"]
        }
      ];
    }

    return [];
  });
}

function reviewActionsForFinding(finding: Finding): ReviewAction[] {
  if (finding.ruleId.startsWith("secret-detected")) {
    return [
      {
        actionId: "rotate-secret",
        title: "Rotate and remove the exposed credential.",
        detail: "Do not merge until the secret is removed from the PR and any exposed value has been rotated.",
        priority: "high",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "workflow-permission-change") {
    return [
      {
        actionId: "justify-workflow-permissions",
        title: "Require a least-privilege explanation for workflow permissions.",
        detail: "Confirm whether write permissions or OIDC are necessary and whether untrusted PRs can reach this workflow.",
        priority: "high",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "workflow-dangerous-trigger") {
    return [
      {
        actionId: "review-privileged-pr-trigger",
        title: "Review privileged pull_request_target usage.",
        detail: "Confirm the workflow does not execute untrusted PR code with write tokens, secrets, or repository permissions.",
        priority: "high",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "dependency-lifecycle-script") {
    return [
      {
        actionId: "review-package-lifecycle-script",
        title: "Review package lifecycle scripts before merge.",
        detail: "Check whether install, postinstall, prepare, or publish scripts can execute unexpected code for contributors or consumers.",
        priority: "high",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "mcp-credential-risk") {
    return [
      {
        actionId: "review-mcp-execution-surface",
        title: "Review MCP commands, args, and credential handling.",
        detail: "Check that MCP config does not commit secrets and does not unexpectedly expand local execution surface.",
        priority: "high",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "change-size") {
    return [
      {
        actionId: "request-review-map-or-split",
        title: "Request a smaller PR or a file-by-file review map.",
        detail: "Ask the contributor to split unrelated changes or identify the files that need the closest review.",
        priority: finding.severity === "high" ? "high" : "medium",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "dependency-added") {
    return [
      {
        actionId: "verify-dependency-change",
        title: "Verify dependency provenance and lockfile impact.",
        detail: "Check package name, maintainer, license, install scripts, and whether the lockfile matches the intended dependency change.",
        priority: "medium",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "dependency-major-upgrade") {
    return [
      {
        actionId: "review-major-dependency-upgrade",
        title: "Review major dependency upgrade impact.",
        detail: "Check changelogs, migration notes, peer dependencies, and whether tests cover the upgraded surface.",
        priority: "medium",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  if (finding.ruleId === "sensitive-path") {
    return [
      {
        actionId: "assign-sensitive-file-review",
        title: "Assign focused review for sensitive files.",
        detail: "Have a maintainer deliberately inspect the sensitive file changes before approval.",
        priority: finding.severity === "high" ? "high" : "medium",
        relatedRuleIds: [finding.ruleId]
      }
    ];
  }

  return [];
}

function dedupeReviewActions(actions: ReviewAction[]): ReviewAction[] {
  const seen = new Set<string>();
  const unique: ReviewAction[] = [];

  for (const action of actions.sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))) {
    if (seen.has(action.actionId)) {
      continue;
    }

    seen.add(action.actionId);
    unique.push(action);
  }

  return unique;
}

function dedupeFocusFiles(files: ReviewFocusFile[]): ReviewFocusFile[] {
  const seen = new Set<string>();
  const unique: ReviewFocusFile[] = [];

  for (const file of files.sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))) {
    if (seen.has(file.path)) {
      continue;
    }

    seen.add(file.path);
    unique.push(file);
  }

  return unique;
}

function priorityRank(priority: ReviewAction["priority"]): number {
  return { low: 1, medium: 2, high: 3 }[priority];
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
