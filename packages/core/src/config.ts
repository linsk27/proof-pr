import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";
import type { ProofPRConfig, ReportLocale, RiskLevel } from "./types.js";

const riskLevelSchema = z.enum(["low", "medium", "high"]);
const localeSchema = z.enum(["en", "zh-CN"]);

const configSchema = z
  .object({
    locale: localeSchema.default("en"),
    riskThreshold: riskLevelSchema.default("high"),
    ignorePaths: z.array(z.string()).default([]),
    sensitivePaths: z
      .array(z.string())
      .default([
        ".github/workflows/**",
        ".github/actions/**",
        "**/.env*",
        "**/mcp*.json",
        "**/*mcp*.json",
        "Dockerfile",
        "**/Dockerfile",
        "package.json",
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
        "bun.lockb",
        "requirements.txt",
        "pyproject.toml",
        "Cargo.toml",
        "Cargo.lock",
        "go.mod",
        "go.sum"
      ]),
    requireTests: z
      .object({
        enabled: z.boolean().default(true),
        paths: z
          .array(z.string())
          .default(["src/**", "packages/**/src/**", "app/**", "lib/**"])
      })
      .default({ enabled: true, paths: ["src/**", "packages/**/src/**", "app/**", "lib/**"] }),
    secrets: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
    dependencies: z
      .object({
        flagNewPackages: z.boolean().default(true),
        flagMajorUpgrades: z.boolean().default(true)
      })
      .default({ flagNewPackages: true, flagMajorUpgrades: true }),
    comment: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true })
  });

export function parseConfig(input: unknown): ProofPRConfig {
  return configSchema.parse(input ?? {});
}

export async function loadConfig(path: string): Promise<ProofPRConfig> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = YAML.parse(raw) as unknown;
    return parseConfig(parsed);
  } catch (error) {
    if (isMissingFileError(error)) {
      return parseConfig({});
    }

    throw error;
  }
}

export function riskMeetsThreshold(risk: RiskLevel, threshold: RiskLevel | "never"): boolean {
  if (threshold === "never") {
    return false;
  }

  return riskRank(risk) >= riskRank(threshold);
}

export function riskRank(risk: RiskLevel): number {
  return { low: 1, medium: 2, high: 3 }[risk];
}

export function parseLocale(value: unknown, fallback: ReportLocale = "en"): ReportLocale {
  const result = localeSchema.safeParse(value);
  return result.success ? result.data : fallback;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
