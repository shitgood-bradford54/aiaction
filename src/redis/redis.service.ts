import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      socket: {
        host: this.configService.get<string>('redis.host'),
        port: this.configService.get<number>('redis.port'),
      },
      password: this.configService.get<string>('redis.password'),
      database: this.configService.get<number>('redis.db'),
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    mode?: 'EX' | 'PX',
    duration?: number,
  ): Promise<void> {
    if (mode && duration) {
      if (mode === 'EX') {
        await this.client.setEx(key, duration, value);
      } else if (mode === 'PX') {
        await this.client.pSetEx(key, duration, value);
      }
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<number> {
    return await this.client.del(keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return await this.client.exists(keys);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async info(section?: string): Promise<string> {
    return await this.client.info(section);
  }

  async configGet(parameter: string): Promise<Record<string, string>> {
    const result = await this.client.configGet(parameter);
    return result as Record<string, string>;
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
