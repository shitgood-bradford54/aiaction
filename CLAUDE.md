# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend scaffold using Prisma (PostgreSQL) and Redis for caching. The application follows a modular architecture with global services for database and cache access.

## Essential Commands

### Development
```bash
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with debugging enabled
```

### Build & Production
```bash
npm run build              # Compile TypeScript to dist/
npm run start:prod         # Run compiled application
```

### Database (Prisma)
```bash
npm run prisma:generate    # Generate Prisma Client (required after schema changes)
npm run prisma:migrate     # Create and apply migration
npx prisma migrate dev --name <migration-name>  # Named migration
npm run prisma:studio      # Open Prisma Studio GUI
```

### Testing
```bash
npm run test               # Run all tests
npm run test:watch         # Watch mode
npm run test:cov           # With coverage report
npm run test:e2e           # E2E tests only
```

### Code Quality
```bash
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting
```

## Architecture Patterns

### Global Services Pattern
Both `PrismaService` and `RedisService` are configured as **global modules** (`@Global()` decorator) and automatically available across all modules without explicit imports. This follows the DRY principle.

**Key locations:**
- `src/prisma/prisma.module.ts` - Global Prisma module
- `src/redis/redis.module.ts` - Global Redis module

**Usage in any service:**
```typescript
constructor(
  private prisma: PrismaService,
  private redis: RedisService,
) {}
```

### Configuration Management
Environment variables are centralized in `src/config/configuration.ts` and accessed via `ConfigService`. The `ConfigModule` is global.

**Configuration structure:**
```typescript
{
  port: number,
  database: { url: string },
  redis: { host, port, password, db }
}
```

### Cache Invalidation Strategy
The codebase implements cache-aside pattern with manual invalidation:
- **Collection cache key**: `users:all` (TTL: 5 minutes)
- **Single entity cache key**: `user:${id}` (TTL: 5 minutes)
- **Invalidation**: On create/update/delete, both entity and collection caches are cleared

**Pattern (see `src/modules/users/users.service.ts:14-139`):**
1. Check Redis cache first
2. If miss, query Prisma
3. Store result in Redis with TTL
4. On mutations, delete related cache keys

### Module Structure
Business logic is organized under `src/modules/`. Each module contains:
```
modules/<feature>/
├── dto/                    # Data Transfer Objects (class-validator)
├── <feature>.controller.ts # API endpoints (Swagger-documented)
├── <feature>.service.ts    # Business logic
└── <feature>.module.ts     # NestJS module definition
```

### Path Aliases
TypeScript path alias `@/*` maps to `src/*` (configured in `tsconfig.json`). Use this for clean imports:
```typescript
import { PrismaService } from '@/prisma/prisma.service';
```

### Validation & Transformation
Global validation pipe is configured in `src/main.ts:13-17`:
- `whitelist: true` - Strip non-whitelisted properties
- `transform: true` - Auto-transform payloads to DTO instances
- `forbidNonWhitelisted: true` - Reject requests with extra properties

All DTOs must use `class-validator` decorators.

## Database Schema Notes

**Prisma models** (`prisma/schema.prisma`):
- UUIDs as primary keys (`@default(uuid())`)
- Automatic timestamps (`createdAt`, `updatedAt`)
- Table name mapping via `@@map()` (e.g., `User` model → `users` table)

**After schema changes:**
1. Run `npm run prisma:generate` to update client
2. Run `npm run prisma:migrate` to create migration
3. Rebuild if types are cached: `npm run build`

## API Documentation

Swagger is auto-generated and available at `http://localhost:3000/api` when the server runs. Controllers use `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators for documentation.

## Environment Setup

Required environment variables (`.env`):
- `DATABASE_URL` - PostgreSQL connection string (Prisma format)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` - Redis config
- `PORT` - Application port (default: 3000)

**Before first run:**
```bash
cp .env.example .env        # Create environment file
# Edit .env with actual credentials
npm install
npm run prisma:generate
npm run prisma:migrate
```

## Development Principles

The codebase follows SOLID principles:
- **Single Responsibility**: Each service handles one domain (e.g., `UsersService` only manages users)
- **Dependency Inversion**: Services depend on abstractions (`PrismaService`, `RedisService`) injected via constructor
- **Open/Closed**: Add new modules without modifying existing ones

When adding features:
1. Create DTO classes with validation decorators
2. Never expose passwords in API responses (use `select` in Prisma queries)
3. Implement cache invalidation for data mutations
4. Add Swagger documentation decorators
5. Follow the existing module pattern in `src/modules/users/`
