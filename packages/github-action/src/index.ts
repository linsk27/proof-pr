import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  getReportMarker,
  loadConfig,
  renderHtmlReport,
  renderMarkdownReport,
  renderSarifReport,
  riskMeetsThreshold,
  scanDiff,
  type Finding,
  type RiskLevel
} from "@proof-pr/core";

const execFileAsync = promisify(execFile);

type FailLevel = RiskLevel | "never";

async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: false });
  const configPath = core.getInput("config-path", { required: false }) || ".proofpr.yml";
  const failOnInput = core.getInput("fail-on", { required: false });
  const shouldComment = parseBoolean(core.getInput("comment", { required: false }) || "true");
  const shouldAnnotate = parseBoolean(core.getInput("annotations", { required: false }) || "true");
  const sarifOutput = core.getInput("sarif-output", { required: false });
  const htmlOutput = core.getInput("html-output", { required: false });

  const config = await loadConfig(configPath);
  const failOn = parseFailLevel(failOnInput || config.riskThreshold);
  const diffText = await readDiff(token);
  const pullRequest = github.context.payload.pull_request
    ? {
        title: github.context.payload.pull_request.title,
        body: github.context.payload.pull_request.body ?? ""
      }
    : undefined;
  const result = scanDiff(diffText, { config, pullRequest });
  const markdown = renderMarkdownReport(result, config.locale);

  core.setOutput("risk", result.risk);
  core.setOutput("findings", String(result.findings.length));
  core.setOutput("evidence-score", String(result.evidenceScore.value));
  core.setOutput("review-decision", result.reviewDecision);
  await core.summary.addRaw(markdown).write();

  if (shouldAnnotate) {
    publishAnnotations(result.findings);
  }

  if (sarifOutput) {
    await writeSarifReport(sarifOutput, renderSarifReport(result));
  }

  if (htmlOutput) {
    await writeHtmlReport(htmlOutput, renderHtmlReport(result, config.locale));
  }

  if (shouldComment && token && github.context.payload.pull_request) {
    await upsertPullRequestComment(token, markdown);
  }

  if (riskMeetsThreshold(result.risk, failOn)) {
    core.setFailed(`ProofPR risk ${result.risk} meets fail-on threshold ${failOn}.`);
  }
}

async function writeSarifReport(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf8");
  core.info(`ProofPR SARIF report written to ${path}.`);
}

async function writeHtmlReport(path: string, body: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body, "utf8");
  core.info(`ProofPR HTML report written to ${path}.`);
}

function publishAnnotations(findings: Finding[]): void {
  const maxAnnotations = 50;

  for (const finding of findings.slice(0, maxAnnotations)) {
    const properties = annotationProperties(finding);
    const message = annotationMessage(finding);

    if (finding.severity === "high") {
      core.error(message, properties);
    } else if (finding.severity === "medium") {
      core.warning(message, properties);
    } else {
      core.notice(message, properties);
    }
  }

  if (findings.length > maxAnnotations) {
    core.notice(
      `ProofPR emitted the first ${maxAnnotations} annotations and skipped ${findings.length - maxAnnotations} additional finding(s).`
    );
  }
}

function annotationProperties(finding: Finding): core.AnnotationProperties {
  const lineNumber = extractLineNumber(finding.evidence);
  const properties: core.AnnotationProperties = {
    title: `${finding.title} (${finding.ruleId})`
  };

  if (finding.path) {
    properties.file = finding.path;
  }

  if (lineNumber) {
    properties.startLine = lineNumber;
    properties.endLine = lineNumber;
  }

  return properties;
}

function annotationMessage(finding: Finding): string {
  const parts = [`${finding.ruleId}: ${finding.message}`];

  if (finding.recommendation) {
    parts.push(`Recommendation: ${finding.recommendation}`);
  }

  return parts.join(" ");
}

function extractLineNumber(evidence: string[] | undefined): number | undefined {
  for (const item of evidence ?? []) {
    const match = /^line (?<line>\d+):/.exec(item);
    const line = match?.groups?.line ? Number(match.groups.line) : undefined;

    if (line && Number.isInteger(line)) {
      return line;
    }
  }

  return undefined;
}

async function readDiff(token: string): Promise<string> {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest || !token) {
    const { stdout } = await execFileAsync("git", ["diff", "--no-ext-diff", "--unified=0"], {
      maxBuffer: 20 * 1024 * 1024
    });
    return stdout;
  }

  const octokit = github.getOctokit(token);
  const response = (await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pullRequest.number,
    headers: {
      accept: "application/vnd.github.v3.diff"
    }
  })) as unknown as { data: string };

  return response.data;
}

async function upsertPullRequestComment(token: string, body: string): Promise<void> {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  const octokit = github.getOctokit(token);
  const marker = getReportMarker();
  const comments = await octokit.rest.issues.listComments({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullRequest.number,
    per_page: 100
  });
  const existing = comments.data.find((comment) => comment.body?.includes(marker));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      comment_id: existing.id,
      body
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: pullRequest.number,
    body
  });
}

function parseFailLevel(value: string): FailLevel {
  if (value === "low" || value === "medium" || value === "high" || value === "never") {
    return value;
  }

  throw new Error("fail-on must be one of: low, medium, high, never");
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  core.setFailed(message);
});
