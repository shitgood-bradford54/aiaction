# DX CLI 工具

## 概述

DX CLI 是本项目的统一管理工具,参考了 monorepo 项目的最佳实践,提供了一致的命令行接口来管理开发环境。

## 核心特性

### 1. 统一的命令接口
- 所有项目操作通过 `./scripts/dx` 统一执行
- 替代分散的 npm scripts,提供更好的一致性
- 支持环境标志控制不同环境的行为

### 2. 智能环境管理
- 自动加载分层环境变量 (.env.{environment}.local)
- 支持开发、生产、测试、E2E 多环境
- 环境变量验证和提示

### 3. 安全确认机制
- 危险操作(如数据库重置)需要确认
- 支持 `-Y` 标志跳过确认
- CI 环境自动跳过确认 (CI=true)

### 4. 端口冲突处理
- 自动检测端口占用
- 自动清理冲突端口
- 确保服务正常启动

## 快速开始

```bash
# 查看帮助
./scripts/dx --help

# 启动开发服务器
./scripts/dx start dev

# 数据库迁移
./scripts/dx db migrate --dev

# 运行测试
./scripts/dx test unit
```

## 命令参考

### 服务管理

```bash
# 启动开发服务器
./scripts/dx start dev

# 启动调试服务器
./scripts/dx start debug

# 启动生产服务器
./scripts/dx start prod
```

### 构建操作

```bash
# 构建应用 (开发环境)
./scripts/dx build

# 构建生产版本
./scripts/dx build --prod
```

### 数据库操作

```bash
# 生成 Prisma Client
./scripts/dx db generate

# 执行数据库迁移
./scripts/dx db migrate --dev         # 开发环境
./scripts/dx db migrate --prod        # 生产环境

# 重置数据库
./scripts/dx db reset --dev           # 需要确认
./scripts/dx db reset --dev -Y        # 跳过确认

# 打开 Prisma Studio
./scripts/dx db studio

# 执行数据库种子
./scripts/dx db seed --dev
```

### 测试

```bash
# 运行单元测试
./scripts/dx test unit

# 运行 E2E 测试
./scripts/dx test e2e

# 运行测试并生成覆盖率报告
./scripts/dx test cov

# 监视模式运行测试
./scripts/dx test watch
```

### 代码质量

```bash
# 代码检查
./scripts/dx lint

# 代码格式化
./scripts/dx format
```

### 环境管理

```bash
# 设置开发环境
./scripts/dx env setup --dev

# 设置生产环境
./scripts/dx env setup --prod

# 验证环境变量
./scripts/dx env validate
```

### 清理操作

```bash
# 清理构建产物
./scripts/dx clean dist

# 重新安装依赖
./scripts/dx clean deps

# 清理所有
./scripts/dx clean all -Y
```

## 环境标志

### 可用标志

- `--dev` 或 `--development` - 开发环境 (默认)
- `--prod` 或 `--production` - 生产环境
- `--test` - 测试环境
- `--e2e` - E2E 测试环境
- `-Y` 或 `--yes` - 跳过所有确认提示
- `-v` 或 `--verbose` - 详细输出
- `-h` 或 `--help` - 显示帮助信息

### 环境变量自动加载

DX CLI 会根据环境标志自动加载对应的环境变量:

- `--dev`: 加载 `.env.development` 和 `.env.development.local`
- `--prod`: 加载 `.env.production` 和 `.env.production.local`
- `--test`: 加载 `.env.test` 和 `.env.test.local`
- `--e2e`: 加载 `.env.e2e` 和 `.env.e2e.local`

## CI 集成

### 自动确认

在 CI 环境中,可以通过以下方式自动跳过确认:

```bash
# 方式 1: 设置 CI 环境变量
CI=true ./scripts/dx db reset --dev

# 方式 2: 设置 AI_CLI_YES 环境变量
AI_CLI_YES=1 ./scripts/dx db reset --dev

# 方式 3: 使用 -Y 标志
./scripts/dx db reset --dev -Y
```

### GitHub Actions 示例

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Setup database
        run: |
          ./scripts/dx env setup --test
          ./scripts/dx db migrate --test
        env:
          CI: true

      - name: Run tests
        run: ./scripts/dx test unit
```

## 架构

### 目录结构

```
scripts/
├── dx                      # 主入口脚本
├── lib/                    # 核心功能模块
│   ├── logger.js          # 日志输出管理
│   ├── env.js             # 环境管理和检测
│   ├── exec.js            # 命令执行和进程管理
│   └── confirm.js         # 用户确认交互
├── config/                # 配置文件
│   ├── commands.json      # 命令映射配置
│   └── env-layers.json    # 环境变量层级配置
└── logs/                  # 日志存储目录
```

### 核心模块

#### Logger (logger.js)
- 统一的日志输出格式
- 支持不同日志级别 (info, success, warn, error, debug)
- 可选的文件日志记录
- 防止管道错误崩溃

#### EnvManager (env.js)
- 环境检测和切换
- 分层环境变量加载
- 环境描述和映射
- 环境文件解析

#### ExecManager (exec.js)
- 统一的命令执行接口
- 进程管理和清理
- 端口冲突检测和处理
- 信号处理 (SIGINT, SIGTERM)

#### ConfirmManager (confirm.js)
- 用户确认交互
- 危险操作二次确认
- CI 环境自动确认
- 自定义确认逻辑

### 配置文件

#### commands.json
定义所有可用命令及其配置:
- 命令执行字符串
- 端口占用信息
- 危险操作标记
- 命令描述

#### env-layers.json
定义环境变量加载层级:
- 各环境的文件列表
- 加载优先级顺序

## 扩展

### 添加新命令

1. 在 `scripts/config/commands.json` 中添加命令配置:

```json
{
  "mycommand": {
    "command": "echo 'Hello'",
    "description": "我的自定义命令"
  }
}
```

2. 在 `scripts/dx` 中添加路由处理:

```javascript
async routeCommand() {
  // ...
  case 'mycommand':
    await this.handleMyCommand(subArgs)
    break
  // ...
}

async handleMyCommand(args) {
  logger.step('执行我的命令')
  await this.executeCommand(this.commands.mycommand)
}
```

### 添加新环境

在 `scripts/config/env-layers.json` 中添加:

```json
{
  "staging": [
    ".env.staging",
    ".env.staging.local"
  ]
}
```

## 最佳实践

1. **优先使用 dx CLI**: 使用 `./scripts/dx` 代替直接调用 npm scripts
2. **明确指定环境**: 使用环境标志明确指定运行环境
3. **CI 中使用 -Y**: 在自动化环境中使用 `-Y` 标志跳过确认
4. **保持配置更新**: 添加新命令时同步更新配置文件
5. **使用 verbose 调试**: 遇到问题时使用 `-v` 查看详细输出

## 故障排除

### 端口被占用

```bash
# dx CLI 会自动处理端口冲突
# 如果仍有问题,可以手动清理:
lsof -ti :3000 | xargs kill -9
```

### 环境变量未加载

```bash
# 检查环境文件是否存在
ls -la .env*

# 验证环境变量
./scripts/dx env validate

# 使用 verbose 模式查看详细信息
./scripts/dx start dev -v
```

### 权限问题

```bash
# 确保 dx 脚本有执行权限
chmod +x scripts/dx
```

## 与 npm scripts 对比

### 使用 dx CLI (推荐)

优点:
- 统一的命令接口
- 智能环境管理
- 端口冲突处理
- 危险操作确认
- 详细的日志输出
- 更好的错误处理

```bash
./scripts/dx db migrate --dev
./scripts/dx start dev
```

### 使用 npm scripts (传统方式)

仍然可用,但功能较少:

```bash
npm run prisma:migrate
npm run start:dev
```

## 参考

- 参考项目: `/Users/a1/work/ai_monorepo_main/scripts`
- NestJS 文档: https://docs.nestjs.com/
- Prisma 文档: https://www.prisma.io/docs/
