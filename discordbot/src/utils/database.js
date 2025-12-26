const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

// Get database URL from environment or use default
const databaseUrl = process.env.BOT_DATABASE_URL || 
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_lFi0mW8VkYDp@ep-snowy-scene-adxjaggr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: databaseUrl,
})

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Create Prisma client with adapter
const prisma = new PrismaClient({
  adapter: adapter,
  log: ['error', 'warn'],
})

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  await pool.end()
})

module.exports = prisma

