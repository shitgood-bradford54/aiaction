#!/bin/bash
# ==========================================
# 分支管理脚本
# 功能: 创建或切换到 issue 分支
# 输入: $1 = issue_number
# 输出: GITHUB_OUTPUT (branch_name)
# ==========================================

set -euo pipefail

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

# 获取最新的远程分支信息
git fetch origin

# 检查分支是否在远程存在
if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
  echo "🔄 Branch $BRANCH_NAME exists remotely, checking out and pulling..."
  git checkout "$BRANCH_NAME"
  git pull origin "$BRANCH_NAME"
else
  echo "🆕 Branch $BRANCH_NAME does not exist, creating from main..."
  git checkout -b "$BRANCH_NAME" main
fi

# 输出到 GitHub Actions
echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
echo "✅ Branch setup complete: $BRANCH_NAME"
