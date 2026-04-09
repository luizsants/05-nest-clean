/**
 * Seed script to create an initial admin (INSTRUCTOR) user.
 *
 * Usage:
 *   npx tsx prisma/seed-admin.ts
 *
 * Environment: reads DATABASE_URL from .env
 *
 * Default credentials (change the password after first login!):
 *   Email:    admin@nestforum.com
 *   Password: Admin@2024!
 */

import 'dotenv/config'
import { hash } from 'bcryptjs'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

const ADMIN_EMAIL = 'admin@nestforum.com'
const ADMIN_NAME = 'Admin'
const ADMIN_PASSWORD = 'Admin@2024!'
const HASH_SALT_ROUNDS = 12

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    // Check if admin already exists
    const existing = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [ADMIN_EMAIL],
    )

    if (existing.rows.length > 0) {
      const user = existing.rows[0]
      console.log(`ℹ️  Admin user already exists:`)
      console.log(`   ID:    ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role:  ${user.role}`)

      // Ensure role is INSTRUCTOR
      if (user.role !== 'INSTRUCTOR') {
        await client.query('UPDATE users SET role = $1 WHERE email = $2', [
          'INSTRUCTOR',
          ADMIN_EMAIL,
        ])
        console.log(`   ✅ Role updated to INSTRUCTOR`)
      }
      return
    }

    // Create username
    const hashedPassword = await hash(ADMIN_PASSWORD, HASH_SALT_ROUNDS)
    const id = randomUUID()

    await client.query(
      `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)`,
      [id, ADMIN_NAME, ADMIN_EMAIL, hashedPassword, 'INSTRUCTOR'],
    )

    console.log(`✅ Admin user created successfully!`)
    console.log(`   ID:       ${id}`)
    console.log(`   Email:    ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`   Role:     INSTRUCTOR`)
    console.log(``)
    console.log(`⚠️  Change the password after first login!`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('❌ Failed to seed admin:', err)
  process.exit(1)
})
