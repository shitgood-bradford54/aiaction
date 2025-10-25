import { registerAs } from '@nestjs/config';

/**
 * 应用配置定义
 *
 * 此配置对象通过 @nestjs/config 的 ConfigModule 加载
 * 支持多环境配置文件加载策略:
 * 1. .env.{NODE_ENV}.local (最高优先级,本地覆盖)
 * 2. .env.{NODE_ENV} (环境默认配置)
 *
 * 注意:
 * - 不加载 .env 文件,如存在会在启动时警告
 * - 启动前使用 `npm run env:validate` 验证必需变量
 * - 生产环境建议使用部署平台注入环境变量
 */

export default registerAs('app', () => {
  // 验证必需的环境变量
  const requiredEnvVars = ['DATABASE_URL', 'REDIS_HOST', 'REDIS_PORT'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please run: npm run env:setup',
    );
  }

  return {
    // 应用配置
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // 数据库配置
    database: {
      url: process.env.DATABASE_URL,
    },

    // Redis 配置
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
    },

    // 日志配置
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },

    // API 配置(可选)
    api: {
      prefix: process.env.API_PREFIX || '',
      corsOrigin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000'],
    },

    // JWT 配置(可选,如需认证功能)
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  };
});
