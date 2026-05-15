import type {
  ChangeLine,
  DiffFile,
  EvidenceRequirement,
  Finding,
  ProofPRConfig,
  PullRequestContext,
  ScanSummary
} from "./types.js";
import { analyzeEvidence } from "./evidence.js";
import { matchesAny, isCodePath, isDependencyManifest, isMcpConfigPath, isTestPath, isWorkflowPath } from "./path-utils.js";
import { detectSecrets } from "./secrets.js";

const PACKAGE_JSON_NON_DEPENDENCY_KEYS = new Set([
  "author",
  "bin",
  "bugs",
  "description",
  "engines",
  "exports",
  "files",
  "homepage",
  "keywords",
  "license",
  "main",
  "module",
  "name",
  "packageManager",
  "private",
  "publishConfig",
  "repository",
  "scripts",
  "type",
  "types",
  "version"
]);

const TOML_NON_DEPENDENCY_KEYS = new Set([
  "authors",
  "description",
  "edition",
  "license",
  "name",
  "readme",
  "repository",
  "requires-python",
  "version"
]);

type DependencyEcosystem = "go" | "npm" | "python" | "rust";

interface ParsedDependencyLine {
  name: string;
  version: string;
  line: ChangeLine;
}

export function analyzeDiffFiles(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): Finding[] {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));
  const findings: Finding[] = [];

  findings.push(...analyzeChangeSize(activeFiles));
  findings.push(...analyzeSensitivePaths(activeFiles, config));
  findings.push(...analyzeMissingTests(activeFiles, config, pullRequest));
  findings.push(...analyzePullRequestEvidence(activeFiles, pullRequest));
  findings.push(...analyzeEvidenceContracts(activeFiles, config, pullRequest));
  findings.push(...analyzeDependencyChanges(activeFiles, config));
  findings.push(...analyzeWorkflowPermissions(activeFiles));
  findings.push(...analyzeWorkflowDangerousTriggers(activeFiles));
  findings.push(...analyzeWorkflowUntrustedCheckout(activeFiles));
  findings.push(...analyzeMcpConfigs(activeFiles));

  if (config.secrets.enabled) {
    for (const file of activeFiles) {
      findings.push(...detectSecrets(file.path, file.addedLines));
    }
  }

  return findings;
}

export function summarizeDiffFiles(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): ScanSummary {
  const activeFiles = files.filter((file) => !matchesAny(file.path, config.ignorePaths));
  const evidence = analyzeEvidence(pullRequest);

  return {
    filesChanged: activeFiles.length,
    additions: activeFiles.reduce((sum, file) => sum + file.added, 0),
    deletions: activeFiles.reduce((sum, file) => sum + file.removed, 0),
    testFilesChanged: activeFiles.filter((file) => isTestPath(file.path)).length,
    sensitiveFilesChanged: activeFiles.filter((file) => matchesAny(file.path, config.sensitivePaths)).length,
    pullRequestDescription: evidence.descriptionState,
    verificationEvidence: evidence.verificationEvidence,
    reproductionEvidence: evidence.reproductionEvidence,
    screenshotEvidence: evidence.screenshotEvidence,
    changelogEvidence: evidence.changelogEvidence,
    permissionRationaleEvidence: evidence.permissionRationaleEvidence
  };
}

function analyzeChangeSize(files: DiffFile[]): Finding[] {
  const filesChanged = files.length;
  const changedLines = files.reduce((sum, file) => sum + file.added + file.removed, 0);

  if (filesChanged >= 20 || changedLines >= 800) {
    return [
      {
        ruleId: "change-size",
        title: "Large review surface",
        message: `This change touches ${filesChanged} files and ${changedLines} changed lines.`,
        severity: "high",
        evidence: [`files: ${filesChanged}`, `changed lines: ${changedLines}`],
        recommendation:
          "Ask for smaller PRs or a clear review map before maintainers spend deep review time."
      }
    ];
  }

  if (filesChanged >= 10 || changedLines >= 250) {
    return [
      {
        ruleId: "change-size",
        title: "Broad review surface",
        message: `This change touches ${filesChanged} files and ${changedLines} changed lines.`,
        severity: "medium",
        evidence: [`files: ${filesChanged}`, `changed lines: ${changedLines}`],
        recommendation:
          "Ask the contributor to explain the scope boundaries and identify the files that need the closest review."
      }
    ];
  }

  return [];
}

function analyzeSensitivePaths(files: DiffFile[], config: ProofPRConfig): Finding[] {
  return files
    .filter((file) => matchesAny(file.path, config.sensitivePaths))
    .map((file) => ({
      ruleId: "sensitive-path",
      title: "Sensitive file changed",
      message: `${file.path} is configured as a sensitive path.`,
      severity: sensitivePathSeverity(file.path),
      path: file.path,
      evidence: [`+${file.added} -${file.removed}`],
      recommendation:
        "Review this file deliberately, especially permission, credential, release, and dependency changes."
    }));
}

function analyzeMissingTests(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): Finding[] {
  if (!config.requireTests.enabled) {
    return [];
  }

  const codeFiles = files.filter(
    (file) =>
      isCodePath(file.path) &&
      !isTestPath(file.path) &&
      matchesAny(file.path, config.requireTests.paths)
  );
  const hasTestChanges = files.some((file) => isTestPath(file.path));
  const hasVerificationEvidence = analyzeEvidence(pullRequest).verificationEvidence;

  if (codeFiles.length === 0 || hasTestChanges || hasVerificationEvidence) {
    return [];
  }

  return [
    {
      ruleId: "missing-tests",
      title: "No verification evidence",
      message: `Code changed in ${codeFiles.length} file(s), but no test files or PR verification notes were found.`,
      severity: codeFiles.length >= 5 ? "medium" : "low",
      evidence: codeFiles.slice(0, 5).map((file) => file.path),
      recommendation:
        "Ask for tests or a clear manual verification note before spending deep review time."
    }
  ];
}

function analyzePullRequestEvidence(files: DiffFile[], pullRequest?: PullRequestContext): Finding[] {
  if (!pullRequest) {
    return [];
  }

  const evidence = analyzeEvidence(pullRequest);
  const codeFiles = files.filter((file) => isCodePath(file.path) && !isTestPath(file.path));
  const hasSensitiveChanges = files.some((file) => isWorkflowPath(file.path) || isMcpConfigPath(file.path));
  const findings: Finding[] = [];

  if (evidence.descriptionState === "missing") {
    findings.push({
      ruleId: "thin-pr-description",
      title: "Pull request description is missing",
      message: "The PR body is empty, so maintainers have little context before review.",
      severity: hasSensitiveChanges || codeFiles.length >= 3 ? "medium" : "low",
      recommendation:
        "Ask for the motivation, test evidence, and any rollout or compatibility notes before review."
    });
  } else if (evidence.descriptionState === "thin") {
    findings.push({
      ruleId: "thin-pr-description",
      title: "Pull request description is thin",
      message: "The PR body is short and may not provide enough review context.",
      severity: hasSensitiveChanges ? "medium" : "low",
      recommendation:
        "Ask for a short explanation of why the change is needed and how it was verified."
    });
  }

  if ((hasSensitiveChanges || codeFiles.length >= 5) && !evidence.reproductionEvidence) {
    findings.push({
      ruleId: "missing-reproduction-context",
      title: "No reproduction or before/after context",
      message: "The PR does not mention reproduction steps, expected behavior, actual behavior, or before/after context.",
      severity: hasSensitiveChanges ? "medium" : "low",
      recommendation:
        "Ask for reproduction steps or a before/after note so reviewers can validate the change path."
    });
  }

  return findings;
}

function analyzeEvidenceContracts(
  files: DiffFile[],
  config: ProofPRConfig,
  pullRequest?: PullRequestContext
): Finding[] {
  if (config.evidence.contracts.length === 0) {
    return [];
  }

  const evidence = analyzeEvidence(pullRequest);
  const hasTestChanges = files.some((file) => isTestPath(file.path));
  const findings: Finding[] = [];

  for (const contract of config.evidence.contracts) {
    const matchedFiles = files.filter((file) => matchesAny(file.path, contract.paths));

    if (matchedFiles.length === 0) {
      continue;
    }

    const missingRequirements = contract.requires.filter(
      (requirement) => !hasEvidenceRequirement(requirement, evidence, hasTestChanges)
    );

    if (missingRequirements.length === 0) {
      continue;
    }

    findings.push({
      ruleId: `evidence-contract:${contract.id}`,
      title: contract.title ?? "Evidence contract missing",
      message: `Changed files match evidence contract "${contract.id}", but missing required evidence: ${missingRequirements
        .map(formatEvidenceRequirement)
        .join(", ")}.`,
      severity: contract.severity,
      path: matchedFiles[0]?.path,
      evidence: [
        `matched files: ${matchedFiles.slice(0, 5).map((file) => file.path).join(", ")}`,
        `missing evidence: ${missingRequirements.map(formatEvidenceRequirement).join(", ")}`
      ],
      recommendation:
        contract.recommendation ??
        "Ask the contributor to add the missing evidence before spending deep review time."
    });
  }

  return findings;
}

function hasEvidenceRequirement(
  requirement: EvidenceRequirement,
  evidence: ReturnType<typeof analyzeEvidence>,
  hasTestChanges: boolean
): boolean {
  if (requirement === "verification") {
    return evidence.verificationEvidence || hasTestChanges;
  }

  if (requirement === "reproduction") {
    return evidence.reproductionEvidence;
  }

  if (requirement === "screenshot") {
    return evidence.screenshotEvidence;
  }

  if (requirement === "changelog") {
    return evidence.changelogEvidence;
  }

  return evidence.permissionRationaleEvidence;
}

function analyzeDependencyChanges(files: DiffFile[], config: ProofPRConfig): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isDependencyManifest(candidate.path))) {
    if (config.dependencies.flagNewPackages) {
      const addedDependencyLines = file.addedLines.filter((line) =>
        isDependencyLikeAddition(file.path, line.value.trim())
      );

      if (addedDependencyLines.length > 0) {
        findings.push({
          ruleId: "dependency-added",
          title: "Dependency manifest changed",
          message: `${file.path} adds or changes dependency-like entries.`,
          severity: "medium",
          path: file.path,
          evidence: addedDependencyLines.slice(0, 5).map(formatEvidenceLine),
          recommendation:
            "Verify package names, licenses, provenance, and whether the lockfile matches the intended dependency change."
        });
      }

      findings.push(...analyzeNonRegistrySources(file));
      findings.push(...analyzeUnpinnedDependencyDeclarations(file));
      findings.push(...analyzeDependencyResolutionOverrides(file));
    }

    if (config.dependencies.flagMajorUpgrades) {
      findings.push(...analyzeMajorDependencyUpgrades(file));
    }

    if (config.dependencies.flagLifecycleScripts) {
      findings.push(...analyzeLifecycleScripts(file));
    }
  }

  if (config.dependencies.flagNewPackages) {
    findings.push(...analyzeDependencyLockfileConsistency(files));
  }

  return findings;
}

function isDependencyLikeAddition(path: string, line: string): boolean {
  return parseDependencyLine(path, { value: line }) !== undefined;
}

function hasDependencyManifestChange(file: DiffFile): boolean {
  return [...file.addedLines, ...file.removedLines].some((line) => {
    const value = line.value.trim();

    return (
      parseDependencyLine(file.path, line) !== undefined ||
      isNonRegistryDependencyLine(file.path, value) ||
      isUnpinnedDependencyLine(file.path, value) ||
      isResolutionOverrideLine(value)
    );
  });
}

function dependencyChangeEvidence(file: DiffFile): string[] {
  const lines = file.addedLines.filter((line) => {
    const value = line.value.trim();

    return (
      parseDependencyLine(file.path, line) !== undefined ||
      isNonRegistryDependencyLine(file.path, value) ||
      isUnpinnedDependencyLine(file.path, value) ||
      isResolutionOverrideLine(value)
    );
  });

  return lines.length > 0 ? lines.slice(0, 5).map(formatEvidenceLine) : [`+${file.added} -${file.removed}`];
}

function isNonRegistryDependencyLine(path: string, line: string): boolean {
  if (isIgnorableDependencyLine(line)) {
    return false;
  }

  if (path.endsWith("package.json")) {
    const entry = parsePackageJsonStringEntry(line);
    return Boolean(entry && !PACKAGE_JSON_NON_DEPENDENCY_KEYS.has(entry.key) && isNonRegistryVersion(entry.version));
  }

  if (path.endsWith("requirements.txt")) {
    return isPythonDirectUrl(line);
  }

  if (path.endsWith("pyproject.toml")) {
    const spec = parseQuotedPythonDependencySpec(line);
    const assignment = parseTomlStringAssignment(line);

    return (
      Boolean(spec && isPythonDirectUrl(spec)) ||
      Boolean(assignment && !TOML_NON_DEPENDENCY_KEYS.has(assignment.key) && isNonRegistryVersion(assignment.value))
    );
  }

  if (path.endsWith("Cargo.toml")) {
    return /\b(?:git|path)\s*=/.test(line);
  }

  return false;
}

function isUnpinnedDependencyLine(path: string, line: string): boolean {
  if (isIgnorableDependencyLine(line) || isNonRegistryDependencyLine(path, line)) {
    return false;
  }

  if (path.endsWith("package.json")) {
    const entry = parsePackageJsonStringEntry(line);
    return Boolean(entry && !PACKAGE_JSON_NON_DEPENDENCY_KEYS.has(entry.key) && isUnpinnedVersion(entry.version));
  }

  if (path.endsWith("requirements.txt")) {
    return isUnpinnedPythonRequirement(line);
  }

  if (path.endsWith("pyproject.toml")) {
    const spec = parseQuotedPythonDependencySpec(line);
    const assignment = parseTomlStringAssignment(line);

    return (
      Boolean(spec && isUnpinnedPythonRequirement(spec)) ||
      Boolean(assignment && !TOML_NON_DEPENDENCY_KEYS.has(assignment.key) && isUnpinnedVersion(assignment.value))
    );
  }

  if (path.endsWith("Cargo.toml")) {
    const assignment = parseTomlStringAssignment(line);
    const key = assignment?.key ?? parseTomlDependencyKey(line);
    const inlineVersion = /\bversion\s*=\s*"(?<version>[^"]*)"/.exec(line);
    const version = inlineVersion?.groups?.version ?? assignment?.value;

    return Boolean(key && !TOML_NON_DEPENDENCY_KEYS.has(key) && version && isUnpinnedVersion(version));
  }

  return false;
}

function isResolutionOverrideLine(line: string): boolean {
  return /^"(?:overrides|resolutions)"\s*:/.test(line) || /^"pnpm"\s*:\s*\{.*"overrides"\s*:/.test(line);
}

function isNonRegistryVersion(version: string): boolean {
  return /^(?:git\+|github:|https?:|file:|link:|portal:)/i.test(version.trim());
}

function isUnpinnedVersion(version: string): boolean {
  const normalized = version.trim().toLowerCase();

  return (
    normalized === "" ||
    normalized === "*" ||
    normalized === "latest" ||
    normalized === "x" ||
    normalized === ">=0" ||
    normalized === ">=0.0.0" ||
    normalized === ">0" ||
    normalized === ">0.0.0"
  );
}

function isUnpinnedPythonRequirement(line: string): boolean {
  const value = stripInlineComment(line).trim();

  if (!value || isPythonDirectUrl(value) || /^(?:-r|--requirement|-c|--constraint)\b/.test(value)) {
    return false;
  }

  const nameOnly = /^[A-Za-z0-9_.-]+(?:\[.*\])?$/.test(value);

  if (nameOnly) {
    return true;
  }

  const match =
    /^[A-Za-z0-9_.-]+(?:\[.*\])?\s*(?<operator>==|>=|<=|~=|>|<|!=)\s*(?<version>[^#\s]+)/.exec(value);

  return Boolean(match?.groups?.version && isUnpinnedVersion(match.groups.version));
}

function isPythonDirectUrl(line: string): boolean {
  const value = stripInlineComment(line).trim();

  return (
    /^(?:git\+|https?:\/\/|file:)/i.test(value) ||
    /^[A-Za-z0-9_.-]+(?:\[.*\])?\s*@\s*(?:git\+|https?:\/\/|file:)/i.test(value)
  );
}

function parsePackageJsonStringEntry(line: string): { key: string; version: string } | undefined {
  const match = /^"(?<key>[@A-Za-z0-9_./-]+)"\s*:\s*"(?<version>[^"]*)"/.exec(line);

  return match?.groups?.key !== undefined && match.groups.version !== undefined
    ? { key: match.groups.key, version: match.groups.version }
    : undefined;
}

function parseTomlStringAssignment(line: string): { key: string; value: string } | undefined {
  const match = /^(?<key>[A-Za-z0-9_.-]+)\s*=\s*"(?<value>[^"]*)"/.exec(line);

  return match?.groups?.key !== undefined && match.groups.value !== undefined
    ? { key: match.groups.key, value: match.groups.value }
    : undefined;
}

function parseTomlDependencyKey(line: string): string | undefined {
  const match = /^(?<key>[A-Za-z0-9_.-]+)\s*=/.exec(line);

  return match?.groups?.key;
}

function parseQuotedPythonDependencySpec(line: string): string | undefined {
  const match = /^"(?<spec>[^"]+)"\s*,?$/.exec(line);

  return match?.groups?.spec;
}

function stripInlineComment(line: string): string {
  return line.replace(/\s+#.*$/, "");
}

function isIgnorableDependencyLine(line: string): boolean {
  const value = line.trim();

  return value === "" || value.startsWith("#") || value.startsWith("//");
}

function ecosystemForLockfileCheckedManifest(path: string): DependencyEcosystem | undefined {
  if (path.endsWith("package.json")) {
    return "npm";
  }

  if (path.endsWith("Cargo.toml")) {
    return "rust";
  }

  if (path.endsWith("go.mod")) {
    return "go";
  }

  return undefined;
}

function ecosystemForDependencyLockfile(path: string): DependencyEcosystem | undefined {
  if (
    path.endsWith("package-lock.json") ||
    path.endsWith("pnpm-lock.yaml") ||
    path.endsWith("yarn.lock") ||
    path.endsWith("bun.lockb")
  ) {
    return "npm";
  }

  if (path.endsWith("Cargo.lock")) {
    return "rust";
  }

  if (path.endsWith("go.sum")) {
    return "go";
  }

  return undefined;
}

function analyzeNonRegistrySources(file: DiffFile): Finding[] {
  const sourceLines = file.addedLines.filter((line) =>
    isNonRegistryDependencyLine(file.path, line.value.trim())
  );

  if (sourceLines.length === 0) {
    return [];
  }

  return [
    {
      ruleId: "dependency-non-registry-source",
      title: "Dependency uses a non-registry source",
      message: `${file.path} adds dependency entries that resolve outside the normal package registry.`,
      severity: "high",
      path: file.path,
      evidence: sourceLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Require an explicit provenance explanation and verify that the source is pinned to an immutable commit, tag, or internal policy-approved path."
    }
  ];
}

function analyzeUnpinnedDependencyDeclarations(file: DiffFile): Finding[] {
  const unpinnedLines = file.addedLines.filter((line) =>
    isUnpinnedDependencyLine(file.path, line.value.trim())
  );

  if (unpinnedLines.length === 0) {
    return [];
  }

  return [
    {
      ruleId: "dependency-unpinned-version",
      title: "Dependency version is not reproducibly pinned",
      message: `${file.path} adds dependency entries with latest, wildcard, empty, or overly broad versions.`,
      severity: "medium",
      path: file.path,
      evidence: unpinnedLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Pin the dependency to a deliberate version range and include the matching lockfile update, or explain why a broad range is required."
    }
  ];
}

function analyzeDependencyResolutionOverrides(file: DiffFile): Finding[] {
  if (!file.path.endsWith("package.json")) {
    return [];
  }

  const overrideLines = file.addedLines.filter((line) => isResolutionOverrideLine(line.value.trim()));

  if (overrideLines.length === 0) {
    return [];
  }

  return [
    {
      ruleId: "dependency-resolution-override",
      title: "Dependency resolution override changed",
      message: `${file.path} adds npm overrides, Yarn resolutions, or pnpm override configuration.`,
      severity: "high",
      path: file.path,
      evidence: overrideLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Review why transitive dependency resolution is being overridden and confirm the lockfile reflects the intended package graph."
    }
  ];
}

function analyzeDependencyLockfileConsistency(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];
  const changedLockfileEcosystems = new Set<DependencyEcosystem>();
  const changedManifestEcosystems = new Set<DependencyEcosystem>();
  const manifestDependencyFiles = files.filter(
    (file) => ecosystemForLockfileCheckedManifest(file.path) && hasDependencyManifestChange(file)
  );
  const lockfileFiles = files.filter((file) => ecosystemForDependencyLockfile(file.path));

  for (const file of lockfileFiles) {
    const ecosystem = ecosystemForDependencyLockfile(file.path);

    if (ecosystem) {
      changedLockfileEcosystems.add(ecosystem);
    }
  }

  for (const file of manifestDependencyFiles) {
    const ecosystem = ecosystemForLockfileCheckedManifest(file.path);

    if (ecosystem) {
      changedManifestEcosystems.add(ecosystem);
    }
  }

  for (const file of manifestDependencyFiles) {
    const ecosystem = ecosystemForLockfileCheckedManifest(file.path);

    if (!ecosystem || changedLockfileEcosystems.has(ecosystem)) {
      continue;
    }

    findings.push({
      ruleId: "dependency-lockfile-missing",
      title: "Dependency manifest changed without lockfile",
      message: `${file.path} changes dependency declarations, but no ${ecosystem} lockfile changed in the diff.`,
      severity: "medium",
      path: file.path,
      evidence: dependencyChangeEvidence(file),
      recommendation:
        "Commit the matching lockfile update, or explain why this ecosystem intentionally does not track a lockfile."
    });
  }

  for (const file of lockfileFiles) {
    const ecosystem = ecosystemForDependencyLockfile(file.path);

    if (!ecosystem || changedManifestEcosystems.has(ecosystem)) {
      continue;
    }

    findings.push({
      ruleId: "dependency-lockfile-only-change",
      title: "Lockfile changed without manifest change",
      message: `${file.path} changed, but no corresponding ${ecosystem} dependency manifest changed in the diff.`,
      severity: "medium",
      path: file.path,
      evidence: [`+${file.added} -${file.removed}`],
      recommendation:
        "Ask why the lockfile was regenerated or modified and verify that no unintended package graph change was introduced."
    });
  }

  return findings;
}

function analyzeMajorDependencyUpgrades(file: DiffFile): Finding[] {
  const removedDependencies = new Map<string, ParsedDependencyLine>();

  for (const line of file.removedLines) {
    const parsed = parseDependencyLine(file.path, line);

    if (parsed) {
      removedDependencies.set(parsed.name, parsed);
    }
  }

  const upgrades = file.addedLines
    .map((line) => parseDependencyLine(file.path, line))
    .filter((line): line is ParsedDependencyLine => Boolean(line))
    .map((added) => ({ added, removed: removedDependencies.get(added.name) }))
    .filter(
      (change): change is { added: ParsedDependencyLine; removed: ParsedDependencyLine } =>
        change.removed !== undefined && isMajorUpgrade(change.removed.version, change.added.version)
    );

  if (upgrades.length === 0) {
    return [];
  }

  return [
    {
      ruleId: "dependency-major-upgrade",
      title: "Dependency major version upgrade",
      message: `${file.path} upgrades one or more dependencies across a major version boundary.`,
      severity: "medium",
      path: file.path,
      evidence: upgrades.slice(0, 5).map(
        ({ added, removed }) =>
          `${added.line.lineNumber ? `line ${added.line.lineNumber}: ` : ""}${added.name} ${removed.version} -> ${
            added.version
          }`
      ),
      recommendation:
        "Check changelogs, migration notes, peer dependency impact, and whether tests cover the upgraded package surface."
    }
  ];
}

function analyzeLifecycleScripts(file: DiffFile): Finding[] {
  if (!file.path.endsWith("package.json")) {
    return [];
  }

  const lifecycleLines = file.addedLines.filter((line) =>
    /^"(?:preinstall|install|postinstall|prepare|prepublish|prepublishOnly)"\s*:/.test(line.value.trim())
  );

  if (lifecycleLines.length === 0) {
    return [];
  }

  return [
    {
      ruleId: "dependency-lifecycle-script",
      title: "Package lifecycle script changed",
      message: `${file.path} adds or changes npm lifecycle scripts that may run during install or publish.`,
      severity: "high",
      path: file.path,
      evidence: lifecycleLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Review whether the lifecycle script is necessary, whether it downloads or executes remote code, and whether it can affect consumers during install."
    }
  ];
}

function parseDependencyLine(path: string, line: ChangeLine): ParsedDependencyLine | undefined {
  const value = line.value.trim();

  if (path.endsWith("package.json")) {
    const entry = parsePackageJsonStringEntry(value);

    if (!entry || !entry.version || PACKAGE_JSON_NON_DEPENDENCY_KEYS.has(entry.key)) {
      return undefined;
    }

    if (
      !/^(?:\^|~|>=?|<=?|\d|workspace:|npm:|file:|link:|portal:|git\+|https?:|github:)/.test(
        entry.version
      )
    ) {
      return undefined;
    }

    return { name: entry.key, version: entry.version, line };
  }

  if (path.endsWith("requirements.txt")) {
    const match =
      /^(?<name>[A-Za-z0-9_.-]+)(?:\[.*\])?\s*(?:==|>=|<=|~=|>|<)\s*(?<version>[^#\s]+)/.exec(
        value
      );
    return match?.groups?.name && match.groups.version
      ? { name: match.groups.name, version: match.groups.version, line }
      : undefined;
  }

  if (path.endsWith("pyproject.toml") || path.endsWith("Cargo.toml")) {
    const assignment = parseTomlStringAssignment(value);

    if (assignment && TOML_NON_DEPENDENCY_KEYS.has(assignment.key)) {
      return undefined;
    }

    const match =
      /^(?<name>[A-Za-z0-9_.-]+)\s*=\s*"(?<version>(?:\^|~|>=?|<=?|\d|workspace:|path\s*=|git\s*=)[^"]*)"/.exec(
        value
      );
    return match?.groups?.name && match.groups.version
      ? { name: match.groups.name, version: match.groups.version, line }
      : undefined;
  }

  if (path.endsWith("go.mod")) {
    const match =
      /^(?:require\s+)?(?<name>[A-Za-z0-9_.\-/]+)\s+(?<version>v\d+\.\d+\.\d+)/.exec(
        value
      );
    return match?.groups?.name && match.groups.version
      ? { name: match.groups.name, version: match.groups.version, line }
      : undefined;
  }

  return undefined;
}

function isMajorUpgrade(previousVersion: string, nextVersion: string): boolean {
  const previousMajor = extractMajorVersion(previousVersion);
  const nextMajor = extractMajorVersion(nextVersion);

  return previousMajor !== undefined && nextMajor !== undefined && nextMajor > previousMajor;
}

function extractMajorVersion(version: string): number | undefined {
  const normalized = version
    .replace(/^workspace:/, "")
    .replace(/^npm:[^@]+@/, "")
    .replace(/^[~^<>=\s]+/, "")
    .replace(/^v/, "");
  const match = /(?<major>\d+)\.\d+\.\d+/.exec(normalized);
  const major = match?.groups?.major ? Number(match.groups.major) : undefined;

  return major !== undefined && Number.isInteger(major) ? major : undefined;
}

function analyzeWorkflowPermissions(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isWorkflowPath(candidate.path))) {
    const permissionLines = file.addedLines.filter((line) => isRiskyWorkflowPermissionLine(line.value));

    if (permissionLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "workflow-permission-change",
      title: "Workflow permission changed",
      message: `${file.path} adds or changes GitHub Actions permissions.`,
      severity: "high",
      path: file.path,
      evidence: permissionLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Check whether the workflow really needs write or token permissions and whether untrusted pull requests can reach it."
    });
  }

  return findings;
}

function isRiskyWorkflowPermissionLine(value: string): boolean {
  const line = value.trim();

  if (/^permissions:\s*write-all\b/i.test(line)) {
    return true;
  }

  return /^(?:actions|attestations|checks|contents|deployments|discussions|id-token|issues|models|packages|pages|pull-requests|repository-projects|security-events|statuses):\s*write\b/i.test(
    line
  );
}

function analyzeWorkflowDangerousTriggers(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isWorkflowPath(candidate.path))) {
    const triggerLines = file.addedLines.filter((line) =>
      /\bpull_request_target\b/.test(line.value.trim())
    );

    if (triggerLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "workflow-dangerous-trigger",
      title: "Workflow uses pull_request_target",
      message: `${file.path} adds pull_request_target, which runs with base repository context and can be risky for untrusted PRs.`,
      severity: "high",
      path: file.path,
      evidence: triggerLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Confirm the workflow does not check out or execute untrusted PR code with privileged tokens or write permissions."
    });
  }

  return findings;
}

function analyzeWorkflowUntrustedCheckout(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isWorkflowPath(candidate.path))) {
    const headCheckoutLines = file.addedLines.filter((line) =>
      isPullRequestHeadCheckoutLine(line.value)
    );

    if (headCheckoutLines.length === 0) {
      continue;
    }

    const hasPullRequestTarget = file.addedLines.some((line) =>
      /\bpull_request_target\b/.test(line.value.trim())
    );

    findings.push({
      ruleId: "workflow-untrusted-checkout",
      title: "Workflow checks out pull request head",
      message: hasPullRequestTarget
        ? `${file.path} combines pull_request_target with pull request head checkout references.`
        : `${file.path} checks out pull request head references; review the job privilege boundary before merging.`,
      severity: hasPullRequestTarget ? "high" : "medium",
      path: file.path,
      evidence: headCheckoutLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Avoid running untrusted PR code with write tokens, repository secrets, or privileged pull_request_target context."
    });
  }

  return findings;
}

function isPullRequestHeadCheckoutLine(value: string): boolean {
  const line = value.trim();

  return (
    /\bgithub\.head_ref\b/.test(line) ||
    /\bgithub\.event\.pull_request\.head(?:\.sha|\.ref|\.repo\.full_name)?\b/.test(line)
  );
}

function analyzeMcpConfigs(files: DiffFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files.filter((candidate) => isMcpConfigPath(candidate.path))) {
    const riskyLines = file.addedLines.filter((line) =>
      /env|token|secret|password|api[_-]?key|command|args/i.test(line.value.trim())
    );

    if (riskyLines.length === 0) {
      continue;
    }

    findings.push({
      ruleId: "mcp-credential-risk",
      title: "MCP configuration needs review",
      message: `${file.path} adds MCP configuration lines related to commands or credentials.`,
      severity: "high",
      path: file.path,
      evidence: riskyLines.slice(0, 5).map(formatEvidenceLine),
      recommendation:
        "Avoid committing credentials in MCP config. Review command and args values as local execution surface."
    });
  }

  return findings;
}

function formatEvidenceLine(line: ChangeLine): string {
  const value = line.value.trim();
  return line.lineNumber ? `line ${line.lineNumber}: ${value}` : value;
}

function formatEvidenceRequirement(requirement: EvidenceRequirement): string {
  return requirement;
}

function sensitivePathSeverity(path: string): "medium" | "high" {
  if (
    matchesAny(path, [
      "**/.env*",
      ".github/workflows/**",
      ".github/actions/**",
      "**/mcp*.json",
      "**/*mcp*.json"
    ])
  ) {
    return "high";
  }

  return "medium";
}
