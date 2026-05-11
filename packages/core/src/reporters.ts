import type { Finding, ReportLocale, ScanResult } from "./types.js";

const REPORT_MARKER = "<!-- proof-pr-report -->";

export function renderMarkdownReport(result: ScanResult, locale: ReportLocale = "en"): string {
  if (locale === "zh-CN") {
    return renderChineseMarkdownReport(result);
  }

  return renderEnglishMarkdownReport(result);
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
    `Risk: **${result.risk}**`,
    `Evidence score: **${result.evidenceScore.value}/100 (${formatEvidenceGrade(result.evidenceScore.grade, "en")})**`,
    `Review gate: **${formatReviewDecision(result.reviewDecision, "en")}**`,
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
    `风险等级：**${translateRisk(result.risk)}**`,
    `证据评分：**${result.evidenceScore.value}/100（${formatEvidenceGrade(result.evidenceScore.grade, "zh-CN")}）**`,
    `Review 门禁：**${formatReviewDecision(result.reviewDecision, "zh-CN")}**`,
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
    } else if (finding.ruleId === "workflow-dangerous-trigger") {
      focus.add(
        locale === "zh-CN"
          ? "重点审查 pull_request_target 是否会用高权限 token 执行不可信 PR 代码。"
          : "Review whether pull_request_target can execute untrusted PR code with privileged tokens."
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
    "review-package-lifecycle-script": "审查包生命周期脚本",
    "review-mcp-execution-surface": "审查 MCP 命令、参数和凭证处理",
    "request-review-map-or-split": "要求拆分 PR 或提供逐文件 review map",
    "verify-dependency-change": "核查依赖来源和 lockfile 影响",
    "review-major-dependency-upgrade": "核查依赖大版本升级影响",
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
    "review-package-lifecycle-script": "检查 install、postinstall、prepare 或 publish 脚本是否会执行非预期代码。",
    "review-mcp-execution-surface": "检查 MCP 配置是否提交凭证，或意外扩大本地执行面。",
    "request-review-map-or-split": "要求贡献者拆分无关改动，或标出最需要重点 review 的文件。",
    "verify-dependency-change": "检查包名、维护者、许可证、安装脚本，以及 lockfile 是否符合预期依赖变化。",
    "review-major-dependency-upgrade": "检查 changelog、迁移说明、peer dependencies，以及测试是否覆盖升级后的关键路径。",
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
    "workflow-permission-change": "workflow 权限发生变更",
    "workflow-dangerous-trigger": "workflow 使用了高风险触发器",
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
    "workflow-dangerous-trigger": "pull_request_target workflow 需要重点审查高权限触发路径。",
    "evidence-contract-missing": "仓库自定义证据契约未满足。",
    "missing-tests": "代码发生变更，但缺少测试变更或验证说明。"
  }[reasonId] ?? fallback;
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
