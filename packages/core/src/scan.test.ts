import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "./reporters.js";
import { scanDiff } from "./scan.js";

describe("scanDiff", () => {
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
});
