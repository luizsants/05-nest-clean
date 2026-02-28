# Copilot Instructions - NestJS Clean Architecture Forum API

## Architecture Overview

This is a **Clean Architecture / DDD** project with strict layer separation:

```
src/
├── core/           # Shared domain primitives (Entity, Either, UniqueEntityID, WatchedList)
├── domain/         # Business logic - framework agnostic
│   ├── forum/      # Forum bounded context
│   │   ├── application/  # Use cases, repositories interfaces
│   │   └── enterprise/   # Entities, value objects, domain events
│   └── notification/     # Notification bounded context
└── infra/          # Framework & external services
    ├── http/       # Controllers, pipes, presenters
    ├── database/   # Prisma repositories, mappers
    ├── auth/       # JWT authentication
    └── cryptography/
```

## Key Patterns

### Either Pattern for Error Handling

Use cases return `Either<Error, Success>` - never throw exceptions from domain layer:

```typescript
type Response = Either<
  ResourceNotFoundError | NotAllowedError,
  { question: Question }
>
```

### Repository Abstraction

Domain defines abstract repositories in `domain/*/application/repositories/`. Infrastructure implements them in `infra/database/prisma/repositories/`. NestJS DI binds them in `DatabaseModule`.

### Entity Creation

Entities use static `create()` factory with optional ID:

```typescript
const question = Question.create({ authorId, title, content }, existingId?)
```

### Mappers

Convert between domain entities and Prisma models using mappers in `infra/database/prisma/mappers/`:

```typescript
PrismaQuestionMapper.toPrisma(domainEntity)
PrismaQuestionMapper.toDomain(prismaModel)
```

## Commands

| Task            | Command                  |
| --------------- | ------------------------ |
| Dev server      | `npm run start:dev`      |
| Unit tests      | `npm run test`           |
| E2E tests       | `npm run test:e2e`       |
| Lint            | `npm run lint:fix`       |
| Prisma generate | `npx prisma generate`    |
| Prisma migrate  | `npx prisma migrate dev` |

## Testing

### Unit Tests

Located alongside source files (`*.spec.ts`). Use in-memory repositories from `test/repositories/`.

### E2E Tests - Parallel Execution (v1.2.0+)

**Overview**: Tests run in parallel using Vitest workers with schema isolation. All 18 tests pass consistently in ~6-7s wall-clock time (vs ~60s sequential in v1.1.0).

**Location**: `src/infra/http/controllers/*.e2e-spec.ts`

**Architecture**:

- Each Vitest worker gets isolated PostgreSQL schema: `test_w0_abc123`, `test_w1_def456`, etc.
- Worker-level isolation (not file-level) prevents Prisma 7 pool caching issues
- Tables truncated between test files for clean state
- Uses `@prisma/adapter-pg` with configurable pool size

**Key Patterns**:

```typescript
// Factory for E2E tests (persisted to database)
await studentFactory.makePrismaStudent()

// Factory for unit tests (pure domain entity)
const student = makeStudent()
```

**Factory Implementation** (test/factories/):

- All factories use UUID in unique fields to prevent constraint violations across parallel workers
- Example: `const uniqueId = randomUUID().slice(0, 8)` added to titles/emails

**Configuration**:

- `vitest.config.e2e.ts` - Pool forks, file parallelism, 30s timeout
- `test/setup-e2e.ts` - Worker schema isolation, truncation logic
- `src/infra/database/prisma/prisma.service.ts` - Pool size 25 (supports parallel tests)
- `.env.test` - Separate test database (`nest-clean-test`)

**Important**: Database is intentionally separate from `.env` (dev database). This isolation prevents accidental data loss during test runs and is a **best practice**.

**Previous Versions**:

- v1.1.0 (tag: `v1.1.0-controllers`) - Sequential E2E tests, ~60s execution
- v1.2.0 (tag: `v1.2.0`) - Parallel E2E tests, 100% consistent, ~6-7s execution

**Migration Notes**: Project was developed using sequential tests (v1.1.0) until completion. Parallel execution (v1.2.0) was implemented post-completion. May contain cleanup opportunities for legacy sequential test artifacts (check git history for details).

**Prisma 7 Parallel Testing Details**:

- Each vitest worker gets unique PostgreSQL schema (e.g., `test_w0_abc123`)
- Test files within worker share schema but are truncated between runs
- Configuration in `test/setup-e2e.ts` and `vitest.config.e2e.ts`
- See `.github/e2e-tests-documentation.md` for troubleshooting and deep dive

## Database

- **Prisma 7** with `@prisma/adapter-pg` (not the default Prisma engine)
- Generated client in `generated/prisma/` (not `node_modules`)
- Schema in `prisma/schema.prisma`

### Database Configuration

**Separate Databases** (Best Practice):

- **Production/Dev**: `DATABASE_URL` in `.env` → `nest-clean` database
- **E2E Tests**: `DATABASE_URL` in `.env.test` → `nest-clean-test` database

**Why Separate?**

- ✅ Prevents accidental data loss when running E2E tests
- ✅ Allows parallel test schemas (`test_w0_*`, `test_w1_*`, etc.) without affecting dev data
- ✅ Parallel execution (v1.2.0) amplifies the need for isolation
- ✅ Safe to TRUNCATE test database multiple times per test run
- ⚠️ Consolidating to single database is **not recommended** - risk is high

**Setup**:

```bash
# Create dev database
psql -U docker -h localhost -p 6000 -c "CREATE DATABASE 'nest-clean';"

# Create test database (used by E2E tests)
psql -U docker -h localhost -p 6000 -c "CREATE DATABASE 'nest-clean-test';"
```

**File Structure**:

- `.env` - Development database configuration
- `.env.test` - E2E test database configuration
- `prisma/schema.prisma` - Shared schema (same for both databases)

## Authentication

JWT RS256 with base64-encoded keys in env vars:

- `JWT_PRIVATE_KEY` - for signing
- `JWT_PUBLIC_KEY` - for verification

Use `@CurrentUser()` decorator to get authenticated user in controllers.

## Validation

Use Zod schemas with `ZodValidationPipe` for request validation:

```typescript
const schema = z.object({ title: z.string(), content: z.string() })
@Body(new ZodValidationPipe(schema)) body: SchemaType
```

## File Naming Conventions

- Use cases: `verb-noun.ts` (e.g., `create-question.ts`)
- Controllers: `verb-noun.controller.ts`
- E2E tests: `*.controller.e2e-spec.ts`
- Repositories: `prisma-{entity}-repository.ts`
