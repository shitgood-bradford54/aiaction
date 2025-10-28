#!/bin/bash
set -e

# 环境变量初始化脚本
# 用途：为开发者快速设置环境变量文件

ENV=${1:-development}

echo "========================================="
echo "Environment Setup Script"
echo "========================================="
echo ""
echo "Setting up environment: $ENV"
echo ""

# 检查模板文件
if [ ! -f .env.example ]; then
  echo "❌ Error: .env.example not found"
  echo "Please ensure .env.example exists in the project root."
  exit 1
fi

# 检查环境特定文件
if [ -f .env.$ENV ]; then
  echo "✓ .env.$ENV already exists"
else
  echo "Creating .env.$ENV from template..."
  cp .env.example .env.$ENV
  echo "✓ Created .env.$ENV"
fi

# 检查本地覆盖文件
if [ -f .env.$ENV.local ]; then
  echo "✓ .env.$ENV.local already exists"
  echo ""
  echo "⚠️  Warning: .env.$ENV.local already exists."
  echo "If you want to reset it, please delete it first and run this script again."
else
  echo "Creating .env.$ENV.local from template..."
  cp .env.example .env.$ENV.local
  echo "✓ Created .env.$ENV.local"
fi

echo ""
echo "========================================="
echo "Environment setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env.$ENV.local with your configuration:"
echo "     vim .env.$ENV.local"
echo ""
echo "  2. Update database connection string (DATABASE_URL)"
echo "  3. Update Redis configuration if needed"
echo "  4. Add any additional secrets (JWT_SECRET, etc.)"
echo ""
echo "  5. Generate Prisma Client:"
echo "     pnpm run prisma:generate"
echo ""
echo "  6. Run database migrations:"
echo "     pnpm run prisma:migrate"
echo ""
echo "  7. Start the development server:"
echo "     pnpm run start:dev"
echo ""
echo "========================================="
echo ""
echo "📝 Note: .env.$ENV.local is ignored by git"
echo "   It's safe to put sensitive information there."
echo ""
