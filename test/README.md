# E2E 测试说明

本文档说明如何运行 E2E 测试以及测试的前置要求。

## 📋 测试概述

项目包含以下 E2E 测试：

| 测试文件 | 用途 | 状态 |
|---------|------|------|
| `config.e2e-spec.ts` | 环境变量配置加载验证 | ✅ 可用 |
| `database.e2e-spec.ts` | PostgreSQL 连接测试 | ⚠️ 需要数据库 |
| `redis.e2e-spec.ts` | Redis 连接测试 | ⚠️ 需要 Redis |

## ✅ 测试成功案例

### 配置加载测试

**测试内容：**
- 验证 NODE_ENV 加载
- 验证 PORT 配置
- 验证 DATABASE_URL 加载
- 验证 Redis 配置加载
- 验证日志级别配置
- 验证配置结构完整性

**运行命令：**
```bash
NODE_ENV=e2e npx jest --config ./test/jest-e2e.json test/config.e2e-spec.ts
```

**测试结果：**
```
✓ NODE_ENV: e2e
✓ PORT: 3002
✓ DATABASE_URL loaded (postgresql://postgres:postgres...)
✓ Redis: localhost:6379 (DB: 2)
✓ LOG_LEVEL: warn
✓ Running in e2e environment
✓ Configuration structure is valid

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

## 🔧 前置要求

### 对于所有 E2E 测试

1. **环境变量配置**
   ```bash
   # 创建 E2E 环境变量文件
   npm run env:setup:e2e

   # 或手动创建
   cp .env.example .env.e2e.local
   ```

2. **编辑配置文件** `.env.e2e.local`
   ```env
   # 使用实际的数据库和 Redis 配置
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=redis  # 如果 Redis 需要密码
   REDIS_DB=2           # 使用独立的 DB 编号
   ```

### 对于数据库测试

1. **PostgreSQL 必须运行**
   ```bash
   # 检查 PostgreSQL 是否运行
   pg_isready

   # 或使用我们的检查脚本
   sh scripts/check-services.sh
   ```

2. **创建测试数据库**
   ```bash
   # 使用 psql
   psql -U postgres -c "CREATE DATABASE nestjs_test;"

   # 或使用现有数据库（确保 DATABASE_URL 正确）
   ```

3. **运行 Prisma 迁移**
   ```bash
   NODE_ENV=e2e npm run prisma:migrate
   ```

### 对于 Redis 测试

1. **Redis 必须运行**
   ```bash
   # 检查 Redis 是否运行
   redis-cli ping

   # 如果需要密码
   redis-cli -a your_password ping

   # 或使用我们的检查脚本
   sh scripts/check-services.sh
   ```

2. **Redis 配置**
   - 确保 `.env.e2e.local` 中的 REDIS_PASSWORD 正确
   - 使用不同的 DB 编号（推荐：DB 2）避免污染开发数据

## 🚀 运行测试

### 1. 检查服务状态

```bash
# 运行服务检查脚本
sh scripts/check-services.sh
```

**期望输出：**
```
=========================================
Infrastructure Connectivity Check
=========================================

Checking services...

1. PostgreSQL:
   DATABASE_URL is set
   ✓ PostgreSQL is accepting connections

2. Redis:
   Host: localhost
   Port: 6379
   ✓ Redis is accepting connections

=========================================
```

### 2. 验证环境变量

```bash
npm run env:validate
```

### 3. 运行测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行单个测试文件
NODE_ENV=e2e npx jest --config ./test/jest-e2e.json test/config.e2e-spec.ts

# 运行数据库测试（需要数据库）
NODE_ENV=e2e npx jest --config ./test/jest-e2e.json test/database.e2e-spec.ts

# 运行 Redis 测试（需要 Redis）
NODE_ENV=e2e npx jest --config ./test/jest-e2e.json test/redis.e2e-spec.ts
```

## 📝 测试详情

### 配置加载测试 (`config.e2e-spec.ts`)

**无需外部服务，可直接运行**

测试内容：
- ✅ 环境变量加载优先级
- ✅ 配置对象结构验证
- ✅ 必需变量存在性检查
- ✅ 类型转换正确性

### PostgreSQL 测试 (`database.e2e-spec.ts`)

**需要：PostgreSQL 服务 + 数据库**

测试内容：
- 数据库连接验证
- SQL 查询执行
- 数据库版本检查
- Schema 验证
- 连接池并发测试

### Redis 测试 (`redis.e2e-spec.ts`)

**需要：Redis 服务**

测试内容：
- Redis 连接验证（PING/PONG）
- 基本操作（SET/GET/DEL）
- 过期时间设置（TTL）
- 缓存操作
- 模式匹配（KEYS）
- 批量操作
- 性能测试（并发操作）

## 🛠️ 故障排查

### 问题：数据库连接失败

**错误：** `Database 'xxx' does not exist`

**解决方案：**
1. 检查数据库是否存在：
   ```bash
   psql -U postgres -l
   ```

2. 创建数据库：
   ```bash
   psql -U postgres -c "CREATE DATABASE nestjs_test;"
   ```

3. 或更新 `.env.e2e.local` 使用已存在的数据库

### 问题：Redis 认证失败

**错误：** `NOAUTH Authentication required`

**解决方案：**
1. 检查 Redis 配置：
   ```bash
   redis-cli CONFIG GET requirepass
   ```

2. 更新 `.env.e2e.local`：
   ```env
   REDIS_PASSWORD=your_redis_password
   ```

3. 或禁用 Redis 密码（仅本地开发）：
   ```bash
   redis-cli CONFIG SET requirepass ""
   ```

### 问题：连接被拒绝

**错误：** `ECONNREFUSED`

**解决方案：**
1. 检查服务是否运行：
   ```bash
   # PostgreSQL
   pg_isready

   # Redis
   redis-cli ping
   ```

2. 检查端口是否正确：
   ```bash
   # PostgreSQL (默认 5432)
   lsof -i:5432

   # Redis (默认 6379)
   lsof -i:6379
   ```

3. 启动服务：
   ```bash
   # PostgreSQL (macOS with Homebrew)
   brew services start postgresql

   # Redis (macOS with Homebrew)
   brew services start redis
   ```

## 📊 测试报告

### 当前测试状态（2025-10-25）

| 测试套件 | 测试数 | 通过 | 失败 | 跳过 |
|---------|-------|------|------|------|
| 配置加载 | 7 | 7 | 0 | 0 |
| PostgreSQL | 9 | - | - | 需要数据库 |
| Redis | 13 | - | - | 需要 Redis |

**说明：**
- ✅ 配置加载测试：无需外部依赖，可直接运行，全部通过
- ⚠️  数据库测试：需要 PostgreSQL 和数据库设置
- ⚠️  Redis 测试：需要 Redis 服务和正确的密码配置

## 🎯 测试建议

### CI/CD 环境

在 CI/CD 管道中，建议：

1. **使用 Docker Compose** 启动测试依赖
   ```yaml
   # docker-compose.test.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: nestjs_test
         POSTGRES_PASSWORD: postgres
       ports:
         - "5432:5432"

     redis:
       image: redis:7
       command: redis-server --requirepass redis
       ports:
         - "6379:6379"
   ```

2. **等待服务就绪**
   ```bash
   # 使用 wait-for-it.sh 或类似工具
   ./scripts/wait-for-it.sh localhost:5432 -- npm run test:e2e
   ```

3. **清理测试数据**
   ```bash
   # 测试后清理
   docker-compose -f docker-compose.test.yml down -v
   ```

### 本地开发

建议使用本地安装的服务，性能更好：

```bash
# 安装服务 (macOS)
brew install postgresql redis

# 启动服务
brew services start postgresql
brew services start redis

# 运行测试
npm run test:e2e
```

## 📚 相关文档

- **环境变量设计**: `doc/env-structure-design.md`
- **快速参考**: `doc/ENV_QUICK_REFERENCE.md`
- **项目配置**: `CLAUDE.md`
- **服务检查脚本**: `scripts/check-services.sh`
- **环境验证脚本**: `scripts/validate-env.js`

---

**最后更新**: 2025-10-25
**维护者**: Development Team
