# 环境变量更新说明

## 更新日期
2025-10-25

## 概述

本次更新为项目实施了完整的**分层环境变量管理系统**，支持多环境配置（development, production, test, e2e），遵循安全最佳实践和 SOLID 原则。

## 主要变更

### 1. 文档更新

#### `doc/env-structure-design.md` ✨ 新增/更新
- 完整的环境变量设计文档
- 针对 NestJS 单体项目优化（非 monorepo）
- 包含 Docker、CI/CD 集成指南
- 详细的安全考虑和最佳实践

### 2. 环境变量文件

#### 新增文件（已提交到代码库）：
- `.env.development` - 开发环境默认配置（无敏感信息）
- `.env.production` - 生产环境模板（使用占位符）
- `.env.test` - 单元测试环境配置
- `.env.e2e` - E2E 测试环境配置

#### 更新文件：
- `.env.example` - 增强的模板，包含详细注释和所有可选配置

#### Gitignore 策略：
- `.env` - 忽略
- `.env.local` - 忽略
- `.env.*.local` - 忽略（本地覆盖文件）
- `.env.development`, `.env.production`, `.env.test`, `.env.e2e` - **提交**

### 3. 脚本工具

#### `scripts/setup-env.sh` ✨ 新增
快速初始化环境变量文件的 Shell 脚本

**用法：**
```bash
npm run env:setup           # 默认创建 development 环境
npm run env:setup:dev       # 开发环境
npm run env:setup:prod      # 生产环境
npm run env:setup:test      # 测试环境
npm run env:setup:e2e       # E2E 测试环境
```

**功能：**
- 检查模板文件是否存在
- 创建环境特定配置文件
- 创建本地覆盖文件（*.local）
- 提供后续操作指引

#### `scripts/validate-env.js` ✨ 新增
环境变量验证脚本

**用法：**
```bash
npm run env:validate
```

**检查项：**
- 必需变量是否存在
- 推荐变量提醒
- 占位符值检测（非开发环境）
- 生产环境特殊检查（SSL、密码等）

### 4. Package.json 更新

#### 新增脚本：
```json
{
  "env:setup": "sh scripts/setup-env.sh",
  "env:setup:dev": "sh scripts/setup-env.sh development",
  "env:setup:prod": "sh scripts/setup-env.sh production",
  "env:setup:test": "sh scripts/setup-env.sh test",
  "env:setup:e2e": "sh scripts/setup-env.sh e2e",
  "env:validate": "node scripts/validate-env.js"
}
```

#### 更新现有脚本：
所有测试和启动脚本现在显式设置 `NODE_ENV`：
```json
{
  "start:dev": "NODE_ENV=development nest start --watch",
  "start:prod": "NODE_ENV=production node dist/main",
  "test": "NODE_ENV=test jest",
  "test:e2e": "NODE_ENV=e2e jest --config ./test/jest-e2e.json"
}
```

### 5. 代码更新

#### `src/app.module.ts` 更新
实现分层环境变量加载：

```typescript
ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
  envFilePath: [
    `.env.${process.env.NODE_ENV}.local`,
    `.env.${process.env.NODE_ENV}`,
    '.env',
  ],
  ignoreEnvFile: process.env.NODE_ENV === 'production',
})
```

#### `src/config/configuration.ts` 重构
- 添加环境变量验证
- 扩展配置对象结构
- 新增 logging、api、jwt 配置段
- 详细的文档注释

**新增配置字段：**
```typescript
{
  port: number,
  nodeEnv: string,           // ← 新增
  database: { url: string },
  redis: { host, port, password, db },
  logging: { level: string }, // ← 新增
  api: { prefix, corsOrigin },// ← 新增
  jwt: { secret, expiresIn }, // ← 新增
}
```

### 6. CLAUDE.md 更新

#### 新增章节：
- **Environment Setup** - 完整的快速开始指南
- **Environment File Strategy** - 文件策略说明
- **Validation** - 验证流程说明

#### 更新章节：
- **Configuration Management** - 详细的分层加载策略说明
- **Essential Commands** - 新增环境变量相关命令

## 使用指南

### 新开发者加入项目

```bash
# 1. 克隆项目
git clone <repository-url>
cd nestjs-prisma-backend

# 2. 安装依赖
npm install

# 3. 初始化环境变量
npm run env:setup

# 4. 编辑配置（添加真实的数据库密码等）
vim .env.development.local

# 5. 验证配置
npm run env:validate

# 6. 初始化数据库
npm run prisma:generate
npm run prisma:migrate

# 7. 启动开发服务器
npm run start:dev
```

### 环境切换

```bash
# 开发环境（默认）
npm run start:dev

# 生产环境
NODE_ENV=production npm run start:prod

# 测试环境
npm run test

# E2E 测试
npm run test:e2e
```

### 添加新的环境变量

1. 在 `.env.example` 中添加变量和注释
2. 在对应的 `.env.<environment>` 文件中添加默认值
3. 更新 `src/config/configuration.ts` 以读取该变量
4. 如果是必需变量，添加到验证列表中
5. 更新文档（`CLAUDE.md` 和 `doc/env-structure-design.md`）

## 安全性改进

### 敏感信息隔离
- ✅ 所有 `.env.*.local` 文件被 gitignore
- ✅ 生产环境密钥不出现在代码库中
- ✅ `.env.production` 仅包含占位符

### 验证机制
- ✅ 启动时验证必需变量
- ✅ 检测占位符值
- ✅ 生产环境特殊检查（SSL、密码等）

### 最小权限
- ✅ 不同环境使用不同的数据库
- ✅ Redis 使用不同的 DB 编号隔离
- ✅ 测试环境用户权限受限

## 设计原则应用

### KISS (Keep It Simple, Stupid)
- 单体项目只需根目录管理环境变量
- 避免复杂的多层嵌套
- 清晰的文件命名约定

### DRY (Don't Repeat Yourself)
- `.env.example` 作为唯一模板源
- 全局配置模块，各服务通过依赖注入获取
- 避免重复的配置定义

### SOLID 原则
- **Single Responsibility**: 配置模块只负责配置管理
- **Dependency Inversion**: 服务依赖 ConfigService 抽象
- **Open/Closed**: 可扩展新环境而不修改现有代码

## 兼容性说明

### 向后兼容
- ✅ 现有的 `.env` 文件仍然有效（作为后备）
- ✅ 未设置 NODE_ENV 时默认使用 development
- ✅ 所有现有环境变量继续工作

### 迁移建议
1. 运行 `npm run env:setup` 创建新文件
2. 将现有 `.env` 内容复制到 `.env.development.local`
3. 验证配置：`npm run env:validate`
4. 测试应用启动
5. 删除旧的 `.env` 文件（可选）

## 下一步优化建议

### 短期（可选）
- [ ] 安装 `cross-env` 支持 Windows 系统
- [ ] 添加 `class-validator` 验证配置类型
- [ ] 创建 Docker Compose 配置示例

### 中期（根据需求）
- [ ] 实现 JWT 认证功能
- [ ] 添加日志级别配置
- [ ] 实现 CORS 配置
- [ ] 添加请求频率限制

### 长期（根据需求）
- [ ] 集成 Vault 或 AWS Secrets Manager
- [ ] 实现配置热重载
- [ ] 添加配置变更审计日志

## 参考资料

- **完整设计文档**: `doc/env-structure-design.md`
- **项目配置指南**: `CLAUDE.md`
- **环境变量模板**: `.env.example`
- **NestJS 配置文档**: https://docs.nestjs.com/techniques/configuration

## 常见问题

### Q: 为什么有这么多环境变量文件？
A: 分层设计确保：
- 团队成员共享默认配置（`.env.development`）
- 个人敏感信息本地化（`.env.development.local`）
- 不同环境隔离（development, production, test, e2e）

### Q: 生产环境应该使用哪个文件？
A: **不应该使用文件**。生产环境通过部署平台（Kubernetes Secrets、Docker Swarm、AWS Parameter Store）注入环境变量。

### Q: .env 和 .env.development 有什么区别？
A:
- `.env` 是全局后备文件（不推荐使用）
- `.env.development` 是开发环境专用配置
- 优先级：`.env.development.local` > `.env.development` > `.env`

### Q: 如何在 Windows 上运行？
A: 安装 `cross-env` 包：
```bash
npm install -D cross-env
```

然后更新 package.json：
```json
"start:dev": "cross-env NODE_ENV=development nest start --watch"
```

---

**更新完成时间**: 2025-10-25
**相关 Issue**: N/A
**负责人**: Claude Code Assistant
