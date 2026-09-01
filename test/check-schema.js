const { Pool } = require('pg')
const p = new Pool({
  connectionString: 'postgresql://docker:docker@localhost:6000/nest-clean-test',
})

async function main() {
  const { rows } = await p.query(
    "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'test_manual'",
  )
  console.log(
    'Tables in test_manual:',
    rows.map((r) => r.tablename),
  )

  const { rows: schemas } = await p.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'test_%'",
  )
  console.log(
    'Test schemas:',
    schemas.map((r) => r.schema_name),
  )

  await p.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
