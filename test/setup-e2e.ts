// test/setup-e2e.ts
import 'dotenv/config'
import { execSync } from 'child_process'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'

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

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Aplica migrations UMA VEZ no início (como já estava)
console.log('Aplicando migrations no banco de teste...')
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: {
    ...process.env,
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1',
    PRISMA_SKIP_POSTINSTALL_GENERATE: '1',
  },
})

// Limpa TODAS as tabelas relevantes ANTES DE CADA teste
beforeEach(async () => {
  await prisma.user.deleteMany()
  // Sem timeout → rápido e seguro
})
// Opcional: desconecta no final
afterAll(async () => {
  await prisma.$disconnect()
})
