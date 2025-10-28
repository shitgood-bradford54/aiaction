#!/bin/bash
# ==========================================
# Claude Code 执行脚本
# 功能: 执行 Claude Code 并检测交互请求
# 输入: $1 = prompt
# 输出: GITHUB_OUTPUT (exit_code, interaction_detected, interaction_message)
# ==========================================

set -euo pipefail

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
claude -p "$PROMPT" --dangerously-skip-permissions 2>&1 | tee "$LOG_FILE"
CLAUDE_EXIT_CODE=$?
set -e

echo "📊 Claude exit code: $CLAUDE_EXIT_CODE"

# 检查是否有交互请求
INTERACTION_DETECTED=false
INTERACTION_MESSAGE=""

if grep -qiE "需要更多信息|请提供|请确认|需要澄清|不确定|waiting for|please provide|need more information|clarification needed|could you|can you provide|please clarify|human interaction|requires confirmation" "$LOG_FILE"; then
  echo "🔔 Interaction detected"
  INTERACTION_DETECTED=true

  # 提取交互内容 (前20行)
  INTERACTION_MESSAGE=$(grep -iE -A 5 "需要更多信息|请提供|请确认|需要澄清|不确定|waiting for|please provide|need more information|clarification needed|could you|can you provide|please clarify|human interaction|requires confirmation" "$LOG_FILE" | head -20)
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

echo "✅ Claude output saved to $LOG_FILE"

# 返回 Claude 的退出码
exit $CLAUDE_EXIT_CODE
