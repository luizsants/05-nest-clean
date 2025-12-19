// test/cleanup-schemas.ts
import 'dotenv/config'
import { Pool } from 'pg'

async function cleanupOrphanSchemas() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('🧹 Limpando schemas UUID órfãos...')

    // Busca todos os schemas UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const result = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `)

    if (result.rows.length === 0) {
      console.log('✅ Nenhum schema órfão encontrado')
      return
    }

    console.log(`📋 Encontrados ${result.rows.length} schemas para remover`)

    // Remove cada schema
    for (const row of result.rows) {
      const schemaName = row.schema_name
      try {
        await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
        console.log(`   ✓ Removido: ${schemaName}`)
      } catch (error) {
        console.log(`   ✗ Erro ao remover ${schemaName}:`, error)
      }
    }

    console.log('✅ Limpeza concluída!')
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

cleanupOrphanSchemas()
