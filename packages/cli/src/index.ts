#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Command, InvalidArgumentError } from "commander";
import {
  loadConfig,
  renderMarkdownReport,
  renderSarifReport,
  riskMeetsThreshold,
  scanDiff,
  type RiskLevel
} from "@proof-pr/core";

const execFileAsync = promisify(execFile);

type OutputFormat = "json" | "markdown" | "sarif";
type FailLevel = RiskLevel | "never";

interface ScanCommandOptions {
  base?: string;
  head: string;
  diffFile?: string;
  config: string;
  format: OutputFormat;
  failOn: FailLevel;
}

const program = new Command();

program
  .name("proof-pr")
  .description("Review pull request evidence, scope, and safety before maintainers spend time on it.")
  .version("0.1.0");

program
  .command("scan", { isDefault: true })
  .description("Scan a git diff and print a ProofPR report.")
  .option("--base <ref>", "Base git ref. When provided, ProofPR scans base...head.")
  .option("--head <ref>", "Head git ref used with --base.", "HEAD")
  .option("--diff-file <path>", "Read a unified diff from a file instead of running git diff.")
  .option("--config <path>", "Path to .proofpr.yml.", ".proofpr.yml")
  .option("--format <format>", "Output format: markdown, json, or sarif.", parseFormat, "markdown")
  .option("--fail-on <level>", "Exit with code 1 on risk level: low, medium, high, or never.", parseFailLevel, "never")
  .action(async (options: ScanCommandOptions) => {
    const diffText = options.diffFile
      ? await readFile(options.diffFile, "utf8")
      : await readGitDiff(options.base, options.head);

    const config = await loadConfig(options.config);
    const result = scanDiff(diffText, { config });
    const output = renderOutput(result, options.format);

    process.stdout.write(`${output}\n`);

    if (riskMeetsThreshold(result.risk, options.failOn)) {
      process.exitCode = 1;
    }
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

function renderOutput(result: ReturnType<typeof scanDiff>, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (format === "sarif") {
    return renderSarifReport(result);
  }

  return renderMarkdownReport(result);
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
