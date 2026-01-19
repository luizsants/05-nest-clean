<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Project setup

```bash
$ docker compose up -d
```

```bash
$ npm install
```

```bash
$ npx prisma generate
```

```bash
$ npx prisma migrate dev
```

## 🔐 Generate RSA Key Pair for JWT (RS256) and Convert to Base64

```bash
# 1. Generate a private key
openssl genrsa -out private.pem 2048

# 2. Generate the public key from the private key
openssl rsa -in private.pem -pubout -out public.pem

# 3. Convert both keys to Base64 (Linux)
base64 -w0 private.pem > private_base64.txt
base64 -w0 public.pem  > public_base64.txt

# 4. Copy contents of private_base64.txt and public_base64.txt into:
# JWT_PRIVATE_KEY=<contents of private_base64.txt>
# JWT_PUBLIC_KEY=<contents of public_base64.txt>

# MacOS / Portable alternative for step 3:
cat private.pem | base64 | tr -d '\n' > private_base64.txt
cat public.pem  | base64 | tr -d '\n' > public_base64.txt

# To display Base64 encoded keys directly in terminal:
cat private.pem | base64 | tr -d '\n'
cat public.pem  | base64 | tr -d '\n'


```

## Setting up the Test Database (Required for Prisma 7+)

Prisma 7+ (with `@prisma/adapter-pg`) has stricter connection timing when using dynamic schemas.  
To ensure reliable and isolated e2e tests, we use a **dedicated test database** instead of per-test schemas.

### 1. Create the test database (run once)

The development database is `nest-clean`.  
Tests use a separate database called `nest-clean-test` inside the same Postgres container.

```bash
# Create the dedicated test database
docker exec -it nest-clean-pg createdb -U docker nest-clean-test
```

### Troubleshooting: Failed Migrations (P3009)

If you see this error when running tests:

```
Error: P3009
migrate found failed migrations in the target database
```

This means a previous migration was interrupted or failed. To fix it, **drop and recreate the test database**:

```bash
# Drop the test database (connect to 'postgres' db first)
docker exec -it nest-clean-pg psql -U docker -d postgres -c "DROP DATABASE IF EXISTS \"nest-clean-test\";"

# Recreate it
docker exec -it nest-clean-pg psql -U docker -d postgres -c "CREATE DATABASE \"nest-clean-test\";"

# Apply migrations
DATABASE_URL="postgresql://docker:docker@localhost:6000/nest-clean-test?schema=public" npx prisma migrate deploy
```

> **Note:** The `-d postgres` flag is required because `psql` needs to connect to an existing database before running DROP/CREATE commands.

### 2. Important: Prisma Engines Checksum

The project includes `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` in test configuration.

**Why?** This prevents Prisma from trying to download checksum verification files from the internet during test execution.

**Is it safe?** YES ✅

- Engines are already validated when you run `npm install`
- Only skips redundant online verification during tests
- **Recommended** for environments with proxy/firewall restrictions
- **No impact** on machines without network restrictions

This is a **best practice** for CI/CD and corporate environments.

### 3. View the test database with Prisma Studio

To visually inspect the test database (e.g., check if data was created or cleaned), open a separate Prisma Studio instance pointing to the test database:

### Open Prisma Studio for the TEST database

```bash
dotenv -e .env.test npx prisma studio
```

```bash
DATABASE_URL=postgresql://docker:docker@localhost:6000/nest-clean-test?schema=public npx prisma studio
```

You can use the .env.test file or create another one with your credentials.

### Dev observations:

Usar vi.waitfor() em vez do arquivo wait-for
