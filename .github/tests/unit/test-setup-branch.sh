#!/bin/bash
# ==========================================
# 单元测试: setup-branch.sh
# 测试分支管理脚本的功能
# ==========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/.github/scripts/ccai/setup-branch.sh"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试统计
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# ==========================================
# 测试辅助函数
# ==========================================

print_test_header() {
  echo ""
  echo "=========================================="
  echo "测试: $1"
  echo "=========================================="
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $message"
    echo "  Expected: $expected"
    echo "  Actual:   $actual"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="${3:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if echo "$haystack" | grep -q "$needle"; then
    echo -e "${GREEN}✓ PASS${NC}: $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $message"
    echo "  Expected to contain: $needle"
    echo "  Actual: $haystack"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

assert_file_exists() {
  local file="$1"
  local message="${2:-}"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $message"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}: $message"
    echo "  File not found: $file"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# ==========================================
# Mock 函数
# ==========================================

# Mock git 命令
git() {
  case "$1" in
    config)
      echo "[MOCK] git config $*" >&2
      ;;
    fetch)
      echo "[MOCK] git fetch $*" >&2
      ;;
    ls-remote)
      # 根据环境变量决定是否返回远程分支
      # git ls-remote --heads origin "branch_name"
      # $1=ls-remote $2=--heads $3=origin $4=branch_name
      if [ "${MOCK_REMOTE_BRANCH_EXISTS:-false}" = "true" ]; then
        # 模拟真实的 git ls-remote 输出格式
        echo "abc123def456	refs/heads/$4"
      fi
      ;;
    checkout)
      echo "[MOCK] git checkout $*" >&2
      if [ "${MOCK_CHECKOUT_FAIL:-false}" = "true" ]; then
        return 1
      fi
      ;;
    pull)
      echo "[MOCK] git pull $*" >&2
      ;;
    *)
      echo "[MOCK] git $*" >&2
      ;;
  esac
}

export -f git

# ==========================================
# 测试用例
# ==========================================

test_missing_issue_number() {
  print_test_header "缺少 issue_number 参数"

  # 运行脚本 (期望失败)
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "" 2>&1)
  exit_code=$?
  set -e

  assert_equals "1" "$exit_code" "脚本应该以退出码 1 失败"
  assert_contains "$output" "Error: Issue number is required" "输出应包含错误消息"
}

test_create_new_branch() {
  print_test_header "创建新分支 (远程不存在)"

  # 设置 mock 环境
  export MOCK_REMOTE_BRANCH_EXISTS=false
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  output=$(bash "$SCRIPT_UNDER_TEST" "123" 2>&1)
  exit_code=$?

  assert_equals "0" "$exit_code" "脚本应该成功执行"
  assert_contains "$output" "Branch issue_123 does not exist" "应显示创建新分支消息"
  assert_contains "$output" "Branch setup complete: issue_123" "应显示完成消息"

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "branch_name=issue_123" "GITHUB_OUTPUT 应包含分支名"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_REMOTE_BRANCH_EXISTS
  unset GITHUB_OUTPUT
}

test_checkout_existing_branch() {
  print_test_header "切换到已存在分支 (远程存在)"

  # 设置 mock 环境
  export MOCK_REMOTE_BRANCH_EXISTS=true
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  output=$(bash "$SCRIPT_UNDER_TEST" "456" 2>&1)
  exit_code=$?

  assert_equals "0" "$exit_code" "脚本应该成功执行"
  assert_contains "$output" "Branch issue_456 exists remotely" "应显示分支已存在消息"
  assert_contains "$output" "Branch setup complete: issue_456" "应显示完成消息"

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "branch_name=issue_456" "GITHUB_OUTPUT 应包含分支名"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_REMOTE_BRANCH_EXISTS
  unset GITHUB_OUTPUT
}

test_git_config_set() {
  print_test_header "Git 配置正确设置"

  export MOCK_REMOTE_BRANCH_EXISTS=false
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本并捕获 git config 调用
  output=$(bash "$SCRIPT_UNDER_TEST" "789" 2>&1)

  assert_contains "$output" "config user.name" "应设置 Git 用户名"
  assert_contains "$output" "config user.email" "应设置 Git 邮箱"

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_REMOTE_BRANCH_EXISTS
  unset GITHUB_OUTPUT
}

test_output_format() {
  print_test_header "GITHUB_OUTPUT 格式正确"

  export MOCK_REMOTE_BRANCH_EXISTS=false
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  bash "$SCRIPT_UNDER_TEST" "999" >/dev/null 2>&1

  # 验证输出格式
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    # 检查格式: key=value
    if echo "$github_output" | grep -q "^branch_name=issue_999$"; then
      assert_equals "true" "true" "GITHUB_OUTPUT 格式正确"
    else
      assert_equals "branch_name=issue_999" "$github_output" "GITHUB_OUTPUT 格式不正确"
    fi
  else
    assert_equals "true" "false" "GITHUB_OUTPUT 文件应存在"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_REMOTE_BRANCH_EXISTS
  unset GITHUB_OUTPUT
}

# ==========================================
# 运行所有测试
# ==========================================

echo ""
echo "=========================================="
echo "开始测试: setup-branch.sh"
echo "=========================================="

test_missing_issue_number
test_create_new_branch
test_checkout_existing_branch
test_git_config_set
test_output_format

# ==========================================
# 测试总结
# ==========================================

echo ""
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo "运行: $TESTS_RUN"
echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}失败: $TESTS_FAILED${NC}"
else
  echo "失败: $TESTS_FAILED"
fi
echo "=========================================="

# 退出码
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}所有测试通过! ✓${NC}"
  exit 0
else
  echo -e "${RED}部分测试失败! ✗${NC}"
  exit 1
fi
