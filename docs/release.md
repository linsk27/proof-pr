# 发布流程

当前最新公开版本是 `0.1.49`。

## 发布前检查

```bash
pnpm release:check
```

这个命令会执行：

- TypeScript 类型检查。
- 单元测试。
- CLI 和 GitHub Action 打包。
- `npm pack --dry-run`，验证 npm 包内容。

## npm 自动发布条件

`.github/workflows/release.yml` 已经支持 tag 发布时自动发布 npm 包：

- 触发条件：推送 `v*.*.*` tag。
- npm 包：`proof-pr`。
- 发布命令：`npm publish --access public`。
- 推荐认证方式：npm Trusted Publishing，通过 GitHub OIDC 发布，不需要长期 npm token。
- 不再依赖仓库 secret `NPM_TOKEN`。如果仓库里仍残留旧 token，release workflow 也会忽略它，避免旧 token 把发布带到 token fallback。

GitHub Release 会先创建；随后 workflow 会检查该版本是否已经存在于 npm。只有 npm 还没有该版本时，才会执行发布步骤。

workflow 使用 Node 24 和 npm 11，并通过 GitHub OIDC 使用 npm Trusted Publishing。`linsk27/proof-pr` 的 trusted publisher 已配置完成；如果 fork 或新包没有配置，发布步骤会失败，需要先在 npm 包设置页补齐 publisher。

## npm Trusted Publishing 设置

`proof-pr` 当前已在 npm 网站配置 trusted publisher：

- Provider：GitHub Actions
- Repository：`linsk27/proof-pr`
- Workflow file：`release.yml`
- Environment：留空，除非以后给 release job 配 GitHub environment

也可以在本机用 npm CLI 配置：

```bash
npm install -g npm@^11.10.0
npm trust github proof-pr --repo linsk27/proof-pr --file release.yml
```

npm 官方要求 trusted publishing 使用 npm 11.5.1+ 和 Node 22.14+；`npm trust` 命令需要 npm 11.10+。后续推 tag 应该能自动发布 npm，不再需要本地粘贴 token。

## 正式发布命令

确认 `pnpm release:check` 通过后：

```bash
git tag v0.1.49
git push origin v0.1.49
```

发布完成后需要检查：

```bash
npm view proof-pr version
npx proof-pr@latest --version
```

当前验证结果：

```txt
npm view proof-pr version -> 0.1.49
npx proof-pr@latest --version -> 0.1.49
```

## `v0.1.49` 发布状态

`v0.1.49` 是本地 PR 描述模拟版，重点包括：

- `check` 支持隐藏高级参数 `--pr-title`、`--pr-body` 和 `--pr-body-file`，本地自查可以带上 PR 标题和描述上下文。
- `request` 同步支持 `--pr-body-file`，生成补证请求时可参考本地 PR 描述草稿。
- 默认帮助页仍然只显示常用参数；README、命令文档、快速开始和 npm README 补充了 `--pr-body-file pr.md` 的按需用法。

## `v0.1.48` 发布状态

`v0.1.48` 是本地扫描上下文提示版，重点包括：

- Markdown 报告在缺少 PR 描述上下文时新增“本地扫描提示”，说明打开 PR 后会结合 PR 标题和描述重新评估证据。
- 避免用户本地运行 `check` 时看到 PR 描述扣分，就误以为规则不准确。
- README、命令文档、快速开始和 npm README 同步解释本地模式与 PR 模式的区别。

## `v0.1.47` 发布状态

`v0.1.47` 是空状态文案收敛版，重点包括：

- `check` 在没有可扫描 diff 时明确说明：刚接入但还没有业务改动时不用处理。
- `request` 在没有可生成补证请求的 diff 时也使用同样逻辑，避免生成补证请求前让用户误以为出错。
- 命令文档、快速开始和 npm README 同步说明空 diff 是正常状态，提交业务改动后再检查即可。

## `v0.1.46` 发布状态

`v0.1.46` 是 doctor 空状态建议优化版，重点包括：

- 当接入正常但当前分支没有可扫描 diff 时，`doctor` 不再直接建议立刻运行 `check`。
- 新建议会明确说明“当前没有可扫描改动”，并提示提交业务改动后再运行 `check`，或打开/更新 PR 查看自动报告。
- doctor 文档截图同步刷新，避免用户把空 diff 状态误认为接入故障。

## `v0.1.45` 发布状态

`v0.1.45` 是帮助页减负版，重点包括：

- `init --help` 只展示 `--force`，把路径、预设、HTML 等高级参数隐藏，避免首次接入被参数表打断。
- `doctor --help` 只展示 `--fix`，`check --help` 只展示报告格式和输出文件，`request --help` 只展示写文件和完整模板。
- 高级参数仍然兼容可用，README、命令文档和 npm README 已说明“普通接入不需要先理解完整参数表”。

## `v0.1.44` 发布状态

`v0.1.44` 是入口顺序收敛版，重点包括：

- 顶层 `--help` 的命令列表按真实默认路径排序：`guide`、`init`、`doctor`、`check`、`request`，`demo` 放到后面作为体验入口。
- `init` 成功后的下一步加入 `npx proof-pr@latest doctor`，让首次接入形成“提交接入文件 -> 体检 -> 本地自查”的闭环。
- README、快速开始、命令文档、npm 包 README 和截图同步到新版入口顺序。

## `v0.1.43` 发布状态

`v0.1.43` 是自检入口前置版，重点包括：

- 中文向导把默认路径从三条扩展为四条：`init`、`doctor`、`check`、`request`。
- 顶层 `--help` 的常用复制命令补上 `doctor`，让用户接入后能先自检。
- README、命令速查、快速开始和 npm 包 README 同步把 `doctor` 放入默认路径，而不是只作为辅助命令。

## `v0.1.42` 发布状态

`v0.1.42` 是入口简化版，重点包括：

- 顶层 `--help` 只展示核心入口：`guide`、`doctor`、`demo`、`check`、`request`、`init`。
- `template`、`scan`、`benchmark` 仍保留可用，但不再挤在首次帮助页里，降低新用户理解成本。
- 帮助页底部明确提示高级命令在 `guide` 中按需查看。

## `v0.1.41` 发布状态

`v0.1.41` 是中文体验继续收敛版，重点包括：

- 中文报告、CLI 向导和 README 继续减少 `review`、`finding`、`Changelog` 等英文术语，统一使用“审查”“风险发现”“变更说明”。
- HTML 风险雷达把 `Secret 泄露` 改成“密钥泄露”，降低中文用户理解成本。
- 文档截图使用新版 CLI 输出重新生成，避免 README 和真实命令输出不一致。

## `v0.1.40` 发布状态

`v0.1.40` 是中文报告术语简化版，重点包括：

- 中文 Markdown 报告统一使用“审查门禁”。
- 风险雷达表头从 `Findings` 改为“发现数”，说明文字从 `rule id` 改为“规则 ID”。
- 风险雷达中的“审查范围”术语同步到 Markdown 和 HTML 报告。

## `v0.1.39` 发布状态

`v0.1.39` 是 doctor 检查项状态中文化版，重点包括：

- `doctor` 检查项状态从 `[pass]`、`[warn]`、`[fail]`、`[info]` 改为中文。
- 文档截图同步更新，首次体检输出更适合中文用户直接阅读。
- 默认使用路径继续保持为 `init`、`doctor`、`check`、`request`。

## `v0.1.38` 发布状态

`v0.1.38` 是入口反馈中文化增强版，重点包括：

- `doctor` 统计从 `fail/warn` 改为中文“失败/警告”。
- `init` 输出里的报告位置说明改为“GitHub Actions 摘要、Workflow 标注、报告文件”。
- CLI 中面向普通用户的 HTML 报告 `artifact` 说明改为“报告文件”。

## `v0.1.37` 发布状态

`v0.1.37` 是 CLI 错误提示中文化增强版，重点包括：

- CLI 总错误前缀从 `ProofPR failed` 改为中文。
- `template` 目标文件已存在时，错误提示改为中文并明确使用 `--force` 覆盖。
- 自动识别不到 base 分支时，错误提示改为中文并给出可复制命令。

## `v0.1.36` 发布状态

`v0.1.36` 是 CLI 帮助中文化增强版，重点包括：

- CLI help 的 `Usage`、`Options`、`Commands`、`Arguments`、默认值提示和 help 命令说明改为中文。
- `doctor`、`check`、`request`、`init`、`demo`、`scan`、`template`、`benchmark` 的参数说明改为中文。
- 写入报告、补证请求、demo 和 benchmark 文件时的成功提示改为中文。

## `v0.1.35` 发布状态

`v0.1.35` 是 PR 模板命令中文化版，重点包括：

- `proof-pr template` 的成功提示和后续步骤改为中文。
- README、npm 包 README 和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## `v0.1.34` 发布状态

`v0.1.34` 是 doctor 中文输出增强版，重点包括：

- `proof-pr doctor` 输出中的 `Checks`、`Next`、`Auto-fix` 等主标签改为中文。
- doctor 截图、README、npm 包 README 和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## `v0.1.33` 发布状态

`v0.1.33` 是中文 help 增强版，重点包括：

- CLI root help 的项目描述和命令描述改为中文，首次运行 `proof-pr --help` 时更容易理解入口。
- README、npm 包 README、快速开始和发布文档同步更新到当前版本。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## `v0.1.32` 发布状态

`v0.1.32` 是 help 引导增强版，重点包括：

- CLI `--help`、`init --help`、`check --help`、`request --help` 和 `doctor --help` 新增中文“常用复制”区域。
- README、npm 包 README、快速开始和命令文档同步说明 help 现在会直接给最短使用路径。
- 默认使用路径继续保持为 `init`、`check`、`request`。

## `v0.1.31` 发布状态

`v0.1.31` 是初始化引导增强版，重点包括：

- `proof-pr init` 输出新增“默认配置已经可用”的明确提示，减少新用户接入后停下来研究配置的成本。
- 初始化截图、README、npm 包 README、快速开始和发布文档同步更新。
- 默认使用路径保持不变：`init`、`check`、`request`。

## `v0.1.30` 发布状态

`v0.1.30` 是补证请求空状态优化版，重点包括：

- `proof-pr request` 在当前分支没有可扫描 diff 时输出短提示，避免新用户误以为干净分支也需要补证。
- 空 diff 提示会说明“这不是错误”，并给出 `doctor`、`demo ui-evidence` 和提交改动后重新运行 `request` 的下一步。
- README、npm 包 README、快速开始和命令文档同步说明 `check` / `request` 的空状态行为。

## `v0.1.29` 发布状态

`v0.1.29` 是本地自查空状态优化版，重点包括：

- `proof-pr check` 在当前分支没有可扫描 diff 时输出短提示，避免新用户误以为空报告是问题。
- 空 diff 提示会说明“这不是错误”，并给出 `doctor`、`demo` 和提交改动后重新运行 `check` 的下一步。
- README、npm 包 README、命令文档和截图同步更新。

## `v0.1.28` 发布状态

`v0.1.28` 是 doctor 引导增强版，重点包括：

- `proof-pr doctor` 报告顶部新增一句话建议，直接告诉用户下一步是打开 PR、运行 `check`，还是先用 `doctor --fix`。
- README、npm 包 README、快速开始、命令文档和 doctor 截图同步更新。
- 保持默认使用路径不变：`init`、`check`、`request` 仍是主入口。

## `v0.1.27` 发布状态

`v0.1.27` 是补证请求减负版，重点包括：

- `proof-pr request` 默认输出更短的 PR 评论式补证请求，更适合直接贴给贡献者。
- 新增 `proof-pr request --full`，需要完整补证模板时再显式使用。
- README、npm 包 README、快速开始和命令速查同步说明短请求和完整模板的区别。

## `v0.1.26` 发布状态

`v0.1.26` 是简化入口版，重点包括：

- CLI 中文向导从四个默认动作收敛为三条主线：`init`、`check`、`request`。
- `demo` 从默认路径下沉为辅助体验命令，避免首次用户误以为必须先跑 demo。
- README、npm 包 README、快速开始和命令速查同步把“默认路径”改为三条命令。

## `v0.1.25` 发布状态

`v0.1.25` 是补证请求增强版，重点包括：

- 新增 `proof-pr request`，只输出可以直接贴给贡献者的补证请求，不展示完整扫描报告。
- 新增 `proof-pr request --output proofpr-request.md`，方便维护者把补证请求保存为文件或复制到 PR 评论。
- Core 新增 `renderContributorRequest`，让后续 GitHub Action 或外部集成可以复用同一段补证请求逻辑。
- README、npm 包 README、命令速查和快速开始同步说明 request 路径。

## `v0.1.24` 发布状态

`v0.1.24` 是自检体验增强版，重点包括：

- `proof-pr doctor --fix`：自动创建缺失的 `.proofpr.yml`、`.github/workflows/proofpr.yml` 和 PR 模板。
- 当 ProofPR workflow 版本过旧、缺少 PR 触发、权限或 HTML artifact 时，`doctor --fix` 会刷新为当前推荐模板。
- 当已有 PR 模板缺少验证、复现、截图或权限理由提示时，`doctor --fix` 只追加 ProofPR 证据补充块，不修改业务代码。
- README、npm 包 README、快速开始和命令速查同步说明自动修复路径。

## `v0.1.23` 发布状态

`v0.1.23` 是产品定位收敛版，重点包括：

- README 第一屏收敛为“PR 证据门禁”：判断 PR 是否带够证据、值不值得审查。
- CLI 默认向导从功能菜单改为三步路径：先看效果、接入仓库、本地自查。
- `doctor`、HTML、SARIF、benchmark 等能力下沉为辅助命令，避免首次用户误以为 ProofPR 是杂项扫描工具箱。
- npm 包 README 和中文文档入口同步精简定位。

## `v0.1.22` 发布状态

`v0.1.22` 是报告直观性增强版，重点包括：

- Markdown 和 HTML 报告新增“风险雷达”，把 rule id 归并为证据完整性、供应链、Workflow 权限、密钥泄露和审查范围。
- HTML 报告新增风险来源条形图，维护者可以先看风险主要集中在哪一类，再进入 finding 细节。
- README、快速开始、命令速查和截图同步说明风险雷达的含义。

## `v0.1.21` 发布状态

`v0.1.21` 是首轮接入体验增强版，重点包括：

- `proof-pr init` 可以重复执行，已有配置默认保留不覆盖，避免新用户因为文件已存在直接卡住。
- `proof-pr init` 输出更短，直接给出要提交的文件、本地自查命令和接入体检命令。
- `proof-pr doctor` 默认自动识别 base 分支，和 `check` 的默认行为保持一致；找不到远程主分支时给出明确处理建议。

## `v0.1.20` 发布状态

`v0.1.20` 是本地自查准确性和中文体验增强版，重点包括：

- `proof-pr check` 默认扫描当前工作区相对 base 的最终状态，包含已提交分支 diff、staged、unstaged 和未跟踪新文件。
- 中文报告补齐供应链规则、审查行动项、证据扣分项和重点文件原因的翻译。

## `v0.1.19` 发布状态

`v0.1.19` 是使用路径简化版，重点包括：

- 新增 `proof-pr check`，本地自查默认自动选择常见 base 分支。
- `guide`、`init`、`doctor` 输出优先推荐 `npx proof-pr@latest check`。
- 文档和截图同步改成更短命令，`scan --base ...` 保留给需要 PR body、diff file 或特殊 base 的高级用法。

## `v0.1.18` 发布状态

`v0.1.18` 是依赖/供应链能力增强版，重点包括：

- 新增 `dependency-non-registry-source`、`dependency-unpinned-version`、`dependency-lockfile-missing`、`dependency-lockfile-only-change`、`dependency-resolution-override`。
- 依赖规则覆盖 npm、Python、Rust、Go 的常见 manifest；Java / Ruby 先进入敏感路径提醒。
- Benchmark 增加 `supply-chain` 分类，总样本扩展到 `22/22 passed`。
- `demo dependency` 改为供应链组合案例，能展示大版本升级、非注册表来源、未固定版本和缺少 lockfile。
- 本版本用于验证 npm Trusted Publishing / GitHub OIDC 自动发布链路。

## `v0.1.17` 发布状态

`v0.1.17` 是小版本功能增强，重点包括：

- `proof-pr init` 生成的 GitHub workflow 默认写出 `proofpr-report.html` 并上传为 `proofpr-report` artifact。
- `proof-pr init` 新增 `--no-html-report` 和 `--html-output <path>`，需要精简 workflow 时可以关闭或改路径。
- `proof-pr doctor` 新增 HTML artifact 检查，能提示 workflow 是否启用了 `html-output` 和 `actions/upload-artifact`。
- 项目自身 `.github/workflows/proofpr.yml` 已同步到 `linsk27/proof-pr@v0.1.17`，并启用 annotations 和 HTML artifact。
- README、快速开始、从 0 到 1 文档、命令速查和示意图同步说明 artifact 查看路径。

## `v0.1.16` 发布状态

`v0.1.16` 已经完成：

- Git tag：`v0.1.16`
- GitHub Release：`v0.1.16`
- npm：`proof-pr@0.1.16`
- npm dist-tag：`latest -> 0.1.16`
- GitHub Actions：main CI 已通过；Release workflow 创建 GitHub Release 成功，但旧发布逻辑在 npm token fallback 步骤失败，npm 已通过本地安全 token 发布。

本次是功能增强版，重点包括：

- HTML 可视化报告新增“一键补证建议”，可以直接复制给贡献者补 PR 描述。
- HTML 风险发现支持按高/中/低/信息筛选，支持搜索规则、文件和详情。
- PR 评论 Markdown 报告新增总览表和可复制补证清单，维护者更容易判断下一步。
- 修复 CLI `--version` 仍显示旧版本的问题。
- `proof-pr init` 生成的 GitHub Action 示例同步到 `v0.1.16`。
- 新增 `proof-pr guide`；直接运行 `proof-pr` 也会显示中文功能菜单，按目标给出命令和结果位置。
- 新增 `proof-pr doctor`，可检查配置、workflow、Action 版本、PR 权限和本地 diff 可读性。
- 新增 `proof-pr demo`，无需 clone 仓库即可运行内置风险案例。
- 新增 `proof-pr template`，并让 `proof-pr init` 默认生成 PR 模板，帮助贡献者提前补充证据。
- Release workflow 已改为 OIDC trusted publishing 发布，不再依赖 `NPM_TOKEN`。
- CLI 支持 `--format html`，可生成独立 HTML 可视化报告。
- CLI `scan` 支持 `--output`，可直接把 HTML、SARIF、JSON 或 Markdown 报告写入文件。
- GitHub Action 支持 `html-output`，可把可视化报告上传为 artifact。
- README 和中文文档补充真实截图、从 0 到 1 使用路径和报告解释。
- HTML 报告集中展示风险等级、证据评分、审查门禁、行动清单、重点文件、扣分原因和可执行补证建议。

## 版本说明

`0.1.8` 已经发布到 npm，但 CLI `--version` 仍显示旧版本。`0.1.49` 继承了后续修复，并且是当前推荐使用版本。

## 发布后动作

可以在 GitHub Release 页面继续执行 Marketplace 上架流程。
