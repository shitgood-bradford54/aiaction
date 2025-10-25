# NPM Scripts 使用规范

## ⚠️ 重要提示

本项目已统一使用 **DX CLI** 作为命令管理工具。

**推荐使用**: `./scripts/dx <command>`
**不推荐**: 直接使用 `npm run <script>`

## 为什么使用 DX CLI?

1. **统一接口** - 所有命令通过 dx 统一管理
2. **智能环境管理** - 自动加载正确的环境变量
3. **安全机制** - 危险操作自动确认
4. **端口管理** - 自动处理端口冲突
5. **更好的错误提示** - 友好的错误信息和建议

## 命令对照表

### ✅ 推荐用法 (使用 DX CLI)

| DX CLI 命令 | 说明 |
|------------|------|
| `./scripts/dx start dev` | 启动开发服务器 |
| `./scripts/dx start debug` | 启动调试服务器 |
| `./scripts/dx start prod` | 启动生产服务器 |
| `./scripts/dx build --dev` | 构建开发版本 |
| `./scripts/dx build --prod` | 构建生产版本 |
| `./scripts/dx db generate` | 生成 Prisma Client |
| `./scripts/dx db migrate --dev` | 数据库迁移 (开发) |
| `./scripts/dx db migrate --prod` | 数据库迁移 (生产) |
| `./scripts/dx db reset --dev` | 重置数据库 (开发) |
| `./scripts/dx db studio` | 打开 Prisma Studio |
| `./scripts/dx db seed --dev` | 执行数据库种子 |
| `./scripts/dx test unit` | 运行单元测试 |
| `./scripts/dx test watch` | 监视模式测试 |
| `./scripts/dx test cov` | 测试覆盖率 |
| `./scripts/dx test e2e` | E2E 测试 |
| `./scripts/dx lint` | 代码检查 |
| `./scripts/dx format` | 代码格式化 |
| `./scripts/dx env setup --dev` | 设置开发环境 |
| `./scripts/dx env validate` | 验证环境变量 |
| `./scripts/dx clean dist` | 清理构建产物 |
| `./scripts/dx clean deps` | 重装依赖 |

### ⚠️ 底层命令 (由 DX 调用，不建议直接使用)

以下命令是底层实现,由 DX CLI 内部调用,**不建议直接使用**:

| NPM Script | 用途 | 为什么不建议直接用 |
|-----------|------|------------------|
| `npm run build` | 构建 | 缺少环境变量管理 |
| `npm run start:dev` | 启动开发 | 缺少端口冲突处理 |
| `npm run start:debug` | 启动调试 | 缺少端口冲突处理 |
| `npm run start:prod` | 启动生产 | 缺少环境验证 |
| `npm run lint` | 代码检查 | 缺少统一日志 |
| `npm run format` | 格式化 | 缺少统一日志 |
| `npm run test` | 测试 | 缺少环境隔离 |
| `npm run test:watch` | 监视测试 | 缺少环境隔离 |
| `npm run test:cov` | 测试覆盖率 | 缺少环境隔离 |
| `npm run test:e2e` | E2E测试 | 缺少环境隔离 |
| `npm run prisma:*` | Prisma命令 | 缺少环境管理和确认 |
| `npm run env:*` | 环境命令 | 缺少统一日志 |

## DX CLI 优势对比

### 使用 npm run (❌ 不推荐)

```bash
# 需要手动管理环境变量
NODE_ENV=development npm run start:dev

# 需要手动清理端口
lsof -ti :3000 | xargs kill -9
npm run start:dev

# 危险操作没有确认
npm run prisma:migrate  # 可能误操作

# 错误信息不友好
npm run test  # 失败后难以定位问题
```

### 使用 DX CLI (✅ 推荐)

```bash
# 自动管理环境变量
./scripts/dx start dev

# 自动清理端口冲突
./scripts/dx start dev  # 自动处理

# 危险操作自动确认
./scripts/dx db reset --dev  # 会要求确认

# 友好的错误提示
./scripts/dx test unit  # 详细的错误信息和建议
```

## 特殊情况

### 何时可以直接使用 npm scripts?

只在以下情况下可以考虑直接使用:

1. **CI/CD 环境** - 但仍建议使用 DX CLI with `-Y` 标志
2. **调试 npm 包问题** - 需要排查 npm 本身的问题
3. **DX CLI 不可用** - 系统出现问题时的临时方案

即使在这些情况下,也建议优先使用 DX CLI:

```bash
# CI/CD 中使用 DX CLI
./scripts/dx db migrate --prod -Y
./scripts/dx test unit

# 调试问题时使用详细模式
./scripts/dx build --dev -v
```

## 快速参考

### 日常开发

```bash
# 启动开发
./scripts/dx start dev

# 代码检查
./scripts/dx lint

# 运行测试
./scripts/dx test unit
```

### 数据库操作

```bash
# 生成客户端
./scripts/dx db generate

# 迁移
./scripts/dx db migrate --dev

# 重置 (需确认)
./scripts/dx db reset --dev
```

### 环境管理

```bash
# 设置环境
./scripts/dx env setup --dev

# 验证环境
./scripts/dx env validate
```

## 获取帮助

```bash
# 查看所有命令
./scripts/dx --help

# 查看详细文档
cat scripts/README.md

# 快速入门
cat scripts/QUICKSTART.md
```

## 团队规范

### ✅ DO (推荐做法)

- 统一使用 `./scripts/dx` 命令
- 使用环境标志 (--dev, --prod, --test, --e2e)
- 危险操作使用 `-Y` 标志 (明确意图)
- 遇到问题使用 `-v` 详细模式

### ❌ DON'T (避免做法)

- 不直接使用 `npm run` 命令
- 不手动管理环境变量
- 不手动清理端口
- 不跳过危险操作确认 (除非在 CI 中)

## 迁移指南

### 旧习惯 → 新习惯

```bash
# 旧习惯 (❌)
npm run start:dev
npm run build
npm run test
npm run prisma:migrate

# 新习惯 (✅)
./scripts/dx start dev
./scripts/dx build --dev
./scripts/dx test unit
./scripts/dx db migrate --dev
```

### IDE 配置

**VS Code** - 更新 tasks.json:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev",
      "type": "shell",
      "command": "./scripts/dx start dev"
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "./scripts/dx test unit"
    }
  ]
}
```

**WebStorm** - 更新 Run Configurations:
- Type: Shell Script
- Script: `./scripts/dx start dev`

## 总结

**核心原则**: 统一使用 DX CLI,享受更好的开发体验!

如有问题,请查看:
- **完整文档**: `scripts/README.md`
- **快速入门**: `scripts/QUICKSTART.md`
- **项目指南**: `CLAUDE.md`
