# GitHub Actions 评论和工作流优化

## 优化目标

1. 减少 GitHub Actions 工作流在 Issue 中创建的评论数量，避免产生过多的"垃圾评论"
2. 移除工作流层面的自动 PR 创建，交由 Claude Code agent 自行决定
3. 简化评论内容，只保留 Claude Code 的执行输出

## 优化前的行为

1. **开始执行**：创建一个"正在处理"的评论
2. **执行完成**：创建一个新的"Claude Code 执行结果"评论
3. **最终状态**：更新初始评论为"任务完成/失败/无变更"，包含 PR 链接等信息
4. **自动创建 PR**：工作流自动检查并创建/更新 Pull Request

这样会在每次执行时产生 **2 个评论**（初始评论 + 执行结果评论）。

## 优化后的行为

1. **开始执行**：创建一个"正在处理"的评论
2. **执行完成**：读取 Claude 输出并保存到变量（不创建新评论）
3. **最终状态**：更新初始评论，**只显示 Claude Code 的执行输出**
4. **不自动创建 PR**：工作流只负责提交和推送代码到 issue 分支，由 Claude Code agent 自行决定是否创建 PR

现在每次执行只产生 **1 个评论**，内容更加简洁，只包含 Claude 的输出结果。

## 技术实现

### 步骤 8: 读取 Claude 输出

```yaml
- name: Read Claude output
  if: always() && steps.run-claude.outcome != 'skipped'
  id: read-output
  run: |
    if [ -f claude_output.log ]; then
      # 使用 base64 编码避免特殊字符问题
      CLAUDE_OUTPUT=$(cat claude_output.log | base64 -w 0 2>/dev/null || cat claude_output.log | base64)
      echo "claude_output_base64=$CLAUDE_OUTPUT" >> $GITHUB_OUTPUT
      echo "has_output=true" >> $GITHUB_OUTPUT
    else
      echo "has_output=false" >> $GITHUB_OUTPUT
      echo "⚠️ claude_output.log 文件不存在"
    fi
```

### 步骤 14/15/16: 更新最终评论

在更新评论时，检查是否有 Claude 输出，如果有则包含在评论中：

```javascript
// 添加 Claude 输出
if (hasOutput && claudeOutputBase64) {
  try {
    const claudeOutput = Buffer.from(claudeOutputBase64, 'base64').toString('utf8');
    const maxLength = 30000; // 为其他内容预留空间
    let truncatedOutput = claudeOutput;
    let wasTruncated = false;
    
    if (claudeOutput.length > maxLength) {
      truncatedOutput = claudeOutput.substring(0, maxLength);
      wasTruncated = true;
    }
    
    body += '---\n\n## 🤖 Claude Code 执行结果\n\n' +
           `**状态**: ✅ 执行成功 (退出码: ${exitCode})\n` +
           `**时间**: ${timestamp}\n\n` +
           '### 📋 执行输出\n\n' +
           '```\n' + truncatedOutput + '\n```\n';
    
    if (wasTruncated) {
      body += `\n⚠️ *输出内容过长，已截断。完整日志请查看 [Actions 运行记录](${runUrl})*\n`;
    }
  } catch (error) {
    body += '---\n\n⚠️ 无法解析 Claude 输出日志\n';
    console.error('解析 Claude 输出失败:', error);
  }
}
```

## 评论内容示例

### 优化后的评论（简洁版）

```markdown
## 🤖 Claude Code 执行结果

**状态**: ✅ 执行成功 (退出码: 0)
**时间**: 2025-10-28 10:30:00

```
[Claude Code 的完整输出内容，包括它的思考过程、执行的操作、创建的文件等...]
```

⚠️ *输出内容过长，已截断。完整日志请查看 [Actions 运行记录](...)*
```

**说明**：
- 去除了"任务完成"、"原始请求"等冗余信息
- 去除了 PR 链接（因为工作流不再自动创建 PR）
- 只保留 Claude Code 的执行结果，让输出更简洁
- Claude Code agent 可以在输出中自行说明它做了什么，是否创建了 PR 等

## 优势

1. **减少垃圾评论**：每次执行只产生 1 个评论而不是 2 个
2. **简洁清晰**：只显示 Claude 的输出，去除冗余信息
3. **更好的用户体验**：Issue 评论区更加整洁
4. **保留完整信息**：Claude 输出内容依然被完整保存和显示
5. **灵活性更高**：Claude Code agent 可以自行决定是否创建 PR，工作流不做限制
6. **权限支持**：通过 PAT_TOKEN 给 Claude agent 提供必要的权限

## 注意事项

1. **GitHub 评论长度限制**：GitHub 评论有 65536 字符的限制，因此 Claude 输出被限制在 60000 字符以内
2. **Base64 编码**：使用 base64 编码传递 Claude 输出，避免特殊字符导致的问题
3. **截断提示**：如果输出过长被截断，会提供链接到 Actions 运行记录查看完整日志
4. **分支管理**：工作流会检查远程是否存在 issue 分支，存在则 checkout，不存在则创建
5. **PAT_TOKEN**：需要配置 PAT_TOKEN secret，供 Claude Code agent 在需要时创建 PR

## 工作流程

1. 用户在 Issue 中评论 `@ccai <任务描述>`
2. Trigger 工作流验证权限并提取参数，创建初始"正在处理"评论
3. Execute 工作流执行：
   - 检查/创建 issue 分支
   - 设置环境（包括 PAT_TOKEN）
   - 执行 Claude Code（agent 可使用 GITHUB_TOKEN）
   - 读取 Claude 输出
   - 如有代码变更，提交并推送到 issue 分支
   - 更新初始评论为 Claude 的执行结果

## 相关文件

- `.github/workflows/ccai-execute.yml` - 执行工作流的主要文件
- `.github/workflows/ccai-trigger.yml` - 触发工作流的文件
- `.github/scripts/ccai/setup-env.sh` - 环境配置脚本（支持 PAT_TOKEN）
- `.github/scripts/ccai/setup-branch.sh` - 分支管理脚本

