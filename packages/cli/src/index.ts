#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";
import { Command, InvalidArgumentError } from "commander";
import {
  listConfigPresets,
  loadConfig,
  parseLocale,
  parsePreset,
  renderMarkdownReport,
  renderSarifReport,
  riskMeetsThreshold,
  scanDiff,
  type ConfigPreset,
  type ReportLocale,
  type RiskLevel
} from "@proof-pr/core";

const execFileAsync = promisify(execFile);

type OutputFormat = "json" | "markdown" | "sarif";
type FailLevel = RiskLevel | "never";

interface ScanCommandOptions {
  base?: string;
  head: string;
  diffFile?: string;
  prTitle?: string;
  prBody?: string;
  prBodyFile?: string;
  config: string;
  format: OutputFormat;
  locale?: ReportLocale;
  failOn: FailLevel;
}

interface InitCommandOptions {
  configPath: string;
  workflowPath: string;
  preset: ConfigPreset;
  failOn: FailLevel;
  force: boolean;
}

const program = new Command();

program
  .name("proof-pr")
  .description("Review pull request evidence, scope, and safety before maintainers spend time on it.")
  .version("0.1.6");

program
  .command("scan", { isDefault: true })
  .description("Scan a git diff and print a ProofPR report.")
  .option("--base <ref>", "Base git ref. When provided, ProofPR scans base...head.")
  .option("--head <ref>", "Head git ref used with --base.", "HEAD")
  .option("--diff-file <path>", "Read a unified diff from a file instead of running git diff.")
  .option("--pr-title <title>", "Pull request title used for evidence checks.")
  .option("--pr-body <body>", "Pull request body used for evidence checks.")
  .option("--pr-body-file <path>", "Read a pull request body from a Markdown file.")
  .option("--config <path>", "Path to .proofpr.yml.", ".proofpr.yml")
  .option("--format <format>", "Output format: markdown, json, or sarif.", parseFormat, "markdown")
  .option("--locale <locale>", "Report language: en or zh-CN.")
  .option("--fail-on <level>", "Exit with code 1 on risk level: low, medium, high, or never.", parseFailLevel, "never")
  .action(async (options: ScanCommandOptions) => {
    const diffText = options.diffFile
      ? await readFile(options.diffFile, "utf8")
      : await readGitDiff(options.base, options.head);

    const config = await loadConfig(options.config);
    const prBody = await readPullRequestBody(options);
    const pullRequest =
      options.prTitle !== undefined || prBody !== undefined
        ? { title: options.prTitle, body: prBody }
        : undefined;
    const result = scanDiff(diffText, { config, pullRequest });
    const locale = parseLocale(options.locale, config.locale);
    const output = renderOutput(result, options.format, locale);

    process.stdout.write(`${output}\n`);

    if (riskMeetsThreshold(result.risk, options.failOn)) {
      process.exitCode = 1;
    }
  });

program
  .command("init")
  .description("Create a starter .proofpr.yml and GitHub Actions workflow.")
  .option("--config-path <path>", "Path to write the ProofPR configuration file.", ".proofpr.yml")
  .option(
    "--workflow-path <path>",
    "Path to write the GitHub Actions workflow.",
    ".github/workflows/proofpr.yml"
  )
  .option(
    "--preset <preset>",
    `Config preset: ${listConfigPresets().join(", ")}.`,
    parsePresetOption,
    "open-source-maintainer"
  )
  .option("--fail-on <level>", "Workflow failure threshold: low, medium, high, or never.", parseFailLevel, "high")
  .option("--force", "Overwrite existing files.", false)
  .action(async (options: InitCommandOptions) => {
    await writeIfMissing(options.configPath, renderConfigTemplate(options.preset), options.force);
    await writeIfMissing(options.workflowPath, renderWorkflowTemplate(options.failOn), options.force);
    process.stdout.write(
      `ProofPR initialized:\n- ${options.configPath}\n- ${options.workflowPath}\n`
    );
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ProofPR failed: ${message}\n`);
  process.exitCode = 1;
});

async function readGitDiff(base: string | undefined, head: string): Promise<string> {
  const args = ["diff", "--no-ext-diff", "--unified=0"];

  if (base) {
    args.push(`${base}...${head}`);
  }

  const { stdout } = await execFileAsync("git", args, { maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

async function readPullRequestBody(options: ScanCommandOptions): Promise<string | undefined> {
  if (options.prBodyFile) {
    return readFile(options.prBodyFile, "utf8");
  }

  return options.prBody;
}

async function writeIfMissing(path: string, contents: string, force: boolean): Promise<void> {
  if (!force && (await pathExists(path))) {
    throw new Error(`${path} already exists. Pass --force to overwrite it.`);
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function renderConfigTemplate(preset: ConfigPreset): string {
  return `locale: zh-CN
preset: ${preset}

comment:
  enabled: true

# 如需更严格或更宽松，可以先换 preset：
# preset: security-strict
#
# 可用预设：
# - balanced
# - open-source-maintainer
# - security-strict
# - ai-generated-pr
# - mcp-security
# - dependency-careful
#
# 也可以取消注释下面这些字段，覆盖 preset 的默认值。
# riskThreshold: high
#
# sensitivePaths:
#   - ".github/workflows/**"
#   - ".github/actions/**"
#   - "**/.env*"
#   - "**/mcp*.json"
#   - "**/*mcp*.json"
#   - "Dockerfile"
#   - "**/Dockerfile"
#   - "package.json"
#   - "pnpm-lock.yaml"
#   - "package-lock.json"
#   - "yarn.lock"
#   - "bun.lockb"
#
# requireTests:
#   enabled: true
#   paths:
#     - "src/**"
#     - "packages/**/src/**"
#     - "app/**"
#     - "lib/**"
#
# secrets:
#   enabled: true
#
# dependencies:
#   flagNewPackages: true
#   flagMajorUpgrades: true
#   flagLifecycleScripts: true
`;
}

function renderWorkflowTemplate(failOn: FailLevel): string {
  return `name: ProofPR

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  proofpr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: linsk27/proof-pr@v0.1.6
        with:
          fail-on: ${failOn}
          comment: "true"
          annotations: "true"
`;
}

function renderOutput(result: ReturnType<typeof scanDiff>, format: OutputFormat, locale: ReportLocale): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (format === "sarif") {
    return renderSarifReport(result);
  }

  return renderMarkdownReport(result, locale);
}

function parseFormat(value: string): OutputFormat {
  if (value === "json" || value === "markdown" || value === "sarif") {
    return value;
  }

  throw new InvalidArgumentError("format must be one of: markdown, json, sarif");
}

function parseFailLevel(value: string): FailLevel {
  if (value === "low" || value === "medium" || value === "high" || value === "never") {
    return value;
  }

  throw new InvalidArgumentError("fail-on must be one of: low, medium, high, never");
}

function parsePresetOption(value: string): ConfigPreset {
  const preset = parsePreset(value);

  if (preset === value) {
    return preset;
  }

  throw new InvalidArgumentError(`preset must be one of: ${listConfigPresets().join(", ")}`);
}
