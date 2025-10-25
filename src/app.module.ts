import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './modules/users/users.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // 环境变量加载优先级: .env.{NODE_ENV}.local > .env.{NODE_ENV}
      // 不加载 .env 文件 (如存在会在启动时警告)
      envFilePath: [`.env.${process.env.NODE_ENV}.local`, `.env.${process.env.NODE_ENV}`],
      // 生产环境建议使用系统环境变量而非文件
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
