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

输出示例：

```txt
ProofPR benchmark

Summary: 13/13 passed (100%)

Categories:
- dependency: 3/3 passed (100%)
- evidence-contract: 4/4 passed (100%)
```

这个目录的意义是让项目的“准确性”有一个可持续讨论的基准：新增规则时必须补 case，规则误报或漏报时也应该先补 case，再调整实现。
