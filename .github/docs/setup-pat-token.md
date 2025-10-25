# GitHub PAT Token 设置指南

## 问题背景

GitHub Actions 的默认 `GITHUB_TOKEN` 有一个安全限制:**无法创建或批准 Pull Request**。这会导致以下错误:

```
GitHub Actions is not permitted to create or approve pull requests.
```

## 解决方案: 创建 Personal Access Token (PAT)

### 步骤 1: 创建 Fine-grained Personal Access Token

1. **访问 GitHub Settings**
   - 点击右上角头像 → Settings
   - 左侧菜单选择 **Developer settings**
   - 选择 **Personal access tokens** → **Fine-grained tokens**

2. **点击 "Generate new token"**

3. **配置 Token**
   - **Token name**: `CCAI PR Creator` (任意名称)
   - **Expiration**: 建议选择 **90 days** 或更长
   - **Repository access**:
     - 选择 **Only select repositories**
     - 选择你的仓库 (例如: `shitgood-bradford54/aiaction`)

4. **设置权限 (Permissions)**
   - **Repository permissions**:
     - `Contents`: **Read and write** (推送代码)
     - `Pull requests`: **Read and write** (创建 PR)
     - `Issues`: **Read and write** (更新评论)
     - `Metadata`: **Read-only** (自动添加)

5. **点击 "Generate token"**
   - ⚠️ **重要**: 复制生成的 token,这是唯一一次看到完整 token 的机会

### 步骤 2: 添加 Token 到仓库 Secrets

1. **访问仓库设置**
   - 进入你的仓库页面
   - 点击 **Settings** 标签
   - 左侧菜单选择 **Secrets and variables** → **Actions**

2. **创建新 Secret**
   - 点击 **New repository secret**
   - **Name**: `PAT_TOKEN` (必须使用此名称)
   - **Secret**: 粘贴刚才复制的 token
   - 点击 **Add secret**

### 步骤 3: 验证配置

现在当你在 Issue 评论中使用 `@ccai <任务>` 时,工作流将:

1. 优先使用 `PAT_TOKEN` (如果已配置)
2. 降级使用 `GITHUB_TOKEN` (如果 `PAT_TOKEN` 未配置,但会失败于创建 PR)

## 安全注意事项

### Token 最小权限原则

我们使用 **Fine-grained tokens** (而非 Classic tokens) 的原因:
- ✅ 可以限制只对特定仓库生效
- ✅ 可以精确控制每个权限范围
- ✅ 有过期时间,降低泄露风险
- ✅ 可以随时撤销

### Token 过期处理

当 token 过期时:
1. 工作流会失败并提示权限错误
2. 需要重新生成 token 并更新 Secret

**建议**:
- 在日历中设置提醒,提前续期 token
- 或者设置更长的过期时间 (例如 1 年)

### Token 撤销

如果 token 泄露:
1. 立即前往 GitHub Settings → Developer settings → Personal access tokens
2. 找到对应的 token 并点击 **Revoke**
3. 重新生成新 token 并更新仓库 Secret

## 工作流配置说明

工作流已配置为**向下兼容**:

```yaml
github-token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}
```

这意味着:
- ✅ 如果 `PAT_TOKEN` 存在,使用 PAT (可以创建 PR)
- ⚠️ 如果 `PAT_TOKEN` 不存在,降级使用 `GITHUB_TOKEN` (无法创建 PR,但其他功能正常)

## 常见问题

### Q1: 为什么不能使用 Classic Token?

A: Fine-grained tokens 更安全:
- Classic tokens 对**所有仓库**生效,风险更高
- Fine-grained tokens 可以限制只对单个仓库生效

### Q2: 如果不配置 PAT_TOKEN 会怎样?

A: 工作流会执行,但在创建 PR 时失败,错误信息:
```
GitHub Actions is not permitted to create or approve pull requests.
```

### Q3: 可以使用 GitHub App 代替吗?

A: 可以,但配置更复杂:
- 需要创建 GitHub App
- 需要安装到仓库
- 需要生成 JWT token
- 对于个人项目,PAT 更简单

### Q4: Token 权限是否过大?

A: 不,这是最小权限:
- `Contents: write` - 必需,用于推送代码变更
- `Pull requests: write` - 必需,用于创建 PR
- `Issues: write` - 必需,用于更新 Issue 评论

## 参考资料

- [GitHub Docs: Creating a fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
- [GitHub Docs: Automatic token authentication](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [GitHub Docs: Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
