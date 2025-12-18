// test/setup-e2e.ts
import 'dotenv/config'
import { execSync } from 'child_process'

// Aplica as migrations no banco de teste UMA VEZ por execução de teste
console.log('Aplicando migrations no banco de teste...')
execSync('npx prisma migrate deploy', { stdio: 'inherit' })

// import 'dotenv/config'

// import { PrismaClient } from '../generated/prisma'
// import { randomUUID } from 'crypto'
// import { execSync } from 'child_process'
// import { Pool } from 'pg'
// import { PrismaPg } from '@prisma/adapter-pg'

// const pool = new Pool({ connectionString: process.env.DATABASE_URL })
// const adapter = new PrismaPg(pool)
// const prisma = new PrismaClient({ adapter })

// function generateUniqueDatabaseUrl(schemaId: string) {
//   if (!process.env.DATABASE_URL) {
//     throw new Error('DATABASE_URL is not defined in environment variables')
//   }
//   const url = new URL(process.env.DATABASE_URL)
//   url.searchParams.set('schema', schemaId)

//   return url.toString()
// }

// const schemaId = randomUUID()

// beforeAll(async () => {
//   const databaseUrl = generateUniqueDatabaseUrl(schemaId)

//   process.env.DATABASE_URL = databaseUrl

//   console.log(databaseUrl)

//   execSync('npx prisma migrate deploy')
// })

// afterAll(async () => {
//   await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
//   await prisma.$disconnect()
// })
//-------------------------------------------------------------------------------------------------------

// // test/setup-e2e.ts
// import 'dotenv/config'
// import { randomUUID } from 'crypto'
// import { execSync } from 'child_process'
// import { Pool } from 'pg'
// import { PrismaPg } from '@prisma/adapter-pg'
// import { PrismaClient } from '../generated/prisma'

// function generateUniqueDatabaseUrl(schemaId: string) {
//   if (!process.env.DATABASE_URL) {
//     throw new Error('DATABASE_URL is not defined in environment variables')
//   }
//   const url = new URL(process.env.DATABASE_URL)
//   url.searchParams.set('schema', schemaId)
//   return url.toString()
// }

// // ← Isso tudo roda IMEDIATAMENTE quando o Vitest carrega o arquivo
// const schemaId = randomUUID()
// const databaseUrl = generateUniqueDatabaseUrl(schemaId)

// process.env.DATABASE_URL = databaseUrl
// process.env.TEST_SCHEMA_ID = schemaId // opcional, para cleanup

// console.log(`Schema de teste: ${schemaId}`)
// console.log(databaseUrl)

// // Roda migrate no schema novo ANTES da app iniciar
// execSync('npx prisma migrate deploy', { stdio: 'inherit' })

// // Cleanup automático ao final do processo
// const cleanupPool = new Pool({ connectionString: databaseUrl })
// const cleanupAdapter = new PrismaPg(cleanupPool)
// const prismaCleanup = new PrismaClient({ adapter: cleanupAdapter })

// process.on('SIGINT', async () => {
//   await prismaCleanup.$executeRawUnsafe(
//     `DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`,
//   )
//   await prismaCleanup.$disconnect()
//   process.exit()
// })

// process.on('exit', async () => {
//   try {
//     await prismaCleanup.$executeRawUnsafe(
//       `DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`,
//     )
//     console.log(`Schema ${schemaId} removido`)
//   } catch {}
//   await prismaCleanup.$disconnect()
// })
