# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend scaffold using Prisma (PostgreSQL) and Redis for caching. The application follows a modular architecture with global services for database and cache access.

## Essential Commands

### Development
```bash
npm run start:dev          # Start with hot-reload (NODE_ENV=development)
npm run start:debug        # Start with debugging enabled
```

### Environment Setup
```bash
npm run env:setup          # Initialize environment files (default: development)
npm run env:setup:dev      # Setup development environment
npm run env:setup:prod     # Setup production environment
npm run env:setup:test     # Setup test environment
npm run env:setup:e2e      # Setup E2E test environment
npm run env:validate       # Validate environment variables
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

Environment variables follow a **layered loading strategy** with multi-environment support:

**File Structure:**
- `.env.example` - Template with all variables and documentation (committed)
- `.env.development` - Development defaults without secrets (committed)
- `.env.development.local` - Local overrides with real credentials (gitignored)
- `.env.production` - Production template with placeholders (committed)
- `.env.production.local` - Real production values (gitignored, use deployment platform)
- `.env.test` - Unit test configuration (committed)
- `.env.e2e` - E2E test configuration (committed)

**Loading Priority** (from high to low):
1. System environment variables (deployment platform injection)
2. `.env.{NODE_ENV}.local` (local overrides, not committed)
3. `.env.{NODE_ENV}` (environment defaults, committed)
4. `.env` (fallback, not recommended)

**Configuration Object** (`src/config/configuration.ts`):
```typescript
{
  port: number,
  nodeEnv: string,
  database: { url: string },
  redis: { host, port, password, db },
  logging: { level: string },
  api: { prefix, corsOrigin },
  jwt: { secret, expiresIn }
}
```

**Access via ConfigService:**
```typescript
constructor(private configService: ConfigService) {}

const port = this.configService.get<number>('app.port');
const dbUrl = this.configService.get<string>('app.database.url');
```

**Detailed Documentation:** See `doc/env-structure-design.md` for complete environment variable management guide.

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

This project uses a **layered environment variable system** for managing different environments (development, production, test, e2e).

### Quick Start (First Time Setup)

```bash
# 1. Clone and install
git clone <repository-url>
cd nestjs-prisma-backend
npm install

# 2. Setup environment variables
npm run env:setup              # Creates .env.development.local

# 3. Edit your local configuration
vim .env.development.local     # Add your database credentials

# 4. Initialize database
npm run prisma:generate        # Generate Prisma Client
npm run prisma:migrate         # Run migrations

# 5. Validate and start
npm run env:validate           # Check configuration
npm run start:dev              # Start development server
```

### Environment Variables

**Core Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database?schema=public`
  - Example: `postgresql://postgres:password@localhost:5432/nestjs_dev?schema=public`
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional for local development)
- `REDIS_DB` - Redis database number (0 for dev, 1 for test, 2 for e2e)

**Optional Variables:**
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment (development | production | test)
- `LOG_LEVEL` - Logging level (debug | info | warn | error)
- `JWT_SECRET` - JWT signing secret (required for authentication)
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., 7d, 24h)
- `API_PREFIX` - Global API path prefix (e.g., api/v1)
- `CORS_ORIGIN` - CORS allowed origins (comma-separated)

### Environment File Strategy

**Development:**
- Use `.env.development.local` for your personal configuration
- Never commit this file (it's gitignored)
- `.env.development` provides team defaults (committed, no secrets)

**Production:**
- Inject environment variables via deployment platform (Kubernetes, Docker, etc.)
- `.env.production` is a template only (committed with placeholders)
- Never store real production secrets in the codebase

**Testing:**
- `.env.test` for unit tests (uses separate database and Redis DB)
- `.env.e2e` for end-to-end tests (uses different port and database)

### Validation

Before starting the application, you can validate your environment:

```bash
npm run env:validate
```

This checks:
- All required variables are present
- No placeholder values in non-development environments
- Production-specific requirements (SSL mode, Redis password, etc.)

**Reference:** Complete environment variable documentation is in `doc/env-structure-design.md`

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
