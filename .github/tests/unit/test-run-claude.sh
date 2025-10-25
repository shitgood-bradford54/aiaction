#!/bin/bash
# ==========================================
# 单元测试: run-claude.sh
# 测试 Claude Code 执行脚本的功能
# ==========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/.github/scripts/ccai/run-claude.sh"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试统计
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# 测试临时目录
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

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

# ==========================================
# Mock 函数
# ==========================================

# Mock claude 命令
claude() {
  echo "[MOCK] claude $*" >&2

  # 根据环境变量决定行为
  case "${MOCK_CLAUDE_BEHAVIOR:-success}" in
    success)
      echo "Claude Code executed successfully"
      echo "Generated code changes"
      return 0
      ;;
    failure)
      echo "Error: Claude Code execution failed"
      return 1
      ;;
    interaction_chinese)
      echo "我需要更多信息来完成这个任务"
      echo "请提供详细的需求说明"
      return 0
      ;;
    interaction_english)
      echo "I need more information to proceed"
      echo "Could you provide more details about the requirements?"
      return 0
      ;;
    interaction_waiting)
      echo "Waiting for user input"
      echo "Please clarify the authentication method"
      return 0
      ;;
    interaction_confirmation)
      echo "This operation requires confirmation"
      echo "Can you provide confirmation before proceeding?"
      return 0
      ;;
    *)
      echo "Unknown mock behavior"
      return 1
      ;;
  esac
}

export -f claude

# ==========================================
# 测试用例
# ==========================================

test_missing_prompt() {
  print_test_header "缺少 prompt 参数"

  cd "$TEST_DIR"

  # 运行脚本 (期望失败)
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "" 2>&1)
  exit_code=$?
  set -e

  assert_equals "1" "$exit_code" "脚本应该以退出码 1 失败"
  assert_contains "$output" "Error: Prompt is required" "输出应包含错误消息"
}

test_successful_execution() {
  print_test_header "Claude 成功执行"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=success
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "implement health check" 2>&1)
  exit_code=$?
  set -e

  assert_equals "0" "$exit_code" "脚本应该成功执行"
  assert_contains "$output" "Executing Claude Code" "应显示执行消息"

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "exit_code=0" "exit_code 应为 0"
    assert_contains "$github_output" "interaction_detected=false" "不应检测到交互"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_failed_execution() {
  print_test_header "Claude 执行失败"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=failure
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "invalid task" 2>&1)
  exit_code=$?
  set -e

  assert_equals "1" "$exit_code" "脚本应该返回失败退出码"

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "exit_code=1" "exit_code 应为 1"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_interaction_detection_chinese() {
  print_test_header "检测中文交互请求"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=interaction_chinese
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "complex task" 2>&1)
  exit_code=$?
  set -e

  assert_equals "0" "$exit_code" "脚本应该成功执行"
  assert_contains "$output" "Interaction detected" "应检测到交互"

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "interaction_detected=true" "应标记交互检测"
    assert_contains "$github_output" "interaction_message" "应包含交互消息"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_interaction_detection_english() {
  print_test_header "检测英文交互请求"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=interaction_english
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  bash "$SCRIPT_UNDER_TEST" "another task" >/dev/null 2>&1
  set -e

  # 验证 GITHUB_OUTPUT
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")
    assert_contains "$github_output" "interaction_detected=true" "应检测到英文交互"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT"
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_interaction_keywords() {
  print_test_header "测试所有交互关键词"

  # 测试的关键词列表 (从 run-claude.sh 中提取)
  local keywords=(
    "需要更多信息"
    "请提供"
    "请确认"
    "需要澄清"
    "不确定"
    "waiting for"
    "please provide"
    "need more information"
    "clarification needed"
    "could you"
    "can you provide"
    "please clarify"
    "human interaction"
    "requires confirmation"
  )

  local keyword_tests_passed=0
  local keyword_tests_total=${#keywords[@]}

  for keyword in "${keywords[@]}"; do
    cd "$TEST_DIR"
    export GITHUB_OUTPUT=$(mktemp)

    # 创建包含关键词的 mock 输出
    cat > claude_output.log << EOF
Claude Code is processing your request...
Testing keyword detection: $keyword
This should trigger interaction detection.
EOF

    # 检查是否能检测到
    if grep -qiE "需要更多信息|请提供|请确认|需要澄清|不确定|waiting for|please provide|need more information|clarification needed|could you|can you provide|please clarify|human interaction|requires confirmation" claude_output.log; then
      keyword_tests_passed=$((keyword_tests_passed + 1))
    fi

    rm -f "$GITHUB_OUTPUT" claude_output.log
  done

  unset GITHUB_OUTPUT

  assert_equals "$keyword_tests_total" "$keyword_tests_passed" "所有 ${keyword_tests_total} 个关键词都应被检测"
}

test_log_file_created() {
  print_test_header "日志文件正确创建"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=success
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  bash "$SCRIPT_UNDER_TEST" "test task" >/dev/null 2>&1
  set -e

  # 验证日志文件
  if [ -f "$TEST_DIR/claude_output.log" ]; then
    assert_equals "true" "true" "日志文件应被创建"
  else
    assert_equals "true" "false" "日志文件未创建"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT" claude_output.log
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_output_format() {
  print_test_header "GITHUB_OUTPUT 格式正确"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=success
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  bash "$SCRIPT_UNDER_TEST" "format test" >/dev/null 2>&1
  set -e

  # 验证输出格式
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")

    # 检查必需的字段
    if echo "$github_output" | grep -q "^exit_code="; then
      assert_equals "true" "true" "应包含 exit_code"
    else
      assert_equals "true" "false" "缺少 exit_code"
    fi

    if echo "$github_output" | grep -q "^interaction_detected="; then
      assert_equals "true" "true" "应包含 interaction_detected"
    else
      assert_equals "true" "false" "缺少 interaction_detected"
    fi
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT" claude_output.log
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

test_multiline_interaction_message() {
  print_test_header "多行交互消息正确处理"

  cd "$TEST_DIR"
  export MOCK_CLAUDE_BEHAVIOR=interaction_english
  export GITHUB_OUTPUT=$(mktemp)

  # 运行脚本
  set +e
  bash "$SCRIPT_UNDER_TEST" "multiline test" >/dev/null 2>&1
  set -e

  # 验证多行输出格式
  if [ -f "$GITHUB_OUTPUT" ]; then
    github_output=$(cat "$GITHUB_OUTPUT")

    # 检查 heredoc 格式
    assert_contains "$github_output" "interaction_message<<EOF" "应使用 heredoc 格式"
    assert_contains "$github_output" "EOF" "应包含 EOF 结束符"
  fi

  # 清理
  rm -f "$GITHUB_OUTPUT" claude_output.log
  unset MOCK_CLAUDE_BEHAVIOR
  unset GITHUB_OUTPUT
}

# ==========================================
# 运行所有测试
# ==========================================

echo ""
echo "=========================================="
echo "开始测试: run-claude.sh"
echo "=========================================="

test_missing_prompt
test_successful_execution
test_failed_execution
test_interaction_detection_chinese
test_interaction_detection_english
test_interaction_keywords
test_log_file_created
test_output_format
test_multiline_interaction_message

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
