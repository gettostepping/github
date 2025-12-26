const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyRestore() {
  try {
    console.log('🔍 Verifying database restoration...\n')
    
    await prisma.$connect()
    console.log('✅ Connected to database\n')
    
    // Check all important tables
    const counts = {
      users: await prisma.user.count(),
      profiles: await prisma.profile.count(),
      watchlists: await prisma.watchlist.count(),
      roles: await prisma.role.count(),
      comments: await prisma.profileComment.count(),
      ratings: await prisma.rating.count(),
      invites: await prisma.invites.count(),
      bans: await prisma.ban.count(),
      apiKeys: 0 // Will check separately since table might not exist
    }
    
    console.log('📊 Database Counts:')
    console.log('─'.repeat(40))
    Object.entries(counts).forEach(([table, count]) => {
      const icon = count > 0 ? '✅' : '❌'
      console.log(`${icon} ${table.padEnd(15)}: ${count}`)
    })
    console.log('─'.repeat(40))
    
    const totalData = Object.values(counts).reduce((a, b) => a + b, 0)
    
    if (totalData === 0) {
      console.log('\n⚠️  Database appears to be empty')
      console.log('💡 You need to restore from Neon backup branch first!')
      console.log('   See: scripts/restore-neon-step-by-step.md')
    } else if (counts.users === 0) {
      console.log('\n⚠️  No users found, but other data exists')
      console.log('💡 This might be a partial restore')
    } else {
      console.log('\n✅ Database has data!')
      
      // Show sample users
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          name: true,
          email: true,
          uid: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })
      
      if (users.length > 0) {
        console.log('\n👥 Sample Users:')
        users.forEach(user => {
          console.log(`   - ${user.name || 'No name'} (${user.email || 'No email'}) - UID: ${user.uid}`)
        })
      }
      
      // Check for owner role
      const ownerRole = await prisma.role.findFirst({
        where: { name: 'owner' },
        include: { user: { select: { name: true, uid: true } } }
      })
      
      if (ownerRole) {
        console.log(`\n👑 Owner found: ${ownerRole.user.name} (UID: ${ownerRole.user.uid})`)
      } else {
        console.log('\n⚠️  No owner role found')
        console.log('💡 Run: node scripts/assign-owner.js (after restoring data)')
      }
      
      // Check ApiKey table
      try {
        const apiKeyCount = await prisma.apiKey.count()
        if (apiKeyCount === 0) {
          console.log('\n💡 ApiKey table exists but is empty (this is normal)')
        } else {
          console.log(`\n🔑 ApiKey table exists with ${apiKeyCount} keys`)
        }
      } catch (e) {
        console.log('\n💡 ApiKey table does not exist yet (will add after restore)')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('ApiKey')) {
      console.log('\n💡 ApiKey table might not exist yet')
      console.log('   Run: npx dotenv-cli -e .env.local -- node scripts/add-api-key-table-safe.js')
    }
  } finally {
    await prisma.$disconnect()
  }
}

verifyRestore()

