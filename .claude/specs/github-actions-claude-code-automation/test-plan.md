# GitHub Actions + Claude Code 自动化系统测试计划

> **文档版本**: 1.1.0
> **最后更新**: 2025-10-25
> **更新内容**: 与实际代码实现同步,补充技术细节

## 更新日志

### v1.1.0 (2025-10-25)
- ✅ 与最新工作流代码实现同步
- ✅ 详细说明排队状态通知机制 (步骤 0)
- ✅ 详细说明 PR 智能更新逻辑 (步骤 11)
- ✅ 更新交互检测关键词为 14 个模式
- ✅ 补充技术实现细节和验证要点
- ✅ 更新测试覆盖目标

### v1.0.0 (初始版本)
- 初始测试计划创建

## 测试概述

本测试计划旨在验证 GitHub Actions + Claude Code 自动化系统的核心功能正常工作,并确保最近修复的问题得到验证。测试采用务实的方法,专注于功能验证而非追求完美覆盖率。

## 测试范围

### 被测试的组件

1. **工作流文件**
   - `.github/workflows/ccai-trigger.yml` - 触发器工作流
   - `.github/workflows/ccai-execute.yml` - 执行工作流

2. **Shell 脚本**
   - `.github/scripts/ccai/setup-branch.sh` - 分支管理
   - `.github/scripts/ccai/setup-env.sh` - 环境设置
   - `.github/scripts/ccai/run-claude.sh` - Claude 执行

3. **核心功能 (已实现)**
   - ✅ 排队状态通知 (ccai-execute.yml 步骤 0)
   - ✅ PR 描述智能更新 (ccai-execute.yml 步骤 11)
   - ✅ 增强 Claude 交互检测 (run-claude.sh 支持 13 个关键词)
   - ✅ 并发控制机制 (concurrency group)
   - ✅ 分支自动管理 (setup-branch.sh)

## 测试策略

### 测试金字塔

```
┌─────────────────────┐
│   E2E Tests (10%)   │  完整用户流程
├─────────────────────┤
│ Integration (30%)   │  工作流集成
├─────────────────────┤
│   Unit Tests (60%)  │  脚本单元测试
└─────────────────────┘
```

### 测试优先级

**P0 - 关键场景 (必须测试)**
1. Issue 评论触发 + 有效用户
2. PR 评论触发 + 关联 Issue
3. 权限拒绝
4. 并发触发 (排队机制)
5. PR 重新触发更新

**P1 - 重要场景 (应该测试)**
6. 空提示词
7. PR 无关联 Issue
8. Claude 交互检测
9. 无代码变更
10. Claude 执行失败

**P2 - 次要场景 (可选测试)**
11. 分支管理边界情况
12. 环境文件生成验证
13. Git 配置正确性

## 测试文件结构

```
.github/tests/
├── README.md                      # 测试运行指南
├── unit/
│   ├── test-setup-branch.sh      # 测试分支管理脚本
│   ├── test-setup-env.sh         # 测试环境设置脚本
│   └── test-run-claude.sh        # 测试 Claude 执行脚本
├── integration/
│   ├── test-trigger-workflow.yml # 测试触发器工作流
│   └── test-execute-workflow.yml # 测试执行工作流
├── e2e/
│   └── test-scenarios.md         # 端到端测试场景
└── fixtures/
    ├── sample-claude-output.log  # Claude 输出示例
    ├── sample-claude-interaction.log # Claude 交互示例
    └── sample-pr-body.txt        # PR 描述示例
```

## 单元测试 (60%)

### 测试工具

使用简单的 Bash 测试框架:
- 不需要外部依赖 (如 bats)
- 使用 `assert_equals`, `assert_contains` 等辅助函数
- Mock 外部依赖 (git, GitHub API, Claude CLI)

### 测试覆盖

#### 1. `setup-branch.sh` 测试

**测试场景:**
- ✅ 创建新分支 (远程不存在)
- ✅ 切换到已存在分支 (远程存在)
- ✅ 缺少 issue_number 参数
- ✅ Git 配置正确设置
- ✅ 输出 GITHUB_OUTPUT 正确

**Mock 依赖:**
- `git fetch`, `git ls-remote`, `git checkout`, `git pull`

#### 2. `setup-env.sh` 测试

**测试场景:**
- ✅ 生成正确的 .env.development.local 文件
- ✅ 包含所有必需的环境变量
- ✅ 缺少 ANTHROPIC_API_KEY 参数
- ✅ 敏感信息正确隐藏在日志中

**验证点:**
- 文件内容格式正确
- DATABASE_URL 使用 CI 配置
- ANTHROPIC_API_KEY 正确注入

#### 3. `run-claude.sh` 测试

**测试场景:**
- ✅ 成功执行 (exit code 0)
- ✅ 执行失败 (exit code 非 0)
- ✅ 检测到交互请求 (13 种关键词)
- ✅ 缺少 prompt 参数
- ✅ 输出到 GITHUB_OUTPUT 正确

**Mock 依赖:**
- `claude` CLI 命令

**交互检测关键词测试:**
- 中文 (5个): 需要更多信息, 请提供, 请确认, 需要澄清, 不确定
- 英文 (9个): waiting for, please provide, need more information, clarification needed, could you, can you provide, please clarify, human interaction, requires confirmation
- 总计: 14 个检测模式 (使用正则表达式 grep -iE)

## 集成测试 (30%)

### 测试方法

创建最小化的测试工作流,可以手动触发:
- 使用 `workflow_dispatch` 事件
- 提供测试输入参数
- 验证工作流步骤执行顺序
- 检查输出结果

### 测试覆盖

#### 1. 触发器工作流测试

**测试场景:**
- ✅ 权限验证 (模拟有权限/无权限用户)
- ✅ Issue ID 提取 (Issue 评论场景)
- ✅ Issue ID 提取 (PR 评论场景 + Closes #xxx)
- ✅ 提示词提取 (有效提示词)
- ✅ 提示词提取 (空提示词)
- ✅ 初始评论创建

**模拟数据:**
```yaml
inputs:
  comment_body: "@ccai add health check endpoint"
  user_permission: "write" # or "read"
  pr_body: "Closes #123" # 仅 PR 场景
```

#### 2. 执行工作流测试

**测试场景:**
- ✅ 排队状态检测和通知 (步骤 0)
- ✅ 分支创建/切换 (setup-branch.sh)
- ✅ 环境文件生成 (setup-env.sh)
- ✅ Claude 执行 (run-claude.sh, 使用 mock)
- ✅ 代码变更检测 (git status --porcelain)
- ✅ PR 创建/更新逻辑 (步骤 11 - 智能判断)
- ✅ 成功/失败/无变更评论更新
- ✅ 交互请求处理

**并发控制测试:**
```yaml
concurrency:
  group: ccai-issue-${{ inputs.issue_number }}
  cancel-in-progress: false
```

**排队状态测试要点:**
- 检查同一 issue 的其他运行中任务
- 如果检测到排队,更新评论显示队列位置
- 排队评论包含: 队列数量、任务描述、运行链接

**PR 更新逻辑测试要点:**
- 新建 PR: 使用 "原始请求" + "创建时间"
- 更新 PR: 使用 "最新请求" + "更新时间" + 多次更新提示
- 保留 "Closes #XXX" 关联

## 端到端测试 (10%)

### 测试方法

手动执行完整的用户场景,验证系统端到端功能:
- 创建真实的 Issue/PR
- 发表 `@ccai` 评论
- 观察工作流执行
- 验证最终结果

### 测试覆盖

#### 场景 1: Issue 评论触发 (P0)

**步骤:**
1. 创建新 Issue (例如: "Add /health endpoint")
2. 评论: `@ccai implement a health check endpoint`
3. 验证:
   - ✅ 创建初始反馈评论
   - ✅ 工作流开始执行
   - ✅ 创建 `issue_XXX` 分支
   - ✅ Claude 生成代码
   - ✅ 创建 Pull Request
   - ✅ 更新评论包含 PR 链接

#### 场景 2: 并发触发排队 (P0)

**步骤:**
1. 使用场景 1 的 Issue
2. 快速发表第二个评论: `@ccai add tests for health endpoint`
3. 验证:
   - ✅ 第二个任务显示"排队中"状态 (步骤 0 检测)
   - ✅ 评论包含: "前面有 X 个任务正在执行"
   - ✅ 评论包含: 任务描述和 Actions 运行链接
   - ✅ 第二个任务等待第一个完成 (concurrency 控制)
   - ✅ 两个任务都成功完成

**技术细节:**
- 排队检测逻辑在 `ccai-execute.yml` 步骤 0
- 使用 `github.rest.actions.listWorkflowRuns` 查询运行中任务
- 过滤条件: `status: 'in_progress'` 且同一 workflow

#### 场景 3: PR 重新触发更新 (P0)

**步骤:**
1. 使用场景 1 创建的 PR
2. 在 Issue 中再次评论: `@ccai optimize the health check response`
3. 验证:
   - ✅ PR 描述被更新 (使用 `pulls.update` API)
   - ✅ 标题保留 "feat: AI-generated solution for #XXX"
   - ✅ 描述包含新的提示词 ("最新请求")
   - ✅ 描述包含更新时间戳 (ISO 8601 格式)
   - ✅ 保留 "Closes #XXX" 链接
   - ✅ 显示多次更新提示

**PR 描述格式验证:**
```markdown
Closes #XXX

## 🤖 由 Claude Code 自动生成

**最新请求**: optimize the health check response
**更新时间**: 2025-10-25T11:45:00Z

### 📋 变更说明

Claude Code 已根据 Issue #XXX 的需求自动生成代码变更。
此 PR 已被多次更新,请查看最新的变更内容。
```

#### 场景 4: 权限拒绝 (P0)

**步骤:**
1. 使用没有 write 权限的用户账号
2. 评论: `@ccai test`
3. 验证:
   - ✅ 立即拒绝
   - ✅ 显示权限错误消息
   - ✅ 工作流不继续执行

#### 场景 5: PR 评论提取 Issue (P0)

**步骤:**
1. 创建 PR (描述包含 "Closes #123")
2. 在 PR 中评论: `@ccai improve error handling`
3. 验证:
   - ✅ 从 PR 描述提取 Issue #123
   - ✅ 在 issue_123 分支上工作
   - ✅ 更新同一个 PR

#### 场景 6: Claude 交互检测 (P1)

**步骤:**
1. 创建 Issue: "Add complex feature with unclear requirements"
2. 评论: `@ccai implement the feature`
3. 如果 Claude 请求更多信息:
   - ✅ 检测到交互关键词 (14 个模式之一)
   - ✅ 评论更新显示 Claude 的问题
   - ✅ 提示用户提供更多信息

**交互检测技术细节:**
- 使用 `grep -iE` 进行大小写不敏感的正则匹配
- 检测模式 (14个):
  - 中文: 需要更多信息|请提供|请确认|需要澄清|不确定
  - 英文: waiting for|please provide|need more information|clarification needed|could you|can you provide|please clarify|human interaction|requires confirmation
- 提取交互内容: `grep -iE -A 5 <pattern>` 并取前 20 行
- 使用 multiline output 格式传递给 GITHUB_OUTPUT

#### 场景 7: 无代码变更 (P1)

**步骤:**
1. 创建 Issue: "Review code quality"
2. 评论: `@ccai analyze the code`
3. 如果 Claude 只分析不修改:
   - ✅ 检测到无变更
   - ✅ 显示"未检测到代码变更"消息
   - ✅ 不创建 PR

## 测试数据和 Fixtures

### Claude 输出示例

**成功输出 (`sample-claude-output.log`):**
```
Starting Claude Code execution...
Task: implement a health check endpoint
Reading project structure...
Creating src/modules/health/health.controller.ts...
Creating src/modules/health/health.module.ts...
Code changes completed successfully.
Exit code: 0
```

**交互请求输出 (`sample-claude-interaction.log`):**
```
Starting Claude Code execution...
Task: implement complex authentication
I need more information to proceed:
1. Which authentication method do you prefer (JWT, OAuth, Session)?
2. Should we support multi-factor authentication?
Could you provide more details about the authentication requirements?
Exit code: 0
```

### PR 描述示例

**新 PR (`sample-pr-body.txt`):**
```markdown
Closes #123

## 🤖 由 Claude Code 自动生成

**原始请求**: implement a health check endpoint
**创建时间**: 2025-10-25T10:30:00Z

### 📋 变更说明

Claude Code 已根据 Issue #123 的需求自动生成以下代码变更。

### ✅ 审查清单

- [ ] 代码功能正确
- [ ] 测试通过(如有)
- [ ] 代码风格符合规范
- [ ] 文档已更新(如需要)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

**更新 PR:**
```markdown
Closes #123

## 🤖 由 Claude Code 自动生成

**最新请求**: add tests for health endpoint
**更新时间**: 2025-10-25T11:45:00Z

### 📋 变更说明

Claude Code 已根据 Issue #123 的需求自动生成代码变更。
此 PR 已被多次更新,请查看最新的变更内容。

...
```

## 测试执行指南

### 本地运行单元测试

```bash
# 进入测试目录
cd .github/tests/unit

# 运行所有单元测试
./test-setup-branch.sh
./test-setup-env.sh
./test-run-claude.sh

# 或使用测试运行器
../run-all-unit-tests.sh
```

### GitHub Actions 运行集成测试

```bash
# 触发测试工作流
gh workflow run test-trigger-workflow.yml
gh workflow run test-execute-workflow.yml

# 查看运行结果
gh run list --workflow=test-trigger-workflow.yml
gh run watch
```

### 执行端到端测试

1. 参考 `.github/tests/e2e/test-scenarios.md`
2. 手动创建 Issue/PR
3. 发表 `@ccai` 评论
4. 观察并记录结果
5. 填写测试结果表格

## 测试覆盖目标

### 单元测试覆盖率

- `setup-branch.sh`: 90%+ (关键路径)
- `setup-env.sh`: 95%+ (配置文件生成)
- `run-claude.sh`: 85%+ (交互检测逻辑)

### 功能覆盖率

- P0 场景: 100% (所有关键场景必须测试)
- P1 场景: 80%+ (大部分重要场景)
- P2 场景: 可选 (根据时间和资源)

### 最近修复验证

- ✅ 排队状态通知 (ccai-execute.yml 步骤 0): 100%
- ✅ PR 描述智能更新 (ccai-execute.yml 步骤 11): 100%
- ✅ 增强交互检测 (run-claude.sh 14个模式): 100%
- ✅ 并发控制机制 (concurrency group): 100%
- ✅ 分支管理优化 (setup-branch.sh fetch 优化): 100%

## 已知限制

### 测试环境限制

1. **GitHub API 依赖**: 集成测试需要 GitHub API 访问
2. **Claude CLI Mock**: 单元测试使用 mock,无法测试真实 Claude 行为
3. **并发测试**: 难以自动化测试并发场景
4. **权限测试**: 需要多个 GitHub 账号来测试权限

### 不测试的内容

1. **GitHub Actions 平台功能**: 假设 GitHub Actions 基础设施正常工作
2. **Claude AI 质量**: 不测试 Claude 生成代码的质量
3. **网络故障**: 不测试网络中断等基础设施故障
4. **极端边界情况**: 不追求 100% 边界覆盖

## 测试维护

### 测试更新触发条件

- 工作流文件修改
- Shell 脚本修改
- 新功能添加
- Bug 修复

### 测试文档更新

- 新增测试场景时更新此文档
- 修改测试策略时更新
- 发现新边界情况时记录

## 成功标准

### 功能验证成功

- ✅ 所有 P0 场景测试通过
- ✅ 80%+ P1 场景测试通过
- ✅ 最近修复的 4 个问题验证通过
- ✅ 无关键路径的回归问题

### 测试质量成功

- ✅ 测试可以在本地运行
- ✅ 测试可以在 CI 中运行
- ✅ 测试失败时提供清晰的错误消息
- ✅ 测试执行时间 < 5 分钟 (单元 + 集成)

### 开发支持成功

- ✅ 开发者可以快速运行测试
- ✅ 测试帮助发现和防止回归
- ✅ 测试作为可执行文档
- ✅ 测试帮助调试问题

## 下一步行动

1. ✅ 创建测试目录结构
2. ✅ 编写单元测试脚本
3. ✅ 编写集成测试工作流
4. ✅ 创建测试 fixtures
5. ✅ 编写测试运行指南
6. ⏳ 执行 E2E 测试场景
7. ⏳ 收集测试结果和反馈
8. ⏳ 优化和改进测试

---

## 快速参考

### 关键文件和路径

```bash
# 工作流文件
.github/workflows/ccai-trigger.yml    # 触发器 (监听评论)
.github/workflows/ccai-execute.yml    # 执行器 (可复用工作流)

# Shell 脚本
.github/scripts/ccai/setup-branch.sh  # 分支管理
.github/scripts/ccai/setup-env.sh     # 环境配置
.github/scripts/ccai/run-claude.sh    # Claude 执行

# 测试文件
.github/tests/unit/                   # 单元测试
.github/tests/integration/            # 集成测试
.github/tests/e2e/                    # 端到端测试
.github/tests/fixtures/               # 测试数据
```

### 关键测试命令

```bash
# 本地运行单元测试
cd .github/tests/unit
./test-setup-branch.sh
./test-setup-env.sh
./test-run-claude.sh

# 触发集成测试工作流
gh workflow run test-trigger-workflow.yml
gh workflow run test-execute-workflow.yml

# 查看工作流运行状态
gh run list --workflow=ccai-trigger.yml
gh run watch

# 检查分支
git branch -r | grep issue_

# 检查 PR
gh pr list --head issue_XXX
```

### 关键验证点

**ccai-trigger.yml (触发器):**
- ✅ 仅响应 `@ccai` 开头的评论
- ✅ 权限验证: admin/write 用户
- ✅ Issue ID 提取: Issue 评论直接获取, PR 评论从描述提取
- ✅ 提示词提取: 去除 `@ccai` 前缀
- ✅ 初始评论创建: "正在处理..."

**ccai-execute.yml (执行器):**
- ✅ 步骤 0: 排队状态检测和通知
- ✅ 步骤 2: 分支创建/切换 (setup-branch.sh)
- ✅ 步骤 5: 环境文件生成 (setup-env.sh)
- ✅ 步骤 7: Claude 执行 (run-claude.sh)
- ✅ 步骤 8: 交互检测和处理
- ✅ 步骤 9: 代码变更检测
- ✅ 步骤 11: PR 创建/更新 (智能判断)
- ✅ 步骤 12-14: 评论更新 (成功/失败/无变更)

**setup-branch.sh:**
- ✅ 参数验证: issue_number 必需
- ✅ Git 配置: github-actions[bot]
- ✅ 远程分支检查: git ls-remote
- ✅ 分支创建: 远程不存在时从 main 创建
- ✅ 分支切换: 远程存在时 fetch + checkout + pull

**setup-env.sh:**
- ✅ 参数验证: ANTHROPIC_API_KEY 必需
- ✅ 文件创建: .env.development.local
- ✅ 变量配置: DATABASE_URL, REDIS_*, ANTHROPIC_API_KEY
- ✅ 日志保护: API key 不显示在日志中

**run-claude.sh:**
- ✅ 参数验证: prompt 必需
- ✅ Claude 执行: claude -p "$PROMPT"
- ✅ 日志记录: tee 到 claude_output.log
- ✅ 交互检测: 14 个关键词模式 (grep -iE)
- ✅ 退出码传递: 保留 Claude 原始退出码
- ✅ 输出格式: GITHUB_OUTPUT (exit_code, interaction_detected, interaction_message)

### P0 测试场景清单

- [ ] Issue 评论触发 + 有效用户
- [ ] PR 评论触发 + 关联 Issue (Closes #XXX)
- [ ] 权限拒绝 (read 用户)
- [ ] 并发触发排队 (同一 issue 多次触发)
- [ ] PR 重新触发更新 (更新描述和时间戳)
- [ ] 分支创建 (远程不存在)
- [ ] 分支切换 (远程已存在)
- [ ] 环境文件生成验证
- [ ] Claude 成功执行
- [ ] 代码变更检测
- [ ] PR 创建 (首次)
- [ ] PR 更新 (再次触发)
- [ ] 评论更新 (成功状态)

### 常见问题排查

**问题: 工作流未触发**
- 检查评论是否以 `@ccai` 开头
- 检查用户是否有 write/admin 权限
- 检查 GitHub Actions 是否启用

**问题: 权限验证失败**
- 检查用户协作者状态
- 检查仓库权限设置
- 查看 Actions 日志中的权限级别

**问题: Issue ID 提取失败 (PR 场景)**
- 检查 PR 描述是否包含 "Closes #XXX"
- 支持格式: Closes/Fixes/Resolves (大小写不敏感)

**问题: Claude 执行失败**
- 检查 ANTHROPIC_API_KEY secret 是否配置
- 检查 Claude CLI 安装是否成功
- 查看 claude_output.log 日志

**问题: PR 未创建**
- 检查是否有代码变更 (git status --porcelain)
- 检查 Claude 退出码是否为 0
- 检查分支是否成功推送

**问题: 排队状态未显示**
- 检查并发控制配置 (concurrency group)
- 检查是否有其他运行中的任务
- 查看步骤 0 的日志输出

---

**文档维护**: 本测试计划应与工作流代码保持同步。每次修改工作流或脚本时,请更新相应的测试场景和验证点。
