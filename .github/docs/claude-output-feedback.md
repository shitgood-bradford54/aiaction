# Claude 输出反馈功能

## 功能说明

现在当 Claude Code 执行时，它的完整输出会被自动发送到相应的 GitHub Issue 中，让用户能实时看到 Claude 的执行过程和结果。

## 实现方式

### 1. 脚本修改 (`run-claude.sh`)

修改了 `.github/scripts/ccai/run-claude.sh` 脚本：

- **原来**：Claude 输出只写入 `claude_output.log` 文件
- **现在**：仍然写入日志文件，工作流会直接读取该文件

```bash
# 执行 Claude Code (允许失败,以便捕获退出码)
claude -p "$PROMPT" 2>&1 | tee "$LOG_FILE"
```

### 2. 工作流修改 (`ccai-execute.yml`)

在工作流中添加了新的步骤 **"步骤 8: 反馈 Claude 输出到 Issue"**：

- 在 Claude 执行完成后立即运行（使用 `if: always()`）
- 使用 Node.js `fs` 模块直接读取 `claude_output.log` 文件
- 将 Claude 的完整输出作为评论发布到 Issue 中
- 包含以下信息：
  - 执行状态（成功/失败）
  - 退出码
  - 执行时间
  - 完整的输出内容

```javascript
// 直接读取日志文件，避免 YAML 模板字符串转义问题
const fs = require('fs');
claudeOutput = fs.readFileSync('claude_output.log', 'utf8');
```

### 3. 输出限制

由于 GitHub 评论有字符限制（约 65536 字符），实现了以下保护措施：

- 限制输出长度为 60000 字符
- 如果输出超长，会自动截断并提示用户查看完整日志
- 提供 Actions 运行记录的链接

## 用户体验改进

### 之前
- 用户只能看到最终结果（成功/失败）
- 如果想知道 Claude 做了什么，需要去 Actions 日志中查看

### 现在
- 用户可以直接在 Issue 中看到 Claude 的完整输出
- 包括：
  - Claude 的思考过程
  - 执行的命令
  - 修改的文件
  - 遇到的问题
- 更好的透明度和可追溯性

## 示例效果

当 Claude Code 执行后，会在 Issue 中自动创建类似这样的评论：

```markdown
## 🤖 Claude Code 执行结果

**状态**: ✅ 执行成功 (退出码: 0)
**时间**: 2025-10-28 14:23:45

### 📋 执行输出

```
🤖 正在分析需求...
📝 创建文件: src/new-feature.ts
✏️ 修改文件: src/app.module.ts
✅ 所有更改已完成
```
```

## 后续优化建议

1. **输出格式化**：可以考虑对输出进行更智能的格式化，突出重点信息
2. **分段显示**：对于超长输出，可以考虑分多个评论发布
3. **实时推送**：未来可以考虑流式输出，让用户实时看到进度
4. **输出过滤**：可以添加选项让用户选择看简版还是详细版

## 相关文件

- `.github/scripts/ccai/run-claude.sh` - Claude 执行脚本
- `.github/workflows/ccai-execute.yml` - 主工作流文件

