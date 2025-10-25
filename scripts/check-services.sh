#!/bin/bash

echo "========================================="
echo "Infrastructure Connectivity Check"
echo "========================================="
echo ""

# 加载环境变量
if [ -f .env.e2e.local ]; then
  export $(cat .env.e2e.local | grep -v '^#' | xargs)
elif [ -f .env.e2e ]; then
  export $(cat .env.e2e | grep -v '^#' | xargs)
elif [ -f .env.development.local ]; then
  export $(cat .env.development.local | grep -v '^#' | xargs)
elif [ -f .env.development ]; then
  export $(cat .env.development | grep -v '^#' | xargs)
fi

echo "Checking services..."
echo ""

# 检查 PostgreSQL
echo "1. PostgreSQL:"
if command -v psql &> /dev/null; then
  # 从 DATABASE_URL 提取连接信息
  if [ -n "$DATABASE_URL" ]; then
    echo "   DATABASE_URL is set"
    # 尝试连接 PostgreSQL（简单测试）
    PG_ISREADY=$(echo "$DATABASE_URL" | sed -n 's/postgresql:\/\/\([^:]*\):\([^@]*\)@\([^:]*\):\([^\/]*\).*/\3:\4/p')
    if [ -n "$PG_ISREADY" ]; then
      pg_isready -h "${PG_ISREADY%:*}" -p "${PG_ISREADY#*:}" > /dev/null 2>&1
      if [ $? -eq 0 ]; then
        echo "   ✓ PostgreSQL is accepting connections"
      else
        echo "   ✗ PostgreSQL is not accepting connections"
        echo "   Please start PostgreSQL or check DATABASE_URL"
      fi
    else
      echo "   ⚠ Could not parse DATABASE_URL"
    fi
  else
    echo "   ✗ DATABASE_URL not set"
  fi
else
  echo "   ⚠ psql not found, skipping connection test"
  echo "   DATABASE_URL: ${DATABASE_URL:-not set}"
fi
echo ""

# 检查 Redis
echo "2. Redis:"
if command -v redis-cli &> /dev/null; then
  REDIS_HOST=${REDIS_HOST:-localhost}
  REDIS_PORT=${REDIS_PORT:-6379}
  REDIS_PASSWORD=${REDIS_PASSWORD:-}

  echo "   Host: $REDIS_HOST"
  echo "   Port: $REDIS_PORT"

  if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_RESPONSE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning ping 2>&1)
  else
    REDIS_RESPONSE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>&1)
  fi

  if echo "$REDIS_RESPONSE" | grep -q "PONG"; then
    echo "   ✓ Redis is accepting connections"
  else
    echo "   ✗ Redis connection failed: $REDIS_RESPONSE"
    echo "   Please start Redis or check REDIS_HOST/REDIS_PORT/REDIS_PASSWORD"
  fi
else
  echo "   ⚠ redis-cli not found, skipping connection test"
  echo "   Host: ${REDIS_HOST:-not set}"
  echo "   Port: ${REDIS_PORT:-not set}"
fi
echo ""

echo "========================================="
echo "To run E2E tests:"
echo "  npm run test:e2e"
echo "========================================="
