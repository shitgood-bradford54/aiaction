# GitHub Actions 评论优化

## 优化目标

减少 GitHub Actions 工作流在 Issue 中创建的评论数量，避免产生过多的"垃圾评论"。

## 优化前的行为

1. **开始执行**：创建一个"正在处理"的评论
2. **执行完成**：创建一个新的"Claude Code 执行结果"评论
3. **最终状态**：更新初始评论为"任务完成/失败/无变更"

这样会在每次执行时产生 **2 个评论**（初始评论 + 执行结果评论）。

## 优化后的行为

1. **开始执行**：创建一个"正在处理"的评论
2. **执行完成**：读取 Claude 输出并保存到变量（不创建新评论）
3. **最终状态**：更新初始评论，包含：
   - 任务状态（成功/失败/无变更）
   - Claude Code 执行结果
   - 完整的执行输出

现在每次执行只产生 **1 个评论**，所有信息都整合在这个评论中。

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

### 成功完成的评论

```markdown
✅ **任务完成!**

📋 **原始请求**: 添加用户登录功能
🔗 **Pull Request**: https://github.com/user/repo/pull/123

请查看 PR 并进行代码审查。

---

## 🤖 Claude Code 执行结果

**状态**: ✅ 执行成功 (退出码: 0)
**时间**: 2025-10-28 10:30:00

### 📋 执行输出

```
[Claude Code 的完整输出内容...]
```
```

### 失败的评论

```markdown
❌ **任务失败**

📋 **原始请求**: 添加用户登录功能
🔍 **查看详细日志**: [GitHub Actions 运行记录](...)

请检查错误信息并重试。

---

## 🤖 Claude Code 执行结果

**状态**: ❌ 执行失败 (退出码: 1)
**时间**: 2025-10-28 10:30:00

### 📋 执行输出

```
[Claude Code 的错误输出内容...]
```
```

## 优势

1. **减少垃圾评论**：每次执行只产生 1 个评论而不是 2 个
2. **信息集中**：所有相关信息都在同一个评论中，方便查看
3. **更好的用户体验**：Issue 评论区更加整洁
4. **保留完整信息**：Claude 输出内容依然被完整保存和显示

## 注意事项

1. **GitHub 评论长度限制**：GitHub 评论有 65536 字符的限制，因此 Claude 输出被限制在 30000 字符以内，为其他内容预留空间
2. **Base64 编码**：使用 base64 编码传递 Claude 输出，避免特殊字符导致的问题
3. **截断提示**：如果输出过长被截断，会提供链接到 Actions 运行记录查看完整日志

## 相关文件

- `.github/workflows/ccai-execute.yml` - 执行工作流的主要文件
- `.github/workflows/ccai-trigger.yml` - 触发工作流的文件

