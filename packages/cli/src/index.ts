#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { Command, InvalidArgumentError } from "commander";
import {
  listConfigPresets,
  loadConfig,
  parseLocale,
  parsePreset,
  renderHtmlReport,
  renderMarkdownReport,
  renderSarifReport,
  riskMeetsThreshold,
  scanDiff,
  type ConfigPreset,
  type ProofPRConfig,
  type ReportLocale,
  type ReviewDecision,
  type RiskLevel
} from "@proof-pr/core";

const execFileAsync = promisify(execFile);
const CLI_VERSION = "0.1.17";

type OutputFormat = "json" | "markdown" | "sarif" | "html";
type FailLevel = RiskLevel | "never";
type DoctorLevel = "pass" | "warn" | "fail" | "info";

interface ScanCommandOptions {
  base?: string;
  head: string;
  diffFile?: string;
  prTitle?: string;
  prBody?: string;
  prBodyFile?: string;
  config: string;
  format: OutputFormat;
  output?: string;
  locale?: ReportLocale;
  failOn: FailLevel;
}

interface InitCommandOptions {
  configPath: string;
  workflowPath: string;
  prTemplate: boolean;
  prTemplatePath: string;
  htmlReport: boolean;
  htmlOutput: string;
  preset: ConfigPreset;
  failOn: FailLevel;
  force: boolean;
}

interface DoctorCommandOptions {
  config: string;
  workflowPath: string;
  prTemplatePath: string;
  base: string;
  head: string;
}

interface TemplateCommandOptions {
  output: string;
  force: boolean;
}

interface DoctorCheck {
  level: DoctorLevel;
  title: string;
  detail?: string;
}

interface DoctorReport {
  checks: DoctorCheck[];
  nextSteps: string[];
}

interface DemoCase {
  id: string;
  title: string;
  description: string;
  diffText: string;
  config?: Partial<ProofPRConfig>;
  pullRequest?: {
    title?: string;
    body?: string;
  };
}

interface DemoCommandOptions {
  list: boolean;
  format: OutputFormat;
  output?: string;
  locale?: ReportLocale;
}

type BenchmarkOutputFormat = "text" | "json" | "markdown";

interface BenchmarkCommandOptions {
  cases: string;
  format: BenchmarkOutputFormat;
  output?: string;
}

interface BenchmarkCase {
  id: string;
  title?: string;
  category?: string;
  diffFile: string;
  config?: Partial<ProofPRConfig>;
  pullRequest?: {
    title?: string;
    body?: string;
  };
  expect: {
    risk?: RiskLevel;
    reviewDecision?: ReviewDecision;
    findings?: string[];
    absentFindings?: string[];
  };
}

interface BenchmarkCaseResult {
  id: string;
  title?: string;
  category: string;
  passed: boolean;
  failures: string[];
  actual: {
    risk: RiskLevel;
    reviewDecision: ReviewDecision;
    findings: string[];
  };
}

interface BenchmarkSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  categories: Array<{
    category: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }>;
  findingCounts: Array<{
    ruleId: string;
    count: number;
  }>;
}

interface BenchmarkReport {
  summary: BenchmarkSummary;
  results: BenchmarkCaseResult[];
}

const DEMO_CASES: DemoCase[] = [
  {
    id: "workflow",
    title: "高权限 workflow 运行不可信 PR 代码",
    description: "演示 pull_request_target 与 PR head checkout 组合风险。",
    diffText: `diff --git a/.github/workflows/pr.yml b/.github/workflows/pr.yml
index 1111111..2222222 100644
--- a/.github/workflows/pr.yml
+++ b/.github/workflows/pr.yml
@@ -1,7 +1,17 @@
 name: PR automation
 on:
+  pull_request_target:
+    types: [opened, synchronize]
+
 jobs:
   test:
     runs-on: ubuntu-latest
     steps:
-      - uses: actions/checkout@v4
+      - uses: actions/checkout@v4
+        with:
+          repository: \${{ github.event.pull_request.head.repo.full_name }}
+          ref: \${{ github.event.pull_request.head.sha }}
+      - run: pnpm install
+      - run: pnpm test
`
  },
  {
    id: "secret",
    title: "疑似 secret 被提交",
    description: "演示 .env、OpenAI key、数据库连接串等敏感内容会被拦截。",
    diffText: `diff --git a/.env b/.env
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.env
@@ -0,0 +1,2 @@
+OPENAI_API_KEY=sk-proj-examplevalueexamplevalue1234567890
+DATABASE_URL=postgres://demo:super-secret-password@example.com:5432/app
`
  },
  {
    id: "dependency",
    title: "依赖供应链风险",
    description: "演示依赖大版本升级、非注册表来源、未固定版本和缺少 lockfile 的组合风险。",
    diffText: `diff --git a/package.json b/package.json
index 1111111..2222222 100644
--- a/package.json
+++ b/package.json
@@ -1,8 +1,10 @@
 {
   "dependencies": {
-    "react": "^18.2.0",
+    "react": "^19.0.0",
+    "internal-kit": "github:acme/internal-kit",
+    "left-pad": "latest",
     "zod": "^3.25.1"
   },
   "devDependencies": {
     "typescript": "^5.9.3"
   }
 }
`
  },
  {
    id: "mcp",
    title: "MCP 本地命令和凭据面",
    description: "演示 MCP / agent 配置中的 command、args、env 风险。",
    diffText: `diff --git a/.cursor/mcp.json b/.cursor/mcp.json
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/.cursor/mcp.json
@@ -0,0 +1,11 @@
+{
+  "mcpServers": {
+    "local-admin": {
+      "command": "node",
+      "args": ["scripts/admin-server.js"],
+      "env": {
+        "API_TOKEN": "\${LOCAL_API_TOKEN}"
+      }
+    }
+  }
+}
`,
    config: { preset: "mcp-security" }
  },
  {
    id: "ui-evidence",
    title: "UI 改动缺少截图证据",
    description: "演示 Evidence Contract：组件改动必须提供截图和验证说明。",
    diffText: `diff --git a/src/components/Button.tsx b/src/components/Button.tsx
index 1111111..2222222 100644
--- a/src/components/Button.tsx
+++ b/src/components/Button.tsx
@@ -1,3 +1,7 @@
 export function Button() {
-  return <button>Save</button>;
+  return (
+    <button className="primary">
+      Save
+    </button>
+  );
 }
`,
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
      title: "Update button styling",
      body: "This updates the primary button style and spacing so the layout is easier to scan."
    }
  }
];

const program = new Command();

program
  .name("proof-pr")
  .description("Review pull request evidence, scope, and safety before maintainers spend time on it.")
  .version(CLI_VERSION);

program
  .command("guide")
  .description("Show a copy-paste friendly guide for common ProofPR tasks.")
  .action(() => {
    process.stdout.write(renderGuide());
  });

program
  .command("doctor")
  .description("Check whether ProofPR is installed correctly in the current repository.")
  .option("--config <path>", "Path to .proofpr.yml.", ".proofpr.yml")
  .option("--workflow-path <path>", "Path to the GitHub Actions workflow.", ".github/workflows/proofpr.yml")
  .option("--pr-template-path <path>", "Path to the pull request template.", ".github/pull_request_template.md")
  .option("--base <ref>", "Base git ref used for local diff checks.", "origin/main")
  .option("--head <ref>", "Head git ref used for local diff checks.", "HEAD")
  .action(async (options: DoctorCommandOptions) => {
    const report = await runDoctor(options);
    process.stdout.write(renderDoctorReport(report));

    if (report.checks.some((check) => check.level === "fail")) {
      process.exitCode = 1;
    }
  });

program
  .command("template")
  .description("Create a ProofPR-friendly pull request template.")
  .option("--output <path>", "Path to write the pull request template.", ".github/pull_request_template.md")
  .option("--force", "Overwrite the existing template.", false)
  .action(async (options: TemplateCommandOptions) => {
    await writeIfMissing(options.output, renderPullRequestTemplate(), options.force);
    process.stdout.write(
      `ProofPR pull request template written to ${options.output}\n\nNext:\n1. Commit the template.\n2. Ask contributors to fill verification, reproduction, screenshot, changelog, and permission rationale sections when relevant.\n3. Run npx proof-pr@latest doctor to check setup.\n`
    );
  });

program
  .command("demo")
  .description("Run a built-in ProofPR demo case without cloning this repository.")
  .argument("[case]", "Demo case id. Use --list to see available cases.", "workflow")
  .option("--list", "List built-in demo cases.", false)
  .option("--format <format>", "Output format: markdown, json, sarif, or html.", parseFormat, "markdown")
  .option("--output <path>", "Write demo report output to a file instead of stdout.")
  .option("--locale <locale>", "Report language: en or zh-CN.", "zh-CN")
  .action(async (caseId: string, options: DemoCommandOptions) => {
    if (options.list) {
      process.stdout.write(renderDemoList());
      return;
    }

    const demoCase = DEMO_CASES.find((item) => item.id === caseId);
    if (!demoCase) {
      throw new Error(`Unknown demo case "${caseId}". Run "proof-pr demo --list" to see available cases.`);
    }

    const result = scanDiff(demoCase.diffText, {
      config: demoCase.config,
      pullRequest: demoCase.pullRequest
    });
    const locale = parseLocale(options.locale, "zh-CN");
    const output = renderDemoOutput(demoCase, result, options.format, locale);

    if (options.output) {
      await writeOutput(options.output, `${output}\n`);
      process.stdout.write(`ProofPR demo ${options.format} report written to ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  });

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
  .option("--format <format>", "Output format: markdown, json, sarif, or html.", parseFormat, "markdown")
  .option("--output <path>", "Write report output to a file instead of stdout.")
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

    if (options.output) {
      await writeOutput(options.output, `${output}\n`);
      process.stdout.write(`ProofPR ${options.format} report written to ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }

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
  .option("--no-pr-template", "Skip creating .github/pull_request_template.md.")
  .option(
    "--pr-template-path <path>",
    "Path to write the pull request template.",
    ".github/pull_request_template.md"
  )
  .option("--no-html-report", "Skip writing and uploading the default HTML visual report artifact.")
  .option("--html-output <path>", "Path for the HTML report generated in GitHub Actions.", "proofpr-report.html")
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
    await writeIfMissing(
      options.workflowPath,
      renderWorkflowTemplate(options.failOn, options.htmlReport, options.htmlOutput),
      options.force
    );
    const created = [options.configPath, options.workflowPath];
    const skipped: string[] = [];

    if (options.prTemplate) {
      const wroteTemplate = await writeIfMissingSoft(
        options.prTemplatePath,
        renderPullRequestTemplate(),
        options.force
      );

      if (wroteTemplate) {
        created.push(options.prTemplatePath);
      } else {
        skipped.push(`${options.prTemplatePath} already exists`);
      }
    }

    process.stdout.write(
      `ProofPR initialized.\n\nCreated:\n${created.map((item) => `- ${item}`).join("\n")}${skipped.length > 0 ? `\n\nSkipped:\n${skipped.map((item) => `- ${item}`).join("\n")}` : ""}\n\nNext:\n1. Commit these files.\n2. Open or update a pull request.\n3. Read the ProofPR comment, Actions summary, annotations${options.htmlReport ? `, and ${options.htmlOutput} artifact` : ""}.\n\nLocal check:\nnpx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN\n\nNeed another task?\nnpx proof-pr@latest guide\n`
    );
  });

program
  .command("benchmark")
  .description("Run ProofPR benchmark cases and compare expected risk/finding output.")
  .option("--cases <dir>", "Directory containing benchmark case JSON files.", "benchmarks/cases")
  .option("--format <format>", "Output format: text, markdown, or json.", parseBenchmarkFormat, "text")
  .option("--output <path>", "Write benchmark output to a file instead of stdout.")
  .action(async (options: BenchmarkCommandOptions) => {
    const report = await runBenchmarks(options.cases);
    let output: string;

    if (options.format === "json") {
      output = `${JSON.stringify(report, null, 2)}\n`;
    } else if (options.format === "markdown") {
      output = renderBenchmarkMarkdown(report);
    } else {
      output = renderBenchmarkText(report);
    }

    if (options.output) {
      await writeOutput(options.output, output);
      process.stdout.write(`ProofPR benchmark report written to ${options.output}\n`);
    } else {
      process.stdout.write(output);
    }

    if (report.results.some((result) => !result.passed)) {
      process.exitCode = 1;
    }
  });

const args = process.argv.slice(2);
const parseTask =
  args.length === 0
    ? Promise.resolve(process.stdout.write(renderGuide()))
    : program.parseAsync(process.argv);

parseTask.catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ProofPR failed: ${message}\n`);
  process.exitCode = 1;
});

function renderGuide(): string {
  return `ProofPR 功能菜单

最推荐先做第 1 步。已经接入过的项目，按目标复制下面的命令即可。

1. 接入 GitHub PR 自动检查
   npx proof-pr@latest init
   然后提交 .proofpr.yml、.github/workflows/proofpr.yml 和 .github/pull_request_template.md，打开 PR 后看评论、Actions summary、annotations 和 HTML artifact。

2. 体检当前仓库接入状态
   npx proof-pr@latest doctor
   检查配置文件、workflow、PR 模板、Action 版本、PR 权限和本地 diff 是否正常。

3. 已接入仓库，单独补 PR 模板
   npx proof-pr@latest template
   引导贡献者填写验证、复现、截图、changelog 和权限理由。

4. 本地检查当前分支
   npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN
   适合在发 PR 前先看风险、证据评分和 Review 行动清单。

5. 生成可分享 HTML 报告
   npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN --format html --output proofpr-report.html
   生成后用浏览器打开 proofpr-report.html。

6. 生成 GitHub Code Scanning 的 SARIF
   npx proof-pr@latest scan --base origin/main --head HEAD --format sarif --output proofpr.sarif
   适合在 CI 里配合 github/codeql-action/upload-sarif 使用。

7. 不接入仓库，先试跑内置案例
   npx proof-pr@latest demo workflow --locale zh-CN
   不需要 clone 仓库或寻找 examples 文件，也能快速看到 ProofPR 会抓什么风险。

8. 查看所有内置案例
   npx proof-pr@latest demo --list

9. 验证规则样本是否仍然命中
   npx proof-pr@latest benchmark --cases benchmarks/cases
   适合维护 ProofPR 规则或发版前回归。

10. 调整审查强度
   打开 .proofpr.yml，把 preset 改成 security-strict、dependency-careful 或 mcp-security。

结果在哪里看：
- GitHub Action：PR Conversation 评论、Actions summary、Checks 状态、workflow annotations、proofpr-report artifact。
- 本地 CLI：终端输出；如果用了 --output，就看写出的 HTML / JSON / SARIF / Markdown 文件。
`;
}

function renderDemoList(): string {
  const rows = DEMO_CASES.map((item) => `- ${item.id}: ${item.title}\n  ${item.description}`).join("\n");

  return `ProofPR 内置案例

用法：
npx proof-pr@latest demo <case> --locale zh-CN

可用案例：
${rows}
`;
}

function renderDemoOutput(
  demoCase: DemoCase,
  result: ReturnType<typeof scanDiff>,
  format: OutputFormat,
  locale: ReportLocale
): string {
  if (format === "json") {
    return JSON.stringify(
      {
        demo: {
          id: demoCase.id,
          title: demoCase.title,
          description: demoCase.description
        },
        result
      },
      null,
      2
    );
  }

  if (format === "markdown") {
    return `# ProofPR demo: ${demoCase.title}

${demoCase.description}

${renderMarkdownReport(result, locale)}`;
  }

  return renderOutput(result, format, locale);
}

async function runDoctor(options: DoctorCommandOptions): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const nextSteps = new Set<string>();

  if (await pathExists(options.config)) {
    try {
      const config = await loadConfig(options.config);
      checks.push({
        level: "pass",
        title: `${options.config} 可读取`,
        detail: `locale=${config.locale}, preset=${config.preset}, riskThreshold=${config.riskThreshold}`
      });

      if (config.comment.enabled) {
        checks.push({ level: "pass", title: "PR 评论已启用", detail: "comment.enabled=true" });
      } else {
        checks.push({ level: "warn", title: "PR 评论未启用", detail: "comment.enabled=false" });
        nextSteps.add("如果希望在 PR Conversation 里看到报告，把 .proofpr.yml 的 comment.enabled 改成 true。");
      }
    } catch (error) {
      checks.push({
        level: "fail",
        title: `${options.config} 解析失败`,
        detail: error instanceof Error ? error.message : String(error)
      });
      nextSteps.add("修复 .proofpr.yml 的 YAML 格式，或重新运行 npx proof-pr@latest init --force。");
    }
  } else {
    checks.push({ level: "fail", title: `缺少 ${options.config}` });
    nextSteps.add("运行 npx proof-pr@latest init 生成 .proofpr.yml 和 GitHub Actions workflow。");
  }

  if (await pathExists(options.workflowPath)) {
    const workflow = await readFile(options.workflowPath, "utf8");
    checks.push({ level: "pass", title: `${options.workflowPath} 已存在` });
    inspectWorkflow(workflow, checks, nextSteps);
  } else {
    checks.push({ level: "fail", title: `缺少 ${options.workflowPath}` });
    nextSteps.add("运行 npx proof-pr@latest init 生成 .github/workflows/proofpr.yml。");
  }

  await inspectPullRequestTemplate(options.prTemplatePath, checks, nextSteps);
  await inspectGitDiff(options, checks, nextSteps);

  if (nextSteps.size === 0) {
    nextSteps.add("当前接入状态正常；可以打开 PR，或运行 npx proof-pr@latest scan --base origin/main --head HEAD --locale zh-CN 做本地自查。");
  }

  return { checks, nextSteps: [...nextSteps] };
}

function inspectWorkflow(workflow: string, checks: DoctorCheck[], nextSteps: Set<string>): void {
  if (/pull_request\s*:/.test(workflow)) {
    checks.push({ level: "pass", title: "workflow 会在 Pull Request 事件运行" });
  } else {
    checks.push({ level: "fail", title: "workflow 没有监听 pull_request" });
    nextSteps.add("确认 .github/workflows/proofpr.yml 包含 on.pull_request。");
  }

  const actionVersion = workflow.match(/linsk27\/proof-pr@(v[0-9]+\.[0-9]+\.[0-9]+)/)?.[1];
  if (!actionVersion) {
    checks.push({ level: "fail", title: "workflow 没有使用 linsk27/proof-pr Action" });
    nextSteps.add(`把 workflow step 更新为 uses: linsk27/proof-pr@v${CLI_VERSION}。`);
  } else if (actionVersion === `v${CLI_VERSION}`) {
    checks.push({ level: "pass", title: `GitHub Action 版本为 ${actionVersion}` });
  } else {
    checks.push({
      level: "warn",
      title: `GitHub Action 版本较旧：${actionVersion}`,
      detail: `当前 CLI 版本是 v${CLI_VERSION}`
    });
    nextSteps.add(`把 workflow 里的 uses 更新为 linsk27/proof-pr@v${CLI_VERSION}。`);
  }

  if (/pull-requests\s*:\s*write/.test(workflow)) {
    checks.push({ level: "pass", title: "workflow 具备写 PR 评论权限" });
  } else {
    checks.push({ level: "warn", title: "workflow 可能缺少 pull-requests: write 权限" });
    nextSteps.add("如果需要自动评论 PR，在 workflow permissions 中加入 pull-requests: write。");
  }

  if (/contents\s*:\s*read/.test(workflow)) {
    checks.push({ level: "pass", title: "workflow 具备读取仓库内容权限" });
  } else {
    checks.push({ level: "warn", title: "workflow 未显式声明 contents: read" });
    nextSteps.add("建议在 workflow permissions 中加入 contents: read。");
  }

  if (/html-output\s*:/.test(workflow)) {
    checks.push({ level: "pass", title: "workflow 会生成 HTML 可视化报告" });

    if (/actions\/upload-artifact@v\d+/.test(workflow)) {
      checks.push({ level: "pass", title: "workflow 会上传 proofpr-report artifact" });
    } else {
      checks.push({ level: "warn", title: "HTML 报告已生成，但没有上传为 artifact" });
      nextSteps.add("在 workflow 里加入 actions/upload-artifact@v4，把 proofpr-report.html 上传为 proofpr-report。");
    }
  } else {
    checks.push({ level: "warn", title: "workflow 未启用 HTML 可视化报告 artifact" });
    nextSteps.add("想让新用户更直观看报告时，重新运行 npx proof-pr@latest init --force，或在 Action step 中加入 html-output: proofpr-report.html。");
  }
}

async function inspectPullRequestTemplate(
  path: string,
  checks: DoctorCheck[],
  nextSteps: Set<string>
): Promise<void> {
  if (!(await pathExists(path))) {
    checks.push({ level: "warn", title: `缺少 ${path}` });
    nextSteps.add("运行 npx proof-pr@latest template 生成 PR 模板，引导贡献者补充验证、复现、截图和权限理由。");
    return;
  }

  const template = await readFile(path, "utf8");
  checks.push({ level: "pass", title: `${path} 已存在` });

  if (/验证|verification|test/i.test(template)) {
    checks.push({ level: "pass", title: "PR 模板会提示验证证据" });
  } else {
    checks.push({ level: "warn", title: "PR 模板没有明显的验证证据提示" });
    nextSteps.add("在 PR 模板中加入“验证方式”栏目，减少 ProofPR 报告里的证据不足。");
  }

  if (/复现|reproduction|before|after|截图|screenshot|权限|permission/i.test(template)) {
    checks.push({ level: "pass", title: "PR 模板覆盖复现、截图或权限理由提示" });
  } else {
    checks.push({ level: "warn", title: "PR 模板缺少复现、截图或权限理由提示" });
    nextSteps.add("在 PR 模板中加入复现、截图、changelog、权限理由等可选栏目。");
  }
}

async function inspectGitDiff(
  options: DoctorCommandOptions,
  checks: DoctorCheck[],
  nextSteps: Set<string>
): Promise<void> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"]);
    if (stdout.trim() !== "true") {
      checks.push({ level: "warn", title: "当前目录不是 Git 仓库" });
      nextSteps.add("进入项目 Git 仓库根目录后再运行 npx proof-pr@latest doctor。");
      return;
    }
  } catch {
    checks.push({ level: "warn", title: "当前目录不是 Git 仓库" });
    nextSteps.add("进入项目 Git 仓库根目录后再运行 npx proof-pr@latest doctor。");
    return;
  }

  checks.push({ level: "pass", title: "当前目录位于 Git 仓库中" });

  try {
    const branch = (await execFileAsync("git", ["branch", "--show-current"])).stdout.trim();
    checks.push({
      level: "info",
      title: branch ? `当前分支：${branch}` : "当前处于 detached HEAD"
    });
  } catch {
    checks.push({ level: "info", title: "无法读取当前分支名" });
  }

  try {
    const diff = await readGitDiff(options.base, options.head);
    checks.push({
      level: "pass",
      title: `可以读取 ${options.base}...${options.head} diff`,
      detail: diff.length === 0 ? "当前没有可扫描的 diff。" : `diff 大小约 ${diff.length} 字符。`
    });
  } catch (error) {
    checks.push({
      level: "warn",
      title: `无法读取 ${options.base}...${options.head} diff`,
      detail: error instanceof Error ? error.message : String(error)
    });
    nextSteps.add(`运行 git fetch origin 后重试；如果主分支不是 main，请使用 --base origin/master 或你的实际主分支。`);
  }
}

function renderDoctorReport(report: DoctorReport): string {
  const failCount = report.checks.filter((check) => check.level === "fail").length;
  const warnCount = report.checks.filter((check) => check.level === "warn").length;
  const status = failCount > 0 ? "需要先修复" : warnCount > 0 ? "基本可用，但建议优化" : "接入正常";
  const checks = report.checks
    .map((check) => {
      const detail = check.detail ? `\n       ${check.detail}` : "";
      return `[${check.level}] ${check.title}${detail}`;
    })
    .join("\n");
  const nextSteps = report.nextSteps.map((step) => `- ${step}`).join("\n");

  return `ProofPR doctor

状态：${status}
统计：${failCount} fail, ${warnCount} warn, ${report.checks.length} checks

Checks:
${checks}

Next:
${nextSteps}
`;
}

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

async function writeIfMissingSoft(path: string, contents: string, force: boolean): Promise<boolean> {
  if (!force && (await pathExists(path))) {
    return false;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return true;
}

async function writeOutput(path: string, contents: string): Promise<void> {
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

# 想更严格时，把 preset 改成 security-strict / dependency-careful / mcp-security。
# 详细配置见 docs/configuration.md。
`;
}

function renderWorkflowTemplate(failOn: FailLevel, htmlReport: boolean, htmlOutput: string): string {
  const htmlReportSteps = htmlReport
    ? `          html-output: ${htmlOutput}
      - name: Upload ProofPR visual report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: proofpr-report
          path: ${htmlOutput}
`
    : "";

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
      - uses: linsk27/proof-pr@v${CLI_VERSION}
        with:
          fail-on: ${failOn}
          comment: "true"
          annotations: "true"
${htmlReportSteps}`;
}

function renderPullRequestTemplate(): string {
  return `## 变更说明

请说明这个 PR 为什么需要、改了什么、影响范围是什么。

## 验证方式

- [ ] 已运行自动化测试：
- [ ] 已完成手动验证：
- [ ] 不需要测试，原因：

## 复现 / Before & After

如果是 bug fix，请写复现步骤、预期结果和实际结果。
如果是 UI 改动，请附 before/after 截图或录屏。

## 依赖 / CI / 权限 / MCP 变更

如果改了依赖、lockfile、GitHub Actions、MCP、环境变量或权限，请说明原因和安全影响。

## 发布风险

- [ ] 无破坏性变更
- [ ] 需要迁移说明 / changelog
- [ ] 需要灰度或回滚方案
`;
}

function renderOutput(result: ReturnType<typeof scanDiff>, format: OutputFormat, locale: ReportLocale): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (format === "sarif") {
    return renderSarifReport(result);
  }

  if (format === "html") {
    return renderHtmlReport(result, locale);
  }

  return renderMarkdownReport(result, locale);
}

async function runBenchmarks(casesDir: string): Promise<BenchmarkReport> {
  const root = resolve(casesDir);
  const entries = await readdir(root, { withFileTypes: true });
  const caseFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => resolve(root, entry.name))
    .sort();
  const results: BenchmarkCaseResult[] = [];

  for (const caseFile of caseFiles) {
    const testCase = JSON.parse(await readFile(caseFile, "utf8")) as BenchmarkCase;
    const diffText = await readFile(resolve(dirname(caseFile), testCase.diffFile), "utf8");
    const result = scanDiff(diffText, {
      config: testCase.config,
      pullRequest: testCase.pullRequest
    });
    const actualFindings = result.findings.map((finding) => finding.ruleId);
    const failures: string[] = [];

    if (testCase.expect.risk && result.risk !== testCase.expect.risk) {
      failures.push(`expected risk ${testCase.expect.risk}, got ${result.risk}`);
    }

    if (testCase.expect.reviewDecision && result.reviewDecision !== testCase.expect.reviewDecision) {
      failures.push(
        `expected review decision ${testCase.expect.reviewDecision}, got ${result.reviewDecision}`
      );
    }

    for (const expectedFinding of testCase.expect.findings ?? []) {
      if (!matchesFindingExpectation(actualFindings, expectedFinding)) {
        failures.push(`expected finding ${expectedFinding}`);
      }
    }

    for (const absentFinding of testCase.expect.absentFindings ?? []) {
      if (matchesFindingExpectation(actualFindings, absentFinding)) {
        failures.push(`unexpected finding ${absentFinding}`);
      }
    }

    results.push({
      id: testCase.id,
      title: testCase.title,
      category: testCase.category ?? "uncategorized",
      passed: failures.length === 0,
      failures,
      actual: {
        risk: result.risk,
        reviewDecision: result.reviewDecision,
        findings: actualFindings
      }
    });
  }

  return {
    summary: summarizeBenchmarkResults(results),
    results
  };
}

function summarizeBenchmarkResults(results: BenchmarkCaseResult[]): BenchmarkSummary {
  const passed = results.filter((result) => result.passed).length;
  const categories = new Map<string, BenchmarkCaseResult[]>();
  const findingCounts = new Map<string, number>();

  for (const result of results) {
    const categoryResults = categories.get(result.category) ?? [];
    categoryResults.push(result);
    categories.set(result.category, categoryResults);

    for (const finding of new Set(result.actual.findings)) {
      findingCounts.set(finding, (findingCounts.get(finding) ?? 0) + 1);
    }
  }

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: ratio(passed, results.length),
    categories: [...categories.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, items]) => {
        const categoryPassed = items.filter((item) => item.passed).length;
        return {
          category,
          total: items.length,
          passed: categoryPassed,
          failed: items.length - categoryPassed,
          passRate: ratio(categoryPassed, items.length)
        };
      }),
    findingCounts: [...findingCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([ruleId, count]) => ({ ruleId, count }))
  };
}

function renderBenchmarkText(report: BenchmarkReport): string {
  const lines = [
    "ProofPR benchmark",
    "",
    `Summary: ${report.summary.passed}/${report.summary.total} passed (${formatPercent(
      report.summary.passRate
    )})`,
    ""
  ];

  lines.push("Categories:");
  for (const category of report.summary.categories) {
    lines.push(
      `- ${category.category}: ${category.passed}/${category.total} passed (${formatPercent(
        category.passRate
      )})`
    );
  }

  if (report.summary.findingCounts.length > 0) {
    lines.push("", "Finding coverage:");
    for (const item of report.summary.findingCounts) {
      lines.push(`- ${item.ruleId}: ${item.count}`);
    }
  }

  lines.push("");

  for (const result of report.results) {
    lines.push(
      `${result.passed ? "PASS" : "FAIL"} ${result.id}${result.title ? ` - ${result.title}` : ""}`
    );

    for (const failure of result.failures) {
      lines.push(`  - ${failure}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function renderBenchmarkMarkdown(report: BenchmarkReport): string {
  const lines = [
    "# ProofPR Benchmark",
    "",
    `**Summary:** ${report.summary.passed}/${report.summary.total} passed (${formatPercent(
      report.summary.passRate
    )})`,
    "",
    "## Categories",
    "",
    "| Category | Passed | Total | Pass rate |",
    "| --- | ---: | ---: | ---: |"
  ];

  for (const category of report.summary.categories) {
    lines.push(
      `| ${category.category} | ${category.passed} | ${category.total} | ${formatPercent(
        category.passRate
      )} |`
    );
  }

  lines.push("", "## Finding Coverage", "", "| Rule | Cases |", "| --- | ---: |");

  for (const item of report.summary.findingCounts) {
    lines.push(`| \`${item.ruleId}\` | ${item.count} |`);
  }

  lines.push("", "## Cases", "", "| Result | Case | Category | Actual risk | Gate |", "| --- | --- | --- | --- | --- |");

  for (const result of report.results) {
    lines.push(
      `| ${result.passed ? "PASS" : "FAIL"} | \`${result.id}\` | ${result.category} | ${
        result.actual.risk
      } | ${result.actual.reviewDecision} |`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : value / total;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function matchesFindingExpectation(actualFindings: string[], expected: string): boolean {
  if (expected.endsWith("*")) {
    const prefix = expected.slice(0, -1);
    return actualFindings.some((finding) => finding.startsWith(prefix));
  }

  return actualFindings.includes(expected);
}

function parseFormat(value: string): OutputFormat {
  if (value === "json" || value === "markdown" || value === "sarif" || value === "html") {
    return value;
  }

  throw new InvalidArgumentError("format must be one of: markdown, json, sarif, html");
}

function parseBenchmarkFormat(value: string): BenchmarkOutputFormat {
  if (value === "text" || value === "json" || value === "markdown") {
    return value;
  }

  throw new InvalidArgumentError("benchmark format must be one of: text, markdown, json");
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
