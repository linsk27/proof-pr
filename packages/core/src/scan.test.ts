import { describe, expect, it } from "vitest";
import { parseConfig } from "./config.js";
import { renderMarkdownReport, renderSarifReport } from "./reporters.js";
import { scanDiff } from "./scan.js";

describe("scanDiff", () => {
  it("applies built-in config presets", () => {
    const config = parseConfig({ preset: "security-strict" });

    expect(config.preset).toBe("security-strict");
    expect(config.riskThreshold).toBe("medium");
    expect(config.sensitivePaths).toContain(".npmrc");
  });

  it("allows explicit config to override preset defaults", () => {
    const config = parseConfig({
      preset: "security-strict",
      riskThreshold: "high",
      sensitivePaths: ["custom/**"],
      requireTests: {
        enabled: false
      }
    });

    expect(config.riskThreshold).toBe("high");
    expect(config.sensitivePaths).toEqual(["custom/**"]);
    expect(config.requireTests.enabled).toBe(false);
    expect(config.requireTests.paths).toContain("server/**");
  });

  it("rejects unknown config presets", () => {
    expect(() => parseConfig({ preset: "strict" })).toThrow();
  });

  it("uses the MCP security preset to focus local agent configuration", () => {
    const result = scanDiff(
      `diff --git a/.cursor/settings.json b/.cursor/settings.json
index 0000000..1111111 100644
--- a/.cursor/settings.json
+++ b/.cursor/settings.json
@@ -1 +1,2 @@
 {}
+{"mcpServers":{"local":{"command":"node","args":["server.js"]}}}
`,
      {
        config: {
          preset: "mcp-security"
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "sensitive-path")).toBe(true);
    expect(result.summary.sensitiveFilesChanged).toBe(1);
  });

  it("detects possible committed secrets", () => {
    const result = scanDiff(`diff --git a/.env b/.env
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.env
@@ -0,0 +1 @@
+OPENAI_API_KEY=sk-projabcdefghijklmnopqrstuvwxyz123456
`);

    expect(result.risk).toBe("high");
    expect(result.reviewDecision).toBe("block-merge");
    expect(result.evidenceScore.value).toBeLessThan(70);
    expect(result.findings.some((finding) => finding.ruleId.startsWith("secret-detected"))).toBe(true);
  });

  it("flags code changes without test changes", () => {
    const result = scanDiff(`diff --git a/src/auth.ts b/src/auth.ts
index 0000000..1111111 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1,2 @@
 export function auth() {}
+export function logout() {}
`);

    expect(result.findings.some((finding) => finding.ruleId === "missing-tests")).toBe(true);
    expect(result.reviewDecision).toBe("needs-evidence");
    expect(result.evidenceScore.deductions.some((deduction) => deduction.reasonId === "missing-tests")).toBe(true);
    expect(result.reviewPlan.actionItems.some((action) => action.actionId === "add-verification-evidence")).toBe(true);
  });

  it("accepts PR body verification evidence when test files did not change", () => {
    const result = scanDiff(
      `diff --git a/src/auth.ts b/src/auth.ts
index 0000000..1111111 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1,2 @@
 export function auth() {}
+export function logout() {}
`,
      {
        pullRequest: {
          title: "Fix logout flow",
          body: "Manually tested logout in Chrome and verified the session cookie is cleared."
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "missing-tests")).toBe(false);
    expect(result.summary.verificationEvidence).toBe(true);
    expect(result.evidenceScore.strengths).toContain("Verification evidence was found.");
  });

  it("recognizes Chinese PR verification and reproduction evidence", () => {
    const result = scanDiff(
      `diff --git a/src/auth.ts b/src/auth.ts
index 0000000..1111111 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1,2 @@
 export function auth() {}
+export function logout() {}
`,
      {
        pullRequest: {
          title: "修复退出登录流程",
          body:
            "本次改动修复退出登录后的跳转问题。验证方式：本地运行单元测试并手动检查页面跳转。复现步骤：登录后点击退出登录，对比修改前后的跳转结果。预期结果：用户回到登录页。实际结果：已经符合预期。"
        }
      }
    );

    expect(result.summary.pullRequestDescription).toBe("present");
    expect(result.summary.verificationEvidence).toBe(true);
    expect(result.summary.reproductionEvidence).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "missing-tests")).toBe(false);
  });

  it("flags repository-defined evidence contracts when required evidence is missing", () => {
    const result = scanDiff(
      `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 0000000..1111111 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1 +1,2 @@
 export function Button() { return null; }
+export function PrimaryButton() { return null; }
`,
      {
        config: {
          evidence: {
            contracts: [
              {
                id: "ui-screenshot",
                title: "UI changes need screenshots",
                paths: ["src/components/**"],
                requires: ["screenshot", "verification"],
                severity: "medium"
              }
            ]
          }
        },
        pullRequest: {
          title: "Update button",
          body: "This updates the primary button style and spacing so the layout is easier to scan."
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "evidence-contract:ui-screenshot")).toBe(true);
    expect(result.summary.screenshotEvidence).toBe(false);
    expect(result.reviewPlan.actionItems.some((action) => action.actionId === "satisfy-evidence-contract")).toBe(true);
  });

  it("accepts repository-defined evidence contracts when PR evidence is present", () => {
    const result = scanDiff(
      `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 0000000..1111111 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1 +1,2 @@
 export function Button() { return null; }
+export function PrimaryButton() { return null; }
`,
      {
        config: {
          evidence: {
            contracts: [
              {
                id: "ui-screenshot",
                paths: ["src/components/**"],
                requires: ["screenshot", "verification"],
                severity: "medium"
              }
            ]
          }
        },
        pullRequest: {
          title: "Update button",
          body: "Verified with pnpm test. Screenshot attached with before/after UI comparison."
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "evidence-contract:ui-screenshot")).toBe(false);
    expect(result.summary.screenshotEvidence).toBe(true);
    expect(result.summary.verificationEvidence).toBe(true);
  });

  it("uses security-strict evidence contracts for workflow changes", () => {
    const result = scanDiff(
      `diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 0000000..1111111 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1 +1,2 @@
 name: CI
+permissions: write-all
`,
      {
        config: {
          preset: "security-strict"
        },
        pullRequest: {
          title: "Update CI",
          body: "Update CI workflow."
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "evidence-contract:workflow-permission-rationale")).toBe(true);
    expect(result.summary.permissionRationaleEvidence).toBe(false);
  });

  it("flags missing PR context for sensitive changes", () => {
    const result = scanDiff(
      `diff --git a/.github/workflows/release.yml b/.github/workflows/release.yml
index 0000000..1111111 100644
--- a/.github/workflows/release.yml
+++ b/.github/workflows/release.yml
@@ -1 +1,2 @@
 name: release
+permissions: write-all
`,
      {
        pullRequest: {
          title: "update workflow",
          body: ""
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "thin-pr-description")).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === "missing-reproduction-context")).toBe(true);
    expect(result.reviewPlan.focusFiles.some((file) => file.path === ".github/workflows/release.yml")).toBe(true);
    expect(
      result.findings
        .find((finding) => finding.ruleId === "workflow-permission-change")
        ?.evidence?.some((item) => item.startsWith("line 2:"))
    ).toBe(true);
  });

  it("does not treat package scripts as dependency additions", () => {
    const result = scanDiff(`diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1 +1,2 @@
 {
+  "typecheck": "pnpm --filter @proof-pr/core build && pnpm -r typecheck"
`);

    expect(result.findings.some((finding) => finding.ruleId === "dependency-added")).toBe(false);
  });

  it("does not treat package metadata version changes as dependency additions", () => {
    const result = scanDiff(`diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1 +1,2 @@
 {
+  "version": "0.1.3"
`);

    expect(result.findings.some((finding) => finding.ruleId === "dependency-added")).toBe(false);
  });

  it("flags package dependency additions", () => {
    const result = scanDiff(`diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1 +1,2 @@
 {
+  "left-pad": "^1.3.0"
`);

    expect(result.findings.some((finding) => finding.ruleId === "dependency-added")).toBe(true);
  });

  it("flags dependency major version upgrades", () => {
    const result = scanDiff(`diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
 {
-  "react": "^18.2.0"
+  "react": "^19.0.0"
 }
`);

    const finding = result.findings.find((item) => item.ruleId === "dependency-major-upgrade");

    expect(finding).toBeDefined();
    expect(finding?.evidence?.[0]).toContain("react ^18.2.0 -> ^19.0.0");
    expect(
      result.reviewPlan.actionItems.some(
        (action) => action.actionId === "review-major-dependency-upgrade"
      )
    ).toBe(true);
  });

  it("can disable dependency major version upgrade checks", () => {
    const result = scanDiff(
      `diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
 {
-  "react": "^18.2.0"
+  "react": "^19.0.0"
 }
`,
      {
        config: {
          dependencies: {
            flagNewPackages: true,
            flagLifecycleScripts: true,
            flagMajorUpgrades: false
          }
        }
      }
    );

    expect(result.findings.some((finding) => finding.ruleId === "dependency-major-upgrade")).toBe(false);
  });

  it("flags package lifecycle scripts", () => {
    const result = scanDiff(`diff --git a/package.json b/package.json
index 0000000..1111111 100644
--- a/package.json
+++ b/package.json
@@ -1,3 +1,4 @@
 {
   "scripts": {
+    "postinstall": "node scripts/postinstall.js"
   }
 }
`);

    expect(result.risk).toBe("high");
    expect(result.reviewDecision).toBe("block-merge");
    expect(result.findings.some((finding) => finding.ruleId === "dependency-lifecycle-script")).toBe(true);
    expect(
      result.reviewPlan.actionItems.some(
        (action) => action.actionId === "review-package-lifecycle-script"
      )
    ).toBe(true);
  });

  it("flags pull_request_target workflow triggers", () => {
    const result = scanDiff(`diff --git a/.github/workflows/pr.yml b/.github/workflows/pr.yml
index 0000000..1111111 100644
--- a/.github/workflows/pr.yml
+++ b/.github/workflows/pr.yml
@@ -1 +1,3 @@
 name: pr
+on:
+  pull_request_target:
`);

    expect(result.risk).toBe("high");
    expect(result.reviewDecision).toBe("block-merge");
    expect(result.findings.some((finding) => finding.ruleId === "workflow-dangerous-trigger")).toBe(true);
    expect(
      result.reviewPlan.actionItems.some(
        (action) => action.actionId === "review-privileged-pr-trigger"
      )
    ).toBe(true);
  });

  it("keeps documentation-only changes low risk", () => {
    const result = scanDiff(`diff --git a/docs/usage.md b/docs/usage.md
index 0000000..1111111 100644
--- a/docs/usage.md
+++ b/docs/usage.md
@@ -1 +1,2 @@
 # Usage
+Run proof-pr scan before opening a pull request.
`);

    expect(result.risk).toBe("low");
    expect(result.findings).toHaveLength(0);
    expect(result.evidenceScore.value).toBeGreaterThanOrEqual(85);
    expect(result.reviewDecision).toBe("ready");
  });

  it("renders a Simplified Chinese Markdown report", () => {
    const result = scanDiff(`diff --git a/src/auth.ts b/src/auth.ts
index 0000000..1111111 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1 +1,2 @@
 export function auth() {}
+export function logout() {}
`);
    const report = renderMarkdownReport(result, "zh-CN");

    expect(report).toContain("# ProofPR 审查报告");
    expect(report).toContain("风险等级");
    expect(report).toContain("证据评分");
    expect(report).toContain("Review 门禁");
    expect(report).toContain("Review 行动清单");
    expect(report).toContain("风险发现");
  });

  it("renders SARIF locations for file findings", () => {
    const result = scanDiff(`diff --git a/.env b/.env
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.env
@@ -0,0 +1 @@
+OPENAI_API_KEY=sk-projabcdefghijklmnopqrstuvwxyz123456
`);
    const sarif = JSON.parse(renderSarifReport(result)) as {
      runs: Array<{ results: Array<{ locations?: Array<{ physicalLocation: { artifactLocation: { uri: string } } }> }> }>;
    };

    expect(sarif.runs[0]?.results[0]?.locations?.[0]?.physicalLocation.artifactLocation.uri).toBe(".env");
  });
});
