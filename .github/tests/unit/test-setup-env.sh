#!/bin/bash
# ==========================================
# 单元测试: setup-env.sh
# 测试环境配置文件生成脚本的功能
# ==========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/.github/scripts/ccai/setup-env.sh"

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
# 测试用例
# ==========================================

test_missing_api_key() {
  print_test_header "缺少 ANTHROPIC_API_KEY 参数"

  cd "$TEST_DIR"

  # 运行脚本 (期望失败)
  set +e
  output=$(bash "$SCRIPT_UNDER_TEST" "" 2>&1)
  exit_code=$?
  set -e

  assert_equals "1" "$exit_code" "脚本应该以退出码 1 失败"
  assert_contains "$output" "Error: ANTHROPIC_API_KEY is required" "输出应包含错误消息"
}

test_env_file_created() {
  print_test_header "环境文件成功创建"

  cd "$TEST_DIR"

  # 运行脚本
  output=$(bash "$SCRIPT_UNDER_TEST" "test-api-key-12345" 2>&1)
  exit_code=$?

  assert_equals "0" "$exit_code" "脚本应该成功执行"
  assert_file_exists "$TEST_DIR/.env.development.local" "应创建 .env.development.local 文件"
  assert_contains "$output" "Environment file created" "应显示成功消息"
}

test_env_file_content() {
  print_test_header "环境文件内容正确"

  cd "$TEST_DIR"

  # 运行脚本
  bash "$SCRIPT_UNDER_TEST" "test-api-key-67890" >/dev/null 2>&1

  # 读取生成的文件
  env_content=$(cat "$TEST_DIR/.env.development.local")

  # 验证必需的环境变量
  assert_contains "$env_content" "NODE_ENV=development" "应包含 NODE_ENV"
  assert_contains "$env_content" "PORT=3000" "应包含 PORT"
  assert_contains "$env_content" "DATABASE_URL=" "应包含 DATABASE_URL"
  assert_contains "$env_content" "test_user:test_password" "数据库连接应使用 CI 配置"
  assert_contains "$env_content" "REDIS_HOST=localhost" "应包含 Redis 配置"
  assert_contains "$env_content" "REDIS_PORT=6379" "应包含 Redis 端口"
  assert_contains "$env_content" "LOG_LEVEL=debug" "应包含日志级别"
  assert_contains "$env_content" "ANTHROPIC_API_KEY=test-api-key-67890" "应包含 API key"
}

test_database_url_format() {
  print_test_header "DATABASE_URL 格式正确"

  cd "$TEST_DIR"

  bash "$SCRIPT_UNDER_TEST" "test-key" >/dev/null 2>&1

  env_content=$(cat "$TEST_DIR/.env.development.local")

  # 验证 PostgreSQL 连接字符串格式
  assert_contains "$env_content" "postgresql://" "DATABASE_URL 应使用 postgresql:// 协议"
  assert_contains "$env_content" "localhost:5432" "应连接到本地 PostgreSQL"
  assert_contains "$env_content" "nestjs_ci_test" "应使用 CI 测试数据库名"
  assert_contains "$env_content" "schema=public" "应指定 schema"
}

test_api_key_injection() {
  print_test_header "API Key 正确注入"

  cd "$TEST_DIR"

  test_key="sk-ant-test-1234567890abcdef"
  bash "$SCRIPT_UNDER_TEST" "$test_key" >/dev/null 2>&1

  env_content=$(cat "$TEST_DIR/.env.development.local")

  assert_contains "$env_content" "ANTHROPIC_API_KEY=$test_key" "API key 应正确注入"
}

test_sensitive_info_hidden() {
  print_test_header "敏感信息在日志中隐藏"

  cd "$TEST_DIR"

  test_key="sk-ant-secret-key-123"
  output=$(bash "$SCRIPT_UNDER_TEST" "$test_key" 2>&1)

  # 验证输出中不包含真实的 API key
  if echo "$output" | grep -q "$test_key"; then
    assert_equals "false" "true" "API key 不应出现在日志输出中"
  else
    assert_equals "true" "true" "API key 在日志中被正确隐藏"
  fi

  # 验证输出包含 REDACTED
  assert_contains "$output" "REDACTED" "应显示 REDACTED 占位符"
}

test_file_format_valid() {
  print_test_header "环境文件格式有效"

  cd "$TEST_DIR"

  bash "$SCRIPT_UNDER_TEST" "test-key" >/dev/null 2>&1

  # 尝试 source 文件 (验证格式是否有效)
  set +e
  set -a
  source "$TEST_DIR/.env.development.local"
  source_exit_code=$?
  set +a
  set -e

  assert_equals "0" "$source_exit_code" "环境文件应可以被 source"

  # 验证环境变量被正确设置
  assert_equals "development" "${NODE_ENV:-}" "NODE_ENV 应被设置"
  assert_equals "3000" "${PORT:-}" "PORT 应被设置"
}

test_redis_config() {
  print_test_header "Redis 配置正确"

  cd "$TEST_DIR"

  bash "$SCRIPT_UNDER_TEST" "test-key" >/dev/null 2>&1

  env_content=$(cat "$TEST_DIR/.env.development.local")

  assert_contains "$env_content" "REDIS_HOST=localhost" "Redis host 应为 localhost"
  assert_contains "$env_content" "REDIS_PORT=6379" "Redis port 应为 6379"
  assert_contains "$env_content" "REDIS_PASSWORD=" "Redis password 应为空 (CI 环境)"
  assert_contains "$env_content" "REDIS_DB=0" "Redis DB 应为 0"
}

# ==========================================
# 运行所有测试
# ==========================================

echo ""
echo "=========================================="
echo "开始测试: setup-env.sh"
echo "=========================================="

test_missing_api_key
test_env_file_created
test_env_file_content
test_database_url_format
test_api_key_injection
test_sensitive_info_hidden
test_file_format_valid
test_redis_config

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
