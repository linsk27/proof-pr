export type RiskLevel = "low" | "medium" | "high";

export type FindingSeverity = "info" | RiskLevel;

export type ReportLocale = "en" | "zh-CN";

export type ConfigPreset =
  | "balanced"
  | "open-source-maintainer"
  | "security-strict"
  | "ai-generated-pr"
  | "mcp-security"
  | "dependency-careful";

export type EvidenceScoreGrade = "strong" | "adequate" | "thin" | "risky";

export type ReviewDecision = "ready" | "review-carefully" | "needs-evidence" | "block-merge";

export type ReviewActionPriority = "low" | "medium" | "high";

export type EvidenceRequirement =
  | "verification"
  | "reproduction"
  | "screenshot"
  | "changelog"
  | "permission-rationale";

export interface EvidenceContract {
  id: string;
  title?: string;
  paths: string[];
  requires: EvidenceRequirement[];
  severity: FindingSeverity;
  recommendation?: string;
}

export interface ProofPRConfig {
  preset: ConfigPreset;
  locale: ReportLocale;
  riskThreshold: RiskLevel;
  ignorePaths: string[];
  sensitivePaths: string[];
  requireTests: {
    enabled: boolean;
    paths: string[];
  };
  secrets: {
    enabled: boolean;
  };
  dependencies: {
    flagNewPackages: boolean;
    flagMajorUpgrades: boolean;
    flagLifecycleScripts: boolean;
  };
  evidence: {
    contracts: EvidenceContract[];
  };
  comment: {
    enabled: boolean;
  };
}

export interface PullRequestContext {
  title?: string;
  body?: string;
}

export interface ChangeLine {
  value: string;
  lineNumber?: number;
}

export interface DiffFile {
  path: string;
  oldPath?: string;
  added: number;
  removed: number;
  isNew: boolean;
  isDeleted: boolean;
  addedLines: ChangeLine[];
  removedLines: ChangeLine[];
}

export interface Finding {
  ruleId: string;
  title: string;
  message: string;
  severity: FindingSeverity;
  path?: string;
  evidence?: string[];
  recommendation?: string;
}

export interface ScanSummary {
  filesChanged: number;
  additions: number;
  deletions: number;
  testFilesChanged: number;
  sensitiveFilesChanged: number;
  pullRequestDescription: "unavailable" | "missing" | "thin" | "present";
  verificationEvidence: boolean;
  reproductionEvidence: boolean;
  screenshotEvidence: boolean;
  changelogEvidence: boolean;
  permissionRationaleEvidence: boolean;
}

export interface EvidenceScoreDetail {
  reasonId: string;
  message: string;
  points: number;
}

export interface EvidenceScore {
  value: number;
  grade: EvidenceScoreGrade;
  strengths: string[];
  deductions: EvidenceScoreDetail[];
}

export interface ReviewAction {
  actionId: string;
  title: string;
  detail: string;
  priority: ReviewActionPriority;
  relatedRuleIds: string[];
}

export interface ReviewFocusFile {
  path: string;
  reasonId: string;
  reason: string;
  priority: ReviewActionPriority;
}

export interface ReviewPlan {
  actionItems: ReviewAction[];
  focusFiles: ReviewFocusFile[];
}

export interface ScanResult {
  risk: RiskLevel;
  evidenceScore: EvidenceScore;
  reviewDecision: ReviewDecision;
  reviewPlan: ReviewPlan;
  summary: ScanSummary;
  findings: Finding[];
}
