import { parseConfig } from "./config.js";
import { parseUnifiedDiff } from "./diff.js";
import { analyzeDiffFiles, summarizeDiffFiles } from "./rules.js";
import type { Finding, ProofPRConfig, PullRequestContext, RiskLevel, ScanResult } from "./types.js";

export interface ScanOptions {
  config?: Partial<ProofPRConfig> | ProofPRConfig;
  pullRequest?: PullRequestContext;
}

export function scanDiff(diffText: string, options: ScanOptions = {}): ScanResult {
  const config = parseConfig(options.config ?? {});
  const files = parseUnifiedDiff(diffText);
  const findings = dedupeFindings(analyzeDiffFiles(files, config, options.pullRequest));
  const summary = summarizeDiffFiles(files, config, options.pullRequest);

  return {
    risk: calculateRisk(findings),
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
