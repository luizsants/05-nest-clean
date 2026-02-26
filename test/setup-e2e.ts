// test/setup-e2e.ts - Parallel test support with Prisma 7
//
// STRATEGY: Worker-level schema isolation + table truncation between test files
// - Each vitest worker gets ONE unique schema (created at worker startup)
// - Test files within a worker share the schema but truncate data between runs
// - This avoids Prisma 7's pg.Pool caching issues with file-level schemas

import { config } from 'dotenv'
import { execSync } from 'child_process'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'

// Load .env.test file explicitly
config({ path: '.env.test' })

// Parse base URL (remove any existing query parameters)
const baseUrl = process.env.DATABASE_URL!.replace(/\?.*$/, '')

// Generate WORKER-LEVEL schema (runs once when worker starts)
const workerId =
  process.env.VITEST_WORKER_ID || process.env.VITEST_POOL_ID || '0'
const uniqueId = randomUUID().slice(0, 8)
const SCHEMA_NAME = `test_w${workerId}_${uniqueId}`

// Use PostgreSQL 'options' parameter to set search_path reliably
// This works at protocol level, before any SQL runs
const searchPathOption = encodeURIComponent(`-c search_path=${SCHEMA_NAME}`)
const SCHEMA_URL = `${baseUrl}?options=${searchPathOption}`

// Set environment variables IMMEDIATELY (before any NestJS/Prisma imports)
process.env.DATABASE_URL = SCHEMA_URL
process.env.TEST_SCHEMA = SCHEMA_NAME
;(globalThis as unknown as Record<string, string>).__TEST_SCHEMA__ = SCHEMA_NAME

// Track if schema was created (to avoid duplicate setup)
let schemaReady = false
let setupPool: Pool | null = null

// Tables to truncate between test files (order matters for foreign keys)
const TABLES_TO_TRUNCATE = [
  'attachments',
  'comments',
  'answers',
  'questions',
  'users',
]

async function ensureSchemaExists(): Promise<void> {
  if (schemaReady) return

  setupPool = new Pool({ connectionString: baseUrl })

  // Create schema (drop if exists from previous failed runs)
  await setupPool.query(`DROP SCHEMA IF EXISTS "${SCHEMA_NAME}" CASCADE`)
  await setupPool.query(`CREATE SCHEMA "${SCHEMA_NAME}"`)

  // Use db push instead of migrate deploy (Prisma 7 syntax)
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: SCHEMA_URL },
  })

  schemaReady = true
  // Note: Don't close setupPool here - we'll reuse it for truncation
}

async function truncateTables(): Promise<void> {
  if (!setupPool) {
    setupPool = new Pool({ connectionString: baseUrl })
  }

  try {
    // Use a single client from the pool to ensure search_path persists
    const client = await setupPool.connect()
    try {
      await client.query(`SET search_path TO "${SCHEMA_NAME}"`)
      await client.query(`
        TRUNCATE TABLE ${TABLES_TO_TRUNCATE.map((t) => `"${t}"`).join(', ')} 
        RESTART IDENTITY CASCADE
      `)
    } finally {
      client.release()
    }
  } catch (error) {
    // Tables might not exist yet on first run - that's OK
    if (
      !(error instanceof Error) ||
      !error.message.includes('does not exist')
    ) {
      // Ignore truncate warnings
    }
  }
}

beforeAll(async () => {
  // Ensure schema exists (first test file in worker creates it)
  await ensureSchemaExists()

  // Truncate tables for clean state (fast, no migration needed)
  await truncateTables()
})

afterAll(async () => {
  // Don't drop schema here - other test files in this worker may need it
  // Schema cleanup happens when worker exits (see below)
})

// Cleanup when worker process exits (use both events for reliability)
const cleanupDone = { value: false }

async function performCleanup(): Promise<void> {
  if (cleanupDone.value) return
  cleanupDone.value = true

  const cleanupPool = new Pool({ connectionString: baseUrl })
  try {
    await cleanupPool.query(`DROP SCHEMA IF EXISTS "${SCHEMA_NAME}" CASCADE`)
  } catch {
    // Ignore cleanup errors
  } finally {
    await cleanupPool.end().catch(() => {})
    if (setupPool) await setupPool.end().catch(() => {})
  }
}

process.on('beforeExit', performCleanup)
process.on('SIGTERM', () => performCleanup().then(() => process.exit(0)))
process.on('SIGINT', () => performCleanup().then(() => process.exit(0)))
