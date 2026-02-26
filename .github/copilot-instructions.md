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
type Response = Either<ResourceNotFoundError | NotAllowedError, { question: Question }>
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

| Task | Command |
|------|---------|
| Dev server | `npm run start:dev` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| Lint | `npm run lint:fix` |
| Prisma generate | `npx prisma generate` |
| Prisma migrate | `npx prisma migrate dev` |

## Testing

### Unit Tests
Located alongside source files (`*.spec.ts`). Use in-memory repositories from `test/repositories/`.

### E2E Tests
Located in `src/infra/http/controllers/*.e2e-spec.ts`. Use factory classes from `test/factories/` that have both:
- `makeEntity()` - pure domain entity for unit tests
- `makePrismaEntity()` - persisted entity for e2e tests

**Prisma 7 Parallel Testing**: E2E tests run in parallel using worker-level schema isolation:
- Each vitest worker gets a unique PostgreSQL schema (e.g., `test_w0_abc123`)
- Test files within a worker share the schema but data is truncated between files
- Configuration in `test/setup-e2e.ts` and `vitest.config.e2e.ts`
- Uses `@prisma/adapter-pg` with `pg.Pool` - schema set via `poolConfig.options`

## Database

- **Prisma 7** with `@prisma/adapter-pg` (not the default Prisma engine)
- Generated client in `generated/prisma/` (not `node_modules`)
- Schema in `prisma/schema.prisma`
- Separate test database: `nest-clean-test` (see README for setup)

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
