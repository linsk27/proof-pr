import type { Finding, FindingSeverity, ReportLocale, ScanResult } from "./types.js";

const REPORT_MARKER = "<!-- proof-pr-report -->";

interface HtmlLabels {
  report: string;
  subtitle: string;
  generated: string;
  risk: string;
  evidenceScore: string;
  reviewGate: string;
  findings: string;
  findingsHint: string;
  changeSummary: string;
  filesChanged: string;
  additions: string;
  deletions: string;
  sensitiveFiles: string;
  testFiles: string;
  highFindings: string;
  mediumFindings: string;
  lowFindings: string;
  evidenceSignals: string;
  prDescription: string;
  verification: string;
  reproduction: string;
  screenshot: string;
  changelog: string;
  permissionRationale: string;
  reviewPlan: string;
  noActions: string;
  quickFix: string;
  quickFixHint: string;
  copyFix: string;
  copiedFix: string;
  riskRadar: string;
  riskRadarHint: string;
  findingDistribution: string;
  findingFilters: string;
  allFindings: string;
  searchFindings: string;
  noFilteredFindings: string;
  high: string;
  medium: string;
  low: string;
  info: string;
  focusFiles: string;
  noFocusFiles: string;
  scoreDetails: string;
  noDeductions: string;
  rulesCovered: string;
  noRules: string;
  noFindings: string;
  rule: string;
  severity: string;
  path: string;
  detail: string;
  evidence: string;
  recommendation: string;
  footer: string;
}

type RiskLensId = "evidence" | "supply-chain" | "workflow" | "secrets" | "review-surface";

interface RiskLens {
  id: RiskLensId;
  label: string;
  hint: string;
  count: number;
  highest: FindingSeverity;
  score: number;
}

export function renderMarkdownReport(result: ScanResult, locale: ReportLocale = "en"): string {
  if (locale === "zh-CN") {
    return renderChineseMarkdownReport(result);
  }

  return renderEnglishMarkdownReport(result);
}

export function renderHtmlReport(result: ScanResult, locale: ReportLocale = "en"): string {
  const labels = htmlLabels(locale);
  const risk = locale === "zh-CN" ? translateRisk(result.risk) : result.risk;
  const decision = formatReviewDecision(result.reviewDecision, locale);
  const scoreGrade = formatEvidenceGrade(result.evidenceScore.grade, locale);
  const findingsBySeverity = countFindingsBySeverity(result.findings);
  const ruleCounts = countFindingsByRule(result.findings);
  const riskLenses = buildRiskLenses(result.findings, locale);
  const fixPrompt = renderContributorFixPrompt(result, locale);
  const evidenceSignals = [
    [labels.prDescription, locale === "zh-CN" ? translateDescriptionState(result.summary.pullRequestDescription) : result.summary.pullRequestDescription, result.summary.pullRequestDescription === "present"],
    [labels.verification, yesNo(result.summary.verificationEvidence, locale), result.summary.verificationEvidence],
    [labels.reproduction, yesNo(result.summary.reproductionEvidence, locale), result.summary.reproductionEvidence],
    [labels.screenshot, yesNo(result.summary.screenshotEvidence, locale), result.summary.screenshotEvidence],
    [labels.changelog, yesNo(result.summary.changelogEvidence, locale), result.summary.changelogEvidence],
    [labels.permissionRationale, yesNo(result.summary.permissionRationaleEvidence, locale), result.summary.permissionRationaleEvidence]
  ] as const;

  return `<!doctype html>
<html lang="${locale === "zh-CN" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ProofPR ${labels.report}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #667085;
      --line: #d9dee7;
      --green: #138a5e;
      --amber: #b7791f;
      --red: #c24135;
      --blue: #2563a9;
      --soft-green: #e8f6ef;
      --soft-amber: #fff3d6;
      --soft-red: #fdebea;
      --soft-blue: #eaf2fb;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
      line-height: 1.5;
    }

    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    h1, h2, h3, p { margin: 0; }

    h1 {
      font-size: 28px;
      line-height: 1.2;
    }

    h2 {
      font-size: 17px;
      margin-bottom: 14px;
    }

    h3 {
      font-size: 15px;
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--muted);
      margin-top: 8px;
      max-width: 760px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 10px;
      background: var(--panel);
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 14px;
    }

    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    .metric { grid-column: span 3; }
    .wide { grid-column: span 8; }
    .side { grid-column: span 4; }
    .full { grid-column: 1 / -1; }

    .metric-label {
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 27px;
      font-weight: 720;
      line-height: 1.1;
    }

    .tone-low { color: var(--green); background: var(--soft-green); border-color: #b8e5cf; }
    .tone-medium { color: var(--amber); background: var(--soft-amber); border-color: #f1d28a; }
    .tone-high { color: var(--red); background: var(--soft-red); border-color: #f3b6b1; }

    .scorebar {
      width: 100%;
      height: 16px;
      border: 1px solid var(--line);
      border-radius: 999px;
      overflow: hidden;
      margin: 14px 0 10px;
      background: #eef1f5;
    }

    .scorefill {
      height: 100%;
      width: ${result.evidenceScore.value}%;
      background: ${scoreColor(result.evidenceScore.value)};
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .summary-item {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fbfcfd;
    }

    .summary-item strong {
      display: block;
      font-size: 20px;
      margin-bottom: 2px;
    }

    .summary-item span {
      color: var(--muted);
      font-size: 12px;
    }

    .signal-list, .action-list, .finding-list, .focus-list, .deduction-list, .rule-list {
      display: grid;
      gap: 10px;
    }

    .fix-panel {
      display: grid;
      gap: 12px;
    }

    .fix-text {
      margin: 0;
      white-space: pre-wrap;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfd;
      padding: 12px;
      color: var(--ink);
      overflow-x: auto;
    }

    .copy-button, .filter-button {
      appearance: none;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      padding: 8px 11px;
      cursor: pointer;
    }

    .copy-button {
      justify-self: flex-start;
      border-color: #b8d5f4;
      background: var(--soft-blue);
      color: var(--blue);
      font-weight: 680;
    }

    .filterbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }

    .filter-button.active {
      border-color: #b8d5f4;
      background: var(--soft-blue);
      color: var(--blue);
      font-weight: 680;
    }

    .finding-search {
      min-width: min(320px, 100%);
      flex: 1 1 240px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font: inherit;
      font-size: 13px;
      padding: 8px 11px;
    }

    .signal, .action, .focus, .deduction, .rule-row {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
      background: #fbfcfd;
    }

    .signal {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .signal-name, .action-title, .finding-title {
      font-weight: 680;
    }

    .signal-state {
      font-size: 12px;
      border-radius: 999px;
      padding: 3px 8px;
      border: 1px solid var(--line);
      white-space: nowrap;
    }

    .severity-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .severity {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fbfcfd;
    }

    .severity strong {
      display: block;
      font-size: 22px;
    }

    .radar-list {
      display: grid;
      gap: 10px;
    }

    .radar-row {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 11px 12px;
      background: #fbfcfd;
    }

    .radar-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      margin-bottom: 8px;
    }

    .radar-label {
      font-weight: 680;
    }

    .radar-count {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .radar-track {
      height: 10px;
      border-radius: 999px;
      background: #eef1f5;
      border: 1px solid var(--line);
      overflow: hidden;
      margin-bottom: 7px;
    }

    .radar-fill {
      height: 100%;
      border-radius: inherit;
      background: var(--blue);
    }

    .radar-fill.high { background: var(--red); }
    .radar-fill.medium { background: var(--amber); }
    .radar-fill.low { background: var(--green); }
    .radar-fill.info { background: var(--blue); }

    .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .action {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
    }

    .box {
      width: 18px;
      height: 18px;
      border: 2px solid var(--blue);
      border-radius: 4px;
      margin-top: 2px;
    }

    .priority {
      display: inline-flex;
      margin-left: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 560;
    }

    .finding {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      background: #fff;
    }

    .finding[hidden] { display: none; }

    .finding-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
      cursor: pointer;
      list-style: none;
    }

    .finding-head::-webkit-details-marker {
      display: none;
    }

    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      background: #f0f3f7;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 2px 5px;
      word-break: break-word;
    }

    .evidence-list {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--muted);
    }

    .footer {
      color: var(--muted);
      font-size: 12px;
      margin-top: 18px;
      text-align: center;
    }

    @media (max-width: 860px) {
      main { width: min(100vw - 20px, 1180px); padding-top: 20px; }
      .topbar { display: block; }
      .pill { margin-top: 12px; }
      .metric, .wide, .side { grid-column: 1 / -1; }
      .summary-grid, .severity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main>
    <section class="topbar">
      <div>
        <h1>ProofPR ${labels.report}</h1>
        <p class="subtitle">${labels.subtitle}</p>
      </div>
      <span class="pill">${labels.generated}</span>
    </section>

    <section class="grid">
      <article class="card metric">
        <div class="metric-label">${labels.risk}</div>
        <div class="metric-value">${escapeHtml(risk)}</div>
        <span class="pill tone-${result.risk}">${escapeHtml(result.risk)}</span>
      </article>
      <article class="card metric">
        <div class="metric-label">${labels.evidenceScore}</div>
        <div class="metric-value">${result.evidenceScore.value}/100</div>
        <div class="scorebar" aria-label="${labels.evidenceScore}">
          <div class="scorefill"></div>
        </div>
        <div class="muted">${escapeHtml(scoreGrade)}</div>
      </article>
      <article class="card metric">
        <div class="metric-label">${labels.reviewGate}</div>
        <div class="metric-value" style="font-size: 20px;">${escapeHtml(decision)}</div>
      </article>
      <article class="card metric">
        <div class="metric-label">${labels.findings}</div>
        <div class="metric-value">${result.findings.length}</div>
        <div class="muted">${labels.findingsHint}</div>
      </article>

      <article class="card wide">
        <h2>${labels.changeSummary}</h2>
        <div class="summary-grid">
          ${summaryItem(labels.filesChanged, result.summary.filesChanged)}
          ${summaryItem(labels.additions, result.summary.additions)}
          ${summaryItem(labels.deletions, result.summary.deletions)}
          ${summaryItem(labels.sensitiveFiles, result.summary.sensitiveFilesChanged)}
          ${summaryItem(labels.testFiles, result.summary.testFilesChanged)}
          ${summaryItem(labels.highFindings, findingsBySeverity.high)}
          ${summaryItem(labels.mediumFindings, findingsBySeverity.medium)}
          ${summaryItem(labels.lowFindings, findingsBySeverity.low)}
        </div>
      </article>

      <article class="card side">
        <h2>${labels.evidenceSignals}</h2>
        <div class="signal-list">
          ${evidenceSignals.map(([name, state, ok]) => signalItem(name, state, ok)).join("\n")}
        </div>
      </article>

      <article class="card full">
        <h2>${labels.riskRadar}</h2>
        <p class="muted" style="margin-bottom: 12px;">${labels.riskRadarHint}</p>
        <div class="radar-list">
          ${riskLenses.map((lens) => htmlRiskLens(lens, locale)).join("\n          ")}
        </div>
      </article>

      <article class="card full">
        <h2>${labels.quickFix}</h2>
        <div class="fix-panel">
          <p class="muted">${labels.quickFixHint}</p>
          <pre class="fix-text" id="proofpr-fix-prompt">${escapeHtml(fixPrompt)}</pre>
          <button class="copy-button" type="button" data-copy-target="proofpr-fix-prompt" data-label="${escapeHtml(labels.copyFix)}" data-copied="${escapeHtml(labels.copiedFix)}">${labels.copyFix}</button>
        </div>
      </article>

      <article class="card wide">
        <h2>${labels.reviewPlan}</h2>
        <div class="action-list">
          ${result.reviewPlan.actionItems.length > 0
            ? result.reviewPlan.actionItems.map((action) => `<div class="action">
            <span class="box"></span>
            <div>
              <div class="action-title">${escapeHtml(localizeActionTitle(action.actionId, action.title, locale))}<span class="priority">${escapeHtml(formatPriority(action.priority, locale))}</span></div>
              <div class="muted">${escapeHtml(localizeActionDetail(action.actionId, action.detail, locale))}</div>
            </div>
          </div>`).join("\n          ")
            : `<div class="muted">${labels.noActions}</div>`}
        </div>
      </article>

      <article class="card side">
        <h2>${labels.findingDistribution}</h2>
        <div class="severity-grid">
          ${severityItem("high", findingsBySeverity.high, labels.high)}
          ${severityItem("medium", findingsBySeverity.medium, labels.medium)}
          ${severityItem("low", findingsBySeverity.low, labels.low)}
          ${severityItem("info", findingsBySeverity.info, labels.info)}
        </div>
      </article>

      <article class="card side">
        <h2>${labels.focusFiles}</h2>
        <div class="focus-list">
          ${result.reviewPlan.focusFiles.length > 0
            ? result.reviewPlan.focusFiles.map((file) => `<div class="focus">
            <div><code>${escapeHtml(file.path)}</code></div>
            <div class="muted">${escapeHtml(localizeFocusReason(file.reasonId, file.reason, locale))}</div>
          </div>`).join("\n          ")
            : `<div class="muted">${labels.noFocusFiles}</div>`}
        </div>
      </article>

      <article class="card side">
        <h2>${labels.scoreDetails}</h2>
        <div class="deduction-list">
          ${result.evidenceScore.deductions.length > 0
            ? result.evidenceScore.deductions.map((deduction) => `<div class="deduction">
            <strong>-${deduction.points}</strong>
            <div class="muted">${escapeHtml(localizeDeduction(deduction.reasonId, deduction.message, locale))}</div>
          </div>`).join("\n          ")
            : `<div class="muted">${labels.noDeductions}</div>`}
        </div>
      </article>

      <article class="card full">
        <h2>${labels.rulesCovered}</h2>
        <div class="rule-list">
          ${ruleCounts.length > 0
            ? ruleCounts.map((item) => `<div class="rule-row"><code>${escapeHtml(item.ruleId)}</code> <span class="muted">${item.count}</span></div>`).join("\n")
            : `<div class="muted">${labels.noRules}</div>`}
        </div>
      </article>

      <article class="card full">
        <h2>${labels.findings}</h2>
        <div class="filterbar" aria-label="${labels.findingFilters}">
          ${findingFilterButton(labels.allFindings, "all", result.findings.length, true)}
          ${findingFilterButton(labels.high, "high", findingsBySeverity.high)}
          ${findingFilterButton(labels.medium, "medium", findingsBySeverity.medium)}
          ${findingFilterButton(labels.low, "low", findingsBySeverity.low)}
          ${findingFilterButton(labels.info, "info", findingsBySeverity.info)}
          <input class="finding-search" id="proofpr-finding-search" type="search" placeholder="${escapeHtml(labels.searchFindings)}">
        </div>
        <div class="finding-list">
          ${result.findings.length > 0
            ? result.findings.map((finding) => htmlFinding(finding, locale)).join("\n")
            : `<div class="muted">${labels.noFindings}</div>`}
          <div class="muted" id="proofpr-empty-filter" hidden>${labels.noFilteredFindings}</div>
        </div>
      </article>
    </section>

    <p class="footer">${labels.footer}</p>
  </main>
  <script>
    (() => {
      const buttons = Array.from(document.querySelectorAll("[data-filter-severity]"));
      const search = document.getElementById("proofpr-finding-search");
      const findings = Array.from(document.querySelectorAll("[data-finding]"));
      const empty = document.getElementById("proofpr-empty-filter");
      let activeSeverity = "all";

      const applyFilters = () => {
        const query = (search?.value || "").trim().toLowerCase();
        let visible = 0;

        for (const finding of findings) {
          const severity = finding.getAttribute("data-severity") || "";
          const haystack = finding.getAttribute("data-search") || "";
          const severityMatches = activeSeverity === "all" || severity === activeSeverity;
          const queryMatches = query === "" || haystack.includes(query);
          const show = severityMatches && queryMatches;
          finding.hidden = !show;
          if (show) visible += 1;
        }

        if (empty) empty.hidden = visible !== 0 || findings.length === 0;
      };

      for (const button of buttons) {
        button.addEventListener("click", () => {
          activeSeverity = button.getAttribute("data-filter-severity") || "all";
          for (const item of buttons) item.classList.toggle("active", item === button);
          applyFilters();
        });
      }

      search?.addEventListener("input", applyFilters);

      for (const button of Array.from(document.querySelectorAll("[data-copy-target]"))) {
        button.addEventListener("click", async () => {
          const target = document.getElementById(button.getAttribute("data-copy-target") || "");
          const text = target?.textContent || "";
          try {
            await navigator.clipboard.writeText(text);
            button.textContent = button.getAttribute("data-copied") || button.textContent;
            setTimeout(() => {
              button.textContent = button.getAttribute("data-label") || button.textContent;
            }, 1200);
          } catch {
            button.textContent = text;
          }
        });
      }
    })();
  </script>
</body>
</html>
`;
}

export function renderContributorRequest(result: ScanResult, locale: ReportLocale = "en"): string {
  return renderContributorFixPrompt(result, locale);
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
              informationUri: "https://github.com/linsk27/proof-pr",
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

function renderEnglishMarkdownReport(result: ScanResult): string {
  const lines: string[] = [
    REPORT_MARKER,
    "# ProofPR Review",
    "",
    "## Summary",
    "",
    "| Item | Result |",
    "| --- | --- |",
    `| Risk | **${result.risk}** |`,
    `| Evidence score | **${result.evidenceScore.value}/100 (${formatEvidenceGrade(result.evidenceScore.grade, "en")})** |`,
    `| Review gate | **${formatReviewDecision(result.reviewDecision, "en")}** |`,
    `| Findings | ${result.findings.length} |`,
    "",
    "## Evidence",
    "",
    `- Files changed: ${result.summary.filesChanged}`,
    `- Additions: ${result.summary.additions}`,
    `- Deletions: ${result.summary.deletions}`,
    `- Test files changed: ${result.summary.testFilesChanged}`,
    `- Sensitive files changed: ${result.summary.sensitiveFilesChanged}`,
    `- PR description: ${result.summary.pullRequestDescription}`,
    `- Verification evidence: ${formatBoolean(result.summary.verificationEvidence)}`,
    `- Reproduction context: ${formatBoolean(result.summary.reproductionEvidence)}`,
    `- Screenshot evidence: ${formatBoolean(result.summary.screenshotEvidence)}`,
    `- Changelog evidence: ${formatBoolean(result.summary.changelogEvidence)}`,
    `- Permission rationale: ${formatBoolean(result.summary.permissionRationaleEvidence)}`,
    ""
  ];

  appendEvidenceScoreSection(lines, result, "en");
  appendRiskRadarSection(lines, result, "en");
  appendQuickFixSection(lines, result, "en");
  appendReviewPlanSection(lines, result, "en");

  if (result.findings.length === 0) {
    lines.push("## Findings", "", "No review-risk findings detected by the enabled rules.", "");
    return lines.join("\n");
  }

  lines.push("## Findings", "");

  for (const finding of result.findings) {
    lines.push(formatEnglishFinding(finding), "");
  }

  lines.push(
    "## Maintainer Focus",
    "",
    ...maintainerFocus(result.findings, "en").map((item) => `- ${item}`),
    ""
  );

  return lines.join("\n");
}

function renderChineseMarkdownReport(result: ScanResult): string {
  const lines: string[] = [
    REPORT_MARKER,
    "# ProofPR 审查报告",
    "",
    "## 总览",
    "",
    "| 项目 | 结果 |",
    "| --- | --- |",
    `| 风险等级 | **${translateRisk(result.risk)}** |`,
    `| 证据评分 | **${result.evidenceScore.value}/100（${formatEvidenceGrade(result.evidenceScore.grade, "zh-CN")}）** |`,
    `| Review 门禁 | **${formatReviewDecision(result.reviewDecision, "zh-CN")}** |`,
    `| 风险发现 | ${result.findings.length} |`,
    "",
    "## 证据概览",
    "",
    `- 改动文件数：${result.summary.filesChanged}`,
    `- 新增行数：${result.summary.additions}`,
    `- 删除行数：${result.summary.deletions}`,
    `- 测试文件改动数：${result.summary.testFilesChanged}`,
    `- 敏感文件改动数：${result.summary.sensitiveFilesChanged}`,
    `- PR 描述质量：${translateDescriptionState(result.summary.pullRequestDescription)}`,
    `- 验证证据：${formatChineseBoolean(result.summary.verificationEvidence)}`,
    `- 复现上下文：${formatChineseBoolean(result.summary.reproductionEvidence)}`,
    `- 截图或视觉证据：${formatChineseBoolean(result.summary.screenshotEvidence)}`,
    `- Changelog 或迁移证据：${formatChineseBoolean(result.summary.changelogEvidence)}`,
    `- 权限理由证据：${formatChineseBoolean(result.summary.permissionRationaleEvidence)}`,
    ""
  ];

  appendEvidenceScoreSection(lines, result, "zh-CN");
  appendRiskRadarSection(lines, result, "zh-CN");
  appendQuickFixSection(lines, result, "zh-CN");
  appendReviewPlanSection(lines, result, "zh-CN");

  if (result.findings.length === 0) {
    lines.push("## 风险发现", "", "启用的规则没有发现需要优先关注的 review 风险。", "");
    return lines.join("\n");
  }

  lines.push("## 风险发现", "");

  for (const finding of result.findings) {
    lines.push(formatChineseFinding(finding), "");
  }

  lines.push(
    "## 维护者关注点",
    "",
    ...maintainerFocus(result.findings, "zh-CN").map((item) => `- ${item}`),
    ""
  );

  return lines.join("\n");
}

function appendEvidenceScoreSection(lines: string[], result: ScanResult, locale: ReportLocale): void {
  lines.push(locale === "zh-CN" ? "## 证据评分细节" : "## Evidence Score", "");

  if (result.evidenceScore.strengths.length > 0) {
    for (const strength of result.evidenceScore.strengths) {
      lines.push(
        locale === "zh-CN"
          ? `- 证据优势：${translateScoreMessage(strength)}`
          : `- Strength: ${strength}`
      );
    }
  } else {
    lines.push(locale === "zh-CN" ? "- 证据优势：暂无明显优势信号。" : "- Strength: No strong evidence signals detected.");
  }

  if (result.evidenceScore.deductions.length > 0) {
    for (const deduction of result.evidenceScore.deductions) {
      lines.push(
        locale === "zh-CN"
          ? `- 扣分项：-${deduction.points}，${translateDeduction(deduction.reasonId, deduction.message)}`
          : `- Deduction: -${deduction.points}, ${deduction.message}`
      );
    }
  } else {
    lines.push(locale === "zh-CN" ? "- 扣分项：无。" : "- Deduction: none.");
  }

  lines.push("");
}

function appendRiskRadarSection(lines: string[], result: ScanResult, locale: ReportLocale): void {
  const lenses = buildRiskLenses(result.findings, locale);

  lines.push(locale === "zh-CN" ? "## 风险雷达" : "## Risk Radar", "");
  lines.push(
    locale === "zh-CN"
      ? "这部分把 rule id 归并成维护者更容易理解的风险来源。"
      : "This groups rule ids into maintainer-facing risk sources."
  );
  lines.push("", locale === "zh-CN" ? "| 风险来源 | Findings | 最高级别 | 说明 |" : "| Source | Findings | Highest | Why it matters |");
  lines.push("| --- | ---: | --- | --- |");

  for (const lens of lenses) {
    lines.push(
      `| ${lens.label} | ${lens.count} | ${formatSeverity(lens.highest, locale)} | ${lens.hint} |`
    );
  }

  lines.push("");
}

function appendQuickFixSection(lines: string[], result: ScanResult, locale: ReportLocale): void {
  lines.push(locale === "zh-CN" ? "## 可复制补证清单" : "## Copyable Fix Checklist", "");
  lines.push(
    locale === "zh-CN"
      ? "贡献者可以直接复制下面内容补到 PR 描述里，维护者也可以把它作为 review 回复。"
      : "Contributors can paste this into the PR description; maintainers can also use it as a review reply."
  );
  lines.push("", "```md", renderContributorFixPrompt(result, locale), "```", "");
}

function appendReviewPlanSection(lines: string[], result: ScanResult, locale: ReportLocale): void {
  lines.push(locale === "zh-CN" ? "## Review 行动清单" : "## Review Plan", "");

  if (result.reviewPlan.actionItems.length > 0) {
    for (const action of result.reviewPlan.actionItems) {
      lines.push(
        locale === "zh-CN"
          ? `- [ ] ${translateReviewActionTitle(action.actionId, action.title)}（${formatPriority(action.priority, locale)}）：${translateReviewActionDetail(action.actionId, action.detail)}`
          : `- [ ] ${action.title} (${formatPriority(action.priority, locale)}): ${action.detail}`
      );
    }
  } else {
    lines.push(locale === "zh-CN" ? "- [ ] 没有额外行动项。" : "- [ ] No additional action items.");
  }

  if (result.reviewPlan.focusFiles.length > 0) {
    lines.push("", locale === "zh-CN" ? "重点文件：" : "Focus files:");
    for (const file of result.reviewPlan.focusFiles) {
      lines.push(
        locale === "zh-CN"
          ? `- \`${file.path}\`（${formatPriority(file.priority, locale)}）：${translateFocusReason(file.reasonId, file.reason)}`
          : `- \`${file.path}\` (${formatPriority(file.priority, locale)}): ${file.reason}`
      );
    }
  }

  lines.push("");
}

function renderContributorFixPrompt(result: ScanResult, locale: ReportLocale): string {
  const missingEvidence = missingEvidenceLabels(result, locale);
  const actions = result.reviewPlan.actionItems.slice(0, 6);
  const focusFiles = result.reviewPlan.focusFiles.slice(0, 5);

  if (locale === "zh-CN") {
    const lines = [
      "请在这个 PR 描述中补充以下内容，方便维护者继续 review：",
      missingEvidence.length > 0 ? `ProofPR 当前最缺：${missingEvidence.join("、")}。` : "ProofPR 当前没有发现必须补充的证据项，可以保留关键验证记录。",
      "",
      "## 验证方式",
      "- 自动化测试：",
      "- 手动验证：",
      "- 未覆盖或不适用的部分：",
      "",
      "## 复现 / Before & After",
      "- 复现步骤或改动前状态：",
      "- 改动后结果：",
      "- 截图 / 录屏 / 日志链接：",
      "",
      "## 风险说明",
      "- 依赖 / CI / 权限 / MCP 变更原因：",
      "- 发布影响、迁移说明或回滚方案："
    ];

    if (actions.length > 0) {
      lines.push("", "## ProofPR 需要处理的点");
      for (const action of actions) {
        lines.push(`- ${translateReviewActionTitle(action.actionId, action.title)}：${translateReviewActionDetail(action.actionId, action.detail)}`);
      }
    }

    if (focusFiles.length > 0) {
      lines.push("", "## 重点文件");
      for (const file of focusFiles) {
        lines.push(`- ${file.path}：${translateFocusReason(file.reasonId, file.reason)}`);
      }
    }

    return lines.join("\n");
  }

  const lines = [
    "Please add the following context to this PR so maintainers can continue review:",
    missingEvidence.length > 0 ? `ProofPR is currently missing: ${missingEvidence.join(", ")}.` : "ProofPR did not find required missing evidence; keep the key verification notes visible.",
    "",
    "## Verification",
    "- Automated tests:",
    "- Manual verification:",
    "- Not covered or not applicable:",
    "",
    "## Reproduction / Before & After",
    "- Reproduction steps or previous state:",
    "- Result after this change:",
    "- Screenshot / recording / log link:",
    "",
    "## Risk Notes",
    "- Dependency / CI / permission / MCP rationale:",
    "- Release impact, migration notes, or rollback plan:"
  ];

  if (actions.length > 0) {
    lines.push("", "## ProofPR Items To Resolve");
    for (const action of actions) {
      lines.push(`- ${action.title}: ${action.detail}`);
    }
  }

  if (focusFiles.length > 0) {
    lines.push("", "## Focus Files");
    for (const file of focusFiles) {
      lines.push(`- ${file.path}: ${file.reason}`);
    }
  }

  return lines.join("\n");
}

function missingEvidenceLabels(result: ScanResult, locale: ReportLocale): string[] {
  const labels: string[] = [];

  if (result.summary.pullRequestDescription !== "present") {
    labels.push(locale === "zh-CN" ? "清楚的 PR 描述" : "clear PR description");
  }

  if (!result.summary.verificationEvidence) {
    labels.push(locale === "zh-CN" ? "测试或手动验证" : "test or manual verification");
  }

  if (!result.summary.reproductionEvidence) {
    labels.push(locale === "zh-CN" ? "复现步骤或 before/after" : "reproduction steps or before/after context");
  }

  if (!result.summary.screenshotEvidence && result.findings.some((finding) => finding.ruleId.includes("screenshot"))) {
    labels.push(locale === "zh-CN" ? "截图或录屏" : "screenshot or recording");
  }

  if (!result.summary.changelogEvidence && result.findings.some((finding) => finding.ruleId.includes("dependency-major-upgrade"))) {
    labels.push(locale === "zh-CN" ? "changelog 或迁移说明" : "changelog or migration notes");
  }

  if (!result.summary.permissionRationaleEvidence && result.findings.some((finding) => finding.ruleId.includes("workflow"))) {
    labels.push(locale === "zh-CN" ? "权限变更理由" : "permission rationale");
  }

  return labels;
}

function formatEnglishFinding(finding: Finding): string {
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

function formatChineseFinding(finding: Finding): string {
  const translated = translateFinding(finding);
  const lines = [
    `### ${translated.title}`,
    "",
    `- 规则：\`${finding.ruleId}\``,
    `- 严重程度：\`${translateSeverity(finding.severity)}\``,
    finding.path ? `- 路径：\`${finding.path}\`` : undefined,
    `- 详情：${translated.message}`
  ].filter((line): line is string => Boolean(line));

  if (finding.evidence && finding.evidence.length > 0) {
    lines.push("- 证据：");
    for (const item of finding.evidence) {
      lines.push(`  - \`${translateEvidence(item)}\``);
    }
  }

  if (translated.recommendation) {
    lines.push(`- 建议：${translated.recommendation}`);
  }

  return lines.join("\n");
}

function maintainerFocus(findings: Finding[], locale: ReportLocale): string[] {
  const focus = new Set<string>();

  for (const finding of findings) {
    if (finding.ruleId.startsWith("secret-detected")) {
      focus.add(
        locale === "zh-CN"
          ? "轮换任何可能暴露的凭证，并在移除 secret 前阻止合并。"
          : "Rotate any exposed credential and block the PR until secrets are removed."
      );
    } else if (finding.ruleId.startsWith("evidence-contract:")) {
      focus.add(
        locale === "zh-CN"
          ? "先要求贡献者补齐仓库定义的证据契约，再投入深度 review。"
          : "Ask the contributor to satisfy the repository-defined evidence contract before deep review."
      );
    } else if (finding.ruleId === "workflow-permission-change") {
      focus.add(
        locale === "zh-CN"
          ? "合并前重点审查 GitHub Actions 权限。"
          : "Review GitHub Actions permissions before merging."
      );
    } else if (finding.ruleId === "missing-tests") {
      focus.add(
        locale === "zh-CN"
          ? "要求补充测试或清晰的手动验证说明。"
          : "Ask for tests or a manual verification note."
      );
    } else if (finding.ruleId === "thin-pr-description") {
      focus.add(
        locale === "zh-CN"
          ? "深入 review 前要求补充更清楚的 PR 描述。"
          : "Ask for a clearer PR description before deep review."
      );
    } else if (finding.ruleId === "missing-reproduction-context") {
      focus.add(
        locale === "zh-CN"
          ? "要求补充复现步骤或 before/after 上下文。"
          : "Ask for reproduction steps or before/after context."
      );
    } else if (finding.ruleId === "change-size") {
      focus.add(
        locale === "zh-CN"
          ? "要求拆分 PR，或提供逐文件 review 指南。"
          : "Request a smaller PR or a file-by-file review guide."
      );
    } else if (finding.ruleId === "dependency-major-upgrade") {
      focus.add(
        locale === "zh-CN"
          ? "重点核查依赖大版本升级的迁移说明、兼容性和测试覆盖。"
          : "Review dependency major upgrade migration notes, compatibility, and test coverage."
      );
    } else if (finding.ruleId === "dependency-lifecycle-script") {
      focus.add(
        locale === "zh-CN"
          ? "合并前审查包生命周期脚本是否会在安装或发布时执行非预期代码。"
          : "Review package lifecycle scripts for unexpected install or publish-time execution."
      );
    } else if (finding.ruleId === "dependency-non-registry-source") {
      focus.add(
        locale === "zh-CN"
          ? "确认非注册表依赖来源可信，并要求固定到不可变 commit、tag 或内部批准路径。"
          : "Verify non-registry dependency provenance and require an immutable commit, tag, or approved internal path."
      );
    } else if (finding.ruleId === "dependency-unpinned-version") {
      focus.add(
        locale === "zh-CN"
          ? "要求把 latest、通配符或空版本改成可复现的版本范围。"
          : "Ask for latest, wildcard, or empty dependency versions to be replaced with reproducible ranges."
      );
    } else if (finding.ruleId === "dependency-lockfile-missing") {
      focus.add(
        locale === "zh-CN"
          ? "要求补充匹配的 lockfile，或说明该生态为什么不提交 lockfile。"
          : "Ask for the matching lockfile update, or an explanation for why no lockfile is expected."
      );
    } else if (finding.ruleId === "dependency-lockfile-only-change") {
      focus.add(
        locale === "zh-CN"
          ? "核查 lockfile-only 变化是否引入了非预期依赖图变更。"
          : "Review lockfile-only changes for unintended package graph changes."
      );
    } else if (finding.ruleId === "dependency-resolution-override") {
      focus.add(
        locale === "zh-CN"
          ? "重点审查 overrides / resolutions 是否改变了传递依赖解析。"
          : "Review whether overrides or resolutions change transitive dependency resolution."
      );
    } else if (finding.ruleId === "workflow-dangerous-trigger") {
      focus.add(
        locale === "zh-CN"
          ? "重点审查 pull_request_target 是否会用高权限 token 执行不可信 PR 代码。"
          : "Review whether pull_request_target can execute untrusted PR code with privileged tokens."
      );
    } else if (finding.ruleId === "workflow-untrusted-checkout") {
      focus.add(
        locale === "zh-CN"
          ? "重点审查 workflow 是否 checkout 并执行了不可信 PR head 代码。"
          : "Review whether the workflow checks out and executes untrusted PR head code."
      );
    } else if (finding.ruleId === "mcp-credential-risk") {
      focus.add(
        locale === "zh-CN"
          ? "重点审查 MCP command、args 和凭证处理方式。"
          : "Review MCP commands, args, and credential handling."
      );
    }
  }

  if (focus.size === 0) {
    focus.add(
      locale === "zh-CN"
        ? "审查列出的敏感文件；如果上下文不足，要求贡献者补充证据。"
        : "Review the listed sensitive files and ask for evidence where context is thin."
    );
  }

  return [...focus];
}

function translateFinding(finding: Finding): Pick<Finding, "title" | "message" | "recommendation"> {
  if (finding.ruleId.startsWith("evidence-contract:")) {
    return {
      title: "证据契约未满足",
      message: "该 PR 命中了仓库自定义证据契约，但 PR 描述中缺少必需证据。",
      recommendation: "建议要求贡献者补齐缺失证据后再深入 review。"
    };
  }

  if (finding.ruleId === "change-size") {
    const files = finding.evidence?.find((item) => item.startsWith("files: "))?.replace("files: ", "");
    const lines = finding.evidence?.find((item) => item.startsWith("changed lines: "))?.replace("changed lines: ", "");
    return {
      title: finding.severity === "high" ? "review 面积过大" : "review 面积偏大",
      message: files && lines ? `该改动涉及 ${files} 个文件、${lines} 行变更。` : finding.message,
      recommendation:
        finding.severity === "high"
          ? "建议要求拆分 PR，或提供清晰的 review map 后再投入深度 review。"
          : "建议要求贡献者解释改动边界，并标出最需要重点 review 的文件。"
    };
  }

  if (finding.ruleId === "sensitive-path") {
    return {
      title: "敏感文件发生变更",
      message: finding.path ? `${finding.path} 命中了敏感路径配置。` : finding.message,
      recommendation: "请重点审查权限、凭证、发布、依赖和 CI 相关变更。"
    };
  }

  if (finding.ruleId === "missing-tests") {
    return {
      title: "缺少验证证据",
      message: "代码发生变更，但没有检测到测试文件改动或 PR 验证说明。",
      recommendation: "建议要求补充测试，或提供清晰的手动验证说明后再深入 review。"
    };
  }

  if (finding.ruleId === "thin-pr-description") {
    const missing = finding.title.toLowerCase().includes("missing");
    return {
      title: missing ? "PR 描述为空" : "PR 描述过薄",
      message: missing ? "PR 正文为空，维护者缺少 review 前的上下文。" : "PR 正文较短，可能不足以支撑有效 review。",
      recommendation: "建议要求补充改动动机、验证证据、兼容性和发布影响说明。"
    };
  }

  if (finding.ruleId === "missing-reproduction-context") {
    return {
      title: "缺少复现或 before/after 上下文",
      message: "PR 未提到复现步骤、预期行为、实际行为或 before/after 说明。",
      recommendation: "建议要求补充复现步骤或 before/after 说明，方便 reviewer 验证改动路径。"
    };
  }

  if (finding.ruleId === "dependency-added") {
    return {
      title: "依赖清单发生变更",
      message: finding.path ? `${finding.path} 中新增或修改了类似依赖的条目。` : finding.message,
      recommendation: "请确认包名、许可证、来源可信度，以及 lockfile 是否匹配预期依赖变化。"
    };
  }

  if (finding.ruleId === "dependency-major-upgrade") {
    return {
      title: "依赖发生大版本升级",
      message: finding.path ? `${finding.path} 中有依赖跨越了大版本边界。` : finding.message,
      recommendation: "请核查 changelog、迁移说明、peer dependencies 影响，以及测试是否覆盖升级后的关键路径。"
    };
  }

  if (finding.ruleId === "dependency-lifecycle-script") {
    return {
      title: "包生命周期脚本发生变更",
      message: finding.path ? `${finding.path} 新增或修改了安装/发布阶段可能自动执行的脚本。` : finding.message,
      recommendation: "请确认该脚本是否必要，是否下载或执行远程代码，以及是否会影响安装该包的用户。"
    };
  }

  if (finding.ruleId === "dependency-non-registry-source") {
    return {
      title: "依赖使用非注册表来源",
      message: finding.path ? `${finding.path} 新增了不通过普通包注册表解析的依赖。` : finding.message,
      recommendation: "请要求说明依赖来源，并确认它固定到不可变 commit、tag 或内部策略允许的路径。"
    };
  }

  if (finding.ruleId === "dependency-unpinned-version") {
    return {
      title: "依赖版本不可复现",
      message: finding.path ? `${finding.path} 新增了 latest、通配符、空版本或过宽版本范围。` : finding.message,
      recommendation: "请把依赖改成明确版本范围并同步 lockfile；如果必须使用宽范围，需要在 PR 中说明原因。"
    };
  }

  if (finding.ruleId === "dependency-lockfile-missing") {
    return {
      title: "依赖清单变更但缺少 lockfile",
      message: finding.path ? `${finding.path} 修改了依赖声明，但 diff 中没有对应生态的 lockfile 变化。` : finding.message,
      recommendation: "请提交匹配的 lockfile 更新；如果该生态故意不提交 lockfile，需要在 PR 中说明原因。"
    };
  }

  if (finding.ruleId === "dependency-lockfile-only-change") {
    return {
      title: "只有 lockfile 发生变化",
      message: finding.path ? `${finding.path} 发生变化，但 diff 中没有对应的依赖清单变化。` : finding.message,
      recommendation: "请确认 lockfile 是否只是重新生成，并检查解析出的依赖图是否出现非预期新增、降级或替换。"
    };
  }

  if (finding.ruleId === "dependency-resolution-override") {
    return {
      title: "依赖解析覆盖发生变化",
      message: finding.path ? `${finding.path} 新增了 overrides、resolutions 或 pnpm overrides。` : finding.message,
      recommendation: "请确认为什么要覆盖传递依赖解析，并检查 lockfile 是否反映了预期的依赖图。"
    };
  }

  if (finding.ruleId === "workflow-permission-change") {
    return {
      title: "Workflow 权限发生变更",
      message: finding.path ? `${finding.path} 新增或修改了 GitHub Actions 权限。` : finding.message,
      recommendation: "请确认 workflow 是否真的需要写权限或 token 权限，并检查不可信 PR 是否能触达该 workflow。"
    };
  }

  if (finding.ruleId === "workflow-dangerous-trigger") {
    return {
      title: "Workflow 使用了 pull_request_target",
      message: finding.path ? `${finding.path} 新增了 pull_request_target 触发器。` : finding.message,
      recommendation: "请确认该 workflow 不会用高权限 token、secret 或写权限执行不可信 PR 代码。"
    };
  }

  if (finding.ruleId === "workflow-untrusted-checkout") {
    return {
      title: "Workflow checkout 了 PR head",
      message: finding.path
        ? `${finding.path} 引用了 PR head 代码来源，需要审查它是否会在高权限上下文中执行。`
        : finding.message,
      recommendation: "避免在 pull_request_target、写权限 token 或可读取 secret 的上下文中运行不可信 PR 代码。"
    };
  }

  if (finding.ruleId === "mcp-credential-risk") {
    return {
      title: "MCP 配置需要重点审查",
      message: finding.path ? `${finding.path} 新增了与命令或凭证相关的 MCP 配置。` : finding.message,
      recommendation: "避免在 MCP 配置中提交凭证，并审查 command 与 args 是否会扩大本地执行面。"
    };
  }

  if (finding.ruleId.startsWith("secret-detected")) {
    return {
      title: "可能提交了 secret",
      message: finding.message.replace("Added line looks like it contains", "新增行疑似包含"),
      recommendation: "请将凭证移到 secret manager 或 CI secret store，轮换任何已暴露的值，并只提交占位符。"
    };
  }

  return finding;
}

function translateEvidence(item: string): string {
  return item
    .replace("matched files: ", "命中文件：")
    .replace("missing evidence: ", "缺失证据：")
    .replace("files: ", "文件数：")
    .replace("changed lines: ", "变更行数：")
    .replace(/\bverification\b/g, "验证")
    .replace(/\breproduction\b/g, "复现")
    .replace(/\bscreenshot\b/g, "截图")
    .replace(/\bchangelog\b/g, "变更日志")
    .replace(/\bpermission-rationale\b/g, "权限理由")
    .replace("line ", "第 ")
    .replace(": ", " 行：");
}

function translateRisk(risk: string): string {
  return { low: "低", medium: "中", high: "高" }[risk] ?? risk;
}

function translateSeverity(severity: string): string {
  return { info: "信息", low: "低", medium: "中", high: "高" }[severity] ?? severity;
}

function translateDescriptionState(state: string): string {
  return { unavailable: "不可用", missing: "缺失", thin: "过薄", present: "充足" }[state] ?? state;
}

function formatEvidenceGrade(grade: string, locale: ReportLocale): string {
  if (locale === "zh-CN") {
    return {
      strong: "证据充分",
      adequate: "基本充分",
      thin: "证据偏薄",
      risky: "证据不足"
    }[grade] ?? grade;
  }

  return grade;
}

function formatReviewDecision(decision: string, locale: ReportLocale): string {
  if (locale === "zh-CN") {
    return {
      ready: "可以进入常规 review",
      "review-carefully": "带着重点进入 review",
      "needs-evidence": "先要求补充证据",
      "block-merge": "处理风险前不建议合并"
    }[decision] ?? decision;
  }

  return {
    ready: "Ready for normal review",
    "review-carefully": "Review with focused attention",
    "needs-evidence": "Ask for evidence before deep review",
    "block-merge": "Block merge until risks are handled"
  }[decision] ?? decision;
}

function formatPriority(priority: string, locale: ReportLocale): string {
  if (locale === "zh-CN") {
    return { low: "低优先级", medium: "中优先级", high: "高优先级" }[priority] ?? priority;
  }

  return `${priority} priority`;
}

function translateReviewActionTitle(actionId: string, fallback: string): string {
  return {
    "block-merge-until-resolved": "风险处理前不要合并",
    "ask-for-evidence-before-review": "深入 review 前先要求补充证据",
    "review-with-focus": "带着重点清单进行 review",
    "normal-review": "进入常规 review",
    "satisfy-evidence-contract": "要求补齐证据契约",
    "improve-pr-description": "要求补充更清楚的 PR 描述",
    "add-verification-evidence": "要求补充测试或手动验证证据",
    "add-reproduction-context": "要求补充复现或 before/after 上下文",
    "rotate-secret": "轮换并移除暴露的凭证",
    "justify-workflow-permissions": "要求说明 workflow 权限最小化理由",
    "review-privileged-pr-trigger": "审查 pull_request_target 高权限触发器",
    "review-untrusted-checkout": "审查 PR head checkout 的权限边界",
    "review-package-lifecycle-script": "审查包生命周期脚本",
    "review-mcp-execution-surface": "审查 MCP 命令、参数和凭证处理",
    "request-review-map-or-split": "要求拆分 PR 或提供逐文件 review map",
    "verify-dependency-change": "核查依赖来源和 lockfile 影响",
    "review-major-dependency-upgrade": "核查依赖大版本升级影响",
    "verify-non-registry-dependency-source": "核查非注册表依赖来源",
    "pin-dependency-version": "要求使用可复现依赖版本",
    "add-matching-lockfile-update": "要求补充匹配的 lockfile",
    "explain-lockfile-only-change": "要求说明 lockfile-only 变化",
    "review-dependency-resolution-override": "审查依赖解析覆盖",
    "assign-sensitive-file-review": "安排敏感文件重点 review"
  }[actionId] ?? fallback;
}

function translateReviewActionDetail(actionId: string, fallback: string): string {
  return {
    "block-merge-until-resolved": "在高风险 finding 被解释、降低或移除前，把这个 PR 视为不可合并。",
    "ask-for-evidence-before-review": "要求测试、截图、复现步骤或更清楚的 PR 描述，再投入详细 review。",
    "review-with-focus": "优先使用下面的风险发现和重点文件作为第一轮 review map。",
    "normal-review": "当前证据足够支撑维护者进行常规 review。",
    "satisfy-evidence-contract": "该 PR 命中了仓库自定义证据契约，但 PR 描述里缺少必需证据。",
    "improve-pr-description": "贡献者应说明为什么改、改了什么、如何验证，以及是否有发布或兼容性风险。",
    "add-verification-evidence": "要求测试输出、CI 链接、截图，或简短的手动验证说明。",
    "add-reproduction-context": "PR 应包含复现步骤、预期/实际行为，或相关 before/after 截图。",
    "rotate-secret": "在 secret 从 PR 中移除并完成轮换前，不要合并。",
    "justify-workflow-permissions": "确认写权限或 OIDC 是否必要，并检查不可信 PR 是否能触发该 workflow。",
    "review-privileged-pr-trigger": "确认 workflow 不会用写权限 token、secret 或仓库权限执行不可信 PR 代码。",
    "review-untrusted-checkout": "确认 job 不会在写权限 token、仓库 secret 或 pull_request_target 高权限上下文中运行不可信 PR 代码。",
    "review-package-lifecycle-script": "检查 install、postinstall、prepare 或 publish 脚本是否会执行非预期代码。",
    "review-mcp-execution-surface": "检查 MCP 配置是否提交凭证，或意外扩大本地执行面。",
    "request-review-map-or-split": "要求贡献者拆分无关改动，或标出最需要重点 review 的文件。",
    "verify-dependency-change": "检查包名、维护者、许可证、安装脚本，以及 lockfile 是否符合预期依赖变化。",
    "review-major-dependency-upgrade": "检查 changelog、迁移说明、peer dependencies，以及测试是否覆盖升级后的关键路径。",
    "verify-non-registry-dependency-source": "要求说明 git、URL、file、link 或 portal 依赖的必要性，并确认来源固定且符合项目策略。",
    "pin-dependency-version": "把 latest、通配符、空版本或过宽版本范围替换为明确版本范围，并同步 lockfile。",
    "add-matching-lockfile-update": "依赖清单变更应包含包管理器 lockfile，或在 PR 中说明为什么没有 lockfile。",
    "explain-lockfile-only-change": "确认 lockfile 是否只是重新生成，并检查依赖图是否出现非预期新增、降级或替换。",
    "review-dependency-resolution-override": "确认为什么要覆盖传递依赖解析，以及消费者或 CI 是否会解析到不同依赖图。",
    "assign-sensitive-file-review": "合并前由维护者有意识地检查敏感文件改动。"
  }[actionId] ?? fallback;
}

function translateFocusReason(reasonId: string, fallback: string): string {
  if (reasonId.startsWith("evidence-contract:")) {
    return "仓库自定义证据契约未满足";
  }

  return {
    "change-size": "review 面积相关 finding",
    "sensitive-path": "敏感路径发生变更",
    "dependency-added": "依赖清单发生变更",
    "dependency-major-upgrade": "依赖发生大版本升级",
    "dependency-lifecycle-script": "包生命周期脚本发生变更",
    "dependency-non-registry-source": "依赖使用非注册表来源",
    "dependency-unpinned-version": "依赖版本不可复现",
    "dependency-lockfile-missing": "依赖清单变更但缺少 lockfile",
    "dependency-lockfile-only-change": "只有 lockfile 发生变化",
    "dependency-resolution-override": "依赖解析覆盖发生变化",
    "workflow-permission-change": "workflow 权限发生变更",
    "workflow-dangerous-trigger": "workflow 使用了高风险触发器",
    "workflow-untrusted-checkout": "workflow checkout 了不可信 PR head",
    "mcp-credential-risk": "MCP 配置存在执行面或凭证风险",
    "missing-tests": "代码改动缺少测试或验证证据"
  }[reasonId] ?? fallback;
}

function translateScoreMessage(message: string): string {
  return {
    "PR description provides review context.": "PR 描述提供了 review 上下文。",
    "Verification evidence was found.": "检测到测试或手动验证证据。",
    "Reproduction or before/after context was found.": "检测到复现步骤或 before/after 上下文。",
    "Screenshot or visual evidence was found.": "检测到截图或视觉证据。",
    "Changelog or migration evidence was found.": "检测到 changelog 或迁移证据。",
    "Permission rationale evidence was found.": "检测到权限理由证据。",
    "Test files changed with the PR.": "PR 同时修改了测试文件。",
    "No configured sensitive files changed.": "没有改动已配置的敏感文件。"
  }[message] ?? message;
}

function translateDeduction(reasonId: string, fallback: string): string {
  return {
    "missing-pr-description": "PR 描述缺失。",
    "thin-pr-description": "PR 描述过薄，不足以支撑可靠 review。",
    "no-pr-context": "扫描时没有可用的 PR 描述上下文。",
    "missing-verification": "没有检测到测试或手动验证证据。",
    "missing-reproduction-context": "没有检测到复现步骤、before/after 或预期/实际上下文。",
    "secret-detected": "检测到疑似已提交 secret。",
    "workflow-permission-change": "Workflow 权限变化需要重点审查。",
    "mcp-credential-risk": "MCP 配置扩大了本地执行面或凭证风险。",
    "large-review-surface": "PR 规模过大，常规 review 可靠性会下降。",
    "broad-review-surface": "PR review 面积偏大。",
    "sensitive-path-high": "高敏感文件发生变更，需要重点 review。",
    "sensitive-path-medium": "敏感文件发生变更，需要重点 review。",
    "dependency-change": "依赖清单发生变更。",
    "dependency-major-upgrade": "依赖发生大版本升级。",
    "dependency-lifecycle-script": "包生命周期脚本可能在安装或发布阶段执行代码。",
    "dependency-non-registry-source": "依赖通过非注册表来源解析，需要核查来源和固定方式。",
    "dependency-unpinned-version": "依赖版本不可复现，可能导致每次安装解析到不同内容。",
    "dependency-lockfile-missing": "依赖清单发生变化，但缺少匹配的 lockfile 证据。",
    "dependency-lockfile-only-change": "只有 lockfile 变化，需要核查依赖图是否符合预期。",
    "dependency-resolution-override": "依赖解析覆盖可能改变传递依赖选择。",
    "workflow-dangerous-trigger": "pull_request_target workflow 需要重点审查高权限触发路径。",
    "workflow-untrusted-checkout": "Workflow checkout PR head 代码，需要审查权限边界。",
    "evidence-contract-missing": "仓库自定义证据契约未满足。",
    "missing-tests": "代码发生变更，但缺少测试变更或验证说明。"
  }[reasonId] ?? fallback;
}

function htmlLabels(locale: ReportLocale): HtmlLabels {
  if (locale === "zh-CN") {
    return {
      report: "可视化报告",
      subtitle: "把 PR 风险、证据质量、Review 门禁和维护者行动清单整理成一个可分享的静态页面。",
      generated: "Generated by ProofPR",
      risk: "风险等级",
      evidenceScore: "证据评分",
      reviewGate: "Review 门禁",
      findings: "风险发现",
      findingsHint: "需要维护者优先关注的信号",
      changeSummary: "改动概览",
      filesChanged: "改动文件",
      additions: "新增行",
      deletions: "删除行",
      sensitiveFiles: "敏感文件",
      testFiles: "测试文件",
      highFindings: "高风险",
      mediumFindings: "中风险",
      lowFindings: "低风险",
      evidenceSignals: "证据信号",
      prDescription: "PR 描述",
      verification: "验证证据",
      reproduction: "复现上下文",
      screenshot: "截图证据",
      changelog: "Changelog",
      permissionRationale: "权限理由",
      reviewPlan: "Review 行动清单",
      noActions: "没有额外行动项。",
      quickFix: "一键补证建议",
      quickFixHint: "复制这段内容到 PR 描述或评论里，贡献者按空白项补齐即可。",
      copyFix: "复制补证清单",
      copiedFix: "已复制",
      riskRadar: "风险雷达",
      riskRadarHint: "按维护者视角归并风险来源，帮助先判断这轮 review 应该看哪里。",
      findingDistribution: "Finding 分布",
      findingFilters: "筛选风险发现",
      allFindings: "全部",
      searchFindings: "搜索规则、文件或详情",
      noFilteredFindings: "当前筛选条件下没有风险发现。",
      high: "高",
      medium: "中",
      low: "低",
      info: "信息",
      focusFiles: "重点文件",
      noFocusFiles: "没有重点文件。",
      scoreDetails: "证据扣分",
      noDeductions: "没有扣分项。",
      rulesCovered: "命中规则",
      noRules: "没有规则命中。",
      noFindings: "启用的规则没有发现需要优先关注的 review 风险。",
      rule: "规则",
      severity: "严重程度",
      path: "路径",
      detail: "详情",
      evidence: "证据",
      recommendation: "建议",
      footer: "ProofPR 不替代人工 review，它帮助维护者先判断证据是否足够、风险边界是否清楚。"
    };
  }

  return {
    report: "Visual Report",
    subtitle: "A shareable static view of PR risk, evidence quality, review gate, and maintainer actions.",
    generated: "Generated by ProofPR",
    risk: "Risk",
    evidenceScore: "Evidence score",
    reviewGate: "Review gate",
    findings: "Findings",
    findingsHint: "Signals that deserve maintainer attention",
    changeSummary: "Change summary",
    filesChanged: "Files changed",
    additions: "Additions",
    deletions: "Deletions",
    sensitiveFiles: "Sensitive files",
    testFiles: "Test files",
    highFindings: "High findings",
    mediumFindings: "Medium findings",
    lowFindings: "Low findings",
    evidenceSignals: "Evidence signals",
    prDescription: "PR description",
    verification: "Verification",
    reproduction: "Reproduction",
    screenshot: "Screenshot",
    changelog: "Changelog",
    permissionRationale: "Permission rationale",
    reviewPlan: "Review plan",
    noActions: "No additional action items.",
    quickFix: "One-click evidence fix",
    quickFixHint: "Copy this into the PR description or a review reply, then fill the blanks.",
    copyFix: "Copy checklist",
    copiedFix: "Copied",
    riskRadar: "Risk radar",
    riskRadarHint: "Groups rule hits by maintainer-facing risk source so the first review pass has a clear map.",
    findingDistribution: "Finding distribution",
    findingFilters: "Filter findings",
    allFindings: "All",
    searchFindings: "Search rules, files, or details",
    noFilteredFindings: "No findings match the current filter.",
    high: "High",
    medium: "Medium",
    low: "Low",
    info: "Info",
    focusFiles: "Focus files",
    noFocusFiles: "No focus files.",
    scoreDetails: "Evidence deductions",
    noDeductions: "No deductions.",
    rulesCovered: "Rules covered",
    noRules: "No rule hits.",
    noFindings: "No review-risk findings detected by the enabled rules.",
    rule: "Rule",
    severity: "Severity",
    path: "Path",
    detail: "Detail",
    evidence: "Evidence",
    recommendation: "Recommendation",
    footer: "ProofPR does not replace human review. It helps maintainers decide whether evidence is enough and risk boundaries are clear."
  };
}

function summaryItem(label: string, value: number): string {
  return `<div class="summary-item"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function signalItem(name: string, state: string, ok: boolean): string {
  return `<div class="signal"><span class="signal-name">${escapeHtml(name)}</span><span class="signal-state ${ok ? "tone-low" : "tone-medium"}">${escapeHtml(state)}</span></div>`;
}

function severityItem(severity: string, value: number, label: string): string {
  return `<div class="severity ${severity === "high" ? "tone-high" : severity === "medium" ? "tone-medium" : severity === "low" ? "tone-low" : ""}"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`;
}

function htmlRiskLens(lens: RiskLens, locale: ReportLocale): string {
  const severity = formatSeverity(lens.highest, locale);
  const fillClass = lens.highest === "info" ? "info" : lens.highest;

  return `<div class="radar-row">
    <div class="radar-head">
      <span class="radar-label">${escapeHtml(lens.label)}</span>
      <span class="radar-count">${lens.count} ${locale === "zh-CN" ? "项" : "findings"} · ${escapeHtml(severity)}</span>
    </div>
    <div class="radar-track" aria-label="${escapeHtml(lens.label)}">
      <div class="radar-fill ${fillClass}" style="width: ${lens.score}%"></div>
    </div>
    <div class="muted">${escapeHtml(lens.hint)}</div>
  </div>`;
}

function findingFilterButton(label: string, severity: string, count: number, active = false): string {
  return `<button class="filter-button${active ? " active" : ""}" type="button" data-filter-severity="${escapeHtml(severity)}">${escapeHtml(label)} <span class="muted">${count}</span></button>`;
}

function htmlFinding(finding: Finding, locale: ReportLocale): string {
  const labels = htmlLabels(locale);
  const translated = locale === "zh-CN" ? translateFinding(finding) : finding;
  const searchText = [
    finding.ruleId,
    finding.severity,
    finding.path,
    translated.title,
    translated.message,
    translated.recommendation,
    ...(finding.evidence ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
  const evidence = finding.evidence && finding.evidence.length > 0
    ? `<ul class="evidence-list">${finding.evidence
        .map((item) => `<li><code>${escapeHtml(locale === "zh-CN" ? translateEvidence(item) : item)}</code></li>`)
        .join("")}</ul>`
    : "";
  const path = finding.path
    ? `<div class="muted">${labels.path}: <code>${escapeHtml(finding.path)}</code></div>`
    : "";
  const recommendation = translated.recommendation
    ? `<div class="muted">${labels.recommendation}: ${escapeHtml(translated.recommendation)}</div>`
    : "";

  return `<details class="finding" open data-finding data-severity="${escapeHtml(finding.severity)}" data-search="${escapeHtml(searchText)}">
    <summary class="finding-head">
      <div>
        <div class="finding-title">${escapeHtml(translated.title)}</div>
        <div class="muted">${labels.rule}: <code>${escapeHtml(finding.ruleId)}</code></div>
      </div>
      <span class="pill ${finding.severity === "high" ? "tone-high" : finding.severity === "medium" ? "tone-medium" : "tone-low"}">${escapeHtml(locale === "zh-CN" ? translateSeverity(finding.severity) : finding.severity)}</span>
    </summary>
    ${path}
    <div class="muted">${labels.detail}: ${escapeHtml(translated.message)}</div>
    ${evidence}
    ${recommendation}
  </details>`;
}

function countFindingsBySeverity(findings: Finding[]): Record<Finding["severity"], number> {
  return findings.reduce<Record<Finding["severity"], number>>(
    (counts, finding) => {
      counts[finding.severity] += 1;
      return counts;
    },
    { info: 0, low: 0, medium: 0, high: 0 }
  );
}

function buildRiskLenses(findings: Finding[], locale: ReportLocale): RiskLens[] {
  const lenses = riskLensDefinitions(locale).map((lens) => ({
    ...lens,
    count: 0,
    highest: "info" as FindingSeverity,
    score: 0
  }));
  const byId = new Map<RiskLensId, RiskLens>(lenses.map((lens) => [lens.id, lens]));

  for (const finding of findings) {
    const lens = byId.get(riskLensIdForRule(finding.ruleId));

    if (!lens) {
      continue;
    }

    lens.count += 1;
    if (severityWeight(finding.severity) > severityWeight(lens.highest)) {
      lens.highest = finding.severity;
    }
  }

  for (const lens of lenses) {
    lens.score = lens.count === 0 ? 0 : Math.min(100, severityWeight(lens.highest) * 24 + lens.count * 12);
  }

  return lenses;
}

function riskLensDefinitions(locale: ReportLocale): Array<Pick<RiskLens, "id" | "label" | "hint">> {
  if (locale === "zh-CN") {
    return [
      { id: "evidence", label: "证据完整性", hint: "PR 描述、验证、复现、截图、changelog 和证据契约是否足够。" },
      { id: "supply-chain", label: "供应链", hint: "依赖来源、版本固定、lockfile、解析覆盖和安装脚本是否可信。" },
      { id: "workflow", label: "Workflow 权限", hint: "GitHub Actions 权限、OIDC、pull_request_target 和 PR head checkout 是否安全。" },
      { id: "secrets", label: "Secret 泄露", hint: "diff 中是否出现疑似 token、API key 或数据库连接串。" },
      { id: "review-surface", label: "Review 面", hint: "改动规模、敏感路径、MCP 或本地 agent 配置是否需要重点 review。" }
    ];
  }

  return [
    { id: "evidence", label: "Evidence completeness", hint: "PR description, verification, reproduction, screenshots, changelog, and evidence contracts." },
    { id: "supply-chain", label: "Supply chain", hint: "Dependency provenance, pinning, lockfiles, resolution overrides, and lifecycle scripts." },
    { id: "workflow", label: "Workflow privilege", hint: "GitHub Actions permissions, OIDC, pull_request_target, and pull request head checkout." },
    { id: "secrets", label: "Secret exposure", hint: "Possible tokens, API keys, or database URLs committed in the diff." },
    { id: "review-surface", label: "Review surface", hint: "Change size, sensitive paths, MCP, or local agent configuration needing focused review." }
  ];
}

function riskLensIdForRule(ruleId: string): RiskLensId {
  if (ruleId.startsWith("dependency-")) {
    return "supply-chain";
  }

  if (ruleId.startsWith("workflow-")) {
    return "workflow";
  }

  if (ruleId.startsWith("secret-detected")) {
    return "secrets";
  }

  if (
    ruleId === "missing-tests" ||
    ruleId === "thin-pr-description" ||
    ruleId === "missing-pr-description" ||
    ruleId === "missing-reproduction-context" ||
    ruleId.startsWith("evidence-contract:")
  ) {
    return "evidence";
  }

  return "review-surface";
}

function severityWeight(severity: FindingSeverity): number {
  return { info: 0, low: 1, medium: 2, high: 3 }[severity];
}

function formatSeverity(severity: FindingSeverity, locale: ReportLocale): string {
  return locale === "zh-CN" ? translateSeverity(severity) : severity;
}

function countFindingsByRule(findings: Finding[]): Array<{ ruleId: string; count: number }> {
  const counts = new Map<string, number>();

  for (const finding of findings) {
    counts.set(finding.ruleId, (counts.get(finding.ruleId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([ruleId, count]) => ({ ruleId, count }));
}

function scoreColor(value: number): string {
  if (value >= 85) {
    return "var(--green)";
  }

  if (value >= 70) {
    return "var(--blue)";
  }

  if (value >= 50) {
    return "var(--amber)";
  }

  return "var(--red)";
}

function yesNo(value: boolean, locale: ReportLocale): string {
  return locale === "zh-CN" ? formatChineseBoolean(value) : formatBoolean(value);
}

function localizeActionTitle(actionId: string, fallback: string, locale: ReportLocale): string {
  return locale === "zh-CN" ? translateReviewActionTitle(actionId, fallback) : fallback;
}

function localizeActionDetail(actionId: string, fallback: string, locale: ReportLocale): string {
  return locale === "zh-CN" ? translateReviewActionDetail(actionId, fallback) : fallback;
}

function localizeFocusReason(reasonId: string, fallback: string, locale: ReportLocale): string {
  return locale === "zh-CN" ? translateFocusReason(reasonId, fallback) : fallback;
}

function localizeDeduction(reasonId: string, fallback: string, locale: ReportLocale): string {
  return locale === "zh-CN" ? translateDeduction(reasonId, fallback) : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBoolean(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function formatChineseBoolean(value: boolean): "有" | "无" {
  return value ? "有" : "无";
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
