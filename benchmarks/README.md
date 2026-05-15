# Benchmark

ProofPR 的 benchmark 不是证明“能准确发现代码 bug”，而是验证内置规则和证据契约是否按预期触发。

运行：

```bash
pnpm benchmark
```

生成 Markdown 报告：

```bash
pnpm benchmark:report
```

写到自定义路径：

```bash
node packages/cli/dist/index.js benchmark --cases benchmarks/cases --format markdown --output benchmark-report.md
```

或者直接使用 CLI：

```bash
node packages/cli/dist/index.js benchmark --cases benchmarks/cases
node packages/cli/dist/index.js benchmark --cases benchmarks/cases --format markdown
```

每个 benchmark case 是一个 JSON 文件，包含：

- `diffFile`：要扫描的 unified diff。
- `config`：可选 ProofPR 配置。
- `pullRequest`：可选 PR 标题和正文。
- `expect`：期望风险等级、Review 门禁、应该出现或不应该出现的 finding。

当前快照报告见 [report.md](report.md)。

## CI 集成

仓库 CI 会在每次 push / PR 中运行：

```bash
pnpm benchmark
pnpm benchmark:report
```

如果任一 benchmark case 失败，CI 会失败。`benchmarks/report.md` 会被追加到 GitHub Actions Summary，方便 reviewer 在 CI 页面直接查看分类通过率和 finding 覆盖。

输出示例：

```txt
ProofPR benchmark

Summary: 22/22 passed (100%)

Categories:
- dependency: 3/3 passed (100%)
- evidence-contract: 4/4 passed (100%)
- supply-chain: 8/8 passed (100%)
```

当前 benchmark 包含 `supply-chain` 分类，覆盖非注册表来源、未固定版本、manifest/lockfile 不一致、lockfile-only 变更、解析覆盖、Python direct URL、Rust git/path 和 Go `go.sum` 同步检查。

这个目录的意义是让项目的“准确性”有一个可持续讨论的基准：新增规则时必须补 case，规则误报或漏报时也应该先补 case，再调整实现。
