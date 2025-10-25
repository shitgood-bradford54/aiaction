# 🤖 GitHub Actions + Claude Code 自动化编程系统 - MVP 实施计划

## 📋 项目概述

实现一个基于 GitHub Actions 和 Claude Code CLI 的自动化编程系统，允许用户通过在 Issue 或 PR 评论中使用 `@ccai <prompt>` 命令来触发 AI 自动化编程任务。

### 核心目标

- ✅ 用户通过 `@ccai` 触发 Claude Code 进行自动化编程
- ✅ 系统自动创建/切换分支（`issue_xxx`）
- ✅ Claude Code 自主完成代码编写、测试、提交、PR 创建
- ✅ 结果自动反馈到原评论

---

## 🎯 MVP 功能范围

### ✅ 包含的功能

- [x] `@ccai` 触发机制（issue 评论 + PR 评论）
- [x] 权限验证（仅写权限用户可触发）
- [x] Issue ID 提取逻辑
- [x] 分支管理（自动创建/切换 `issue_xxx` 分支）
- [x] 环境准备（PostgreSQL + Redis 服务容器）
- [x] 依赖安装（pnpm install）
- [x] Claude Code 非交互式执行（`claude -p "prompt"`）
- [x] PR 自动创建（由 Claude 通过 gh CLI）
- [x] 结果反馈（评论 PR 链接或错误信息）
- [x] 并发控制（同 issue 排队执行）
- [x] 基本错误处理和日志

### ❌ 不包含的功能（留待后续版本）

- [ ] 多轮交互对话
- [ ] 实时进度更新
- [ ] 执行历史记录
- [ ] 个人 API Key 支持
- [ ] 断点续传
- [ ] 高级限流和配额管理

---

## 🔑 已确认的技术决策

### Q1. Claude Code CLI 执行模式 ✅

**确认结果**：Claude Code 支持非交互式执行

- **命令格式**：`claude -p "your prompt here"`
- **Headless 模式**：使用 `-p` 标志启用非交互模式
- **输出格式**：可选 `--output-format stream-json` 用于结构化输出
- **适用场景**：CI/CD、pre-commit hooks、自动化脚本

**示例**：
```bash
claude -p "npm run build and git commit and git push"
claude -p "如果有 linting 错误，修复它们并建议提交信息"
```

**已知限制**：
- Headless 模式不跨会话持久化
- 使用 `-c/--continue` 时命令行 prompt 会被忽略

### Q2. Claude 的自主性和能力边界 ✅

**确认结果**：Claude 可以完成复杂任务并支持交互

- Claude 可以调用 `gh cli` 等工具
- 如果需要用户交互，会返回 JSON 格式的交互请求
- 能够处理：代码编写 + 测试 + commit + PR 创建

**MVP 策略**：
- 一次性执行模式（不处理交互请求）
- 如遇到交互需求，任务失败并提示用户

### Q3. GitHub Token 权限 ✅

**确认结果**：使用最高权限 token

在 workflow 中配置：
```yaml
permissions:
  contents: write          # 推送分支和提交代码
  pull-requests: write     # 创建 PR
  issues: write            # 评论 issue
  actions: write           # 管理 Actions（可选）
```

### Q4. API Key 管理策略 ✅

**确认结果**：使用仓库共享 Secret

- 在仓库 Settings → Secrets 中配置 `ANTHROPIC_API_KEY`
- 所有触发用户共享此配额
- 后续版本可支持个人 Key

---

## 📅 实施阶段（预计 3-4 周）

### 🚀 阶段 0：环境验证（3-5 天）

**目标**：验证所有技术假设

**任务清单**：
- [ ] 在测试仓库创建验证 workflow（spike）
- [ ] 测试 Claude Code 非交互式执行（`claude -p`）
  - [ ] 验证退出码（成功=0，失败=非0）
  - [ ] 验证输出解析
  - [ ] 验证文件操作能力
- [ ] 验证 GitHub Token 权限
  - [ ] 测试分支创建和推送
  - [ ] 测试 PR 创建权限
  - [ ] 测试 issue 评论权限
- [ ] 配置 `ANTHROPIC_API_KEY` Secret
- [ ] 测试服务容器（PostgreSQL + Redis）健康检查

**验证脚本示例**：
```yaml
# .github/workflows/spike-claude-cli.yml
name: Spike - Claude CLI Validation
on: workflow_dispatch

jobs:
  validate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Test Non-Interactive Execution
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "创建一个名为 test.txt 的文件，内容为 'Hello from Claude'" || exit 1
          [ -f "test.txt" ] || { echo "文件未创建"; exit 1; }
          echo "✅ Claude CLI 非交互模式验证通过"
```

**产出**：
- ✅ Go/No-Go 决策文档
- ✅ 验证报告（成功的测试用例）

---

### 📝 阶段 1：基础工作流（5-7 天）

**目标**：构建 workflow 骨架和触发机制

**任务清单**：
- [ ] 创建 `.github/workflows/ccai.yml`
- [ ] 实现触发器
  - [ ] `issue_comment` (types: [created])
  - [ ] `pull_request_review_comment` (types: [created])
- [ ] 实现命令解析
  - [ ] 检测评论是否以 `@ccai ` 开头
  - [ ] 提取 prompt（去除 `@ccai ` 前缀）
- [ ] 实现权限验证
  - [ ] 检查 `github.event.sender.permissions.push == true`
  - [ ] 权限不足时回复错误信息
- [ ] 实现 Issue ID 提取
  - [ ] Issue 评论：直接使用 `github.event.issue.number`
  - [ ] PR 评论：解析 PR body 中的 `Closes #xxx` / `Fixes #xxx`
  - [ ] 提取失败时报错并通知用户
- [ ] 实现分支管理
  - [ ] 检查 `issue_xxx` 分支是否存在
  - [ ] 不存在：从 main 创建
  - [ ] 存在：checkout 并 pull 最新代码
- [ ] 实现并发控制
  ```yaml
  concurrency:
    group: ccai-issue-${{ steps.issue_id.outputs.issue_id }}
    cancel-in-progress: false
  ```
- [ ] 实现初始反馈
  - [ ] 开始时评论："🤖 Claude Code 正在处理您的请求..."
  - [ ] 包含 Actions 运行日志链接

**核心代码片段**：
```yaml
name: CCAI - Claude Code AI Assistant

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]

jobs:
  ccai:
    if: startsWith(github.event.comment.body, '@ccai ')
    runs-on: ubuntu-latest
    timeout-minutes: 60
    permissions:
      contents: write
      pull-requests: write
      issues: write

    concurrency:
      group: ccai-issue-${{ github.event.issue.number || github.event.pull_request.number }}
      cancel-in-progress: false

    steps:
      - name: Verify User Permissions
        run: |
          if [ "${{ github.event.sender.permissions.push }}" != "true" ]; then
            echo "::error::无权限：只有拥有仓库写权限的用户可以触发 @ccai"
            exit 1
          fi

      - name: Extract Issue ID
        id: issue_id
        run: |
          if [ "${{ github.event_name }}" = "issue_comment" ]; then
            echo "issue_id=${{ github.event.issue.number }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.event_name }}" = "pull_request_review_comment" ]; then
            PR_BODY="${{ github.event.pull_request.body }}"
            ISSUE_ID=$(echo "$PR_BODY" | grep -oP '(?<=(Closes|Fixes|Resolves) #)\d+' | head -1)
            if [ -z "$ISSUE_ID" ]; then
              echo "::error::无法从 PR 中提取关联的 issue ID"
              exit 1
            fi
            echo "issue_id=$ISSUE_ID" >> $GITHUB_OUTPUT
          fi

      - name: Extract Prompt
        id: prompt
        run: |
          COMMENT="${{ github.event.comment.body }}"
          PROMPT="${COMMENT#@ccai }"
          echo "prompt<<EOF" >> $GITHUB_OUTPUT
          echo "$PROMPT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
```

**产出**：
- ✅ 完整的 workflow 骨架
- ✅ 触发器和权限验证测试通过
- ✅ 基本的评论反馈功能

---

### 🔧 阶段 2：环境和执行（5-7 天）

**目标**：集成完整的执行环境和 Claude Code

**任务清单**：
- [ ] 配置服务容器
  - [ ] PostgreSQL 容器 + 健康检查
  - [ ] Redis 容器 + 健康检查
- [ ] 实现环境变量配置
  ```yaml
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://user:password@localhost:5432/testdb
    REDIS_HOST: localhost
    REDIS_PORT: 6379
    REDIS_DB: 1
  ```
- [ ] 实现依赖安装
  - [ ] 设置 Node.js 20 + pnpm
  - [ ] 使用缓存加速（`cache: 'pnpm'`）
  - [ ] 运行 `pnpm install --frozen-lockfile`
- [ ] 集成 Claude Code 执行
  - [ ] 安装 Claude Code CLI
  - [ ] 使用 `-p` 标志传递 prompt
  - [ ] 捕获退出码和输出
  - [ ] 处理执行失败情况
- [ ] 实现数据库初始化
  - [ ] 运行 Prisma 迁移（`prisma migrate deploy`）
  - [ ] 可选：执行种子数据（`prisma db seed`）
- [ ] 实现错误处理
  - [ ] 捕获 Claude 执行错误
  - [ ] 捕获环境准备错误
  - [ ] 记录详细日志

**服务容器配置**：
```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: testdb
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    image: redis:7
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

**Claude Code 执行步骤**：
```yaml
- name: Install Claude Code
  run: npm install -g @anthropic-ai/claude-code

- name: Execute Claude Code
  id: claude
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    set +e
    claude -p "${{ steps.prompt.outputs.prompt }}" 2>&1 | tee claude_output.log
    EXIT_CODE=${PIPESTATUS[0]}
    echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT

    if [ $EXIT_CODE -ne 0 ]; then
      echo "::error::Claude Code 执行失败（退出码：$EXIT_CODE）"
      exit 1
    fi
```

**产出**：
- ✅ 完整的执行环境
- ✅ Claude Code 成功执行测试用例
- ✅ 错误处理和日志记录

---

### 🎨 阶段 3：集成和优化（3-5 天）

**目标**：完善 PR 创建和用户反馈

**任务清单**：
- [ ] 实现 PR 创建（由 Claude 自动完成）
  - [ ] 验证 Claude 是否已创建 PR
  - [ ] 如未创建，手动调用 `gh pr create`
- [ ] 实现结果反馈
  - [ ] 成功：评论 PR 链接
  - [ ] 失败：评论错误信息 + Actions 日志链接
  - [ ] 包含执行时间和状态
- [ ] 实现超时处理
  - [ ] 设置 `timeout-minutes: 60`
  - [ ] 超时后评论通知用户
- [ ] 测试并发场景
  - [ ] 同一 issue 的多次触发（应排队）
  - [ ] 不同 issue 的触发（应并行）
- [ ] 添加测试运行（可选）
  - [ ] Claude 执行后运行 `pnpm test`
  - [ ] 测试失败不阻止 PR 创建
  - [ ] 在 PR 中标记测试状态
- [ ] 性能优化
  - [ ] 优化依赖安装缓存
  - [ ] 优化容器启动时间

**成功反馈模板**：
```yaml
- name: Comment Success
  if: success()
  uses: actions/github-script@v7
  with:
    script: |
      const prNumber = '${{ steps.pr.outputs.pr_number }}';
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `✅ **Claude Code 已完成任务**

📝 **任务**：${{ steps.prompt.outputs.prompt }}
🔗 **Pull Request**: #${prNumber}
⏱️ **执行时间**：${{ steps.duration.outputs.time }}

请审查 PR 并在确认后合并。`
      });
```

**失败反馈模板**：
```yaml
- name: Comment Failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `❌ **Claude Code 执行失败**

📝 **任务**：${{ steps.prompt.outputs.prompt }}
📊 **查看详细日志**：[Actions Run #${{ github.run_number }}](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})

请检查日志并手动处理。`
      });
```

**产出**：
- ✅ 完整的 PR 创建和反馈流程
- ✅ 并发场景测试通过
- ✅ 用户体验优化

---

### 🧪 阶段 4：测试和文档（2-3 天）

**目标**：全面测试和文档编写

**任务清单**：
- [ ] 功能测试
  - [ ] Issue 评论触发测试
  - [ ] PR 评论触发测试
  - [ ] 权限验证测试（无权限用户）
  - [ ] Issue ID 提取测试（多种格式）
  - [ ] 分支创建/切换测试
  - [ ] 并发控制测试
- [ ] 错误处理测试
  - [ ] Claude 执行失败
  - [ ] Issue ID 提取失败
  - [ ] 权限验证失败
  - [ ] 服务容器启动失败
  - [ ] 超时场景
- [ ] 边界情况测试
  - [ ] 超长 prompt
  - [ ] 特殊字符 prompt
  - [ ] 空 prompt
  - [ ] 重复触发
- [ ] 编写文档
  - [ ] 使用指南（README 更新）
  - [ ] 故障排查指南
  - [ ] 配置说明
  - [ ] 最佳实践
- [ ] 性能和稳定性测试
  - [ ] 多任务并发测试
  - [ ] 长时间运行测试
  - [ ] 资源使用监控

**测试用例示例**：

| 测试用例 | 输入 | 期望输出 | 状态 |
|---------|------|---------|------|
| Issue 评论触发 | `@ccai 添加一个简单的 hello API` | ✅ PR 创建成功 | 待测 |
| 无权限用户 | `@ccai xxx`（只读用户） | ❌ 权限错误评论 | 待测 |
| PR 评论触发 | `@ccai 修复这个 bug`（PR #123） | ✅ 提取 issue ID 成功 | 待测 |
| PR 无关联 issue | `@ccai xxx`（PR 无 issue） | ❌ 提取失败评论 | 待测 |
| 并发触发 | 同时 2 个 `@ccai` | ✅ 排队执行 | 待测 |
| Claude 执行失败 | `@ccai 执行不可能的任务` | ❌ 失败评论 + 日志链接 | 待测 |
| 超时场景 | `@ccai 超长任务（>60分钟）` | ❌ 超时通知 | 待测 |

**文档结构**：
```markdown
## 🤖 CCAI - Claude Code AI Assistant

### 使用方法

在任何 Issue 或 PR 评论中使用：
\`\`\`
@ccai <你的编程任务描述>
\`\`\`

### 示例

- `@ccai 实现用户登录功能，包括邮箱验证和 JWT token 生成`
- `@ccai 修复 users.service.ts 中的缓存失效问题`
- `@ccai 添加 API 限流中间件，每分钟最多 100 次请求`

### 权限要求

只有拥有仓库**写权限**的用户可以触发 @ccai

### 工作流程

1. 系统检测到 `@ccai` 命令
2. 验证用户权限
3. 创建/切换到 `issue_xxx` 分支
4. 启动执行环境（PostgreSQL + Redis）
5. Claude Code 自动完成：代码编写 → 测试 → 提交 → PR 创建
6. 在评论中回复 PR 链接

### 故障排查

- **权限不足**：确保您拥有仓库写权限
- **Issue ID 提取失败**：PR 需要在描述中包含 `Closes #xxx`
- **执行超时**：任务超过 60 分钟会自动终止，请拆分任务
- **Claude 执行失败**：查看 Actions 日志了解详情

### 限制

- ⏱️ 单次任务执行时间限制：60 分钟
- 📏 Prompt 长度限制：65536 字符
- 🔄 并发限制：同一 issue 排队执行
```

**产出**：
- ✅ 完整的测试报告
- ✅ 使用文档
- ✅ 发布准备完成

---

## 🎯 验收标准

### 核心功能

- [ ] 用户在 issue 评论中使用 `@ccai <prompt>` 可触发系统
- [ ] 用户在 PR 评论中使用 `@ccai <prompt>` 可触发系统
- [ ] 只有拥有写权限的用户可以触发
- [ ] 系统自动创建/切换到 `issue_xxx` 分支
- [ ] Claude Code 成功执行并完成编程任务
- [ ] 自动创建 PR 并在评论中反馈链接
- [ ] 执行失败时在评论中反馈错误信息

### 并发和稳定性

- [ ] 同一 issue 的多次触发排队执行（不取消）
- [ ] 不同 issue 的触发并行执行
- [ ] 超时（60 分钟）时正确处理并通知用户
- [ ] 环境准备失败时正确处理并通知用户

### 错误处理

- [ ] 权限验证失败时给出明确提示
- [ ] Issue ID 提取失败时给出明确提示
- [ ] Claude 执行失败时提供 Actions 日志链接
- [ ] 所有错误都有友好的用户反馈

### 文档和可维护性

- [ ] 代码注释清晰
- [ ] 使用文档完整
- [ ] 故障排查指南完善
- [ ] 测试用例覆盖核心场景

---

## ⚠️ 已知风险和缓解措施

| 风险 | 概率 | 影响 | 缓解措施 | 状态 |
|------|------|------|---------|------|
| Claude Code 执行超时 | 中 | 高 | 设置 60 分钟超时 + 提示用户拆分任务 | 已规划 |
| 并发导致分支冲突 | 中 | 中 | 严格的 concurrency 控制 + 排队机制 | 已规划 |
| PostgreSQL 容器启动慢 | 低 | 中 | 健康检查 + 重试逻辑 | 已规划 |
| API 调用配额耗尽 | 中 | 中 | 使用仓库 Secret + 监控使用量 | 已规划 |
| Claude 需要交互时挂起 | 低 | 中 | MVP 阶段直接失败 + 提示用户 | 已规划 |

---

## 📊 进度追踪

### 总体进度

- [ ] 阶段 0：环境验证（0%）
- [ ] 阶段 1：基础工作流（0%）
- [ ] 阶段 2：环境和执行（0%）
- [ ] 阶段 3：集成和优化（0%）
- [ ] 阶段 4：测试和文档（0%）

### 里程碑

- [ ] **M1**：Claude Code 非交互式执行验证通过（阶段 0）
- [ ] **M2**：基础 workflow 可触发并反馈（阶段 1）
- [ ] **M3**：Claude Code 成功执行简单任务（阶段 2）
- [ ] **M4**：PR 自动创建和反馈完成（阶段 3）
- [ ] **M5**：所有测试通过，文档完成（阶段 4）
- [ ] **M6**：MVP 正式发布 🚀

---

## 📞 支持和反馈

如有问题或建议，请在本 issue 下评论或联系项目维护者。

---

## 📚 参考资料

- [Claude Code 官方文档](https://docs.claude.com/en/docs/claude-code/cli-reference)
- [Claude Code GitHub 仓库](https://github.com/anthropics/claude-code)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [架构分析报告](docs/ccai-architecture-analysis.md)（待创建）
