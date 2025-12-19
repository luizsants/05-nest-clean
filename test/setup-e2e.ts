// test/setup-e2e.ts
import 'dotenv/config'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

/**
 * PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
 *
 * Evita que o Prisma tente baixar checksums da internet durante testes.
 * Isso é SEGURO porque:
 * - As engines já foram validadas no `npm install`
 * - Apenas pula verificação redundante online
 * - Necessário em ambientes com proxy/firewall (ex: rede corporativa)
 * - Não afeta máquinas sem restrições de rede
 * - Prática recomendada para CI/CD
 */
process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = '1'

function generateUniqueDatabaseUrl(schemaId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables')
  }
  const url = new URL(process.env.DATABASE_URL)
  url.searchParams.set('schema', schemaId)
  return url.toString()
}

// Gera schema UUID único para este arquivo de teste (paralelismo seguro)
const schemaId = randomUUID()
const databaseUrl = generateUniqueDatabaseUrl(schemaId)

// Sobrescreve DATABASE_URL para usar schema isolado no banco de teste
process.env.DATABASE_URL = databaseUrl
// Exporta para uso nos testes
process.env.TEST_SCHEMA_ID = schemaId

console.log(`[Setup] Schema de teste: ${schemaId}`)

// Aplica migrations no schema UUID isolado
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: {
    ...process.env,
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
    PRISMA_SKIP_POSTINSTALL_GENERATE: '1',
  },
})

// Cleanup: remove schema UUID ao final
afterAll(async () => {
  const { Pool } = await import('pg')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const { PrismaClient } = await import('../generated/prisma')

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await prisma.$disconnect()
  console.log(`[Cleanup] Schema ${schemaId} removido`)
})
