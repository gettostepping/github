const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

async function exportData() {
  try {
    console.log('📦 Exporting database data...\n')
    
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error('❌ DATABASE_URL not set in environment')
      return
    }
    
    // Check if pg_dump is available
    try {
      execSync('pg_dump --version', { stdio: 'ignore' })
    } catch (e) {
      console.error('❌ pg_dump not found. Please install PostgreSQL client tools.')
      console.log('   Windows: Download from https://www.postgresql.org/download/windows/')
      console.log('   Or use: npm install -g pg-dump')
      return
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `backup-${timestamp}.sql`
    
    console.log(`📝 Creating backup: ${filename}`)
    console.log('   This may take a moment...\n')
    
    // Export using pg_dump
    execSync(`pg_dump "${dbUrl}" > ${filename}`, { stdio: 'inherit' })
    
    console.log(`\n✅ Backup created: ${filename}`)
    console.log(`   File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`)
    
    // Also export as JSON for easy inspection
    console.log('\n📊 Exporting data counts...')
    
    const counts = {
      users: await prisma.user.count(),
      profiles: await prisma.profile.count(),
      watchlists: await prisma.watchlist.count(),
      roles: await prisma.role.count(),
      comments: await prisma.profileComment.count(),
      ratings: await prisma.rating.count(),
      invites: await prisma.invites.count(),
      bans: await prisma.ban.count()
    }
    
    fs.writeFileSync('backup-counts.json', JSON.stringify(counts, null, 2))
    console.log('✅ Counts exported to: backup-counts.json')
    console.log('\n📊 Current database counts:')
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()

