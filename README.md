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

使用 DX CLI 快速设置环境:

```bash
# 设置开发环境
./scripts/dx env setup --dev

# 编辑本地配置
vim .env.development.local
```

或者手动创建:

```bash
cp .env.example .env.development.local
```

修改 `.env.development.local` 文件中的数据库和 Redis 连接信息。

### 3. 初始化数据库

```bash
# 生成 Prisma Client
./scripts/dx db generate

# 运行数据库迁移
./scripts/dx db migrate --dev
```

### 4. 启动应用

```bash
# 开发模式
./scripts/dx start dev

# 调试模式
./scripts/dx start debug

# 生产模式
./scripts/dx build --prod
./scripts/dx start prod
```

应用将在 `http://localhost:3000` 启动。

### 5. 访问 API 文档

启动应用后,访问 Swagger API 文档:

```
http://localhost:3000/api
```

## DX CLI - 统一命令管理工具

本项目使用 **DX CLI** 统一管理所有开发命令,提供更好的开发体验。

### 常用命令

```bash
# 查看帮助
./scripts/dx --help

# 启动服务
./scripts/dx start dev          # 开发服务器
./scripts/dx start debug        # 调试服务器

# 构建应用
./scripts/dx build --dev        # 开发版本
./scripts/dx build --prod       # 生产版本

# 数据库操作
./scripts/dx db generate        # 生成 Prisma Client
./scripts/dx db migrate --dev   # 数据库迁移
./scripts/dx db reset --dev     # 重置数据库
./scripts/dx db studio          # 打开 Prisma Studio

# 测试
./scripts/dx test unit          # 单元测试
./scripts/dx test e2e           # E2E 测试
./scripts/dx test cov           # 测试覆盖率

# 代码质量
./scripts/dx lint               # 代码检查
./scripts/dx format             # 代码格式化

# 环境管理
./scripts/dx env setup --dev    # 设置开发环境
./scripts/dx env validate       # 验证环境变量

# 清理操作
./scripts/dx clean dist         # 清理构建产物
./scripts/dx clean deps         # 重装依赖
```

### DX CLI 优势

1. **统一接口** - 所有操作通过 dx 统一管理
2. **智能环境管理** - 自动加载正确的环境变量
3. **安全机制** - 危险操作自动确认
4. **端口管理** - 自动处理端口冲突
5. **友好提示** - 详细的错误信息和建议

### 详细文档

- **快速入门**: `scripts/QUICKSTART.md`
- **完整文档**: `scripts/README.md`
- **使用规范**: `NPM_SCRIPTS.md`
- **项目指南**: `CLAUDE.md`

## 传统命令 (不推荐)

> ⚠️ **注意**: 建议使用 DX CLI 代替直接使用 npm scripts。
>
> 查看 `NPM_SCRIPTS.md` 了解为什么。

<details>
<summary>点击查看传统 npm scripts (仅供参考)</summary>

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

</details>

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

## GitHub Actions - Claude Code AI 集成

本项目集成了 GitHub Actions 自动化工作流,支持通过 Issue 评论触发 Claude Code AI 自动生成代码。

### 快速使用

1. **在 Issue 评论中触发 AI**:
   ```
   @ccai 请添加用户登录功能
   ```

2. **AI 将自动**:
   - 创建分支 `issue_<编号>`
   - 执行代码生成
   - 推送变更
   - 创建 Pull Request

### 初始配置 (一次性)

#### 1. 设置 Anthropic API Key

在仓库 Settings → Secrets and variables → Actions 中添加:
- **Name**: `ANTHROPIC_API_KEY`
- **Value**: 你的 Anthropic API Key ([获取地址](https://console.anthropic.com/))

#### 2. 设置 Personal Access Token (必需)

由于 GitHub Actions 的安全限制,默认 `GITHUB_TOKEN` **无法创建 Pull Request**。需要创建一个 PAT:

**方法 1: 自动创建 (推荐)**
```bash
# 使用 GitHub CLI 创建 token
gh auth refresh -s repo,write:discussion
```

**方法 2: 手动创建**

1. 访问 [GitHub Settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. 点击 "Generate new token"
3. 配置:
   - **Token name**: `CCAI PR Creator`
   - **Expiration**: 90 days 或更长
   - **Repository access**: 选择当前仓库
   - **Permissions**:
     - `Contents`: Read and write
     - `Pull requests`: Read and write
     - `Issues`: Read and write
4. 复制生成的 token

**添加到仓库 Secrets:**
- 进入仓库 Settings → Secrets and variables → Actions
- 点击 "New repository secret"
- **Name**: `PAT_TOKEN`
- **Secret**: 粘贴刚才复制的 token

📖 **详细指南**: 查看 [`.github/docs/setup-pat-token.md`](.github/docs/setup-pat-token.md)

### 使用示例

```markdown
# 在 Issue 评论中:

@ccai 添加用户注册功能,包含邮箱验证

@ccai 修复登录接口的性能问题

@ccai 重构用户服务,应用 SOLID 原则
```

### 工作流特性

- ✅ **并发控制**: 同一 Issue 的多个请求自动排队
- ✅ **环境隔离**: 自动配置测试数据库和 Redis
- ✅ **实时反馈**: 通过评论更新任务状态
- ✅ **智能触发**: 大小写不敏感的 `@ccai` 触发词
- ✅ **权限控制**: 只有 write/admin 权限用户可触发
- ✅ **PR 自动化**: 自动创建或更新 Pull Request

### 注意事项

1. **PAT Token 必需**: 如果未配置 `PAT_TOKEN`,工作流将在创建 PR 时失败
2. **Token 过期**: PAT 有过期时间,需要定期更新
3. **权限限制**: 只有 write 或 admin 权限的协作者可以触发工作流
4. **费用**: 使用 Anthropic API 会产生费用,请合理使用

## 扩展建议

- 添加身份认证(JWT、Passport)
- 实现权限控制(Guards)
- 添加日志系统(Winston)
- 集成消息队列(Bull、RabbitMQ)
- 添加文件上传功能
- 实现 GraphQL API

## 许可证

MIT
