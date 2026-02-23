/* eslint-disable no-console */
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
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env },
})

// Limpa TODAS as tabelas antes de cada teste (sem paralelismo = seguro)
beforeEach(async () => {
  console.log('🧹 Limpando banco de dados...')
  // Deletar na ordem correta: filhos antes dos pais (foreign keys)
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.question.deleteMany()
  await prisma.user.deleteMany()
})

// Opcional: desconecta no final
afterAll(async () => {
  console.log('👋 Desconectando do banco de teste')
  await prisma.$disconnect()
  await pool.end()
})
