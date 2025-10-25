import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 检查是否存在 .env 文件(不应该存在)
  const envFilePath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFilePath)) {
    logger.warn(
      '⚠️  警告: 检测到 .env 文件存在,但该文件不会被加载。\n' +
        '   请使用 .env.{NODE_ENV}.local 或 .env.{NODE_ENV} 文件。\n' +
        `   当前环境: ${process.env.NODE_ENV || 'development'}\n` +
        '   建议删除 .env 文件以避免混淆。',
    );
  }

  const app = await NestFactory.create(AppModule);

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 启用 CORS
  app.enableCors();

  // Swagger API 文档配置
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('NestJS + Prisma + PostgreSQL + Redis API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger API docs: http://localhost:${port}/api`);
}
bootstrap();
