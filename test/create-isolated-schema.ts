import { randomUUID } from 'crypto'
import { Pool } from 'pg'

/**
 * Cria um schema UUID isolado para um teste
 * Use isso no beforeAll de cada teste e2e
 */
export async function createIsolatedSchema(): Promise<{
  schemaId: string
  databaseUrl: string
  cleanup: () => Promise<void>
}> {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  const schemaId = randomUUID()
  const url = new URL(baseUrl)
  url.searchParams.set('schema', schemaId)
  const databaseUrl = url.toString()

  console.log(`[Test Setup] Schema isolado criado: ${schemaId}`)

  // Aplica migrations
  const { execSync } = await import('child_process')
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'pipe',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
        PRISMA_SKIP_POSTINSTALL_GENERATE: '1',
      },
    })
  } catch (error) {
    console.error(`[Test Setup] Erro ao aplicar migrations:`, error)
    throw error
  }

  const cleanup = async () => {
    try {
      const cleanupPool = new Pool({ connectionString: baseUrl })
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
      await cleanupPool.end()
      console.log(`[Test Cleanup] Schema ${schemaId} removido`)
    } catch (error) {
      console.error(`[Test Cleanup] Erro:`, error)
    }
  }

  return { schemaId, databaseUrl, cleanup }
}
