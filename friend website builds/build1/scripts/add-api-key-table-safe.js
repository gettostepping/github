const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function addApiKeyTableSafely() {
  try {
    console.log('🔒 Safely adding ApiKey table to database...\n')
    
    // Check if table already exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ApiKey'
      )
    `
    
    if (tableExists[0].exists) {
      console.log('✅ ApiKey table already exists!')
      console.log('   Skipping table creation.\n')
      
      // Check structure
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ApiKey'
        ORDER BY ordinal_position
      `
      
      console.log('📋 Current ApiKey table structure:')
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`)
      })
      
      return
    }
    
    console.log('🚀 Executing safe migration (only adds ApiKey table)...\n')
    
    // Execute SQL statements one at a time
    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "lastUsedAt" TIMESTAMP(3),
        "expiresAt" TIMESTAMP(3),
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
      )
    `)
    console.log('   ✅ ApiKey table created')
    
    // Create unique index on key
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_key_key" ON "ApiKey"("key")
    `)
    console.log('   ✅ Unique index on key created')
    
    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ApiKey_createdBy_idx" ON "ApiKey"("createdBy")
    `)
    console.log('   ✅ Index on createdBy created')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ApiKey_revoked_idx" ON "ApiKey"("revoked")
    `)
    console.log('   ✅ Index on revoked created')
    
    console.log('✅ ApiKey table created successfully!')
    console.log('   ✅ No existing tables were modified')
    console.log('   ✅ All your data is safe\n')
    
    // Verify the table was created
    const verify = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "ApiKey"
    `
    console.log(`📊 ApiKey table ready (currently has ${verify[0].count} keys)`)
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ ApiKey table already exists!')
    } else {
      console.error('❌ Error:', error.message)
      console.log('\n💡 This is a safe operation - if it fails, your existing data is not affected')
    }
  } finally {
    await prisma.$disconnect()
  }
}

addApiKeyTableSafely()

