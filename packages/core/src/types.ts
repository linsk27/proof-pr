export type RiskLevel = "low" | "medium" | "high";

export type FindingSeverity = "info" | RiskLevel;

export interface ProofPRConfig {
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
  };
  comment: {
    enabled: boolean;
  };
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
}

export interface ScanResult {
  risk: RiskLevel;
  summary: ScanSummary;
  findings: Finding[];
}
