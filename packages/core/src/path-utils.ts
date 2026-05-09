import picomatch from "picomatch";

export function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => picomatch.isMatch(path, pattern, { dot: true }));
}

export function isTestPath(path: string): boolean {
  return matchesAny(path, [
    "**/*.test.*",
    "**/*.spec.*",
    "**/__tests__/**",
    "**/tests/**",
    "test/**",
    "tests/**"
  ]);
}

export function isCodePath(path: string): boolean {
  return matchesAny(path, [
    "**/*.c",
    "**/*.cc",
    "**/*.cpp",
    "**/*.cs",
    "**/*.go",
    "**/*.java",
    "**/*.js",
    "**/*.jsx",
    "**/*.kt",
    "**/*.mjs",
    "**/*.py",
    "**/*.rs",
    "**/*.ts",
    "**/*.tsx"
  ]);
}

export function isDependencyManifest(path: string): boolean {
  return matchesAny(path, [
    "package.json",
    "**/package.json",
    "requirements.txt",
    "**/requirements.txt",
    "pyproject.toml",
    "**/pyproject.toml",
    "Cargo.toml",
    "**/Cargo.toml",
    "go.mod",
    "**/go.mod"
  ]);
}

export function isWorkflowPath(path: string): boolean {
  return matchesAny(path, [".github/workflows/**", ".github/actions/**"]);
}

export function isMcpConfigPath(path: string): boolean {
  return matchesAny(path, ["**/mcp*.json", "**/*mcp*.json", "**/.mcp/**"]);
}
