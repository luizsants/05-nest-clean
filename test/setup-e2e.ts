// test/setup-e2e.ts - Parallel test support with Prisma 7
//
// STRATEGY: Worker-level schema isolation + table truncation between test files
// - Each vitest worker gets ONE unique schema (created at worker startup)
// - Test files within a worker share the schema but truncate data between runs
// - This avoids Prisma 7's pg.Pool caching issues with file-level schemas

import { config } from 'dotenv'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'

// Load .env first (base configuration), then override with .env.test (test-specific)
config({ path: '.env' })
config({ path: '.env.test', override: true })

// Parse base URL (remove any existing query parameters)
const baseUrl = process.env.DATABASE_URL!.replace(/\?.*$/, '')

// Generate WORKER-LEVEL schema (runs once when worker starts)
const workerId =
  process.env.VITEST_WORKER_ID || process.env.VITEST_POOL_ID || '0'
const uniqueId = randomUUID().slice(0, 8)
const SCHEMA_NAME = `test_w${workerId}_${uniqueId}`

// Use PostgreSQL 'options' parameter to set search_path reliably
// Include 'public' so enum types (e.g. "UserRole") resolve correctly
const searchPathOption = encodeURIComponent(
  `-c search_path=${SCHEMA_NAME},public`,
)
const SCHEMA_URL = `${baseUrl}?options=${searchPathOption}`

// Set environment variables IMMEDIATELY (before any NestJS/Prisma imports)
process.env.DATABASE_URL = SCHEMA_URL
process.env.TEST_SCHEMA = SCHEMA_NAME
;(globalThis as unknown as Record<string, string>).__TEST_SCHEMA__ = SCHEMA_NAME

// Track if schema was created (to avoid duplicate setup)
let schemaReady = false
let setupPool: Pool | null = null

// Tables to truncate between test files (order matters for foreign keys)
// Order: most dependent first, then base tables
const TABLES_TO_TRUNCATE = [
  'notifications', // depends on users
  'comments', // depends on questions, answers, users
  'attachments', // depends on questions, answers
  'answers', // depends on questions, users
  'questions', // depends on users
  'users', // base table
]

async function ensureSchemaExists(): Promise<void> {
  if (schemaReady) return

  setupPool = new Pool({ connectionString: baseUrl })

  // Create schema (drop if exists from previous failed runs)
  await setupPool.query(`DROP SCHEMA IF EXISTS "${SCHEMA_NAME}" CASCADE`)
  await setupPool.query(`CREATE SCHEMA "${SCHEMA_NAME}"`)

  // 1. Clone enum types from public schema into test schema
  const enums = await setupPool.query<{
    typname: string
    enumlabel: string
  }>(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder
  `)

  // Group labels by enum type name
  const enumMap = new Map<string, string[]>()
  for (const { typname, enumlabel } of enums.rows) {
    if (!enumMap.has(typname)) enumMap.set(typname, [])
    enumMap.get(typname)!.push(enumlabel)
  }

  for (const [typname, labels] of enumMap) {
    const labelsSql = labels.map((l) => `'${l}'`).join(', ')
    await setupPool.query(
      `CREATE TYPE "${SCHEMA_NAME}"."${typname}" AS ENUM (${labelsSql})`,
    )
  }

  // 2. Clone table structures from public schema
  const tables = await setupPool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables 
     WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`,
  )

  for (const { tablename } of tables.rows) {
    await setupPool.query(
      `CREATE TABLE "${SCHEMA_NAME}"."${tablename}" 
       (LIKE public."${tablename}" INCLUDING ALL)`,
    )
  }

  // 3. Fix enum column types: change from public."EnumType" to test_schema."EnumType"
  // Find all columns that use enum types from the public schema
  const enumColumns = await setupPool.query<{
    table_name: string
    column_name: string
    udt_name: string
  }>(`
    SELECT c.table_name, c.column_name, c.udt_name
    FROM information_schema.columns c
    JOIN pg_type t ON c.udt_name = t.typname
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE c.table_schema = '${SCHEMA_NAME}'
      AND n.nspname = 'public'
      AND t.typtype = 'e'
  `)

  for (const { table_name, column_name, udt_name } of enumColumns.rows) {
    // Get current default value before altering type
    const defaultRes = await setupPool.query<{ column_default: string | null }>(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = '${SCHEMA_NAME}' 
         AND table_name = '${table_name}' 
         AND column_name = '${column_name}'`,
    )
    const currentDefault = defaultRes.rows[0]?.column_default

    // Drop default first to avoid cast errors during type change
    if (currentDefault) {
      await setupPool.query(`
        ALTER TABLE "${SCHEMA_NAME}"."${table_name}"
        ALTER COLUMN "${column_name}" DROP DEFAULT
      `)
    }

    await setupPool.query(`
      ALTER TABLE "${SCHEMA_NAME}"."${table_name}"
      ALTER COLUMN "${column_name}" 
      TYPE "${SCHEMA_NAME}"."${udt_name}"
      USING "${column_name}"::text::"${SCHEMA_NAME}"."${udt_name}"
    `)

    // Re-apply default with correct schema-qualified enum type
    if (currentDefault) {
      // Replace public."EnumType" with test_schema."EnumType" in default
      const fixedDefault = currentDefault.replace(
        /public\."([^"]+)"/g,
        `"${SCHEMA_NAME}"."$1"`,
      )
      // Also handle unqualified enum references (just "EnumType")
      const finalDefault = fixedDefault.includes(`"${SCHEMA_NAME}"`)
        ? fixedDefault
        : fixedDefault.replace(
            `::"${udt_name}"`,
            `::"${SCHEMA_NAME}"."${udt_name}"`,
          )
      await setupPool.query(`
        ALTER TABLE "${SCHEMA_NAME}"."${table_name}"
        ALTER COLUMN "${column_name}" SET DEFAULT ${finalDefault}
      `)
    }
  }

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
      await client.query(`SET search_path TO "${SCHEMA_NAME}", public`)

      // Check which tables actually exist before truncating
      const existingTables = await client.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = '${SCHEMA_NAME}'`,
      )
      const existingTableNames = new Set(
        existingTables.rows.map((r) => r.tablename),
      )

      // Only truncate tables that exist
      const tablesToTruncate = TABLES_TO_TRUNCATE.filter((t) =>
        existingTableNames.has(t),
      )

      if (tablesToTruncate.length > 0) {
        // Simple truncate without killing connections - let CASCADE handle it
        await client.query(`
          TRUNCATE TABLE ${tablesToTruncate.map((t) => `"${t}"`).join(', ')} 
          RESTART IDENTITY CASCADE
        `)
      }
    } finally {
      client.release()
    }
  } catch (error) {
    // Log but don't fail on truncate errors
    if (error instanceof Error) {
      console.warn('Truncate warning (non-critical):', error.message)
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
  // Truncate data after test file completes (between-file cleanup)
  await truncateTables()
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
