import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    // 删除缓存
    await this.redis.del('users:all');

    return user;
  }

  async findAll() {
    // 尝试从缓存获取
    const cached = await this.redis.get('users:all');
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库获取
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 缓存结果 (5分钟 = 300秒)
    await this.redis.set('users:all', JSON.stringify(users), 'EX', 300);

    return users;
  }

  async findOne(id: string) {
    const cacheKey = `user:${id}`;

    // 尝试从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库获取
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 缓存结果 (5分钟 = 300秒)
    await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 300);

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 如果更新邮箱,检查是否已存在
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 删除相关缓存
    await this.redis.del(`user:${id}`);
    await this.redis.del('users:all');

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({ where: { id } });

    // 删除相关缓存
    await this.redis.del(`user:${id}`);
    await this.redis.del('users:all');

    return { message: 'User deleted successfully' };
  }
}
