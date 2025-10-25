# GitHub Actions + Claude Code 自动化系统 - 技术实施规格 (多文件架构)

> **文档类型**: 代码生成优化的技术规格说明
> **创建日期**: 2025-10-25
> **架构策略**: 多文件可维护架构
> **目标**: 为自动代码生成提供直接可执行的实施蓝图

---

## 问题陈述

### 业务问题
当前 NestJS 后端项目缺少自动化 CI/CD 系统,开发者需要手动执行编码、测试、提交和 PR 创建等重复性工作,效率低下且容易出错。

### 现状分析
- **无 CI/CD**: `.github/workflows/` 目录仅有单文件工作流,缺少模块化设计
- **手动流程**: 所有代码变更、测试、Git 操作需人工执行
- **协作低效**: Issue 和 PR 之间缺少自动化关联
- **维护性差**: 现有单文件工作流(472行)难以理解和维护

### 预期结果
用户在 GitHub Issue 或 PR 中通过 `@ccai <prompt>` 评论即可触发:
1. 自动创建/切换 issue 分支
2. Claude Code 执行编码任务
3. 自动运行测试
4. 自动提交代码
5. 自动创建 Pull Request
6. 实时反馈执行状态

**重要**: 通过多文件架构实现高可维护性,遵循 KISS、DRY 原则。

---

## 解决方案概述

### 核心策略
实现基于 GitHub Actions 的 AI 编码自动化工作流,通过**多文件架构**实现关注点分离,提高可维护性和可复用性。

### 主要系统变更
1. **多个 GitHub Actions 工作流文件** (替代单文件设计)
   - `.github/workflows/ccai-trigger.yml` (触发器)
   - `.github/workflows/ccai-execute.yml` (执行器,可复用工作流)
2. **独立 Shell 脚本模块**
   - `.github/scripts/ccai/parse-comment.sh` (评论解析)
   - `.github/scripts/ccai/setup-env.sh` (环境设置)
   - `.github/scripts/ccai/setup-branch.sh` (分支管理)
   - `.github/scripts/ccai/check-permission.sh` (权限验证)
   - `.github/scripts/ccai/create-feedback.sh` (反馈生成)
3. **配置文件**
   - `.github/config/ccai-config.json` (集中配置)

### 架构优势
- **可维护性**: 每个文件职责单一,易于理解
- **可复用性**: 可复用工作流可被其他触发器调用
- **可测试性**: 独立脚本可在本地测试
- **DRY 原则**: 消除重复代码,集中管理配置

### 成功标准
- ✅ 用户评论 `@ccai <prompt>` 后,工作流在 5 秒内响应
- ✅ 工作流自动创建/切换正确的 issue 分支
- ✅ Claude Code 成功执行编码任务并提交代码
- ✅ 测试失败时,错误信息清晰反馈到评论
- ✅ 成功时,PR 链接自动添加到原始评论
- ✅ 并发请求正确排队,不会产生冲突
- ✅ 代码结构清晰,维护成本低

---

## 文件结构设计

### 完整文件树

```
.github/
├── workflows/
│   ├── ccai-trigger.yml              # 主触发器 (issue_comment + pr_review_comment)
│   └── ccai-execute.yml              # 可复用执行工作流
├── scripts/
│   └── ccai/
│       ├── parse-comment.sh          # 提取提示词
│       ├── setup-env.sh              # 创建环境配置文件
│       ├── setup-branch.sh           # 分支管理逻辑
│       ├── check-permission.sh       # 权限验证 (可选,当前通过 GitHub Script)
│       ├── run-claude.sh             # Claude Code 执行封装
│       └── create-feedback.sh        # 生成反馈评论内容
└── config/
    └── ccai-config.json              # 集中配置 (超时、数据库凭证等)
```

### 文件职责矩阵

| 文件 | 类型 | 职责 | 输入 | 输出 |
|------|------|------|------|------|
| `ccai-trigger.yml` | Workflow | 监听评论事件,调用执行工作流 | GitHub Event | 调用 `ccai-execute.yml` |
| `ccai-execute.yml` | Reusable Workflow | 执行完整的 AI 编码流程 | issue_number, prompt | PR URL / Error |
| `parse-comment.sh` | Shell Script | 从评论中提取提示词 | comment_body | prompt |
| `setup-env.sh` | Shell Script | 生成 `.env.development.local` | API key, DB config | 环境文件 |
| `setup-branch.sh` | Shell Script | 创建/切换 issue 分支 | issue_number | branch_name |
| `run-claude.sh` | Shell Script | 执行 Claude Code 并检测交互 | prompt | exit_code, logs |
| `create-feedback.sh` | Shell Script | 生成反馈评论 Markdown | status, pr_url, logs | comment_body |
| `ccai-config.json` | JSON Config | 集中管理配置参数 | - | 配置对象 |

---

## 技术实施详细规格

### 1. 触发工作流 - `ccai-trigger.yml`

#### 文件路径
```
.github/workflows/ccai-trigger.yml
```

#### 完整 YAML 规格

```yaml
name: CCAI Trigger - Issue/PR Comment Listener

# 触发事件: Issue 评论和 PR Review 评论
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

# 权限配置
permissions:
  contents: write       # 允许推送代码
  pull-requests: write  # 允许创建和更新 PR
  issues: write         # 允许创建和更新评论

jobs:
  # ==========================================
  # Job 1: 验证和参数提取
  # ==========================================
  validate-and-extract:
    name: Validate & Extract Parameters
    runs-on: ubuntu-latest

    # 仅在评论以 @ccai 开头时触发
    if: startsWith(github.event.comment.body, '@ccai')

    outputs:
      should_proceed: ${{ steps.validate.outputs.should_proceed }}
      issue_number: ${{ steps.extract-issue.outputs.issue_number }}
      prompt: ${{ steps.extract-prompt.outputs.prompt }}
      comment_id: ${{ steps.initial-comment.outputs.comment_id }}

    steps:
      # ------------------------------------------
      # 步骤 1: 权限验证
      # ------------------------------------------
      - name: Check user permission
        id: check-permission
        uses: actions/github-script@v7
        with:
          script: |
            const { data: permission } = await github.rest.repos.getCollaboratorPermissionLevel({
              owner: context.repo.owner,
              repo: context.repo.repo,
              username: context.actor
            });

            const hasPermission = ['admin', 'write'].includes(permission.permission);

            if (!hasPermission) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: '❌ 权限不足: 只有拥有 write 或 admin 权限的用户才能触发 Claude Code。'
              });
              core.setFailed('User does not have sufficient permissions');
            }

            core.setOutput('has_permission', hasPermission);
            return hasPermission;

      # ------------------------------------------
      # 步骤 2: 提取 Issue ID
      # ------------------------------------------
      - name: Extract Issue ID
        id: extract-issue
        if: steps.check-permission.outputs.has_permission == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            let issueNumber = null;

            // 场景 1: Issue 评论
            if (context.eventName === 'issue_comment') {
              issueNumber = context.issue.number;
              console.log(`Issue comment detected: #${issueNumber}`);
            }
            // 场景 2: PR Review 评论
            else if (context.eventName === 'pull_request_review_comment') {
              const { data: pr } = await github.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: context.issue.number
              });

              const body = pr.body || '';
              const issueMatch = body.match(/(?:Closes|Fixes|Resolves)\s+#(\d+)/i);

              if (issueMatch) {
                issueNumber = parseInt(issueMatch[1], 10);
                console.log(`PR comment detected, extracted issue: #${issueNumber}`);
              } else {
                await github.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: context.issue.number,
                  body: '❌ 无法从 PR 描述中提取 Issue 编号。请在 PR 描述中添加 "Closes #xxx" 或 "Fixes #xxx"。'
                });
                core.setFailed('Unable to extract issue number from PR');
                return null;
              }
            }

            if (!issueNumber) {
              core.setFailed('Failed to determine issue number');
            }

            core.setOutput('issue_number', issueNumber);
            return issueNumber;

      # ------------------------------------------
      # 步骤 3: 提取提示词
      # ------------------------------------------
      - name: Extract prompt
        id: extract-prompt
        if: steps.extract-issue.outputs.issue_number
        uses: actions/github-script@v7
        with:
          script: |
            const commentBody = context.payload.comment.body;
            const prompt = commentBody.replace(/^@ccai\s+/, '').trim();

            if (!prompt) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: '❌ 请提供具体的任务描述。格式: `@ccai <your task description>`'
              });
              core.setFailed('Empty prompt');
              return null;
            }

            core.setOutput('prompt', prompt);
            console.log(`Extracted prompt: ${prompt}`);
            return prompt;

      # ------------------------------------------
      # 步骤 4: 创建初始反馈评论
      # ------------------------------------------
      - name: Post initial comment
        id: initial-comment
        if: steps.extract-prompt.outputs.prompt
        uses: actions/github-script@v7
        with:
          script: |
            const prompt = `${{ steps.extract-prompt.outputs.prompt }}`;
            const { data: comment } = await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `🤖 Claude Code 正在处理您的请求...\n\n📋 **任务**: ${prompt}\n\n⏳ 请稍候...`
            });

            core.setOutput('comment_id', comment.id);
            return comment.id;

      # ------------------------------------------
      # 步骤 5: 设置验证标志
      # ------------------------------------------
      - name: Set validation result
        id: validate
        if: always()
        run: |
          if [ "${{ steps.check-permission.outputs.has_permission }}" == "true" ] && \
             [ -n "${{ steps.extract-issue.outputs.issue_number }}" ] && \
             [ -n "${{ steps.extract-prompt.outputs.prompt }}" ]; then
            echo "should_proceed=true" >> $GITHUB_OUTPUT
          else
            echo "should_proceed=false" >> $GITHUB_OUTPUT
          fi

  # ==========================================
  # Job 2: 调用执行工作流
  # ==========================================
  execute-task:
    name: Execute Claude Code Task
    needs: validate-and-extract
    if: needs.validate-and-extract.outputs.should_proceed == 'true'
    uses: ./.github/workflows/ccai-execute.yml
    with:
      issue_number: ${{ needs.validate-and-extract.outputs.issue_number }}
      prompt: ${{ needs.validate-and-extract.outputs.prompt }}
      comment_id: ${{ needs.validate-and-extract.outputs.comment_id }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 技术要点

1. **两阶段设计**:
   - Job 1: 快速验证和参数提取
   - Job 2: 调用可复用工作流执行任务

2. **DRY 原则**: 所有评论创建逻辑集中在 Job 1,避免重复

3. **失败快速返回**: 权限或参数验证失败立即退出,不调用执行工作流

---

### 2. 执行工作流 - `ccai-execute.yml`

#### 文件路径
```
.github/workflows/ccai-execute.yml
```

#### 完整 YAML 规格

```yaml
name: CCAI Execute - Reusable Workflow

# 可复用工作流: 被 ccai-trigger.yml 调用
on:
  workflow_call:
    inputs:
      issue_number:
        description: 'Issue number'
        required: true
        type: string
      prompt:
        description: 'User prompt for Claude Code'
        required: true
        type: string
      comment_id:
        description: 'Initial comment ID for updates'
        required: true
        type: string
    secrets:
      ANTHROPIC_API_KEY:
        description: 'Anthropic API Key for Claude Code'
        required: true
      GITHUB_TOKEN:
        description: 'GitHub Token for API calls'
        required: true

jobs:
  execute:
    name: Execute Claude Code
    runs-on: ubuntu-latest
    timeout-minutes: 60

    # 并发控制: 按 issue ID 排队
    concurrency:
      group: ccai-issue-${{ inputs.issue_number }}
      cancel-in-progress: false

    # Service Containers: PostgreSQL + Redis
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: nestjs_ci_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test_user"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      # ==========================================
      # 步骤 1: 检出代码
      # ==========================================
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      # ==========================================
      # 步骤 2: 分支管理
      # ==========================================
      - name: Setup branch
        id: setup-branch
        run: |
          bash .github/scripts/ccai/setup-branch.sh "${{ inputs.issue_number }}"

      # ==========================================
      # 步骤 3: 设置 Node.js
      # ==========================================
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # ==========================================
      # 步骤 4: 安装依赖
      # ==========================================
      - name: Install dependencies
        run: npm ci --prefer-offline --no-audit

      # ==========================================
      # 步骤 5: 创建环境配置文件
      # ==========================================
      - name: Create environment file
        run: |
          bash .github/scripts/ccai/setup-env.sh "${{ secrets.ANTHROPIC_API_KEY }}"

      # ==========================================
      # 步骤 6: 安装 Claude Code CLI
      # ==========================================
      - name: Install Claude Code CLI
        run: |
          npm install -g @anthropic-ai/claude-code
          claude --version

      # ==========================================
      # 步骤 7: 执行 Claude Code 任务
      # ==========================================
      - name: Run Claude Code
        id: run-claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          bash .github/scripts/ccai/run-claude.sh "${{ inputs.prompt }}"

      # ==========================================
      # 步骤 8: 处理 Claude 交互请求
      # ==========================================
      - name: Handle Claude interaction
        if: steps.run-claude.outputs.interaction_detected == 'true'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const commentId = ${{ inputs.comment_id }};
            const interactionMessage = `${{ steps.run-claude.outputs.interaction_message }}`;

            await github.rest.issues.updateComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: commentId,
              body: `🤖 Claude Code 需要更多信息:\n\n\`\`\`\n${interactionMessage}\n\`\`\`\n\n请在此评论下回复,然后重新触发工作流。`
            });

      # ==========================================
      # 步骤 9: 检查 Git 变更
      # ==========================================
      - name: Check for changes
        id: check-changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
            echo "✅ Detected code changes"
            git status --short
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
            echo "⚠️ No code changes detected"
          fi

      # ==========================================
      # 步骤 10: 推送变更
      # ==========================================
      - name: Push changes
        if: steps.check-changes.outputs.has_changes == 'true'
        run: |
          BRANCH_NAME="issue_${{ inputs.issue_number }}"
          ISSUE_NUMBER="${{ inputs.issue_number }}"

          git add .
          git commit -m "chore: Claude Code automated changes for issue #${ISSUE_NUMBER}

Co-Authored-By: Claude <noreply@anthropic.com>" || true
          git push origin "$BRANCH_NAME"

          echo "✅ Changes pushed to branch: $BRANCH_NAME"

      # ==========================================
      # 步骤 11: 创建 Pull Request
      # ==========================================
      - name: Create Pull Request
        if: steps.check-changes.outputs.has_changes == 'true' && steps.run-claude.outputs.exit_code == '0'
        id: create-pr
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const branchName = `issue_${{ inputs.issue_number }}`;
            const issueNumber = ${{ inputs.issue_number }};
            const prompt = `${{ inputs.prompt }}`;

            // 检查是否已存在 PR
            const { data: existingPRs } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              head: `${context.repo.owner}:${branchName}`,
              state: 'open'
            });

            let prUrl;

            if (existingPRs.length > 0) {
              prUrl = existingPRs[0].html_url;
              console.log(`PR already exists: ${prUrl}`);
            } else {
              const { data: pr } = await github.rest.pulls.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `Fix: Issue #${issueNumber} - Claude Code automated changes`,
                head: branchName,
                base: 'main',
                body: `Closes #${issueNumber}

🤖 This PR was automatically generated by Claude Code.

**Original Request**: ${prompt}

---
Generated with [Claude Code](https://claude.com/claude-code)`
              });

              prUrl = pr.html_url;
              console.log(`Created new PR: ${prUrl}`);
            }

            core.setOutput('pr_url', prUrl);
            return prUrl;

      # ==========================================
      # 步骤 12: 更新成功评论
      # ==========================================
      - name: Update comment on success
        if: success() && steps.create-pr.outputs.pr_url
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const commentId = ${{ inputs.comment_id }};
            const prUrl = '${{ steps.create-pr.outputs.pr_url }}';
            const prompt = `${{ inputs.prompt }}`;

            await github.rest.issues.updateComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: commentId,
              body: `✅ **任务完成!**

📋 **原始请求**: ${prompt}

🔗 **Pull Request**: ${prUrl}

请查看 PR 并进行代码审查。`
            });

      # ==========================================
      # 步骤 13: 更新失败评论
      # ==========================================
      - name: Update comment on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const commentId = ${{ inputs.comment_id }};
            const prompt = `${{ inputs.prompt }}`;
            const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

            await github.rest.issues.updateComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: commentId,
              body: `❌ **任务失败**

📋 **原始请求**: ${prompt}

🔍 **查看详细日志**: [GitHub Actions 运行记录](${runUrl})

请检查错误信息并重试。`
            });

      # ==========================================
      # 步骤 14: 更新无变更评论
      # ==========================================
      - name: Update comment on no changes
        if: success() && steps.check-changes.outputs.has_changes == 'false'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const commentId = ${{ inputs.comment_id }};
            const prompt = `${{ inputs.prompt }}`;

            await github.rest.issues.updateComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: commentId,
              body: `⚠️ **任务完成,但未检测到代码变更**

📋 **原始请求**: ${prompt}

Claude Code 执行完成,但未生成任何代码变更。请检查任务是否需要代码修改。`
            });
```

#### 技术要点

1. **可复用设计**: 通过 `workflow_call` 触发,可被多个触发器调用
2. **参数化配置**: 所有动态值通过 inputs 传递
3. **模块化脚本**: 复杂逻辑封装到独立 Shell 脚本
4. **清晰职责**: 只负责执行,不处理权限验证

---

### 3. Shell 脚本规格

#### 3.1 分支管理脚本 - `setup-branch.sh`

##### 文件路径
```
.github/scripts/ccai/setup-branch.sh
```

##### 完整脚本

```bash
#!/bin/bash
# ==========================================
# 分支管理脚本
# 功能: 创建或切换到 issue 分支
# 输入: $1 = issue_number
# 输出: GITHUB_OUTPUT (branch_name)
# ==========================================

set -e

ISSUE_NUMBER="$1"
BRANCH_NAME="issue_${ISSUE_NUMBER}"

# 验证参数
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Error: Issue number is required"
  exit 1
fi

echo "📋 Managing branch for issue #${ISSUE_NUMBER}"

# 配置 Git
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# 检查分支是否存在
if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
  echo "🔄 Branch $BRANCH_NAME exists, checking out and pulling..."
  git fetch origin "$BRANCH_NAME"
  git checkout "$BRANCH_NAME"
  git pull origin "$BRANCH_NAME"
else
  echo "🆕 Branch $BRANCH_NAME does not exist, creating from main..."
  git checkout -b "$BRANCH_NAME" main
fi

# 输出到 GitHub Actions
echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
echo "✅ Branch setup complete: $BRANCH_NAME"
```

##### 技术细节

| 功能点 | 实现方式 | 错误处理 |
|--------|---------|---------|
| 参数验证 | 检查 `$1` 非空 | 退出码 1 |
| Git 配置 | 使用 `github-actions[bot]` 身份 | 自动成功 |
| 远程分支检查 | `git ls-remote --heads origin` | grep 匹配 |
| 分支创建 | `git checkout -b` | 自动失败退出 |
| 分支切换 | `git checkout + git pull` | 自动失败退出 |

---

#### 3.2 环境配置脚本 - `setup-env.sh`

##### 文件路径
```
.github/scripts/ccai/setup-env.sh
```

##### 完整脚本

```bash
#!/bin/bash
# ==========================================
# 环境配置文件生成脚本
# 功能: 创建 .env.development.local
# 输入: $1 = ANTHROPIC_API_KEY
# 输出: .env.development.local 文件
# ==========================================

set -e

ANTHROPIC_API_KEY="$1"

# 验证参数
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ Error: ANTHROPIC_API_KEY is required"
  exit 1
fi

echo "📝 Creating environment configuration file..."

# 创建环境文件
cat > .env.development.local << EOF
# ==========================================
# CI Environment Configuration
# Auto-generated by GitHub Actions
# ==========================================

# Application
NODE_ENV=development
PORT=3000

# Database (Service Container)
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/nestjs_ci_test?schema=public"

# Redis (Service Container)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=debug

# Anthropic API Key (from GitHub Secrets)
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
EOF

echo "✅ Environment file created: .env.development.local"

# 显示内容 (隐藏敏感信息)
echo "📄 File contents (API key hidden):"
cat .env.development.local | grep -v "ANTHROPIC_API_KEY"
echo "ANTHROPIC_API_KEY=***REDACTED***"
```

##### 技术细节

| 功能点 | 实现方式 | 安全性 |
|--------|---------|-------|
| 参数验证 | 检查 `$1` 非空 | 必需 |
| 文件创建 | Heredoc (`cat > file << EOF`) | 覆盖现有文件 |
| 敏感信息保护 | 日志中隐藏 API key | `grep -v` 过滤 |
| 文件路径 | 项目根目录 `.env.development.local` | 固定路径 |

---

#### 3.3 Claude 执行脚本 - `run-claude.sh`

##### 文件路径
```
.github/scripts/ccai/run-claude.sh
```

##### 完整脚本

```bash
#!/bin/bash
# ==========================================
# Claude Code 执行脚本
# 功能: 执行 Claude Code 并检测交互请求
# 输入: $1 = prompt
# 输出: GITHUB_OUTPUT (exit_code, interaction_detected, interaction_message)
# ==========================================

PROMPT="$1"
LOG_FILE="claude_output.log"

# 验证参数
if [ -z "$PROMPT" ]; then
  echo "❌ Error: Prompt is required"
  exit 1
fi

echo "🤖 Executing Claude Code..."
echo "📋 Prompt: $PROMPT"

# 执行 Claude Code (允许失败,以便捕获退出码)
set +e
claude -p "$PROMPT" 2>&1 | tee "$LOG_FILE"
CLAUDE_EXIT_CODE=$?
set -e

echo "📊 Claude exit code: $CLAUDE_EXIT_CODE"

# 检查是否有交互请求
INTERACTION_DETECTED=false
INTERACTION_MESSAGE=""

if grep -q "需要更多信息\|请确认\|human interaction\|requires confirmation" "$LOG_FILE"; then
  echo "🔔 Interaction detected"
  INTERACTION_DETECTED=true

  # 提取交互内容 (前20行)
  INTERACTION_MESSAGE=$(grep -A 5 "需要更多信息\|请确认\|human interaction\|requires confirmation" "$LOG_FILE" | head -20)
fi

# 输出到 GitHub Actions
echo "exit_code=$CLAUDE_EXIT_CODE" >> $GITHUB_OUTPUT
echo "interaction_detected=$INTERACTION_DETECTED" >> $GITHUB_OUTPUT

if [ "$INTERACTION_DETECTED" = true ]; then
  # 使用 multiline output
  echo "interaction_message<<EOF" >> $GITHUB_OUTPUT
  echo "$INTERACTION_MESSAGE" >> $GITHUB_OUTPUT
  echo "EOF" >> $GITHUB_OUTPUT
fi

# 返回 Claude 的退出码
exit $CLAUDE_EXIT_CODE
```

##### 技术细节

| 功能点 | 实现方式 | 错误处理 |
|--------|---------|---------|
| 参数验证 | 检查 `$1` 非空 | 退出码 1 |
| 执行 Claude | `claude -p "$PROMPT"` | 捕获退出码 |
| 日志记录 | `tee` 同时输出到终端和文件 | 自动成功 |
| 交互检测 | `grep` 关键词匹配 | 无匹配时为 false |
| 退出码传递 | 返回 Claude 的原始退出码 | 保留原始状态 |

---

#### 3.4 评论解析脚本 - `parse-comment.sh` (可选)

##### 文件路径
```
.github/scripts/ccai/parse-comment.sh
```

##### 完整脚本

```bash
#!/bin/bash
# ==========================================
# 评论解析脚本
# 功能: 从评论中提取提示词
# 输入: $1 = comment_body
# 输出: STDOUT (prompt)
# ==========================================

set -e

COMMENT_BODY="$1"

# 验证参数
if [ -z "$COMMENT_BODY" ]; then
  echo "❌ Error: Comment body is required" >&2
  exit 1
fi

# 提取提示词 (去除 @ccai 前缀和空白)
PROMPT=$(echo "$COMMENT_BODY" | sed 's/^@ccai\s*//' | xargs)

# 验证提示词非空
if [ -z "$PROMPT" ]; then
  echo "❌ Error: Prompt is empty after extraction" >&2
  exit 1
fi

# 输出提示词
echo "$PROMPT"
```

##### 技术细节

**注意**: 此脚本为可选实现,当前设计中提示词提取在 GitHub Script 中完成。如果未来需要在 Shell 中处理,可使用此脚本。

---

### 4. 配置文件规格

#### 4.1 集中配置 - `ccai-config.json`

##### 文件路径
```
.github/config/ccai-config.json
```

##### 完整配置

```json
{
  "version": "1.0.0",
  "description": "CCAI Workflow Configuration",
  "workflow": {
    "timeout_minutes": 60,
    "concurrency_strategy": "queue"
  },
  "services": {
    "postgres": {
      "image": "postgres:15-alpine",
      "user": "test_user",
      "password": "test_password",
      "database": "nestjs_ci_test",
      "port": 5432,
      "health_check": {
        "command": "pg_isready -U test_user",
        "interval": "10s",
        "timeout": "5s",
        "retries": 5
      }
    },
    "redis": {
      "image": "redis:7-alpine",
      "port": 6379,
      "password": "",
      "database": 0,
      "health_check": {
        "command": "redis-cli ping",
        "interval": "10s",
        "timeout": "5s",
        "retries": 5
      }
    }
  },
  "environment": {
    "node_env": "development",
    "port": 3000,
    "log_level": "debug"
  },
  "git": {
    "branch_prefix": "issue_",
    "commit_message_template": "chore: Claude Code automated changes for issue #%s",
    "user_name": "github-actions[bot]",
    "user_email": "github-actions[bot]@users.noreply.github.com"
  },
  "pull_request": {
    "title_template": "Fix: Issue #%s - Claude Code automated changes",
    "base_branch": "main",
    "body_template": "Closes #%s\n\n🤖 This PR was automatically generated by Claude Code.\n\n**Original Request**: %s\n\n---\nGenerated with [Claude Code](https://claude.com/claude-code)"
  },
  "feedback_messages": {
    "permission_denied": "❌ 权限不足: 只有拥有 write 或 admin 权限的用户才能触发 Claude Code。",
    "issue_extraction_failed": "❌ 无法从 PR 描述中提取 Issue 编号。请在 PR 描述中添加 \"Closes #xxx\" 或 \"Fixes #xxx\"。",
    "empty_prompt": "❌ 请提供具体的任务描述。格式: `@ccai <your task description>`",
    "processing": "🤖 Claude Code 正在处理您的请求...\n\n📋 **任务**: %s\n\n⏳ 请稍候...",
    "success": "✅ **任务完成!**\n\n📋 **原始请求**: %s\n\n🔗 **Pull Request**: %s\n\n请查看 PR 并进行代码审查。",
    "failure": "❌ **任务失败**\n\n📋 **原始请求**: %s\n\n🔍 **查看详细日志**: [GitHub Actions 运行记录](%s)\n\n请检查错误信息并重试。",
    "no_changes": "⚠️ **任务完成,但未检测到代码变更**\n\n📋 **原始请求**: %s\n\nClaude Code 执行完成,但未生成任何代码变更。请检查任务是否需要代码修改。",
    "interaction_required": "🤖 Claude Code 需要更多信息:\n\n```\n%s\n```\n\n请在此评论下回复,然后重新触发工作流。"
  },
  "interaction_keywords": [
    "需要更多信息",
    "请确认",
    "human interaction",
    "requires confirmation"
  ]
}
```

##### 使用方式

**在工作流中读取配置** (示例):
```yaml
- name: Load configuration
  id: load-config
  run: |
    CONFIG=$(cat .github/config/ccai-config.json)
    TIMEOUT=$(echo $CONFIG | jq -r '.workflow.timeout_minutes')
    echo "timeout=$TIMEOUT" >> $GITHUB_OUTPUT
```

**注意**: 当前实现中配置直接硬编码在工作流文件中。此 JSON 文件为**可选优化**,用于集中管理配置,便于未来维护。

---

## 实施步骤详解

### 阶段 1: 文件结构创建 (P0)

#### 步骤 1.1: 创建目录结构
```bash
mkdir -p .github/workflows
mkdir -p .github/scripts/ccai
mkdir -p .github/config
```

#### 步骤 1.2: 创建工作流文件
- 创建 `.github/workflows/ccai-trigger.yml`
- 创建 `.github/workflows/ccai-execute.yml`

#### 步骤 1.3: 创建脚本文件
- 创建 `.github/scripts/ccai/setup-branch.sh`
- 创建 `.github/scripts/ccai/setup-env.sh`
- 创建 `.github/scripts/ccai/run-claude.sh`

#### 步骤 1.4: 设置脚本权限
```bash
chmod +x .github/scripts/ccai/*.sh
```

#### 步骤 1.5: 创建配置文件 (可选)
- 创建 `.github/config/ccai-config.json`

**验证标准**:
- ✅ 所有文件存在于正确路径
- ✅ Shell 脚本具有执行权限
- ✅ JSON 配置语法正确

---

### 阶段 2: 配置 GitHub Secrets (P0)

#### 步骤 2.1: 配置 ANTHROPIC_API_KEY

1. 进入仓库 Settings
2. 导航到 Secrets and variables → Actions
3. 点击 "New repository secret"
4. 名称: `ANTHROPIC_API_KEY`
5. 值: 粘贴 API 密钥
6. 点击 "Add secret"

**验证方式**:
```bash
# 在工作流中测试
echo "API key length: ${#ANTHROPIC_API_KEY}"
# 应输出非零长度
```

---

### 阶段 3: 测试工作流 (P0)

#### 场景 1: Issue 评论触发

**操作**:
1. 创建测试 Issue #999
2. 评论 `@ccai 添加一个健康检查端点`

**预期结果**:
- ✅ 触发工作流运行
- ✅ 权限验证通过
- ✅ 创建 `issue_999` 分支
- ✅ 环境文件正确生成
- ✅ Claude Code 执行成功
- ✅ PR 自动创建

**验证命令**:
```bash
# 检查分支
git branch -r | grep issue_999

# 检查 PR
gh pr list --head issue_999
```

---

#### 场景 2: PR 评论触发

**操作**:
1. 创建 Issue #1000
2. 创建 PR 并在描述中添加 `Closes #1000`
3. 在 PR 中评论 `@ccai 优化数据库查询`

**预期结果**:
- ✅ 从 PR 提取 Issue ID: 1000
- ✅ 切换到 `issue_1000` 分支
- ✅ 执行任务并推送变更

---

#### 场景 3: 权限不足

**操作**:
1. 使用非协作者账号评论 `@ccai test`

**预期结果**:
- ❌ 工作流立即退出
- ❌ 创建权限不足评论
- ❌ 不调用执行工作流

---

#### 场景 4: 并发请求

**操作**:
1. 在 Issue #999 快速连续评论两次 `@ccai`

**预期结果**:
- ✅ 第一个请求立即执行
- ✅ 第二个请求进入队列
- ✅ 第一个完成后,第二个自动开始

**验证方式**:
- 查看 Actions 运行时间,确保非并行

---

### 阶段 4: 错误处理验证 (P1)

#### 测试用例矩阵

| 测试用例 | 触发方式 | 预期行为 | 验证方法 |
|---------|---------|---------|---------|
| 空提示词 | `@ccai` | 显示使用说明 | 检查评论内容 |
| PR 无 Issue 关联 | PR 评论但无 Closes | 显示提取失败错误 | 检查错误评论 |
| Claude 执行失败 | 触发不可能完成的任务 | 显示失败信息和日志链接 | 检查评论链接 |
| 无代码变更 | 触发仅查询任务 | 显示无变更警告 | 检查评论状态 |
| 超时 | 触发长时间任务 | 60分钟后自动终止 | 检查工作流状态 |

---

## 集成流程图

### 用户触发流程

```
用户评论 @ccai <prompt>
         |
         v
[ccai-trigger.yml - Job 1: validate-and-extract]
         |
         ├─> 权限验证
         |   └─> 失败 → 创建权限不足评论 → 退出
         |
         ├─> 提取 Issue ID
         |   └─> 失败 → 创建提取失败评论 → 退出
         |
         ├─> 提取提示词
         |   └─> 失败 → 创建空提示词评论 → 退出
         |
         └─> 创建初始评论 ("正在处理...")
         |
         v
[ccai-trigger.yml - Job 2: execute-task]
         |
         └─> 调用可复用工作流
         |
         v
[ccai-execute.yml - Job: execute]
         |
         ├─> 检出代码
         ├─> 分支管理 (setup-branch.sh)
         ├─> 安装依赖
         ├─> 创建环境文件 (setup-env.sh)
         ├─> 安装 Claude CLI
         ├─> 执行 Claude (run-claude.sh)
         |   ├─> 成功 → 继续
         |   ├─> 失败 → 更新评论 (失败) → 退出
         |   └─> 交互 → 更新评论 (交互请求) → 退出
         |
         ├─> 检查代码变更
         |   └─> 无变更 → 更新评论 (警告) → 退出
         |
         ├─> 推送变更
         ├─> 创建 PR
         └─> 更新评论 (成功 + PR 链接)
```

---

## 文件间依赖关系

### 依赖矩阵

| 调用方 | 被调用方 | 依赖类型 | 传递数据 |
|--------|---------|---------|---------|
| `ccai-trigger.yml` | `ccai-execute.yml` | Workflow Call | issue_number, prompt, comment_id |
| `ccai-execute.yml` | `setup-branch.sh` | Shell Exec | issue_number |
| `ccai-execute.yml` | `setup-env.sh` | Shell Exec | ANTHROPIC_API_KEY |
| `ccai-execute.yml` | `run-claude.sh` | Shell Exec | prompt |
| 所有工作流 | `ccai-config.json` | 可选读取 | 配置参数 |

### 数据流图

```
GitHub Event (comment)
         |
         v
[ccai-trigger.yml]
         |
         ├─> GitHub API → 权限验证
         ├─> GitHub API → PR 详情
         └─> GitHub API → 创建评论
         |
         v
[ccai-execute.yml]
         |
         ├─> setup-branch.sh
         |   └─> Git 操作
         |
         ├─> setup-env.sh
         |   └─> 文件系统 (.env.development.local)
         |
         ├─> run-claude.sh
         |   └─> Claude API
         |
         └─> GitHub API → 创建 PR / 更新评论
```

---

## 错误处理决策树

```
开始执行
    |
    ├─> 权限验证
    |   ├─> 通过 → 继续
    |   └─> 失败 → [评论: 权限不足] → 退出
    |
    ├─> Issue ID 提取
    |   ├─> Issue 评论 → 直接获取 → 继续
    |   ├─> PR 评论
    |   |   ├─> 有 Closes #xxx → 提取成功 → 继续
    |   |   └─> 无 Closes #xxx → [评论: 提取失败] → 退出
    |   └─> 其他失败 → [评论: 未知错误] → 退出
    |
    ├─> 提示词提取
    |   ├─> 非空 → 继续
    |   └─> 空 → [评论: 使用说明] → 退出
    |
    ├─> 环境准备
    |   ├─> 成功 → 继续
    |   └─> 失败 → [评论: 环境设置失败] → 退出
    |
    ├─> Claude 执行
    |   ├─> 退出码 0 → 继续
    |   ├─> 检测到交互 → [评论: 交互请求] → 退出
    |   └─> 退出码非 0 → [评论: 执行失败 + 日志] → 退出
    |
    ├─> 代码变更检查
    |   ├─> 有变更 → 推送 + 创建 PR → [评论: 成功 + PR 链接]
    |   └─> 无变更 → [评论: 无变更警告]
    |
    └─> 结束
```

---

## 与现有代码库的集成

### 零侵入原则

**不需要修改的文件**:
- ✅ 所有 `src/` 源代码
- ✅ 所有测试文件
- ✅ `package.json` (依赖列表)
- ✅ `tsconfig.json` (TypeScript 配置)
- ✅ `prisma/schema.prisma` (数据库模型)
- ✅ 所有现有文档

**新增文件**:
- ✅ `.github/workflows/ccai-trigger.yml`
- ✅ `.github/workflows/ccai-execute.yml`
- ✅ `.github/scripts/ccai/*.sh` (3 个脚本)
- ✅ `.github/config/ccai-config.json` (可选)
- ✅ `.env.development.local` (CI 环境临时生成,不提交)

### 与 DX CLI 的关系

| DX CLI 命令 | GitHub Actions 行为 | 说明 |
|------------|-------------------|------|
| `./scripts/dx env setup --dev` | 不调用 (使用 `setup-env.sh`) | 独立实现 |
| `./scripts/dx db migrate --dev` | 不调用 (Claude 负责) | Claude 可能使用 |
| `./scripts/dx test unit` | 不调用 (Claude 负责) | Claude 可能使用 |
| `./scripts/dx build` | 不调用 (按需) | Claude 可能使用 |
| `./scripts/dx start dev` | 不调用 (CI 不启动服务) | N/A |

**重要**: 工作流不直接调用 DX CLI,但 Claude Code 执行任务时可能会使用它们。

---

## 性能和成本优化

### GitHub Actions 配额管理

| 计划类型 | 免费分钟数/月 | 超出费用 |
|---------|-------------|---------|
| 公开仓库 | 无限制 | 免费 |
| 私有仓库 (Free) | 2,000 分钟 | $0.008/分钟 |
| 私有仓库 (Pro) | 3,000 分钟 | $0.008/分钟 |

**优化策略**:
1. 设置 60 分钟超时,避免无限运行
2. 使用并发控制,避免资源浪费
3. 缓存 npm 依赖,加快安装速度

### Claude API 成本控制

| 模型 | 输入成本 | 输出成本 |
|------|---------|---------|
| Claude 3.5 Sonnet | $3/M tokens | $15/M tokens |

**优化策略**:
1. 提示词清晰简洁,减少 token 消耗
2. 任务失败时立即停止,避免重试浪费
3. 使用交互检测,避免 Claude 陷入循环

---

## 监控和日志

### 关键性能指标 (KPI)

| 指标 | 目标值 | 监控方式 |
|------|--------|---------|
| 工作流成功率 | > 80% | GitHub Insights |
| 平均执行时间 | < 30 分钟 | Actions 日志 |
| 权限验证失败率 | < 5% | 评论统计 |
| Claude 交互率 | < 10% | 日志分析 |

### 日志级别

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| 🤖 INFO | 正常流程 | "Executing Claude Code..." |
| ✅ SUCCESS | 成功操作 | "Branch setup complete" |
| ⚠️ WARNING | 非致命问题 | "No code changes detected" |
| ❌ ERROR | 致命错误 | "Permission denied" |
| 🔔 NOTICE | 需要关注 | "Interaction detected" |

---

## 安全性考虑

### Secrets 保护

| Secret 名称 | 使用位置 | 泄露风险 | 防护措施 |
|------------|---------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude CLI | 高 | GitHub Secrets 加密,日志过滤 |
| `GITHUB_TOKEN` | API 调用 | 中 | 自动生成,权限最小化 |

### 权限最小化原则

```yaml
permissions:
  contents: write       # 仅用于推送代码
  pull-requests: write  # 仅用于创建 PR
  issues: write         # 仅用于创建评论
  # 不需要其他权限
```

---

## 文档更新需求

### 必需更新

| 文档 | 更新内容 | 优先级 |
|------|---------|--------|
| `CLAUDE.md` | 添加 GitHub Actions 使用说明 | P0 |
| `README.md` | 添加自动化工作流章节 | P1 |
| `CHANGELOG.md` | 记录新功能 | P1 |

### `CLAUDE.md` 新增章节示例

```markdown
## GitHub Actions 自动化

### 触发 Claude Code

在任意 Issue 或 Pull Request 评论中使用以下命令:

\`\`\`
@ccai <你的任务描述>
\`\`\`

**示例**:
- `@ccai 添加用户认证功能`
- `@ccai 优化数据库查询性能`
- `@ccai 修复登录页面的 bug`

**工作流程**:
1. 系统自动创建/切换到 `issue_xxx` 分支
2. Claude Code 执行任务并提交代码
3. 自动创建 Pull Request
4. 在原评论中显示 PR 链接

**权限要求**: 只有拥有 write 或 admin 权限的用户可以触发。

### 架构说明

工作流采用多文件架构,提高可维护性:
- `ccai-trigger.yml`: 监听评论事件
- `ccai-execute.yml`: 执行 AI 编码任务
- `scripts/ccai/*.sh`: 独立脚本模块
```

---

## 实施准备清单

### 第一阶段: 基础设施 (P0)

- [ ] 创建 `.github/workflows/ccai-trigger.yml`
- [ ] 创建 `.github/workflows/ccai-execute.yml`
- [ ] 创建 `.github/scripts/ccai/setup-branch.sh`
- [ ] 创建 `.github/scripts/ccai/setup-env.sh`
- [ ] 创建 `.github/scripts/ccai/run-claude.sh`
- [ ] 设置脚本执行权限 (`chmod +x`)
- [ ] 配置 GitHub Secret: `ANTHROPIC_API_KEY`

### 第二阶段: 测试验证 (P0)

- [ ] 测试 Issue 评论触发
- [ ] 测试 PR 评论触发
- [ ] 测试权限验证
- [ ] 测试分支管理逻辑
- [ ] 测试并发控制
- [ ] 测试 PR 自动创建
- [ ] 测试错误处理 (至少 5 个场景)

### 第三阶段: 文档更新 (P1)

- [ ] 更新 `CLAUDE.md` 添加使用说明
- [ ] 更新 `README.md` 添加自动化章节
- [ ] 更新 `CHANGELOG.md` 记录新功能

### 第四阶段: 优化增强 (P2)

- [ ] 创建 `.github/config/ccai-config.json` (可选)
- [ ] 实现配置文件读取逻辑
- [ ] 添加更多错误场景处理
- [ ] 优化反馈消息模板
- [ ] 添加性能监控

---

## 总结

### 核心优势

1. **高可维护性**: 多文件架构,每个文件职责单一
2. **高可复用性**: 可复用工作流可被其他触发器调用
3. **DRY 原则**: 消除重复代码,集中管理配置
4. **KISS 原则**: 简单直接,易于理解
5. **零代码侵入**: 现有应用无需任何修改
6. **完全自动化**: 从评论到 PR 的完整流程
7. **安全可控**: 权限验证 + Secret 保护 + 环境隔离

### 与单文件设计对比

| 维度 | 单文件设计 | 多文件设计 |
|------|-----------|-----------|
| 代码行数 | 472 行 | 触发器 ~200 行 + 执行器 ~300 行 |
| 可维护性 | 低 (单文件过长) | 高 (模块化) |
| 可复用性 | 低 (无法复用) | 高 (可复用工作流) |
| 可测试性 | 低 (依赖 GitHub) | 高 (脚本可本地测试) |
| 扩展性 | 低 (修改困难) | 高 (独立扩展) |

### 已知限制

1. **依赖 Claude API**: API 不可用时工作流失败
2. **GitHub Actions 配额**: 超出免费额度需付费
3. **无本地测试**: 工作流必须推送到 GitHub 才能完整测试
4. **交互受限**: Claude 需要交互时只能提示用户,无法自动处理

### 未来扩展方向

1. **支持自定义触发器**: 例如 `/claude`, `/ai`
2. **集成更多 AI 模型**: GPT-4, Gemini
3. **增加任务模板**: 例如 `/claude fix-bug`, `/claude add-feature`
4. **性能监控面板**: 可视化成功率、执行时间等指标
5. **任务优先级**: 紧急任务优先执行

---

**文档版本**: 2.0.0 (多文件架构)
**最后更新**: 2025-10-25
**维护者**: Claude Code
**架构策略**: 模块化、可维护、DRY 原则
