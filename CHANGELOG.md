# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-01-24

### Added
- 初始化 NestJS 项目脚手架
- 集成 Prisma ORM (v5.18.0) 用于数据库管理
- 集成 PostgreSQL 作为主数据库
- 集成 Redis 用于缓存
- 配置 Swagger API 文档
- 实现全局验证管道
- 创建 Users 模块示例
  - CRUD 操作
  - Redis 缓存集成
  - 数据验证
- 配置 TypeScript 编译
- 添加 ESLint 和 Prettier 代码规范
- 配置环境变量管理
- 添加健康检查端点

### Features
- 类型安全的数据库访问
- 自动 API 文档生成
- Redis 缓存支持(带 TTL)
- 请求验证和转换
- CORS 支持
- 模块化架构

### Technical Stack
- NestJS 10.3.10
- Prisma 5.18.0
- PostgreSQL
- Redis 4.7.0
- TypeScript 5.5.4
- Swagger/OpenAPI
