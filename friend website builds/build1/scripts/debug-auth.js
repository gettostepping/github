const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugAuth() {
  try {
    console.log('🔍 Debugging authentication and database state...\n')
    
    // Check database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Check all tables
    const userCount = await prisma.user.count()
    const profileCount = await prisma.profile.count()
    const presenceCount = await prisma.presence.count()
    const roleCount = await prisma.role.count()
    
    console.log(`\n📊 Database counts:`)
    console.log(`- Users: ${userCount}`)
    console.log(`- Profiles: ${profileCount}`)
    console.log(`- Presence: ${presenceCount}`)
    console.log(`- Roles: ${roleCount}`)
    
    if (userCount === 0) {
      console.log('\n💡 SOLUTION: The database was reset and is empty.')
      console.log('   The user needs to:')
      console.log('   1. Sign out if currently signed in')
      console.log('   2. Sign in again to create their account')
      console.log('   3. This will populate the database with their data')
    }
    
    // Check if there are any roles defined
    if (roleCount > 0) {
      const roles = await prisma.role.findMany()
      console.log('\n🎭 Roles in database:')
      roles.forEach(role => {
        console.log(`- ${role.name} (User: ${role.userId})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAuth()
