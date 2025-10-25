import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaModule } from '@/prisma/prisma.module';
import configuration from '@/config/configuration';

/**
 * PostgreSQL 连接 E2E 测试
 *
 * 目的：验证应用能够成功连接到 PostgreSQL 数据库
 *
 * 测试内容：
 * 1. Prisma Client 能否正常初始化
 * 2. 数据库连接是否可用
 * 3. 能否执行基本的数据库查询
 */
describe('PostgreSQL Connection (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

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
        PrismaModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  describe('Database Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      // 执行一个简单的查询来验证连接
      const result = await prismaService.$queryRaw<Array<{ value: number }>>`SELECT 1 as value`;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should execute raw query successfully', async () => {
      // 测试原始 SQL 查询
      const result = await prismaService.$queryRaw`SELECT current_database() as db_name`;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('db_name');

      console.log(`✓ Connected to database: ${result[0].db_name}`);
    });

    it('should check database version', async () => {
      // 检查 PostgreSQL 版本
      const result = await prismaService.$queryRaw`SELECT version() as version`;

      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('version');
      expect(result[0].version).toContain('PostgreSQL');

      console.log(`✓ PostgreSQL version: ${result[0].version.split(',')[0]}`);
    });

    it('should verify schema exists', async () => {
      // 验证 schema 是否存在
      const result = await prismaService.$queryRaw<Array<{ schema_name: string }>>`
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'public'
      `;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].schema_name).toBe('public');
    });

    it('should perform basic CRUD readiness check', async () => {
      // 验证数据库支持基本的 CRUD 操作
      // 这里只检查能否执行查询，不实际创建表
      const canQuery = await prismaService.$executeRaw`SELECT 1`;

      expect(canQuery).toBeDefined();
      console.log('✓ Database is ready for CRUD operations');
    });
  });

  describe('Prisma Service', () => {
    it('should have PrismaService instance', () => {
      expect(prismaService).toBeDefined();
      expect(prismaService).toBeInstanceOf(PrismaService);
    });

    it('should connect to database on module init', async () => {
      // PrismaService 应该在模块初始化时自动连接
      // 我们通过执行一个简单查询来验证连接状态
      await expect(
        prismaService.$queryRaw`SELECT 1`
      ).resolves.toBeDefined();
    });
  });

  describe('Connection Pool', () => {
    it('should handle multiple concurrent queries', async () => {
      // 测试连接池能否处理并发查询
      const queries = Array.from({ length: 5 }, (_, i) =>
        prismaService.$queryRaw`SELECT ${i} as query_id`
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result[0].query_id).toBe(index);
      });

      console.log('✓ Connection pool handled 5 concurrent queries successfully');
    });
  });
});
