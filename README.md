# NestJS + Prisma + PostgreSQL + Redis 后端脚手架

这是一个使用最新版本技术栈构建的现代化后端服务器脚手架。

## 技术栈

- **NestJS** - 渐进式 Node.js 框架
- **Prisma** - 现代化 ORM
- **PostgreSQL** - 关系型数据库
- **Redis** - 内存数据库/缓存
- **TypeScript** - 类型安全
- **Swagger** - API 文档

## 项目结构

```
.
├── prisma/
│   └── schema.prisma        # Prisma 数据模型
├── src/
│   ├── common/              # 通用模块(过滤器、拦截器等)
│   ├── config/              # 配置文件
│   │   └── configuration.ts
│   ├── modules/             # 业务模块
│   │   └── users/           # 用户模块示例
│   ├── prisma/              # Prisma 服务
│   ├── redis/               # Redis 服务
│   ├── app.module.ts        # 根模块
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts              # 应用入口
├── test/                    # 测试文件
├── .env                     # 环境变量
├── .env.example             # 环境变量示例
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置:

```bash
cp .env.example .env
```

修改 `.env` 文件中的数据库和 Redis 连接信息。

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 4. 启动应用

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

应用将在 `http://localhost:3000` 启动。

### 5. 访问 API 文档

启动应用后,访问 Swagger API 文档:

```
http://localhost:3000/api
```

## 可用脚本

- `npm run build` - 编译项目
- `npm run start` - 启动应用
- `npm run start:dev` - 开发模式(热重载)
- `npm run start:prod` - 生产模式
- `npm run lint` - 代码检查
- `npm run format` - 代码格式化
- `npm run test` - 运行测试
- `npm run prisma:generate` - 生成 Prisma Client
- `npm run prisma:migrate` - 运行数据库迁移
- `npm run prisma:studio` - 打开 Prisma Studio

## API 端点

### 健康检查

- `GET /` - 基础健康检查
- `GET /health` - 详细健康状态

### 用户管理

- `POST /users` - 创建用户
- `GET /users` - 获取所有用户(带缓存)
- `GET /users/:id` - 获取单个用户(带缓存)
- `PATCH /users/:id` - 更新用户
- `DELETE /users/:id` - 删除用户

## 核心特性

### 1. Prisma ORM
- 类型安全的数据库访问
- 自动迁移管理
- 强大的查询构建器

### 2. Redis 缓存
- 全局 Redis 服务
- 自动缓存管理
- TTL 支持

### 3. 验证和转换
- 使用 class-validator 进行请求验证
- 使用 class-transformer 进行数据转换
- 全局验证管道

### 4. API 文档
- 自动生成 Swagger 文档
- 交互式 API 测试界面

### 5. 配置管理
- 环境变量支持
- 类型安全的配置

## 数据库设置

确保已安装并运行 PostgreSQL:

```bash
# macOS (使用 Homebrew)
brew install postgresql
brew services start postgresql

# 创建数据库
createdb mydb
```

## Redis 设置

确保已安装并运行 Redis:

```bash
# macOS (使用 Homebrew)
brew install redis
brew services start redis
```

## 开发建议

1. **遵循 SOLID 原则** - 每个模块、服务和控制器都应该有单一职责
2. **使用 DTO** - 为所有输入/输出定义数据传输对象
3. **错误处理** - 使用 NestJS 异常过滤器
4. **日志记录** - 添加适当的日志记录
5. **测试** - 为关键功能编写单元测试和 E2E 测试

## 扩展建议

- 添加身份认证(JWT、Passport)
- 实现权限控制(Guards)
- 添加日志系统(Winston)
- 集成消息队列(Bull、RabbitMQ)
- 添加文件上传功能
- 实现 GraphQL API

## 许可证

MIT
