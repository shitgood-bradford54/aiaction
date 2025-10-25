import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@/config/configuration';

/**
 * 配置加载 E2E 测试
 *
 * 目的：验证环境变量是否正确加载
 */
describe('Configuration Loading (e2e)', () => {
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          envFilePath: [
            `.env.${process.env.NODE_ENV}.local`,
            `.env.${process.env.NODE_ENV}`,
            '.env',
          ],
        }),
      ],
    }).compile();

    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  describe('Environment Configuration', () => {
    it('should load NODE_ENV', () => {
      const nodeEnv = configService.get<string>('app.nodeEnv');
      expect(nodeEnv).toBeDefined();
      console.log(`✓ NODE_ENV: ${nodeEnv}`);
    });

    it('should load PORT', () => {
      const port = configService.get<number>('app.port');
      expect(port).toBeDefined();
      expect(typeof port).toBe('number');
      console.log(`✓ PORT: ${port}`);
    });

    it('should load DATABASE_URL', () => {
      const dbUrl = configService.get<string>('app.database.url');
      expect(dbUrl).toBeDefined();
      expect(dbUrl).toContain('postgresql://');
      console.log(`✓ DATABASE_URL loaded (${dbUrl.substring(0, 30)}...)`);
    });

    it('should load Redis configuration', () => {
      const redisHost = configService.get<string>('app.redis.host');
      const redisPort = configService.get<number>('app.redis.port');
      const redisDb = configService.get<number>('app.redis.db');

      expect(redisHost).toBeDefined();
      expect(redisPort).toBeDefined();
      expect(redisDb).toBeDefined();

      console.log(`✓ Redis: ${redisHost}:${redisPort} (DB: ${redisDb})`);
    });

    it('should load environment-specific configuration', () => {
      const logLevel = configService.get<string>('app.logging.level');
      expect(logLevel).toBeDefined();
      console.log(`✓ LOG_LEVEL: ${logLevel}`);
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid environment file path priority', () => {
      // 测试环境应该使用 .env.e2e 或 .env.e2e.local
      const nodeEnv = process.env.NODE_ENV;
      expect(['e2e', 'test']).toContain(nodeEnv);
      console.log(`✓ Running in ${nodeEnv} environment`);
    });

    it('should validate configuration structure', () => {
      const config = configService.get('app');
      expect(config).toBeDefined();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('redis');
      console.log('✓ Configuration structure is valid');
    });
  });
});
