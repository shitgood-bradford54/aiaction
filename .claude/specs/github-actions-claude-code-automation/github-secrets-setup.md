# GitHub Secrets 配置指南

## 概述

GitHub Actions workflow (`ccai.yml`) 需要配置以下 Secrets 来使用 Claude Code API:

- `ANTHROPIC_API_KEY` - Anthropic API 密钥
- `ANTHROPIC_BASE_URL` - Anthropic API 基础 URL (自定义端点)

## 配置步骤

### 1. 访问仓库设置

1. 打开你的 GitHub 仓库
2. 点击 **Settings** (设置) 标签
3. 在左侧菜单中找到 **Security** 部分
4. 点击 **Secrets and variables** → **Actions**

### 2. 添加 ANTHROPIC_API_KEY

1. 点击 **New repository secret** 按钮
2. 填写以下信息:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Secret**: 粘贴你的 Anthropic API 密钥
     ```
     kkkkkkkkkkkkkkkk
     ```
3. 点击 **Add secret** 保存

### 3. 添加 ANTHROPIC_BASE_URL

1. 再次点击 **New repository secret** 按钮
2. 填写以下信息:
   - **Name**: `ANTHROPIC_BASE_URL`
   - **Secret**: 粘贴你的自定义 API 端点
     ```
     https://api.codemirror.codes/
     ```
3. 点击 **Add secret** 保存

### 4. 验证配置

配置完成后,你应该能在 Secrets 列表中看到:

- ✅ `ANTHROPIC_API_KEY`
- ✅ `ANTHROPIC_BASE_URL`

## 工作流中的使用

这些 Secrets 会在以下两个地方被使用:

### 1. 环境变量文件 (步骤 9)

```yaml
- name: Create environment file
  run: |
    cat > .env.development.local << 'EOF'
    ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}
    ANTHROPIC_BASE_URL=${{ secrets.ANTHROPIC_BASE_URL }}
    EOF
```

### 2. Claude Code 执行环境 (步骤 11)

```yaml
- name: Run Claude Code
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
  run: |
    claude -p "$PROMPT"
```

## 安全注意事项

### ✅ 最佳实践

- **Never commit secrets** - Secrets 永远不应该提交到代码仓库
- **Use environment-specific secrets** - 对不同环境使用不同的 API 密钥
- **Rotate regularly** - 定期更换 API 密钥
- **Limit access** - 只给必要的协作者访问 Secrets 的权限

### ⚠️ 日志安全

GitHub Actions 会自动在日志中隐藏 Secret 值:

```bash
# 实际执行
ANTHROPIC_API_KEY=kkkkkkkkkkkkkkkk

# 日志中显示
ANTHROPIC_API_KEY=***
```

但要注意:

- 不要 `echo` 或 `cat` Secrets 到日志
- 配置文件中使用 `grep -v` 过滤敏感信息:
  ```bash
  cat .env.development.local | grep -v "ANTHROPIC_API_KEY"
  ```

## 故障排查

### Secret 未生效

如果工作流报错 "API key not found":

1. **检查 Secret 名称** - 必须完全匹配 (大小写敏感)
   - ✅ `ANTHROPIC_API_KEY`
   - ❌ `anthropic_api_key`

2. **检查 Secret 值** - 确保没有多余的空格或换行符

3. **检查权限** - 确保工作流有权限读取 Secrets:
   ```yaml
   permissions:
     contents: write
     pull-requests: write
     issues: write
   ```

4. **重新触发工作流** - 修改 Secrets 后需要重新运行工作流

### Base URL 配置问题

如果使用自定义 API 端点:

1. **确保 URL 格式正确**:
   - ✅ `https://api.codemirror.codes/`
   - ✅ `https://api.codemirror.codes` (结尾斜杠可选)
   - ❌ `api.codemirror.codes` (缺少协议)

2. **测试端点可达性**:
   ```bash
   curl -I https://api.codemirror.codes/
   ```

3. **检查 Claude Code 是否支持自定义端点**:
   ```bash
   claude --help | grep -i base
   ```

## 更新 Secrets

修改已存在的 Secret:

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 点击 Secret 名称旁边的 **Update** 按钮
3. 输入新值并保存
4. 重新运行工作流以使用新值

## 相关文档

- [GitHub Actions Secrets 官方文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [工作流配置文件](.github/workflows/ccai.yml)
- [系统设计文档](system-design.md)
- [测试计划](test-plan.md)
