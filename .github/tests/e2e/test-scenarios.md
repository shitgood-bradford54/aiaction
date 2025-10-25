# 端到端测试场景

本文档描述了 GitHub Actions + Claude Code 自动化系统的端到端测试场景。

## 📋 测试准备

### 前置条件

1. **仓库配置**
   - ✅ GitHub Actions 已启用
   - ✅ 配置了 `ANTHROPIC_API_KEY` secret
   - ✅ 工作流文件已部署

2. **权限设置**
   - ✅ 测试用户有 write/admin 权限
   - ✅ GitHub Actions 有创建 PR 的权限

3. **环境准备**
   - ✅ 主分支代码是最新的
   - ✅ 没有冲突的测试分支

### 测试记录表格

复制此表格记录测试结果：

| 场景 | 状态 | Issue# | 执行时间 | 备注 |
|------|------|--------|----------|------|
| 场景 1: Issue 评论触发 | ⏳ | | | |
| 场景 2: 并发触发排队 | ⏳ | | | |
| 场景 3: PR 重新触发更新 | ⏳ | | | |
| 场景 4: 权限拒绝 | ⏳ | | | |
| 场景 5: PR 评论提取 Issue | ⏳ | | | |
| 场景 6: Claude 交互检测 | ⏳ | | | |
| 场景 7: 无代码变更 | ⏳ | | | |
| 场景 8: 大小写不敏感触发 | ⏳ | | | |

状态图例: ⏳待测试 | ✅通过 | ❌失败 | ⏭️跳过

## 🎯 测试场景

### 场景 1: Issue 评论触发 (P0)

**目标**: 验证完整的 Issue → PR 工作流

**步骤**:

1. **创建测试 Issue**
   ```
   标题: [Test] Add health check endpoint
   描述: We need a health check endpoint to monitor the application status.
   ```

2. **发表触发评论**
   ```
   @ccai implement a health check endpoint at GET /health that returns
   the application status, uptime, database connectivity, and Redis connectivity
   ```

3. **验证点**:
   - ✅ 工作流被触发（Actions 标签页可见）
   - ✅ 创建初始反馈评论 "🤖 正在处理您的请求..."
   - ✅ 创建 `issue_XXX` 分支
   - ✅ Claude 生成代码
   - ✅ 检测到代码变更
   - ✅ 创建 Pull Request
   - ✅ PR 标题: "feat: AI-generated solution for #XXX"
   - ✅ PR 描述包含原始请求和创建时间
   - ✅ PR 描述包含 "Closes #XXX"
   - ✅ 评论更新包含 PR 链接
   - ✅ 评论状态显示 "✅ 完成"

4. **预期结果**:
   - Issue 中有成功完成的评论
   - 创建了新的 PR 链接到该 Issue
   - PR 中的代码符合需求

**清理**:
```bash
# 关闭 PR
gh pr close <pr-number>

# 删除分支（可选）
git push origin --delete issue_XXX
```

---

### 场景 2: 并发触发排队 (P0)

**目标**: 验证并发控制和排队机制

**步骤**:

1. **使用场景 1 的 Issue**

2. **快速连续发表两个评论**:

   评论 1:
   ```
   @ccai add unit tests for the health check endpoint
   ```

   评论 2（立即发表）:
   ```
   @ccai add E2E tests for the health check endpoint
   ```

3. **验证点**:
   - ✅ 两个工作流都被触发
   - ✅ 第一个任务正常开始执行
   - ✅ 第二个任务显示 "⏳ 排队中..." 状态
   - ✅ 排队评论包含: "前面有 X 个任务正在执行"
   - ✅ 排队评论包含: 任务描述
   - ✅ 排队评论包含: Actions 运行链接
   - ✅ 第一个任务完成后，第二个任务自动开始
   - ✅ 两个任务都成功完成
   - ✅ PR 被更新（或创建第二个 commit）

4. **预期结果**:
   - 看到排队状态通知
   - 两个任务串行执行，没有冲突
   - 最终代码包含两次请求的变更

**观察重点**:
```bash
# 实时查看运行状态
gh run list --workflow=ccai-execute.yml --limit 5

# 查看具体任务日志
gh run view <run-id> --log
```

---

### 场景 3: PR 重新触发更新 (P0)

**目标**: 验证 PR 智能更新逻辑

**步骤**:

1. **使用场景 1 或 2 创建的 PR**

2. **在原始 Issue 中再次评论**:
   ```
   @ccai optimize the health check response format to follow REST API best practices
   ```

3. **验证点**:
   - ✅ 工作流被触发
   - ✅ 使用现有的 `issue_XXX` 分支
   - ✅ PR 被更新（不是创建新 PR）
   - ✅ PR 标题保持不变
   - ✅ PR 描述被更新:
     - "最新请求": optimize the health check...
     - "更新时间": 新的 ISO 8601 时间戳
     - 包含多次更新提示
   - ✅ 保留 "Closes #XXX" 链接
   - ✅ 新的代码 commit 推送到同一分支
   - ✅ PR 时间线显示新的 commit

4. **预期 PR 描述格式**:
   ```markdown
   Closes #XXX

   ## 🤖 由 Claude Code 自动生成

   **最新请求**: optimize the health check response format...
   **更新时间**: 2025-10-25T12:30:00Z

   ### 📋 变更说明

   Claude Code 已根据 Issue #XXX 的需求自动生成代码变更。
   此 PR 已被多次更新,请查看最新的变更内容。
   ```

**验证命令**:
```bash
# 查看 PR 详情
gh pr view <pr-number>

# 查看 PR 更新历史
gh pr view <pr-number> --json updatedAt,commits
```

---

### 场景 4: 权限拒绝 (P0)

**目标**: 验证权限验证机制

**步骤**:

1. **创建测试 Issue**

2. **使用没有 write 权限的用户账号发表评论**:
   ```
   @ccai implement something
   ```

   如果没有额外测试账号，可以：
   - 临时移除自己的 write 权限（需要管理员）
   - 或查看现有的权限拒绝逻辑代码

3. **验证点**:
   - ✅ 工作流被触发
   - ✅ 权限检查步骤失败
   - ✅ 评论更新显示权限错误
   - ✅ 后续步骤不执行
   - ✅ 不创建分支或 PR

4. **预期评论**:
   ```
   ❌ 权限不足

   抱歉，您没有权限触发 Claude Code。
   只有仓库的协作者（write 或 admin 权限）可以使用此功能。
   ```

**替代测试**:
如果无法测试真实权限，检查代码逻辑：
```bash
# 查看权限检查代码
cat .github/workflows/ccai-trigger.yml | grep -A 10 "permissions"
```

---

### 场景 5: PR 评论提取 Issue (P0)

**目标**: 验证从 PR 评论提取 Issue ID

**步骤**:

1. **使用场景 1 创建的 PR**

2. **在 PR 中发表评论**:
   ```
   @ccai improve error handling for database connection failures
   ```

3. **验证点**:
   - ✅ 工作流被触发
   - ✅ 从 PR 描述提取 Issue ID（通过 "Closes #XXX"）
   - ✅ 在正确的 `issue_XXX` 分支上工作
   - ✅ 更新同一个 PR（不创建新 PR）
   - ✅ PR 描述被更新

4. **预期行为**:
   - 即使在 PR 中评论，也能正确关联原始 Issue
   - 所有变更都在同一分支和 PR 中

**调试**:
```bash
# 查看工作流日志中的 Issue 提取
gh run view <run-id> --log | grep -A 5 "Issue ID"
```

---

### 场景 6: Claude 交互检测 (P1)

**目标**: 验证 Claude 请求更多信息的处理

**步骤**:

1. **创建测试 Issue**:
   ```
   标题: [Test] Add complex authentication system
   描述: We need authentication
   ```

2. **发表模糊的请求**:
   ```
   @ccai implement authentication
   ```

3. **如果 Claude 请求澄清**:

4. **验证点**:
   - ✅ 检测到交互关键词（14 种之一）
   - ✅ 评论更新显示 Claude 的问题
   - ✅ 提示用户提供更多信息
   - ✅ 不创建 PR（因为未完成）

5. **预期评论格式**:
   ```
   🤔 需要更多信息

   Claude Code 需要一些澄清才能继续:

   [Claude 的具体问题]

   请在此 Issue 中回复提供更多详细信息，
   然后再次使用 @ccai 触发。
   ```

**注意**:
- 此场景取决于 Claude 的实际响应
- 如果 Claude 直接实现，场景会变为场景 1
- 可以通过 fixtures 中的示例测试检测逻辑

**验证检测逻辑**:
```bash
# 测试交互检测关键词
echo "I need more information" | grep -qiE "需要更多信息|请提供|...|need more information" && echo "检测成功"
```

---

### 场景 7: 无代码变更 (P1)

**目标**: 验证无变更场景处理

**步骤**:

1. **创建测试 Issue**:
   ```
   标题: [Test] Code review request
   描述: Please review the health check implementation
   ```

2. **发表分析类请求**:
   ```
   @ccai analyze the current health check implementation and suggest improvements
   ```

3. **如果 Claude 只分析不修改代码**:

4. **验证点**:
   - ✅ Claude 执行成功（exit code 0）
   - ✅ 检测到无代码变更
   - ✅ 评论更新显示分析结果
   - ✅ 不创建 PR
   - ✅ 显示 "未检测到代码变更" 消息

5. **预期评论**:
   ```
   ℹ️ 未检测到代码变更

   Claude Code 已完成分析，但没有生成代码变更。

   [Claude 的分析输出]

   如果需要实现建议的改进，请明确指示。
   ```

**替代测试**:
如果 Claude 仍然生成了代码，可以手动测试：
```bash
# 模拟无变更场景
git status --porcelain  # 应该为空
```

---

### 场景 8: 大小写不敏感触发 (P0)

**目标**: 验证 @ccai 触发词的大小写不敏感性

**步骤**:

1. **创建测试 Issue**
   ```
   标题: [Test] Case-insensitive trigger
   描述: Testing trigger word case insensitivity
   ```

2. **测试不同大小写变体的触发词**:

   测试用例 1 - 全大写:
   ```
   @CCAI implement a simple hello world endpoint
   ```

   测试用例 2 - 首字母大写:
   ```
   @Ccai add unit tests
   ```

   测试用例 3 - 混合大小写:
   ```
   @CcAi add documentation
   ```

   测试用例 4 - 标准小写（对照组）:
   ```
   @ccai add E2E tests
   ```

3. **验证点**:
   - ✅ 所有大小写变体都能触发工作流
   - ✅ `@CCAI` 触发成功
   - ✅ `@Ccai` 触发成功
   - ✅ `@CcAi` 触发成功
   - ✅ `@ccai` 触发成功（基准）
   - ✅ 提示词正确提取（不包含触发词本身）
   - ✅ 工作流正常执行
   - ✅ 创建 PR 或更新现有 PR

4. **预期行为**:
   - 所有大小写变体表现一致
   - 提取的提示词不包含 `@ccai` 部分
   - 大小写不影响后续工作流逻辑

5. **验证命令**:
   ```bash
   # 检查工作流触发记录
   gh run list --workflow=ccai-trigger.yml --limit 10

   # 验证提示词提取
   gh run view <run-id> --log | grep -i "extracted prompt"
   ```

**测试矩阵**:

| 触发词 | 是否触发 | 提示词正确 | PR 创建 | 备注 |
|--------|----------|------------|---------|------|
| @ccai  | ✅ | ✅ | ✅ | 标准形式 |
| @CCAI  | ✅ | ✅ | ✅ | 全大写 |
| @Ccai  | ✅ | ✅ | ✅ | 首字母大写 |
| @CcAi  | ✅ | ✅ | ✅ | 混合大小写 |
| @cCaI  | ✅ | ✅ | ✅ | 混合大小写 |

**代码验证**:

检查实现是否使用了大小写不敏感匹配：

```bash
# 检查 ccai-trigger.yml
grep -n "toLower\|/i" .github/workflows/ccai-trigger.yml

# 检查 ccai.yml
grep -n "toLower\|/i" .github/workflows/ccai.yml
```

预期输出应包含：
- `toLower(github.event.comment.body)` - GitHub Actions 表达式
- `/^@ccai\s+/i` - JavaScript 正则表达式（i 标志表示大小写不敏感）

---

## 📊 测试结果总结

### 完成测试后填写

**测试执行日期**: _____________

**测试执行人**: _____________

**环境信息**:
- 仓库: _____________
- 分支: _____________
- Claude Code 版本: _____________

**测试结果汇总**:

| 优先级 | 场景数 | 通过 | 失败 | 跳过 |
|--------|--------|------|------|------|
| P0 | 6 | | | |
| P1 | 2 | | | |
| **总计** | **8** | | | |

**成功率**: _____ %

**发现的问题**:
1.
2.
3.

**改进建议**:
1.
2.
3.

---

## 🔧 故障排查

### 工作流未触发

**检查**:
```bash
# 验证评论格式
echo "@ccai test" | grep -q "^@ccai" && echo "格式正确"

# 检查工作流状态
gh workflow list | grep ccai

# 查看最近的运行
gh run list --workflow=ccai-trigger.yml --limit 5
```

### PR 未创建

**检查**:
```bash
# 验证分支存在
git branch -r | grep issue_XXX

# 检查代码变更
git diff origin/main origin/issue_XXX

# 查看工作流日志
gh run view <run-id> --log | grep -i "pull request"
```

### Claude 执行失败

**检查**:
```bash
# 验证 secret 配置
gh secret list | grep ANTHROPIC_API_KEY

# 查看错误日志
gh run view <run-id> --log-failed
```

---

## 📚 相关资源

- [测试计划](../../.claude/specs/github-actions-claude-code-automation/test-plan.md)
- [单元测试](../unit/)
- [集成测试](../integration/)
- [测试 Fixtures](../fixtures/)

---

**最后更新**: 2025-10-25
**文档版本**: 1.0.0
