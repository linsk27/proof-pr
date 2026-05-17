# 变更记录

## Unreleased

暂无。

## 0.1.35 - 2026-05-18

- `proof-pr template` 的成功提示和后续步骤改为中文。
- README、npm 包 README 和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## 0.1.34 - 2026-05-18

- `proof-pr doctor` 输出中的 `Checks`、`Next`、`Auto-fix` 等主标签改为中文。
- doctor 截图、README、npm 包 README 和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## 0.1.33 - 2026-05-17

- CLI root help 的项目描述和命令描述改为中文，首次运行 `proof-pr --help` 时更容易理解入口。
- README、npm 包 README、快速开始和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## 0.1.32 - 2026-05-17

- CLI `--help`、`init --help`、`check --help`、`request --help` 和 `doctor --help` 新增中文“常用复制”区域。
- README、npm 包 README、快速开始和命令文档同步说明 help 现在会直接给最短使用路径。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## 0.1.31 - 2026-05-17

- `proof-pr init` 输出新增“默认配置已经可用”的明确提示，减少新用户接入后停下来研究配置的成本。
- 初始化截图、README、npm 包 README、快速开始和发布文档同步更新。
- 默认使用路径保持不变：`init`、`check`、`request`。

## 0.1.30 - 2026-05-17

- `proof-pr request` 在当前分支没有可扫描 diff 时改为输出短提示，不再生成误导性的补证请求。
- 空 diff 提示会说明这不是错误，并给出 `doctor`、`demo ui-evidence` 和提交改动后重新运行 `request` 的下一步。
- README、npm 包 README、快速开始和命令文档同步说明 `check` / `request` 的空状态行为。

## 0.1.29 - 2026-05-17

- `proof-pr check` 在当前分支没有可扫描 diff 时改为输出短提示，不再打印完整报告。
- 空 diff 提示会直接说明这不是错误，并给出 `doctor`、`demo` 和重新运行 `check` 的下一步。
- README、npm 包 README、命令文档和截图同步更新。

## 0.1.28 - 2026-05-17

- `proof-pr doctor` 报告顶部新增一句话建议，减少用户判断下一步的成本。
- README、npm 包 README、快速开始、命令文档和 doctor 截图同步说明新的自检输出。
- 默认使用路径保持简洁：`init`、`check`、`request` 仍是主入口。

## 0.1.27 - 2026-05-17

- `proof-pr request` 默认输出更短的 PR 评论式补证请求，更适合直接贴给贡献者。
- 新增 `proof-pr request --full`，需要完整补证模板时再显式使用。
- README、npm 包 README、快速开始和命令速查同步说明短请求和完整模板的区别。

## 0.1.26 - 2026-05-16

- CLI 中文向导从四个默认动作收敛为三条主线：`init`、`check`、`request`。
- `demo` 从默认路径下沉为辅助体验命令，避免首次用户误以为必须先跑 demo。
- README、npm 包 README、快速开始和命令速查同步简化默认使用路径。

## 0.1.25 - 2026-05-15

- 新增 `proof-pr request`，使用和 `check` 相同的默认 diff 逻辑，但只输出可以直接发给贡献者的补证请求。
- 新增 `proof-pr request --output proofpr-request.md`，方便维护者把补证请求保存为文件或复制到 PR 评论。
- Core 新增 `renderContributorRequest`，复用 HTML / Markdown 报告中的补证请求生成逻辑。
- README、npm 包 README、快速开始和命令速查同步说明 request 路径。

## 0.1.24 - 2026-05-15

- 新增 `proof-pr doctor --fix`，可自动创建缺失的 `.proofpr.yml`、`.github/workflows/proofpr.yml` 和 PR 模板。
- `doctor --fix` 会把过旧或缺少关键配置的 ProofPR workflow 刷新为当前推荐模板，包括 PR 触发、权限、Action 版本和 HTML artifact。
- 已有 PR 模板缺少验证、复现、截图或权限理由提示时，`doctor --fix` 只追加 ProofPR 证据补充块，不修改业务代码。
- README、npm 包 README、快速开始和命令速查同步说明自动修复路径。

## 0.1.23 - 2026-05-15

- 收敛项目定位：README、CLI 向导和中文文档统一强调 ProofPR 是“PR 证据门禁”，不是通用扫描器、AI code reviewer 或漏洞库。
- 简化默认使用路径：首屏只保留“先看效果、接入仓库、本地自查”三条主命令，`doctor`、HTML、SARIF、benchmark 等能力下沉为辅助命令。
- 更新 npm 包 README 和文档入口，减少功能堆叠，让首次访问者更容易理解项目作用。

## 0.1.22 - 2026-05-15

- Markdown 和 HTML 报告新增“风险雷达”，把 findings 按证据完整性、供应链、Workflow 权限、Secret 泄露和 Review 面归并展示。
- HTML 可视化报告新增风险来源条形图，帮助维护者先判断 review 应该从哪里开始。
- 文档和截图同步展示更直观的风险来源说明。

## 0.1.21 - 2026-05-15

- `init` 改为可重复执行：已有 `.proofpr.yml`、workflow 或 PR 模板时默认保留不覆盖，并提示使用 `--force` 更新模板。
- `init` 输出改为更直接的中文接入步骤，包含可复制的 `git add` / `git commit`、报告查看位置、本地自查和接入体检命令。
- `doctor` 默认复用 `check` 的 base 自动识别逻辑，不再固定假设 `origin/main`，并在没有远程主分支时给出更清晰的处理建议。

## 0.1.20 - 2026-05-15

- `check` 默认扫描当前工作区相对 base 的最终状态，包含已提交分支 diff、staged、unstaged 和未跟踪新文件。
- 中文报告补齐供应链规则、行动项、扣分项和重点文件原因的翻译。

## 0.1.19 - 2026-05-15

- 新增 `check` 命令：`npx proof-pr@latest check` 会自动选择 `origin/main`、`origin/master`、`main` 或 `master` 作为 base，减少本地自查命令长度。
- `guide`、`init`、`doctor` 输出改为优先推荐 `check`。
- README、命令速查、快速开始、SARIF 文档和截图同步简化使用路径，`scan --base ...` 保留为高级用法。

## 0.1.18 - 2026-05-15

- 新增供应链依赖规则：非注册表来源、未固定版本、manifest/lockfile 不一致、lockfile-only 变更和解析覆盖。
- 依赖检查覆盖 npm、Python、Rust、Go 的常见 manifest；Java / Ruby 先进入 `dependency-careful` 敏感路径提醒。
- Benchmark 增加 `supply-chain` 分类，总样本从 14 个扩展到 22 个。
- 文档更新 Trusted Publishing 状态：npm package 已配置 GitHub Actions trusted publisher，下一次 tag 验证自动发布链路。

## 0.1.17 - 2026-05-15

- `init` 生成的 GitHub workflow 默认写出 `proofpr-report.html` 并上传为 `proofpr-report` artifact，让首次接入就能看到可视化报告。
- `doctor` 新增 HTML artifact 体检，提醒 workflow 是否启用了 `html-output` 和 `actions/upload-artifact`。
- README、快速开始、从 0 到 1 文档和输出位置图同步说明 PR 评论、Actions summary、annotations、HTML artifact 的查看路径。

## 0.1.16 - 2026-05-12

- HTML 可视化报告新增“一键补证建议”，可复制给贡献者补 PR 描述。
- HTML 风险发现支持按严重程度筛选、按规则/文件/详情搜索，并可折叠查看。
- PR 评论的 Markdown 报告新增总览表和可复制补证清单，让维护者更容易判断下一步。

## 0.1.15 - 2026-05-12

- `init` 默认生成 `.github/pull_request_template.md`，帮助贡献者在开 PR 时补充验证、复现、截图、changelog 和权限理由。
- 新增 `template` 命令，可为已接入的仓库单独补 PR 模板：`npx proof-pr@latest template`。
- `doctor` 新增 PR 模板体检，提醒模板是否包含验证证据、复现、截图或权限理由栏目。

## 0.1.14 - 2026-05-12

- 新增 `demo` 命令，用户无需 clone 仓库即可运行内置风险案例，例如 `npx proof-pr@latest demo workflow --locale zh-CN`。
- `guide`、README 和命令速查改为优先推荐 `demo` 试用路径，减少 examples 文件路径带来的理解成本。
- Release workflow 在没有可用 npm token 时不再让 GitHub Release 整体失败，会提示改用本地 token 发布。

## 0.1.13 - 2026-05-12

- 新增 `doctor` 体检命令，检查 `.proofpr.yml`、GitHub Actions workflow、Action 版本、PR 权限和本地 diff 可读性。
- `guide` 功能菜单补充 `doctor`，让首次接入后可以一条命令确认安装状态。
- README、快速开始和命令速查文档补充体检流程、结果位置和截图。

## 0.1.12 - 2026-05-12

- 新增 `guide` 功能菜单；直接运行 `proof-pr` 或 `proof-pr guide` 会按“我想做什么”列出常用命令和结果位置。
- README 和中文文档新增“功能和命令速查”，补充真实功能菜单截图，降低首次使用成本。

## 0.1.11 - 2026-05-12

- CLI `scan` 新增 `--output <path>`，可以直接把 Markdown、JSON、SARIF 或 HTML 报告写入文件。
- 文档中的 HTML 和 SARIF 示例改为使用 `--output`，减少 shell 重定向带来的理解成本。

## 0.1.10 - 2026-05-12

- 简化 `proof-pr init` 默认生成的配置文件，减少首次接入时看到的注释和高级选项。
- 优化 README、快速开始和从 0 到 1 文档，把默认路径收敛为 `npx proof-pr@latest init`、提交文件、打开 PR。
- 优化 `proof-pr init` 输出，直接提示下一步操作和本地检查命令。
- 清理 HTML 报告生成时的空白行，让截图和生成物更稳定。

## 0.1.9 - 2026-05-11

- 修复 CLI `--version` 仍显示旧版本的问题。
- 更新 `proof-pr init` 生成的 GitHub Action 示例到 `v0.1.9`。
- 修正了 `0.1.8` 包内版本显示不一致的问题。

## 0.1.8 - 2026-05-11

- 新增独立 HTML 可视化报告：CLI 支持 `--format html`，GitHub Action 支持 `html-output`。
- 文档新增可视化报告截图，帮助用户理解风险面板、证据评分和行动清单。
- 注意：`0.1.8` 已被后续版本替代，建议直接使用 `latest`。

## 0.1.7 - 2026-05-11

- 新增 Evidence Contract：仓库可以用 `.proofpr.yml` 定义路径级证据要求，例如 UI 改动必须有截图、workflow 改动必须有权限理由。
- 新增 `benchmark` CLI 命令和 `pnpm benchmark` 脚本，用样本 case 验证风险等级、Review 门禁和 finding 命中结果。
- 新增 `benchmark --output`，CI 可以直接生成 Markdown benchmark 报告。
- CI 现在会自动运行 benchmark，并把报告写入 GitHub Actions Summary。
- 新增 benchmark 样本和 UI 改动案例，帮助公开讨论规则命中、误报和漏报。
- 新增 `workflow-untrusted-checkout`：识别 `pull_request_target` 中 checkout PR head 代码的高风险组合。
- 优化 `workflow-permission-change`：只读权限如 `contents: read` 不再被当成权限升级。
- 报告证据概览新增截图、changelog / 迁移说明、权限理由等证据信号。
- 中文文档补充 CI benchmark、规则准确性边界和 workflow 供应链风险说明。

## 0.1.6 - 2026-05-11

- 新增 `dependency-major-upgrade`：识别依赖跨大版本升级。
- 新增 `dependency-lifecycle-script`：识别 `package.json` 中可能在安装或发布阶段执行的包生命周期脚本。
- 新增 `workflow-dangerous-trigger`：识别 GitHub Actions `pull_request_target` 高风险触发器。
- GitHub Action 在未显式传 `fail-on` 时，会使用 `.proofpr.yml` 中的 `riskThreshold`。
- 文档补充新增规则、配置项和风险评分说明。

## 0.1.5 - 2026-05-10

- 新增 Review Plan：报告会生成维护者行动清单和重点文件列表。
- 新增规则预设：`open-source-maintainer`、`security-strict`、`ai-generated-pr`、`mcp-security`、`dependency-careful`。
- `proof-pr init` 支持 `--preset`，初始化配置时可直接选择审查策略。
- GitHub Action 新增 `annotations` 输入，默认输出 workflow annotations。
- GitHub Action 新增 `sarif-output` 输入，可写出 SARIF 文件并接入 GitHub Code Scanning。
- Release workflow 支持 tag 发布时自动发布 npm 包。
- 新增真实案例库、SARIF 示例、Marketplace 上架说明和示例 workflow。
- 文档补充规则预设、报告查看位置、运行时机、项目定位和发布状态说明。

## 0.1.4 - 2026-05-10

- 新增 Evidence Score：每份报告输出 0-100 证据评分，并列出证据优势和扣分项。
- 新增 Review Gate：根据风险等级、证据评分和安全 finding 给维护者下一步动作建议。
- JSON 输出新增 `evidenceScore` 和 `reviewDecision` 字段。
- README 和文档补充 ProofPR 作为“PR 证据门禁”的定位、评分逻辑和使用价值。

## 0.1.3 - 2026-05-10

- 新增简体中文 Markdown 报告：`.proofpr.yml` 支持 `locale: zh-CN`，CLI 支持 `--locale zh-CN`。
- GitHub Action 会根据仓库配置输出中文 PR 评论和 job summary。
- `proof-pr init` 默认生成中文报告配置。
- 文档补充中文使用方式、Windows 终端乱码说明和确定性风险评估原理。
- 发布 `proof-pr@0.1.3` 到 npm，并在 README 中补充 npm 发布状态。

## 0.1.2 - 2026-05-10

- 修复 CLI `--version` 输出仍显示 `0.1.0` 的问题。
- 更新文档中的 GitHub Action 示例到 `linsk27/proof-pr@v0.1.2`。

## 0.1.1 - 2026-05-10

- 发布 `proof-pr` CLI 到 npm。
- 更新 README 和快速开始文档，改为 npm 优先安装路径。
- 更新 GitHub Action 示例到 `linsk27/proof-pr@v0.1.1`。
- 增加更清晰的使用说明、搜索关键词和效果图展示。

## 0.1.0 - 2026-05-09

首次公开 MVP。

- 新增确定性的 PR diff 扫描器。
- 新增改动规模、敏感路径、缺少测试、secrets、依赖、workflow 权限和 MCP 配置风险规则。
- 新增 PR title/body 证据分析，用于检查验证说明和复现上下文。
- 新增 GitHub Action，支持 PR 评论和 job summary。
- 新增本地 CLI，包含 `scan` 和 `init` 命令。
- 新增文档、示例配置和 CI。
