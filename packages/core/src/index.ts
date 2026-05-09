export { loadConfig, parseConfig, riskMeetsThreshold, riskRank } from "./config.js";
export { parseUnifiedDiff } from "./diff.js";
export { renderMarkdownReport, renderSarifReport, getReportMarker } from "./reporters.js";
export { scanDiff } from "./scan.js";
export type {
  ChangeLine,
  DiffFile,
  Finding,
  FindingSeverity,
  ProofPRConfig,
  RiskLevel,
  ScanResult,
  ScanSummary
} from "./types.js";
