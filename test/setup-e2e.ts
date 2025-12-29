// test/setup-e2e.ts
import 'dotenv/config'
import { execSync } from 'child_process'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Aplica migrations UMA VEZ no início
console.log('🔄 Aplicando migrations no banco de teste...')
execSync('npx prisma migrate deploy', { stdio: 'inherit' })

// Limpa TODAS as tabelas antes de cada teste (sem paralelismo = seguro)
beforeEach(async () => {
  console.log('🧹 Limpando banco de dados...')
  // Deletar questions ANTES de users (por causa da foreign key)
  await prisma.question.deleteMany()
  await prisma.user.deleteMany()
})

// Limpa TODAS as tabelas relevantes ANTES DE CADA teste
beforeEach(async () => {
  await prisma.question.deleteMany()
  await prisma.user.deleteMany()
  // Sem timeout → rápido e seguro
})
// Opcional: desconecta no final
afterAll(async () => {
  console.log('👋 Desconectando do banco de teste')
  await prisma.$disconnect()
  await pool.end()
})
