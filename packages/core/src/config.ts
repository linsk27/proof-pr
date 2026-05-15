import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";
import type { ConfigPreset, EvidenceContract, ProofPRConfig, ReportLocale, RiskLevel } from "./types.js";

const riskLevelSchema = z.enum(["low", "medium", "high"]);
const findingSeveritySchema = z.enum(["info", "low", "medium", "high"]);
const localeSchema = z.enum(["en", "zh-CN"]);
const evidenceRequirementSchema = z.enum([
  "verification",
  "reproduction",
  "screenshot",
  "changelog",
  "permission-rationale"
]);
const configPresetSchema = z.enum([
  "balanced",
  "open-source-maintainer",
  "security-strict",
  "ai-generated-pr",
  "mcp-security",
  "dependency-careful"
]);

export const CONFIG_PRESETS: ConfigPreset[] = [
  "balanced",
  "open-source-maintainer",
  "security-strict",
  "ai-generated-pr",
  "mcp-security",
  "dependency-careful"
];

const DEFAULT_SENSITIVE_PATHS = [
  ".github/workflows/**",
  ".github/actions/**",
  "**/.env*",
  "**/mcp*.json",
  "**/*mcp*.json",
  "Dockerfile",
  "**/Dockerfile",
  "package.json",
  "**/package.json",
  "pnpm-lock.yaml",
  "**/pnpm-lock.yaml",
  "package-lock.json",
  "**/package-lock.json",
  "yarn.lock",
  "**/yarn.lock",
  "bun.lockb",
  "**/bun.lockb",
  "requirements.txt",
  "**/requirements.txt",
  "pyproject.toml",
  "**/pyproject.toml",
  "Cargo.toml",
  "**/Cargo.toml",
  "Cargo.lock",
  "**/Cargo.lock",
  "go.mod",
  "**/go.mod",
  "go.sum",
  "**/go.sum"
];

const DEFAULT_TEST_PATHS = ["src/**", "packages/**/src/**", "app/**", "lib/**"];

const WORKFLOW_EVIDENCE_CONTRACTS: EvidenceContract[] = [
  {
    id: "workflow-permission-rationale",
    title: "Workflow changes need a permission rationale",
    paths: [".github/workflows/**", ".github/actions/**"],
    requires: ["verification", "permission-rationale"],
    severity: "high",
    recommendation:
      "Explain why the workflow needs this trigger or permission, and include verification that untrusted PR code cannot reach privileged tokens."
  }
];

const DEPENDENCY_EVIDENCE_CONTRACTS: EvidenceContract[] = [
  {
    id: "dependency-upgrade-evidence",
    title: "Dependency changes need upgrade evidence",
    paths: [
      "package.json",
      "**/package.json",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "requirements.txt",
      "**/requirements.txt",
      "pyproject.toml",
      "**/pyproject.toml",
      "go.mod",
      "**/go.mod"
    ],
    requires: ["verification", "changelog"],
    severity: "medium",
    recommendation:
      "Link changelog or migration notes and include the test command or CI evidence used to validate the dependency change."
  }
];

type ConfigPresetDefaults = Partial<Omit<ProofPRConfig, "preset">>;

const PRESET_DEFAULTS: Record<ConfigPreset, ConfigPresetDefaults> = {
  balanced: {},
  "open-source-maintainer": {
    riskThreshold: "high",
    sensitivePaths: DEFAULT_SENSITIVE_PATHS,
    requireTests: {
      enabled: true,
      paths: DEFAULT_TEST_PATHS
    }
  },
  "security-strict": {
    riskThreshold: "medium",
    sensitivePaths: [
      ...DEFAULT_SENSITIVE_PATHS,
      ".npmrc",
      "**/.npmrc",
      ".pypirc",
      "**/.pypirc",
      ".dockerignore",
      "docker-compose*.yml",
      "**/docker-compose*.yml",
      ".github/dependabot.yml",
      ".github/codeql/**",
      "terraform/**/*.tf",
      "**/*.pem",
      "**/*.key"
    ],
    requireTests: {
      enabled: true,
      paths: ["src/**", "packages/**/src/**", "app/**", "lib/**", "server/**", "api/**"]
    },
    evidence: {
      contracts: WORKFLOW_EVIDENCE_CONTRACTS
    }
  },
  "ai-generated-pr": {
    riskThreshold: "medium",
    sensitivePaths: DEFAULT_SENSITIVE_PATHS,
    requireTests: {
      enabled: true,
      paths: ["src/**", "packages/**/src/**", "app/**", "lib/**", "server/**", "api/**", "components/**"]
    }
  },
  "mcp-security": {
    riskThreshold: "medium",
    sensitivePaths: [
      ...DEFAULT_SENSITIVE_PATHS,
      ".cursor/**",
      ".vscode/**"
    ],
    requireTests: {
      enabled: true,
      paths: DEFAULT_TEST_PATHS
    }
  },
  "dependency-careful": {
    riskThreshold: "medium",
    sensitivePaths: [
      ...DEFAULT_SENSITIVE_PATHS,
      "poetry.lock",
      "**/poetry.lock",
      "uv.lock",
      "**/uv.lock",
      "Pipfile",
      "**/Pipfile",
      "Pipfile.lock",
      "**/Pipfile.lock",
      "pom.xml",
      "**/pom.xml",
      "build.gradle",
      "**/build.gradle",
      "build.gradle.kts",
      "**/build.gradle.kts",
      "Gemfile",
      "**/Gemfile",
      "Gemfile.lock",
      "**/Gemfile.lock"
    ],
    requireTests: {
      enabled: true,
      paths: DEFAULT_TEST_PATHS
    },
    evidence: {
      contracts: DEPENDENCY_EVIDENCE_CONTRACTS
    }
  }
};

const evidenceContractSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  paths: z.array(z.string().min(1)).min(1),
  requires: z.array(evidenceRequirementSchema).min(1),
  severity: findingSeveritySchema.default("medium"),
  recommendation: z.string().min(1).optional()
});

const configSchema = z
  .object({
    preset: configPresetSchema.default("balanced"),
    locale: localeSchema.default("en"),
    riskThreshold: riskLevelSchema.default("high"),
    ignorePaths: z.array(z.string()).default([]),
    sensitivePaths: z.array(z.string()).default(DEFAULT_SENSITIVE_PATHS),
    requireTests: z
      .object({
        enabled: z.boolean().default(true),
        paths: z.array(z.string()).default(DEFAULT_TEST_PATHS)
      })
      .default({ enabled: true, paths: DEFAULT_TEST_PATHS }),
    secrets: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true }),
    dependencies: z
      .object({
        flagNewPackages: z.boolean().default(true),
        flagMajorUpgrades: z.boolean().default(true),
        flagLifecycleScripts: z.boolean().default(true)
      })
      .default({ flagNewPackages: true, flagMajorUpgrades: true, flagLifecycleScripts: true }),
    evidence: z
      .object({
        contracts: z.array(evidenceContractSchema).default([])
      })
      .default({ contracts: [] }),
    comment: z.object({ enabled: z.boolean().default(true) }).default({ enabled: true })
  });

export function parseConfig(input: unknown): ProofPRConfig {
  const raw = isRecord(input) ? input : {};
  const preset = configPresetSchema.parse(raw.preset ?? "balanced");
  return configSchema.parse(deepMerge(PRESET_DEFAULTS[preset], raw, { preset }));
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

export function parsePreset(value: unknown, fallback: ConfigPreset = "balanced"): ConfigPreset {
  const result = configPresetSchema.safeParse(value);
  return result.success ? result.data : fallback;
}

export function listConfigPresets(): ConfigPreset[] {
  return CONFIG_PRESETS;
}

function deepMerge(...items: unknown[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      if (isRecord(value) && isRecord(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else {
        output[key] = value;
      }
    }
  }

  return output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
