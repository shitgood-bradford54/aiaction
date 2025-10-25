import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '@/redis/redis.service';
import { RedisModule } from '@/redis/redis.module';
import configuration from '@/config/configuration';

/**
 * Redis 连接 E2E 测试
 *
 * 目的：验证应用能够成功连接到 Redis 服务器
 *
 * 测试内容：
 * 1. Redis Client 能否正常初始化
 * 2. Redis 连接是否可用
 * 3. 基本的 Redis 操作（SET、GET、DEL）
 * 4. 缓存过期功能
 * 5. Redis 信息查询
 */
describe('Redis Connection (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  const TEST_KEY_PREFIX = 'e2e:test:';
  const TEST_KEY = `${TEST_KEY_PREFIX}connection`;

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
        RedisModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    redisService = moduleFixture.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    // 清理测试数据
    const keys = await redisService.keys(`${TEST_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redisService.del(...keys);
    }

    await redisService.disconnect();
    await app.close();
  });

  describe('Redis Connection', () => {
    it('should connect to Redis server', async () => {
      // 执行 PING 命令验证连接
      const pong = await redisService.ping();

      expect(pong).toBeDefined();
      expect(pong).toBe('PONG');

      console.log('✓ Redis connection established (PING -> PONG)');
    });

    it('should get Redis server info', async () => {
      // 获取 Redis 服务器信息
      const info = await redisService.info();

      expect(info).toBeDefined();
      expect(typeof info).toBe('string');
      expect(info).toContain('redis_version');

      // 提取 Redis 版本
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      if (versionMatch) {
        console.log(`✓ Redis version: ${versionMatch[1]}`);
      }
    });

    it('should check current database', async () => {
      // 检查当前使用的数据库编号
      const config = await redisService.configGet('databases');

      expect(config).toBeDefined();
      console.log('✓ Connected to Redis database');
    });
  });

  describe('Basic Operations', () => {
    const testValue = JSON.stringify({
      message: 'E2E test data',
      timestamp: Date.now(),
    });

    afterEach(async () => {
      // 每个测试后清理
      await redisService.del(TEST_KEY);
    });

    it('should SET and GET string value', async () => {
      // 测试基本的 SET 和 GET 操作
      await redisService.set(TEST_KEY, testValue);
      const result = await redisService.get(TEST_KEY);

      expect(result).toBe(testValue);
      console.log('✓ SET and GET operations work correctly');
    });

    it('should SET with expiration (TTL)', async () => {
      // 测试带过期时间的 SET
      const ttl = 10; // 10 秒
      await redisService.set(TEST_KEY, testValue, 'EX', ttl);

      // 检查 TTL
      const remainingTtl = await redisService.ttl(TEST_KEY);
      expect(remainingTtl).toBeGreaterThan(0);
      expect(remainingTtl).toBeLessThanOrEqual(ttl);

      console.log(`✓ Key expiration set correctly (TTL: ${remainingTtl}s)`);
    });

    it('should DELETE key', async () => {
      // 测试删除操作
      await redisService.set(TEST_KEY, testValue);

      // 验证键存在
      let exists = await redisService.exists(TEST_KEY);
      expect(exists).toBe(1);

      // 删除键
      await redisService.del(TEST_KEY);

      // 验证键已删除
      exists = await redisService.exists(TEST_KEY);
      expect(exists).toBe(0);

      console.log('✓ DELETE operation works correctly');
    });

    it('should check if key EXISTS', async () => {
      // 测试 EXISTS 命令
      await redisService.set(TEST_KEY, testValue);

      const exists = await redisService.exists(TEST_KEY);
      expect(exists).toBe(1);

      await redisService.del(TEST_KEY);
      const notExists = await redisService.exists(TEST_KEY);
      expect(notExists).toBe(0);
    });
  });

  describe('Cache Operations', () => {
    const cacheKey = `${TEST_KEY_PREFIX}cache:user:123`;
    const cacheValue = JSON.stringify({
      id: 123,
      name: 'Test User',
      email: 'test@example.com',
    });

    afterEach(async () => {
      await redisService.del(cacheKey);
    });

    it('should cache and retrieve data', async () => {
      // 模拟缓存用户数据
      await redisService.set(cacheKey, cacheValue, 'EX', 300); // 5分钟缓存

      const cached = await redisService.get(cacheKey);
      expect(cached).toBe(cacheValue);

      const parsed = JSON.parse(cached);
      expect(parsed.id).toBe(123);
      expect(parsed.name).toBe('Test User');

      console.log('✓ Cache storage and retrieval works correctly');
    });

    it('should handle cache invalidation', async () => {
      // 设置缓存
      await redisService.set(cacheKey, cacheValue, 'EX', 300);

      // 验证缓存存在
      let cached = await redisService.get(cacheKey);
      expect(cached).toBe(cacheValue);

      // 清除缓存
      await redisService.del(cacheKey);

      // 验证缓存已清除
      cached = await redisService.get(cacheKey);
      expect(cached).toBeNull();

      console.log('✓ Cache invalidation works correctly');
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(async () => {
      // 创建测试数据
      await redisService.set(`${TEST_KEY_PREFIX}user:1`, 'User 1');
      await redisService.set(`${TEST_KEY_PREFIX}user:2`, 'User 2');
      await redisService.set(`${TEST_KEY_PREFIX}user:3`, 'User 3');
      await redisService.set(`${TEST_KEY_PREFIX}post:1`, 'Post 1');
    });

    afterEach(async () => {
      // 清理测试数据
      const keys = await redisService.keys(`${TEST_KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redisService.del(...keys);
      }
    });

    it('should find keys by pattern', async () => {
      // 查找所有用户相关的键
      const userKeys = await redisService.keys(`${TEST_KEY_PREFIX}user:*`);

      expect(userKeys).toBeDefined();
      expect(Array.isArray(userKeys)).toBe(true);
      expect(userKeys.length).toBe(3);

      console.log(`✓ Found ${userKeys.length} keys matching pattern`);
    });

    it('should delete multiple keys', async () => {
      // 批量删除键
      const userKeys = await redisService.keys(`${TEST_KEY_PREFIX}user:*`);
      expect(userKeys.length).toBe(3);

      await redisService.del(...userKeys);

      const remainingKeys = await redisService.keys(`${TEST_KEY_PREFIX}user:*`);
      expect(remainingKeys.length).toBe(0);

      console.log('✓ Batch deletion works correctly');
    });
  });

  describe('RedisService Instance', () => {
    it('should have RedisService instance', () => {
      expect(redisService).toBeDefined();
      expect(redisService).toBeInstanceOf(RedisService);
    });

    it('should have all required methods', () => {
      expect(typeof redisService.set).toBe('function');
      expect(typeof redisService.get).toBe('function');
      expect(typeof redisService.del).toBe('function');
      expect(typeof redisService.exists).toBe('function');
      expect(typeof redisService.keys).toBe('function');
      expect(typeof redisService.ping).toBe('function');
    });
  });

  describe('Performance', () => {
    it('should handle rapid successive operations', async () => {
      // 测试快速连续操作
      const operations = [];

      for (let i = 0; i < 10; i++) {
        const key = `${TEST_KEY_PREFIX}perf:${i}`;
        operations.push(
          redisService.set(key, `value-${i}`).then(() =>
            redisService.get(key)
          )
        );
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((value, index) => {
        expect(value).toBe(`value-${index}`);
      });

      // 清理
      const keys = await redisService.keys(`${TEST_KEY_PREFIX}perf:*`);
      if (keys.length > 0) {
        await redisService.del(...keys);
      }

      console.log('✓ Handled 10 rapid operations successfully');
    });
  });
});
