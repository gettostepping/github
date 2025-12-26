const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('Testing database connection...')
    
    // Check if we can connect
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check user count
    const userCount = await prisma.user.count()
    console.log(`📊 Total users: ${userCount}`)
    
    // Check if there are any users
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          uid: true,
          createdAt: true
        }
      })
      
      console.log('\n👥 Users in database:')
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - UID: ${user.uid} - Created: ${user.createdAt}`)
      })
    } else {
      console.log('❌ No users found in database')
      console.log('💡 User needs to sign in to create their account')
    }
    
    // Check presence records
    const presenceCount = await prisma.presence.count()
    console.log(`\n📡 Presence records: ${presenceCount}`)
    
    // Check profiles
    const profileCount = await prisma.profile.count()
    console.log(`👤 Profile records: ${profileCount}`)
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
