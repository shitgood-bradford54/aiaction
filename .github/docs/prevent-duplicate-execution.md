# 防止重复执行的修复

## 问题描述

用户在使用 `@CCai` 命令时，发现会触发两个任务，导致重复执行和重复的"任务完成"评论。

## 问题原因

在 GitHub 中：
1. Pull Request 本质上也是一个 Issue
2. 当在 PR 中评论时，会同时触发 `issue_comment` 事件
3. 原配置中同时监听 `issue_comment` 和 `pull_request_review_comment` 事件

这导致了以下场景的重复触发：
- 用户在 Issue 中评论 `@CCai hi test`，触发第一次执行，创建 PR #6
- 如果用户在 PR #6 中再次评论 `@CCai`，会再次触发执行
- 或者如果用户在代码审查中评论 `@CCai`，也会触发

## 解决方案

### 1. 移除 PR Review 评论触发器

**修改前**：
```yaml
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
```

**修改后**：
```yaml
on:
  issue_comment:
    types: [created]
```

### 2. 添加 PR 评论过滤

在步骤 1 中添加检查，如果检测到评论来自 PR（而非原始 Issue），直接跳过：

```javascript
// 如果是 issue_comment 事件，检查是否在 PR 中
if (context.eventName === 'issue_comment' && context.payload.issue.pull_request) {
  console.log('Comment is on a PR, skipping to avoid duplicate execution.');
  console.log('Please comment on the original Issue instead.');
  
  // 在 PR 中回复提示
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: '⚠️ 请在原始 Issue 中使用 @ccai 命令，而不是在 PR 中。'
  });
  
  return false;
}
```

### 3. 简化 Issue ID 提取逻辑

由于已经过滤掉了 PR 评论，不再需要从 PR 描述中提取 Issue 编号：

```javascript
// 由于我们已经在步骤 1 中过滤掉了 PR 评论，这里直接获取 Issue 编号
const issueNumber = context.issue.number;
console.log(`Issue comment detected: #${issueNumber}`);
```

## 使用规则

修复后的使用规则：

✅ **正确用法**：
- 在原始 Issue 中评论 `@CCai <任务描述>`

❌ **错误用法**：
- 在 Pull Request 的评论区评论 `@CCai <任务描述>`
- 在 Pull Request 的代码审查中评论 `@CCai <任务描述>`

如果在 PR 中使用 `@CCai`，系统会自动回复提示消息，要求在原始 Issue 中使用。

## 效果

- ✅ 防止重复执行
- ✅ 避免创建重复的 PR
- ✅ 减少不必要的 API 调用和资源消耗
- ✅ 提供清晰的用户提示

## 相关文件

- `.github/workflows/ccai-trigger.yml` - 触发器工作流

