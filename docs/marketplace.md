# GitHub Marketplace 安装说明

ProofPR 作为 GitHub Action 已经具备 Marketplace 上架所需的基础信息：

- `action.yml` 提供 `name`、`description`、`author`、`inputs`。
- `branding` 已配置为 `shield` 图标和蓝色主题。
- README 提供安装示例、截图、使用场景、配置说明和安全边界。
- Release workflow 支持 tag 发布并生成 GitHub Release。

## 上架前检查清单

1. 确认 `action.yml` 中的输入项稳定。
2. 确认 README 第一屏说明清楚：ProofPR 是 PR 证据门禁，不是 AI code reviewer。
3. 确认至少有一个真实 PR 评论截图。
4. 确认仓库有 `LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`。
5. 打 `v0.1.25` tag，等待 GitHub Release 创建完成。
6. 在 GitHub 仓库页面进入 `Releases`，选择最新 release，点击 `Publish this Action to the GitHub Marketplace`。

## 推荐 Marketplace 描述

短描述：

```txt
PR evidence gate for maintainers: risk, evidence score, annotations, SARIF, and review checklist.
```

中文定位：

```txt
ProofPR 帮助开源维护者在深入 review 前，先检查 PR 是否具备足够的测试、复现、权限、依赖和安全证据。
```

推荐标签：

```txt
pull-request, code-review, maintainers, security, ai-coding, mcp, sarif
```

## 安装入口文案

```yaml
- uses: linsk27/proof-pr@v0.1.25
  with:
    fail-on: high
    comment: "true"
    annotations: "true"
```

如果团队需要接入 Code Scanning：

```yaml
- uses: linsk27/proof-pr@v0.1.25
  with:
    sarif-output: proofpr.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: proofpr.sarif
```

## 注意

Marketplace 上架不是代码提交能自动完成的事，需要仓库所有者在 GitHub 网页上确认发布。代码侧已经把可上架所需的基础材料准备好。
