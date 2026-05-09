import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  getReportMarker,
  loadConfig,
  renderMarkdownReport,
  riskMeetsThreshold,
  scanDiff,
  type RiskLevel
} from "@proof-pr/core";

const execFileAsync = promisify(execFile);

type FailLevel = RiskLevel | "never";

async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: false });
  const configPath = core.getInput("config-path", { required: false }) || ".proofpr.yml";
  const failOn = parseFailLevel(core.getInput("fail-on", { required: false }) || "high");
  const shouldComment = parseBoolean(core.getInput("comment", { required: false }) || "true");

  const config = await loadConfig(configPath);
  const diffText = await readDiff(token);
  const pullRequest = github.context.payload.pull_request
    ? {
        title: github.context.payload.pull_request.title,
        body: github.context.payload.pull_request.body ?? ""
      }
    : undefined;
  const result = scanDiff(diffText, { config, pullRequest });
  const markdown = renderMarkdownReport(result);

  core.setOutput("risk", result.risk);
  core.setOutput("findings", String(result.findings.length));
  await core.summary.addRaw(markdown).write();

  if (shouldComment && token && github.context.payload.pull_request) {
    await upsertPullRequestComment(token, markdown);
  }

  if (riskMeetsThreshold(result.risk, failOn)) {
    core.setFailed(`ProofPR risk ${result.risk} meets fail-on threshold ${failOn}.`);
  }
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
