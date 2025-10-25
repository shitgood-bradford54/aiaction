# 环境变量快速参考

## 🚀 快速开始

```bash
# 新开发者初始化流程
npm run env:setup              # 1. 创建环境变量文件
vim .env.development.local     # 2. 编辑配置（添加真实密码）
npm run env:validate           # 3. 验证配置
npm run start:dev              # 4. 启动开发服务器
```

## 📁 文件结构

```
.
├── .env.example                    # ✅ 提交 - 完整模板，包含所有变量说明
├── .env.development                # ✅ 提交 - 开发环境默认值（无敏感信息）
├── .env.development.local          # ❌ 忽略 - 个人配置（包含真实密码）
├── .env.production                 # ✅ 提交 - 生产环境模板（仅占位符）
├── .env.production.local           # ❌ 忽略 - 生产环境实际值
├── .env.test                       # ✅ 提交 - 单元测试配置
├── .env.e2e                        # ✅ 提交 - E2E 测试配置
└── scripts/
    ├── setup-env.sh                # 环境初始化脚本
    └── validate-env.js             # 环境验证脚本
```

## 🔧 NPM 脚本

### 环境管理
```bash
npm run env:setup              # 创建 .env.development.local
npm run env:setup:dev          # 创建开发环境文件
npm run env:setup:prod         # 创建生产环境文件
npm run env:setup:test         # 创建测试环境文件
npm run env:setup:e2e          # 创建 E2E 测试文件
npm run env:validate           # 验证当前环境变量
```

### 开发与构建
```bash
npm run start:dev              # 开发模式 (NODE_ENV=development)
npm run start:debug            # 调试模式
npm run start:prod             # 生产模式 (NODE_ENV=production)
npm run build                  # 编译 TypeScript
```

### 测试
```bash
npm run test                   # 单元测试 (NODE_ENV=test)
npm run test:watch             # 监听模式
npm run test:cov               # 测试覆盖率
npm run test:e2e               # E2E 测试 (NODE_ENV=e2e)
```

## 🔐 必需的环境变量

```env
# 数据库（Prisma + PostgreSQL）
DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"

# 缓存（Redis）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                # 可选，本地开发通常为空
REDIS_DB=0                     # 0=dev, 1=test, 2=e2e
```

## ⚙️ 可选的环境变量

```env
# 应用配置
NODE_ENV=development           # development | production | test
PORT=3000                      # 应用端口
LOG_LEVEL=debug                # debug | info | warn | error

# API 配置
API_PREFIX=api/v1              # API 路径前缀
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# 认证（如需要）
JWT_SECRET=your-secret-key     # JWT 签名密钥
JWT_EXPIRES_IN=7d              # JWT 过期时间

# 速率限制
RATE_LIMIT_TTL=60              # 限流窗口（秒）
RATE_LIMIT_MAX=100             # 最大请求数
```

## 📊 加载优先级

```
优先级（从高到低）：
1. 系统环境变量（部署平台注入）
2. .env.{NODE_ENV}.local       ← 个人配置
3. .env.{NODE_ENV}             ← 团队默认值
4. .env                        ← 全局后备（不推荐）
```

**示例：**
- 开发环境：`.env.development.local` > `.env.development` > `.env`
- 生产环境：系统环境变量 > `.env.production.local` (不使用文件)

## 🌍 不同环境配置

### Development（开发）
```env
DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/nestjs_dev?schema=public"
REDIS_DB=0
LOG_LEVEL=debug
```

### Test（单元测试）
```env
DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/nestjs_test?schema=public"
REDIS_DB=1
LOG_LEVEL=error
PORT=3001
```

### E2E（端到端测试）
```env
DATABASE_URL="postgresql://e2e_user:e2e_pass@localhost:5432/nestjs_e2e?schema=public"
REDIS_DB=2
LOG_LEVEL=warn
PORT=3002
```

### Production（生产）
```env
# ⚠️ 生产环境不使用文件，通过部署平台注入
DATABASE_URL="postgresql://prod_user:REAL_PASSWORD@prod-host:5432/nestjs_prod?schema=public&sslmode=require"
REDIS_PASSWORD=REAL_REDIS_PASSWORD
LOG_LEVEL=info
```

## ✅ 验证检查项

运行 `npm run env:validate` 将检查：

- ✅ 必需变量是否存在
- ✅ 推荐变量提醒
- ✅ 占位符值检测
- ✅ 生产环境 SSL 配置
- ✅ 生产环境密码设置

## 🔍 常见场景

### 添加新的环境变量
1. 在 `.env.example` 中添加变量和说明
2. 在相应的 `.env.<environment>` 中添加默认值
3. 更新 `src/config/configuration.ts` 读取该变量
4. 如果是必需变量，添加到验证列表
5. 更新文档

### 切换环境
```bash
# 开发环境
npm run start:dev

# 测试环境
npm run test

# 生产环境
NODE_ENV=production npm run start:prod
```

### Docker 部署
```dockerfile
# Dockerfile
ENV NODE_ENV=production
# 不要复制 .env 文件到镜像

# 运行时通过 -e 注入
docker run -e DATABASE_URL="..." -e REDIS_HOST="..." myapp
```

### 重置环境配置
```bash
# 删除本地配置
rm .env.development.local

# 重新初始化
npm run env:setup
```

## 📚 详细文档

- **完整设计**: `doc/env-structure-design.md`
- **更新说明**: `doc/ENV_UPDATE_SUMMARY.md`
- **项目指南**: `CLAUDE.md`

## 🆘 故障排查

### 应用启动失败
```bash
# 1. 检查环境变量文件是否存在
ls -la .env*

# 2. 验证配置
npm run env:validate

# 3. 检查变量是否正确加载
NODE_ENV=development node -e "require('dotenv').config({path:'.env.development.local'}); console.log(process.env.DATABASE_URL)"
```

### 测试失败
```bash
# 确保使用独立的测试数据库
cat .env.test | grep DATABASE_URL

# 测试数据库应该不同于开发数据库
# ❌ nestjs_dev
# ✅ nestjs_test
```

### 生产环境配置
```bash
# ⚠️ 生产环境不要使用 .env 文件
# 使用部署平台注入环境变量：

# Kubernetes Secret
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL="..." \
  --from-literal=REDIS_PASSWORD="..."

# Docker Compose
environment:
  - DATABASE_URL=${DATABASE_URL}
  - REDIS_PASSWORD=${REDIS_PASSWORD}
```

---

**最后更新**: 2025-10-25
**维护者**: Development Team
