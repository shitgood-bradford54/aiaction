# 环境变量分层结构设计

## 设计原则

1. **分层管理**：全局 → 环境特定 → 本地覆盖
2. **环境分离**：development, production, test, e2e 独立配置
3. **安全性**：敏感信息本地化，模板文件提交
4. **一致性**：统一的变量命名和加载方式

## 目录结构

```
nestjs-prisma-backend/
├── .env.example                  # 环境变量模板（提交到代码库）
├── .env.development              # 开发环境变量（提交到代码库，不含敏感信息）
├── .env.development.local        # 开发环境本地覆盖（不提交，包含敏感信息）
├── .env.production               # 生产环境变量模板（提交到代码库，不含真实值）
├── .env.production.local         # 生产环境实际配置（不提交，部署时注入）
├── .env.test                     # 单元测试环境变量（提交到代码库）
├── .env.test.local               # 单元测试本地覆盖（不提交）
├── .env.e2e                      # E2E测试环境变量（提交到代码库）
├── .env.e2e.local                # E2E测试本地覆盖（不提交）
├── src/
│   └── config/
│       └── configuration.ts      # 配置定义和验证
└── scripts/
    ├── setup-env.sh              # 环境变量初始化脚本
    └── validate-env.js           # 环境变量验证脚本
```

## 变量分类

### 核心环境变量

#### 应用基础配置

- `NODE_ENV`: 运行环境标识 (development | production | test)
- `PORT`: 应用服务端口（默认：3000）

#### 数据库配置（Prisma）

- `DATABASE_URL`: PostgreSQL 连接字符串
  - 格式：`postgresql://username:password@host:port/database?schema=public`
  - 开发环境：本地数据库
  - 测试环境：测试专用数据库
  - 生产环境：生产数据库（需高可用配置）

#### 缓存配置（Redis）

- `REDIS_HOST`: Redis 主机地址
- `REDIS_PORT`: Redis 端口（默认：6379）
- `REDIS_PASSWORD`: Redis 密码（可选）
- `REDIS_DB`: Redis 数据库编号（默认：0）

#### 扩展配置（可选）

- `JWT_SECRET`: JWT 签名密钥（如需身份认证）
- `JWT_EXPIRES_IN`: JWT 过期时间（如：7d、24h）
- `API_PREFIX`: 全局 API 路径前缀（如：api/v1）
- `LOG_LEVEL`: 日志级别（debug | info | warn | error）
- `CORS_ORIGIN`: CORS 允许的源（逗号分隔）
- `RATE_LIMIT_TTL`: 请求频率限制窗口（秒）
- `RATE_LIMIT_MAX`: 请求频率限制次数

## 环境特定配置

### Development（开发环境）

```env
NODE_ENV=development
PORT=3000

# 本地数据库
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/nestjs_dev?schema=public"

# 本地 Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 开发调试
LOG_LEVEL=debug
```

### Production（生产环境）

```env
NODE_ENV=production
PORT=3000

# 生产数据库（实际值通过 .env.production.local 或部署系统注入）
DATABASE_URL="postgresql://prod_user:REPLACE_WITH_REAL_PASSWORD@prod-db-host:5432/nestjs_prod?schema=public"

# 生产 Redis
REDIS_HOST=prod-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=REPLACE_WITH_REAL_PASSWORD
REDIS_DB=0

# 生产配置
LOG_LEVEL=info
```

### Test（单元测试环境）

```env
NODE_ENV=test
PORT=3001

# 测试数据库（内存数据库或独立测试库）
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/nestjs_test?schema=public"

# 测试 Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1

# 测试配置
LOG_LEVEL=error
```

### E2E（端到端测试环境）

```env
NODE_ENV=test
PORT=3002

# E2E 测试数据库
DATABASE_URL="postgresql://e2e_user:e2e_password@localhost:5432/nestjs_e2e?schema=public"

# E2E Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=2

# E2E 配置
LOG_LEVEL=warn
```

## 加载优先级

NestJS 使用 `@nestjs/config` 加载环境变量，优先级从高到低：

1. **环境变量**（系统级或部署平台注入，最高优先级）
2. `.env.<NODE_ENV>.local`（本地覆盖，不提交到代码库）
3. `.env.<NODE_ENV>`（环境特定配置，提交到代码库）
4. `.env`（默认配置，不推荐使用）

**示例：**
- 开发环境：`.env.development.local` > `.env.development` > 系统环境变量
- 生产环境：部署平台注入的环境变量 > `.env.production.local` > `.env.production`

**推荐做法：**
- `.env.example`: 提供完整的变量模板和说明
- `.env.development`: 提交到代码库，包含本地开发默认值（无敏感信息）
- `.env.development.local`: 开发者个人配置，不提交（包含真实密码）
- `.env.production`: 提交到代码库，包含变量占位符
- `.env.production.local`: 不提交，生产环境通过部署系统注入

## 工具链集成

### NestJS ConfigModule 配置

在 `src/app.module.ts` 中：

```typescript
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env',
      ],
      ignoreEnvFile: process.env.NODE_ENV === 'production', // 生产环境建议使用系统环境变量
    }),
    // ... 其他模块
  ],
})
export class AppModule {}
```

### Package.json Scripts

```json
{
  "scripts": {
    "start:dev": "NODE_ENV=development nest start --watch",
    "start:prod": "NODE_ENV=production node dist/main",
    "test": "NODE_ENV=test jest",
    "test:e2e": "NODE_ENV=e2e jest --config ./test/jest-e2e.json",
    "env:setup": "sh scripts/setup-env.sh",
    "env:validate": "node scripts/validate-env.js"
  }
}
```

### 使用 cross-env（跨平台兼容）

为了在 Windows 和 Unix 系统上一致工作，推荐使用 `cross-env`：

```bash
npm install -D cross-env
```

```json
{
  "scripts": {
    "start:dev": "cross-env NODE_ENV=development nest start --watch",
    "start:prod": "cross-env NODE_ENV=production node dist/main",
    "test": "cross-env NODE_ENV=test jest",
    "test:e2e": "cross-env NODE_ENV=e2e jest --config ./test/jest-e2e.json"
  }
}
```

### Docker Integration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 不要将 .env 文件复制到镜像中
# 环境变量应通过 docker run -e 或 docker-compose 注入

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production.local  # 本地开发/测试用
    environment:
      # 或直接在此定义环境变量（优先级更高）
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
```

## 安全考虑

1. **敏感信息隔离**
   - 生产环境密钥、密码不出现在代码库中
   - 使用 `.env.*.local` 文件存储本地敏感配置
   - 生产环境通过部署平台（如 Kubernetes Secrets、AWS Parameter Store）注入环境变量

2. **模板文件机制**
   - `.env.example` 提供完整的配置示例和说明
   - 所有变量使用占位符（如 `REPLACE_WITH_REAL_VALUE`）
   - 新开发者通过 `cp .env.example .env.development.local` 快速初始化

3. **本地覆盖策略**
   - `.gitignore` 必须包含 `*.local` 文件
   - 开发者可以安全地在 `.local` 文件中覆盖配置
   - 不影响团队其他成员的配置

4. **环境验证**
   - 应用启动前验证必要变量是否存在
   - 使用 `class-validator` 和 `class-transformer` 验证配置类型
   - 示例：`src/config/configuration.ts` 中添加验证逻辑

5. **最小权限原则**
   - 测试环境数据库用户仅有测试库权限
   - 开发环境用户不应访问生产数据
   - Redis 使用不同的 DB 编号隔离环境

## 初始化流程

### 1. 首次设置（新开发者）

```bash
# 1. 克隆项目
git clone <repository-url>
cd nestjs-prisma-backend

# 2. 安装依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env.development.local

# 4. 编辑配置文件，填入真实值
vim .env.development.local

# 5. 生成 Prisma Client
npm run prisma:generate

# 6. 运行数据库迁移
npm run prisma:migrate

# 7. 启动开发服务器
npm run start:dev
```

### 2. 环境变量验证脚本

创建 `scripts/setup-env.sh`：

```bash
#!/bin/bash
set -e

ENV=${1:-development}

echo "Setting up environment: $ENV"

# 检查模板文件
if [ ! -f .env.example ]; then
  echo "Error: .env.example not found"
  exit 1
fi

# 检查环境特定文件
if [ ! -f .env.$ENV ]; then
  echo "Creating .env.$ENV from template..."
  cp .env.example .env.$ENV
  echo "Please edit .env.$ENV and add your configuration"
fi

# 检查本地覆盖文件
if [ ! -f .env.$ENV.local ]; then
  echo "Creating .env.$ENV.local from template..."
  cp .env.example .env.$ENV.local
  echo "Please edit .env.$ENV.local with sensitive values"
fi

echo "Environment setup complete!"
echo "Next steps:"
echo "  1. Edit .env.$ENV.local with your configuration"
echo "  2. Run 'npm run prisma:generate'"
echo "  3. Run 'npm run prisma:migrate'"
echo "  4. Run 'npm run start:dev'"
```

### 3. 环境变量验证脚本

创建 `scripts/validate-env.js`：

```javascript
const fs = require('fs');
const path = require('path');

const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
];

const envFile = process.env.NODE_ENV
  ? `.env.${process.env.NODE_ENV}.local`
  : '.env.development.local';

const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envFile} not found`);
  console.error('Run: npm run env:setup');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const missingVars = requiredVars.filter(
  varName => !envContent.includes(`${varName}=`)
);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:');
  missingVars.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
}

console.log('✓ Environment variables validated successfully');
```

## 配置定义与类型安全

更新 `src/config/configuration.ts` 以支持环境验证：

```typescript
import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsEnum, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  REDIS_PASSWORD?: string;

  @IsNumber()
  REDIS_DB: number;
}

function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

export default registerAs('app', () => {
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT, 10) || 3000,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: parseInt(process.env.REDIS_DB, 10) || 0,
  };

  return validate(config);
});
```

## 总结

本设计遵循以下原则：

1. **KISS（保持简单）**：单体项目只需根目录管理环境变量，避免复杂的多层嵌套
2. **DRY（避免重复）**：使用 `.env.example` 作为唯一模板源，其他文件从此派生
3. **SOLID**：配置模块全局化，各服务通过依赖注入获取配置，符合依赖倒置原则
4. **安全性**：敏感信息通过 `.local` 文件和 `.gitignore` 隔离，永不提交
5. **可维护性**：清晰的文件命名和验证脚本，降低新成员上手难度
