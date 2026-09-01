// test/cleanup-e2e.ts - Global cleanup after E2E tests
import { Pool } from 'pg'

const baseUrl = 'postgresql://docker:docker@localhost:6000/nest-clean-test'

export async function cleanup() {
  const pool = new Pool({ connectionString: baseUrl })

  try {
    // Drop all test schemas
    const { rows } = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'test_%'
    `)

    for (const row of rows) {
      await pool.query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`)
    }

    // Truncate public schema tables (IF EXISTS for resilience)
    const tables = [
      'notifications',
      'attachments',
      'comments',
      'answers',
      'questions',
      'users',
    ]

    for (const table of tables) {
      await pool
        .query(`TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE`)
        .catch(() => {
          // Table may not exist in all environments
        })
    }

    console.log(
      `✅ Cleaned up ${rows.length} test schemas and truncated public`,
    )
  } catch (error) {
    console.error('Cleanup error:', error)
  } finally {
    await pool.end()
  }
}

// Allow running directly: npx ts-node test/cleanup-e2e.ts
if (require.main === module) {
  cleanup().then(() => process.exit(0))
}
