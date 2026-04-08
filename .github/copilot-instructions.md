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

**Overview**: Tests run in parallel using Vitest workers with PostgreSQL schema isolation. The current setup is stable at 18/18 passing tests in ~6-7s wall-clock time, versus ~60s in the old sequential setup.

**Location**: `src/infra/http/controllers/*.e2e-spec.ts`

**Status / Performance**:

- v1.2.0 is the stable parallel E2E baseline
- 18/18 tests pass consistently across repeated runs
- Typical wall-clock time: ~6-7s
- Typical aggregate time: ~48-58s
- Rough improvement over serial execution: ~90% wall-clock reduction

**Architecture**:

- Each Vitest worker gets its own PostgreSQL schema, such as `test_w0_abc12345`
- Isolation is worker-level, not file-level, to avoid Prisma 7 `pg.Pool` caching issues
- Test files inside the same worker share the schema, but tables are truncated between runs
- The schema search path is set at the PostgreSQL protocol level through `DATABASE_URL`
- Prisma uses `@prisma/adapter-pg`, not the default Prisma engine

**Why worker-level schemas**:

- File-level schemas created too many schemas and led to unstable connection behavior
- Worker-level schemas keep the number of schemas small and remove race conditions seen with per-file isolation

**Key configuration files**:

- `vitest.config.e2e.ts`: `pool: 'forks'`, file parallelism enabled, `testTimeout: 30000`, `hookTimeout: 60000`
- `test/setup-e2e.ts`: loads `.env.test`, generates worker schema names, creates/drops schemas, truncates tables, performs cleanup on exit
- `src/infra/database/prisma/prisma.service.ts`: pool size 25, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
- `.env.test`: dedicated E2E database `nest-clean-test`

**Test environment flow**:

1. Load `.env.test`
2. Generate worker schema name like `test_w${workerId}_${randomUUID(8)}`
3. Set `DATABASE_URL` search path to that schema
4. Drop and recreate schema if needed
5. Push schema / run setup for the worker
6. Truncate tables between test files
7. Drop schemas during cleanup

**Critical implementation details**:

- Factories must inject UUIDs into fields with unique constraints
- Example pattern: `const uniqueId = randomUUID().slice(0, 8)`
- `make-question.ts` uses the UUID in the title to guarantee unique slugs
- `make-student.ts` uses the UUID in the email to guarantee uniqueness
- Pool size 25 is intentional; earlier lower values caused connection timeout failures under parallel load
- Do not reintroduce aggressive `pg_terminate_backend()` calls in truncation logic; they previously caused unexpected connection termination during test runs

**Required E2E patterns**:

```typescript
// Factory for E2E tests (persisted to database)
await studentFactory.makePrismaStudent()

// Factory for unit tests (pure domain entity)
const student = makeStudent()
```

```typescript
const uniqueId = randomUUID().slice(0, 8)
title: `${faker.lorem.sentence()} [${uniqueId}]`
email: `user-${uniqueId}@test.com`
```

**Available persisted factories**:

- `StudentFactory`
- `QuestionFactory`
- `AnswerFactory`
- `QuestionCommentFactory`
- `AnswerCommentFactory`
- `QuestionAttachmentFactory`
- `NotificationFactory`

**Current E2E file set (18 tests)**:

- Questions: `create-question.controller.e2e-spec.ts`, `edit-question.controller.e2e-spec.ts`, `delete-question-controller.e2e-spec.ts`, `get-question-by-slug-controller.e2e-spec.ts`, `fetch-recent-questions.controller.e2e-spec.ts`, `choose-question-best-answer.controller.e2e-spec.ts`
- Question comments: `comment-on-question.controller.e2e-spec.ts`, `delete-question-comment.controller.e2e-spec.ts`
- Question answers: `answer-question.controller.e2e-spec.ts`, `fetch-question-answer.controller.e2e-spec.ts`
- Answer comments: `comment-on-answer.controller.e2e-spec.ts`, `delete-answer-comment.controller.e2e-spec.ts`
- Answers: `fetch-answer-comments.controller.e2e-spec.ts`, `edit-answer.controller.e2e-spec.ts`, `delete-answer.controller.e2e-spec.ts`
- Authentication: `create-account.controller.e2e-spec.ts`, `authenticate.controller.e2e-spec.ts`
- Fetch comments: `fetch-question-comments.controller.e2e-spec.ts`

**How to run E2E tests**:

- Full suite: `npm run test:e2e`
- Watch mode: `npm run test:e2e:watch`
- Cleanup residual schemas: `npm run test:e2e:cleanup`
- Single file: `npx vitest --config vitest.config.e2e.ts run src/infra/http/controllers/create-question.controller.e2e-spec.ts`

**Troubleshooting**:

- `Connection pool exhausted`: raise `max` in `prisma.service.ts` from 25 to 40 if the suite grows substantially
- `duplicate key value violates unique constraint`: check factories for missing UUIDs in unique fields
- `TRUNCATE table does not exist`: usually first-run timing during schema creation; expected warning if schema is not ready yet
- `Connection terminated unexpectedly`: confirm truncation logic is not killing active backends
- Tests hang on truncate: inspect `TABLES_TO_TRUNCATE` ordering for foreign-key deadlocks

**Historical notes**:

- v1.1.0 (`v1.1.0-controllers`) used sequential execution at ~60s
- v1.2.0 introduced stable parallel E2E execution
- The project was originally built under the sequential model; some legacy artifacts may still exist and should be evaluated with that history in mind

**Important**: Keep `.env` and `.env.test` on separate databases. Parallel E2E execution assumes it is safe to truncate the test database repeatedly; sharing a database with development data is not acceptable.

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
