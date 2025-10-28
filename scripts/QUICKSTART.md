# DX CLI 快速入门

## 5 分钟上手指南

### 1. 验证安装

```bash
# 查看帮助
./scripts/dx --help

# 或通过 pnpm
pnpm run dx -- --help
```

### 2. 首次使用

```bash
# 设置开发环境
./scripts/dx env setup --dev

# 编辑环境变量
vim .env.development.local

# 验证环境变量
./scripts/dx env validate
```

### 3. 数据库初始化

```bash
# 生成 Prisma Client
./scripts/dx db generate

# 执行迁移
./scripts/dx db migrate --dev

# (可选) 执行种子数据
./scripts/dx db seed --dev
```

### 4. 启动开发服务器

```bash
# 启动服务器
./scripts/dx start dev

# 或使用详细模式查看更多信息
./scripts/dx start dev -v
```

### 5. 常用开发命令

```bash
# 代码检查
./scripts/dx lint

# 代码格式化
./scripts/dx format

# 运行测试
./scripts/dx test unit

# 运行 E2E 测试
./scripts/dx test e2e

# 打开 Prisma Studio
./scripts/dx db studio
```

## 常见工作流

### 开发流程

```bash
# 1. 拉取最新代码
git pull

# 2. 安装/更新依赖
npm install

# 3. 更新数据库
./scripts/dx db generate
./scripts/dx db migrate --dev

# 4. 启动开发服务器
./scripts/dx start dev

# 5. 开发完成后
./scripts/dx lint                    # 检查代码
./scripts/dx format                  # 格式化
./scripts/dx test unit               # 运行测试
```

### 数据库重置

```bash
# 重置并重新迁移 (危险操作,需要确认)
./scripts/dx db reset --dev

# 跳过确认
./scripts/dx db reset --dev -Y
```

### 生产部署

```bash
# 1. 构建应用
./scripts/dx build --prod

# 2. 执行生产环境迁移 (需要确认)
./scripts/dx db migrate --prod

# 3. 启动生产服务器
./scripts/dx start prod
```

### 清理和维护

```bash
# 清理构建产物
./scripts/dx clean dist

# 重新安装依赖
./scripts/dx clean deps

# 清理所有 (包括 node_modules)
./scripts/dx clean all -Y
```

## 环境标志

### 开发环境 (默认)

```bash
./scripts/dx start dev
# 等同于
./scripts/dx start --dev
# 等同于
./scripts/dx start
```

### 生产环境

```bash
./scripts/dx build --prod
./scripts/dx db migrate --prod
./scripts/dx start --prod
```

### 测试环境

```bash
./scripts/dx test unit --test
./scripts/dx db migrate --test
```

### E2E 测试环境

```bash
./scripts/dx test e2e --e2e
./scripts/dx db migrate --e2e
```

## 技巧和窍门

### 1. 使用别名

在 `~/.bashrc` 或 `~/.zshrc` 中添加:

```bash
alias dx='./scripts/dx'
```

然后就可以直接使用:

```bash
dx start dev
dx db migrate --dev
dx test unit
```

### 2. npm scripts 快捷方式

```bash
# 添加到 package.json
"scripts": {
  "dev": "node scripts/dx start dev",
  "db:migrate": "node scripts/dx db migrate --dev",
  "db:reset": "node scripts/dx db reset --dev -Y"
}

# 使用
npm run dev
npm run db:migrate
npm run db:reset
```

### 3. 详细模式调试

遇到问题时使用 `-v` 标志:

```bash
./scripts/dx start dev -v
./scripts/dx db migrate --dev -v
```

### 4. CI 环境使用

```bash
# 自动跳过确认
CI=true ./scripts/dx db reset --dev

# 或使用 -Y 标志
./scripts/dx db reset --dev -Y
```

## 故障排除

### 权限错误

```bash
chmod +x scripts/dx
```

### 端口被占用

dx CLI 会自动清理端口,如果仍有问题:

```bash
# 查看占用端口的进程
lsof -ti :3000

# 手动清理
lsof -ti :3000 | xargs kill -9
```

### 环境变量未加载

```bash
# 检查环境文件
ls -la .env*

# 验证环境变量
./scripts/dx env validate

# 使用详细模式
./scripts/dx start dev -v
```

### Prisma Client 未生成

```bash
# 重新生成
./scripts/dx db generate

# 如果仍有问题,清理并重新生成
rm -rf node_modules/.prisma
./scripts/dx db generate
```

## 获取帮助

### 命令帮助

```bash
# 查看所有命令
./scripts/dx --help

# 查看详细文档
cat scripts/README.md
```

### 更多资源

- **项目文档**: `CLAUDE.md`
- **实施详情**: `scripts/IMPLEMENTATION.md`
- **完整指南**: `scripts/README.md`

## 下一步

- 阅读 [完整文档](README.md) 了解所有功能
- 查看 [实施总结](IMPLEMENTATION.md) 了解架构设计
- 根据团队需求自定义命令配置
