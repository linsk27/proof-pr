# 贡献指南

感谢你愿意改进 ProofPR。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## 规则变更

ProofPR 的规则默认应该是确定性的。相比猜测代码是不是 AI 写的，我们更看重维护者可以检查的证据。

好的规则输出应该包含：

- 清晰的标题。
- 面向维护者的简短说明。
- 可检查的证据行或文件路径。
- 具体的 review 建议。

## Pull Request

提交 PR 时请包含：

- 改了什么。
- 为什么改。
- 如何验证。
- 有助于 review 的 before/after 行为说明。
