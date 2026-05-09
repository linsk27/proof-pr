import type { Finding, ScanResult } from "./types.js";

const REPORT_MARKER = "<!-- proof-pr-report -->";

export function renderMarkdownReport(result: ScanResult): string {
  const lines: string[] = [
    REPORT_MARKER,
    "# ProofPR Review",
    "",
    `Risk: **${result.risk}**`,
    "",
    "## Evidence",
    "",
    `- Files changed: ${result.summary.filesChanged}`,
    `- Additions: ${result.summary.additions}`,
    `- Deletions: ${result.summary.deletions}`,
    `- Test files changed: ${result.summary.testFilesChanged}`,
    `- Sensitive files changed: ${result.summary.sensitiveFilesChanged}`,
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("## Findings", "", "No review-risk findings detected by the enabled rules.", "");
    return lines.join("\n");
  }

  lines.push("## Findings", "");

  for (const finding of result.findings) {
    lines.push(formatFinding(finding), "");
  }

  lines.push(
    "## Maintainer Focus",
    "",
    ...maintainerFocus(result.findings).map((item) => `- ${item}`),
    ""
  );

  return lines.join("\n");
}

export function getReportMarker(): string {
  return REPORT_MARKER;
}

export function renderSarifReport(result: ScanResult): string {
  const rules = new Map(
    result.findings.map((finding) => [
      finding.ruleId,
      {
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title },
        fullDescription: { text: finding.message }
      }
    ])
  );

  return JSON.stringify(
    {
      version: "2.1.0",
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "ProofPR",
              informationUri: "https://github.com/proof-pr/proof-pr",
              rules: [...rules.values()]
            }
          },
          results: result.findings.map((finding) => ({
            ruleId: finding.ruleId,
            level: sarifLevel(finding.severity),
            message: { text: finding.message },
            locations: finding.path
              ? [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: finding.path }
                    }
                  }
                ]
              : []
          }))
        }
      ]
    },
    null,
    2
  );
}

function formatFinding(finding: Finding): string {
  const lines = [
    `### ${finding.title}`,
    "",
    `- Rule: \`${finding.ruleId}\``,
    `- Severity: \`${finding.severity}\``,
    finding.path ? `- Path: \`${finding.path}\`` : undefined,
    `- Detail: ${finding.message}`
  ].filter((line): line is string => Boolean(line));

  if (finding.evidence && finding.evidence.length > 0) {
    lines.push("- Evidence:");
    for (const item of finding.evidence) {
      lines.push(`  - \`${item}\``);
    }
  }

  if (finding.recommendation) {
    lines.push(`- Recommendation: ${finding.recommendation}`);
  }

  return lines.join("\n");
}

function maintainerFocus(findings: Finding[]): string[] {
  const focus = new Set<string>();

  for (const finding of findings) {
    if (finding.ruleId.startsWith("secret-detected")) {
      focus.add("Rotate any exposed credential and block the PR until secrets are removed.");
    } else if (finding.ruleId === "workflow-permission-change") {
      focus.add("Review GitHub Actions permissions before merging.");
    } else if (finding.ruleId === "missing-tests") {
      focus.add("Ask for tests or a manual verification note.");
    } else if (finding.ruleId === "change-size") {
      focus.add("Request a smaller PR or a file-by-file review guide.");
    } else if (finding.ruleId === "mcp-credential-risk") {
      focus.add("Review MCP commands, args, and credential handling.");
    }
  }

  if (focus.size === 0) {
    focus.add("Review the listed sensitive files and ask for evidence where context is thin.");
  }

  return [...focus];
}

function sarifLevel(severity: Finding["severity"]): "note" | "warning" | "error" {
  if (severity === "high") {
    return "error";
  }

  if (severity === "medium") {
    return "warning";
  }

  return "note";
}
