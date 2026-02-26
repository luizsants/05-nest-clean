import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@/../generated/prisma/client.js'
import { Pool, PoolConfig } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool
  private testSchema: string | undefined

  constructor() {
    // Get test schema from env (set by test/setup-e2e.ts at worker startup)
    const testSchema = process.env.TEST_SCHEMA

    // Parse connection string to extract components
    const connectionString = process.env.DATABASE_URL!
    const url = new URL(connectionString)

    // Build pool config with schema set via 'options' parameter
    // This sets search_path at PostgreSQL protocol level (synchronous, no race condition)
    const poolConfig: PoolConfig = {
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      max: 5,
    }

    if (testSchema) {
      // Set search_path via PostgreSQL startup options (GUC parameters)
      // This is applied BEFORE any queries run on the connection
      poolConfig.options = `-c search_path=${testSchema}`
    }

    const pool = new Pool(poolConfig)
    const adapter = new PrismaPg(pool)
    super({ adapter })

    this.pool = pool
    this.testSchema = testSchema
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
    await this.pool.end()
  }
}
