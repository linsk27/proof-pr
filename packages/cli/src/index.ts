#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { Command, Help, InvalidArgumentError, type Argument, type Option } from "commander";
import {
  listConfigPresets,
  loadConfig,
  parseLocale,
  parsePreset,
  renderContributorRequest,
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
const CLI_VERSION = "0.1.44";

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

interface CheckCommandOptions {
  base?: string;
  head: string;
  config: string;
  format: OutputFormat;
  output?: string;
  locale?: ReportLocale;
  failOn: FailLevel;
}

interface RequestCommandOptions {
  base?: string;
  head: string;
  config: string;
  output?: string;
  locale?: ReportLocale;
  full: boolean;
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
  base?: string;
  head: string;
  fix: boolean;
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
  fixes: string[];
}

interface InitFileResult {
  path: string;
  status: "created" | "updated" | "skipped";
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
const defaultHelp = new Help();
const HELP_TITLE_TRANSLATIONS: Record<string, string> = {
  "Usage:": "用法:",
  "Arguments:": "参数:",
  "Options:": "选项:",
  "Commands:": "命令:"
};

function localizeHelpMetadata(text: string | undefined): string {
  return (text ?? "")
    .replace(/\bchoices:/g, "可选值:")
    .replace(/\bdefault:/g, "默认值:")
    .replace(/\bpreset:/g, "预设值:")
    .replace(/\benv:/g, "环境变量:");
}

program
  .name("proof-pr")
  .description("PR 证据门禁：在维护者投入审查前，检查证据、范围和高风险改动。")
  .version(CLI_VERSION, "-V, --version", "显示版本号。")
  .helpOption("-h, --help", "显示帮助信息。")
  .addHelpCommand("help [command]", "显示某个命令的帮助信息。")
  .configureHelp({
    styleTitle: (title) => HELP_TITLE_TRANSLATIONS[title] ?? title,
    optionDescription: (option: Option) => localizeHelpMetadata(defaultHelp.optionDescription(option)),
    argumentDescription: (argument: Argument) => localizeHelpMetadata(defaultHelp.argumentDescription(argument))
  })
  .addHelpText("after", renderRootHelpFooter());

program
  .command("guide")
  .description("显示中文向导和最常用复制命令。")
  .action(() => {
    process.stdout.write(renderGuide());
  });

program
  .command("doctor")
  .description("体检当前仓库是否已正确接入 ProofPR。")
  .option("--config <path>", ".proofpr.yml 配置文件路径。", ".proofpr.yml")
  .option("--workflow-path <path>", "GitHub Actions workflow 文件路径。", ".github/workflows/proofpr.yml")
  .option("--pr-template-path <path>", "Pull Request 模板文件路径。", ".github/pull_request_template.md")
  .option("--base <ref>", "本地 diff 检查使用的 base 引用，默认和 check 一样自动识别。")
  .option("--head <ref>", "本地 diff 检查使用的 head 引用。", "HEAD")
  .option("--fix", "在安全时创建或刷新 ProofPR 接入文件。", false)
  .addHelpText("after", renderDoctorHelpFooter())
  .action(async (options: DoctorCommandOptions) => {
    const report = await runDoctor(options);
    process.stdout.write(renderDoctorReport(report));

    if (report.checks.some((check) => check.level === "fail")) {
      process.exitCode = 1;
    }
  });

program
  .command("template", { hidden: true })
  .description("生成适合 ProofPR 的 PR 模板。")
  .option("--output <path>", "PR 模板写入路径。", ".github/pull_request_template.md")
  .option("--force", "覆盖已有模板文件。", false)
  .action(async (options: TemplateCommandOptions) => {
    await writeIfMissing(options.output, renderPullRequestTemplate(), options.force);
    process.stdout.write(
      `ProofPR PR 模板已写入 ${options.output}\n\n下一步:\n1. 提交这个模板文件。\n2. 让贡献者在相关场景补充验证、复现、截图、变更说明和权限理由。\n3. 运行 npx proof-pr@latest doctor 检查接入状态。\n`
    );
  });

program
  .command("demo")
  .description("运行内置案例，不需要接入仓库也能先看效果。")
  .argument("[case]", "内置案例 id，可用 --list 查看。", "workflow")
  .option("--list", "列出全部内置案例。", false)
  .option("--format <format>", "输出格式：markdown、json、sarif 或 html。", parseFormat, "markdown")
  .option("--output <path>", "把 demo 报告写入文件，而不是输出到终端。")
  .option("--locale <locale>", "报告语言：en 或 zh-CN。", "zh-CN")
  .action(async (caseId: string, options: DemoCommandOptions) => {
    if (options.list) {
      process.stdout.write(renderDemoList());
      return;
    }

    const demoCase = DEMO_CASES.find((item) => item.id === caseId);
    if (!demoCase) {
      throw new Error(`未知 demo 案例 "${caseId}"。运行 "proof-pr demo --list" 查看可用案例。`);
    }

    const result = scanDiff(demoCase.diffText, {
      config: demoCase.config,
      pullRequest: demoCase.pullRequest
    });
    const locale = parseLocale(options.locale, "zh-CN");
    const output = renderDemoOutput(demoCase, result, options.format, locale);

    if (options.output) {
      await writeOutput(options.output, `${output}\n`);
      process.stdout.write(`ProofPR demo ${options.format} 报告已写入 ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  });

program
  .command("check")
  .description("发 PR 前扫描当前分支。")
  .option("--base <ref>", "base Git 引用，默认自动选择 origin/main、origin/master、main 或 master。")
  .option("--head <ref>", "和 --base 对比的 head Git 引用。", "HEAD")
  .option("--config <path>", ".proofpr.yml 配置文件路径。", ".proofpr.yml")
  .option("--format <format>", "输出格式：markdown、json、sarif 或 html。", parseFormat, "markdown")
  .option("--output <path>", "把报告写入文件，而不是输出到终端。")
  .option("--locale <locale>", "报告语言：en 或 zh-CN。", "zh-CN")
  .option("--fail-on <level>", "风险达到指定等级时返回退出码 1：low、medium、high 或 never。", parseFailLevel, "never")
  .addHelpText("after", renderCheckHelpFooter())
  .action(async (options: CheckCommandOptions) => {
    const base = options.base ?? (await resolveDefaultBaseRef());
    const diffText = await readCheckDiff(base, options.head);
    const config = await loadConfig(options.config);
    const locale = parseLocale(options.locale, config.locale);

    if (!options.output && options.format === "markdown" && diffText.trim().length === 0) {
      process.stdout.write(renderNoDiffCheckMessage(base, options.head, locale));
      return;
    }

    const result = scanDiff(diffText, { config });
    const output = renderOutput(result, options.format, locale);

    if (options.output) {
      await writeOutput(options.output, `${output}\n`);
      process.stdout.write(`ProofPR ${options.format} 报告已写入 ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }

    if (riskMeetsThreshold(result.risk, options.failOn)) {
      process.exitCode = 1;
    }
  });

program
  .command("request")
  .description("生成可直接发给贡献者的补证请求。")
  .option("--base <ref>", "base Git 引用，默认自动选择 origin/main、origin/master、main 或 master。")
  .option("--head <ref>", "和 --base 对比的 head Git 引用。", "HEAD")
  .option("--config <path>", ".proofpr.yml 配置文件路径。", ".proofpr.yml")
  .option("--output <path>", "把补证请求写入文件，而不是输出到终端。")
  .option("--locale <locale>", "报告语言：en 或 zh-CN。", "zh-CN")
  .option("--full", "输出完整补证模板，而不是简短 PR 评论。", false)
  .addHelpText("after", renderRequestHelpFooter())
  .action(async (options: RequestCommandOptions) => {
    const base = options.base ?? (await resolveDefaultBaseRef());
    const diffText = await readCheckDiff(base, options.head);
    const config = await loadConfig(options.config);
    const locale = parseLocale(options.locale, config.locale);
    const output =
      diffText.trim().length === 0
        ? renderNoDiffRequestMessage(base, options.head, locale)
        : renderContributorRequest(scanDiff(diffText, { config }), locale, {
            style: options.full ? "full" : "short"
          });

    if (options.output) {
      await writeOutput(options.output, `${output}\n`);
      process.stdout.write(`ProofPR 贡献者补证请求已写入 ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  });

program
  .command("scan", { isDefault: true, hidden: true })
  .description("扫描指定 diff 并输出 ProofPR 报告。")
  .option("--base <ref>", "base Git 引用；传入后 ProofPR 会扫描 base...head。")
  .option("--head <ref>", "和 --base 对比的 head Git 引用。", "HEAD")
  .option("--diff-file <path>", "从文件读取 unified diff，而不是运行 git diff。")
  .option("--pr-title <title>", "用于证据检查的 Pull Request 标题。")
  .option("--pr-body <body>", "用于证据检查的 Pull Request 描述。")
  .option("--pr-body-file <path>", "从 Markdown 文件读取 Pull Request 描述。")
  .option("--config <path>", ".proofpr.yml 配置文件路径。", ".proofpr.yml")
  .option("--format <format>", "输出格式：markdown、json、sarif 或 html。", parseFormat, "markdown")
  .option("--output <path>", "把报告写入文件，而不是输出到终端。")
  .option("--locale <locale>", "报告语言：en 或 zh-CN。")
  .option("--fail-on <level>", "风险达到指定等级时返回退出码 1：low、medium、high 或 never。", parseFailLevel, "never")
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
      process.stdout.write(`ProofPR ${options.format} 报告已写入 ${options.output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }

    if (riskMeetsThreshold(result.risk, options.failOn)) {
      process.exitCode = 1;
    }
  });

program
  .command("init")
  .description("生成默认可用的配置、GitHub Actions workflow 和 PR 模板。")
  .option("--config-path <path>", "ProofPR 配置文件写入路径。", ".proofpr.yml")
  .option(
    "--workflow-path <path>",
    "GitHub Actions workflow 写入路径。",
    ".github/workflows/proofpr.yml"
  )
  .option("--no-pr-template", "不生成 .github/pull_request_template.md。")
  .option(
    "--pr-template-path <path>",
    "PR 模板写入路径。",
    ".github/pull_request_template.md"
  )
  .option("--no-html-report", "不生成和上传默认 HTML 可视化报告文件。")
  .option("--html-output <path>", "GitHub Actions 中生成的 HTML 报告路径。", "proofpr-report.html")
  .option(
    "--preset <preset>",
    `配置预设：${listConfigPresets().join(", ")}。`,
    parsePresetOption,
    "open-source-maintainer"
  )
  .option("--fail-on <level>", "Workflow 失败阈值：low、medium、high 或 never。", parseFailLevel, "high")
  .option("--force", "覆盖已有文件。", false)
  .addHelpText("after", renderInitHelpFooter())
  .action(async (options: InitCommandOptions) => {
    const results: InitFileResult[] = [
      {
        path: options.configPath,
        status: await writeProjectFile(options.configPath, renderConfigTemplate(options.preset), options.force)
      },
      {
        path: options.workflowPath,
        status: await writeProjectFile(
          options.workflowPath,
          renderWorkflowTemplate(options.failOn, options.htmlReport, options.htmlOutput),
          options.force
        )
      }
    ];

    if (options.prTemplate) {
      results.push({
        path: options.prTemplatePath,
        status: await writeProjectFile(options.prTemplatePath, renderPullRequestTemplate(), options.force)
      });
    }

    process.stdout.write(renderInitReport(results, options));
  });

program
  .command("benchmark", { hidden: true })
  .description("运行 benchmark 用例，验证规则输出是否符合预期。")
  .option("--cases <dir>", "benchmark JSON 用例目录。", "benchmarks/cases")
  .option("--format <format>", "输出格式：text、markdown 或 json。", parseBenchmarkFormat, "text")
  .option("--output <path>", "把 benchmark 输出写入文件，而不是输出到终端。")
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
      process.stdout.write(`ProofPR benchmark 报告已写入 ${options.output}\n`);
    } else {
      process.stdout.write(output);
    }

    if (report.results.some((result) => !result.passed)) {
      process.exitCode = 1;
    }
  });

orderRootHelpCommands(program);

const args = process.argv.slice(2);
const parseTask =
  args.length === 0
    ? Promise.resolve(process.stdout.write(renderGuide()))
    : program.parseAsync(process.argv);

parseTask.catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ProofPR 执行失败：${message}\n`);
  process.exitCode = 1;
});

function renderGuide(): string {
  return `ProofPR = PR 证据门禁

它只回答一个问题：
这个 PR 有没有足够证据，值得维护者开始审查？

真的只记四条命令：

1. 接入 GitHub PR 自动检查
   npx proof-pr@latest init
   生成 .proofpr.yml、.github/workflows/proofpr.yml 和 PR 模板；提交后打开 PR 即可看到报告。

2. 体检接入是否正确
   npx proof-pr@latest doctor
   检查配置、workflow、PR 模板、Action 版本、权限和本地 diff，并直接给下一步建议。

3. 发 PR 前本地自查
   npx proof-pr@latest check
   自动识别常见 base 分支，并检查当前工作区相对 base 的最终改动。

4. 直接生成补证请求
   npx proof-pr@latest request
   只输出一段可以贴给贡献者的补证说明，不展示完整扫描报告。

报告会给出：
- 是否建议继续审查、先补证据，还是先处理高风险。
- 缺什么证据：测试、复现、截图、变更说明、权限理由。
- 风险主要在哪：供应链、Workflow、密钥、证据完整性或审查范围。

想自动修复常见接入问题：
   npx proof-pr@latest doctor --fix

想先体验，不改仓库：
   npx proof-pr@latest demo workflow --locale zh-CN

需要可分享页面：
   npx proof-pr@latest check --format html --output proofpr-report.html

高级命令按需使用：
- npx proof-pr@latest template
- npx proof-pr@latest demo --list
- npx proof-pr@latest request --output proofpr-request.md
- npx proof-pr@latest check --format sarif --output proofpr.sarif
- npx proof-pr@latest benchmark --cases benchmarks/cases
`;
}

function renderRootHelpFooter(): string {
  return `
常用复制：
  npx proof-pr@latest init
  npx proof-pr@latest doctor
  npx proof-pr@latest check
  npx proof-pr@latest request

中文向导：
  npx proof-pr@latest guide

高级命令：
  npx proof-pr@latest guide 里有 demo、HTML、SARIF、benchmark 的按需用法。
`;
}

function orderRootHelpCommands(command: Command): void {
  const order = new Map([
    ["guide", 0],
    ["init", 1],
    ["doctor", 2],
    ["check", 3],
    ["request", 4],
    ["demo", 5],
    ["template", 50],
    ["scan", 51],
    ["benchmark", 52],
    ["help", 100]
  ]);

  const commands = command.commands as Command[];

  commands.sort((left: Command, right: Command) => {
    const leftOrder = order.get(left.name()) ?? 90;
    const rightOrder = order.get(right.name()) ?? 90;
    return leftOrder === rightOrder ? left.name().localeCompare(right.name()) : leftOrder - rightOrder;
  });
}

function renderInitHelpFooter(): string {
  return `
最常用：
  npx proof-pr@latest init

说明：
  默认配置已经可用，提交生成文件后打开 PR 即可看到报告。
`;
}

function renderCheckHelpFooter(): string {
  return `
最常用：
  npx proof-pr@latest check
  npx proof-pr@latest check --format html --output proofpr-report.html

说明：
  当前没有可扫描 diff 时，check 会给短提示，不会输出完整空报告。
`;
}

function renderRequestHelpFooter(): string {
  return `
最常用：
  npx proof-pr@latest request
  npx proof-pr@latest request --full

说明：
  request 只生成可贴给贡献者的补证说明，不展示完整扫描报告。
`;
}

function renderDoctorHelpFooter(): string {
  return `
最常用：
  npx proof-pr@latest doctor
  npx proof-pr@latest doctor --fix

说明：
  doctor 会在报告顶部直接给下一步建议。
`;
}

function renderNoDiffCheckMessage(base: string, head: string, locale: ReportLocale): string {
  if (locale === "zh-CN") {
    return `ProofPR check

当前没有可扫描的 diff，这不是错误。
对比范围：${base}...${head}

下一步：
- 如果刚接入 ProofPR：提交改动后再运行 npx proof-pr@latest check。
- 如果想确认接入是否完整：运行 npx proof-pr@latest doctor。
- 如果想先看真实效果：运行 npx proof-pr@latest demo workflow --locale zh-CN。
`;
  }

  return `ProofPR check

No diff was found for ProofPR to scan. This is not an error.
Range: ${base}...${head}

Next:
- If you just added ProofPR, commit your changes and run npx proof-pr@latest check again.
- To verify setup, run npx proof-pr@latest doctor.
- To see a real example first, run npx proof-pr@latest demo workflow.
`;
}

function renderNoDiffRequestMessage(base: string, head: string, locale: ReportLocale): string {
  if (locale === "zh-CN") {
    return `ProofPR request

当前没有可生成补证请求的 diff，这不是错误。
对比范围：${base}...${head}

下一步：
- 如果刚接入 ProofPR：提交改动后再运行 npx proof-pr@latest request。
- 如果想确认接入是否完整：运行 npx proof-pr@latest doctor。
- 如果想先看真实补证示例：运行 npx proof-pr@latest demo ui-evidence --locale zh-CN。
`;
  }

  return `ProofPR request

No diff was found for ProofPR to turn into a contributor request. This is not an error.
Range: ${base}...${head}

Next:
- If you just added ProofPR, commit your changes and run npx proof-pr@latest request again.
- To verify setup, run npx proof-pr@latest doctor.
- To see a real contributor request example, run npx proof-pr@latest demo ui-evidence.
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
  const fixes = options.fix ? await applyDoctorFixes(options) : [];
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
    nextSteps.add("当前接入状态正常；可以打开 PR，或运行 npx proof-pr@latest check 做本地自查。");
  }

  return { checks, nextSteps: [...nextSteps], fixes };
}

async function applyDoctorFixes(options: DoctorCommandOptions): Promise<string[]> {
  const fixes: string[] = [];

  if (!(await pathExists(options.config))) {
    await writeOutput(options.config, renderConfigTemplate("open-source-maintainer"));
    fixes.push(`已创建 ${options.config}`);
  }

  if (await shouldRefreshDoctorWorkflow(options.workflowPath)) {
    await writeOutput(options.workflowPath, renderWorkflowTemplate("high", true, "proofpr-report.html"));
    fixes.push(`已刷新 ${options.workflowPath}`);
  }

  if (!(await pathExists(options.prTemplatePath))) {
    await writeOutput(options.prTemplatePath, renderPullRequestTemplate());
    fixes.push(`已创建 ${options.prTemplatePath}`);
  } else {
    const template = await readFile(options.prTemplatePath, "utf8");
    if (!hasProofPrTemplateEvidence(template)) {
      const nextTemplate = `${template.trimEnd()}\n\n${renderPullRequestTemplateAddon()}`;
      await writeOutput(options.prTemplatePath, nextTemplate);
      fixes.push(`已向 ${options.prTemplatePath} 追加 ProofPR 证据提示`);
    }
  }

  return fixes;
}

async function shouldRefreshDoctorWorkflow(path: string): Promise<boolean> {
  if (!(await pathExists(path))) {
    return true;
  }

  const workflow = await readFile(path, "utf8");
  return (
    !/pull_request\s*:/.test(workflow) ||
    !new RegExp(`linsk27/proof-pr@v${escapeRegExp(CLI_VERSION)}`).test(workflow) ||
    !/pull-requests\s*:\s*write/.test(workflow) ||
    !/contents\s*:\s*read/.test(workflow) ||
    !/html-output\s*:/.test(workflow) ||
    !/actions\/upload-artifact@v\d+/.test(workflow)
  );
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
      checks.push({ level: "pass", title: "workflow 会上传 proofpr-report 报告文件" });
    } else {
      checks.push({ level: "warn", title: "HTML 报告已生成，但没有上传为报告文件" });
      nextSteps.add("在 workflow 里加入 actions/upload-artifact@v4，把 proofpr-report.html 上传为 proofpr-report 报告文件。");
    }
  } else {
    checks.push({ level: "warn", title: "workflow 未启用 HTML 可视化报告文件" });
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
    nextSteps.add("在 PR 模板中加入复现、截图、变更说明、权限理由等可选栏目。");
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

  const detectedBase = options.base ?? (await resolveDefaultBaseRef().catch(() => undefined));

  try {
    if (detectedBase) {
      const diff = await readCheckDiff(detectedBase, options.head);
      checks.push({
        level: "pass",
        title: `可以读取 ${detectedBase}...${options.head} diff`,
        detail: diff.length === 0 ? "当前没有可扫描的 diff。" : `diff 大小约 ${diff.length} 字符。`
      });
    } else {
      const diff = await readGitDiff(undefined, options.head);
      checks.push({
        level: "warn",
        title: "未找到默认 base 分支，只检查当前工作区 diff",
        detail: diff.length === 0 ? "当前工作区没有可扫描的 diff。" : `工作区 diff 大小约 ${diff.length} 字符。`
      });
      nextSteps.add("如果仓库有远程主分支，先运行 git fetch origin；主分支不是 main/master 时，使用 npx proof-pr@latest doctor --base origin/你的主分支。");
    }
  } catch (error) {
    const baseLabel = detectedBase ?? "工作区";
    checks.push({
      level: "warn",
      title: `无法读取 ${baseLabel}...${options.head} diff`,
      detail: error instanceof Error ? error.message : String(error)
    });
    nextSteps.add("运行 git fetch origin 后重试；如果主分支不是 main/master，请使用 --base origin/你的实际主分支。");
  }
}

function renderDoctorReport(report: DoctorReport): string {
  const failCount = report.checks.filter((check) => check.level === "fail").length;
  const warnCount = report.checks.filter((check) => check.level === "warn").length;
  const status = failCount > 0 ? "需要先修复" : warnCount > 0 ? "基本可用，但建议优化" : "接入正常";
  const recommendation = renderDoctorRecommendation(report, failCount, warnCount);
  const levelText: Record<DoctorLevel, string> = {
    pass: "通过",
    warn: "警告",
    fail: "失败",
    info: "信息"
  };
  const fixes =
    report.fixes.length > 0
      ? `\n自动修复:\n${report.fixes.map((fix) => `- ${fix}`).join("\n")}\n`
      : "";
  const checks = report.checks
    .map((check) => {
      const detail = check.detail ? `\n       ${check.detail}` : "";
      return `[${levelText[check.level]}] ${check.title}${detail}`;
    })
    .join("\n");
  const nextSteps = report.nextSteps.map((step) => `- ${step}`).join("\n");

  return `ProofPR doctor

状态：${status}
统计：${failCount} 失败, ${warnCount} 警告, ${report.checks.length} 项检查
建议：${recommendation}
${fixes}

检查项:
${checks}

下一步:
${nextSteps}
`;
}

function renderDoctorRecommendation(report: DoctorReport, failCount: number, warnCount: number): string {
  if (report.fixes.length > 0) {
    return "已自动处理可安全修复的接入文件；下一步运行 npx proof-pr@latest doctor 确认。";
  }

  if (failCount > 0) {
    return "先运行 npx proof-pr@latest doctor --fix；如果仍有失败项，再按“下一步”处理。";
  }

  if (warnCount > 0) {
    return "可以先打开 PR 试用；想补齐接入细节时运行 npx proof-pr@latest doctor --fix。";
  }

  return "接入已可用；现在可以打开 PR，或本地运行 npx proof-pr@latest check。";
}

function renderInitReport(results: InitFileResult[], options: InitCommandOptions): string {
  const statusText: Record<InitFileResult["status"], string> = {
    created: "已创建",
    updated: "已更新",
    skipped: "已存在，未覆盖"
  };
  const files = results.map((result) => `[${statusText[result.status]}] ${result.path}`).join("\n");
  const skipped = results.filter((result) => result.status === "skipped");
  const gitAddPaths = results.map((result) => result.path).join(" ");
  const forceHint =
    skipped.length > 0
      ? "\n已有文件已保留不变。如果想用当前版本模板覆盖它们，运行：\nnpx proof-pr@latest init --force\n"
      : "";

  return `ProofPR 初始化完成。

文件:
${files}
${forceHint}
默认配置已经可用；先提交这些文件并打开 PR，不需要先改配置。

下一步直接复制:
git add ${gitAddPaths}
git commit -m "chore: add ProofPR"
npx proof-pr@latest doctor

发 PR 前本地自查:
npx proof-pr@latest check

打开或更新 Pull Request 后，报告会出现在:
- PR 评论
- GitHub Actions 摘要
- Workflow 标注${options.htmlReport ? `\n- ${options.htmlOutput} 报告文件` : ""}
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

async function readCheckDiff(base: string, head: string): Promise<string> {
  if (head !== "HEAD") {
    return readGitDiff(base, head);
  }

  const mergeBase = (await readGitOutput(["merge-base", base, "HEAD"])) ?? base;
  const trackedDiff = await readGitStdout(["diff", "--no-ext-diff", "--unified=0", mergeBase, "--"], [0]);
  const untrackedDiffs = await readUntrackedFileDiffs();

  return [trackedDiff, ...untrackedDiffs].filter((part) => part.trim().length > 0).join("\n");
}

async function resolveDefaultBaseRef(): Promise<string> {
  const originHead = await readGitOutput(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);

  if (originHead) {
    return originHead.replace(/^refs\/remotes\//, "");
  }

  const candidates = ["origin/main", "origin/master", "upstream/main", "upstream/master", "main", "master"];

  for (const candidate of candidates) {
    if (await gitCommitRefExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "无法自动识别 base 分支。请运行 `proof-pr check --base origin/main`，或使用 `proof-pr scan --base <ref> --head HEAD`。"
  );
}

async function gitCommitRefExists(ref: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

async function readUntrackedFileDiffs(): Promise<string[]> {
  const output = await readGitOutput(["ls-files", "--others", "--exclude-standard"]);
  const files = output?.split(/\r?\n/).filter(Boolean) ?? [];
  const diffs: string[] = [];

  for (const file of files) {
    diffs.push(await readGitStdout(["diff", "--no-index", "--no-ext-diff", "--unified=0", "--", "/dev/null", file], [0, 1]));
  }

  return diffs;
}

async function readGitStdout(args: string[], allowedExitCodes: number[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { maxBuffer: 20 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    if (isExecError(error) && allowedExitCodes.includes(error.code)) {
      return typeof error.stdout === "string" ? error.stdout : "";
    }

    throw error;
  }
}

async function readGitOutput(args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", args);
    const value = stdout.trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function isExecError(error: unknown): error is Error & { code: number; stdout?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readPullRequestBody(options: ScanCommandOptions): Promise<string | undefined> {
  if (options.prBodyFile) {
    return readFile(options.prBodyFile, "utf8");
  }

  return options.prBody;
}

async function writeIfMissing(path: string, contents: string, force: boolean): Promise<void> {
  if (!force && (await pathExists(path))) {
    throw new Error(`${path} 已存在。如需覆盖，请追加 --force。`);
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function writeProjectFile(path: string, contents: string, force: boolean): Promise<InitFileResult["status"]> {
  const exists = await pathExists(path);

  if (exists && !force) {
    return "skipped";
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return exists ? "updated" : "created";
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
- [ ] 需要迁移说明 / 变更说明
- [ ] 需要灰度或回滚方案
`;
}

function hasProofPrTemplateEvidence(template: string): boolean {
  return (
    /验证|verification|test/i.test(template) &&
    /复现|reproduction|before|after|截图|screenshot|权限|permission/i.test(template)
  );
}

function renderPullRequestTemplateAddon(): string {
  return `## ProofPR 证据补充

如果本次 PR 涉及代码、UI、依赖、GitHub Actions、MCP、环境变量或权限变更，请补充：

- 验证方式：测试命令、手动验证步骤或不需要测试的原因。
- 复现上下文：bug fix 请说明修改前如何复现、预期结果和实际结果。
- 截图 / 录屏：UI 改动请提供 before/after。
- 依赖 / 权限理由：说明新增依赖、lockfile、workflow、MCP 或权限变更的必要性和安全影响。
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
