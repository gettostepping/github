const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function assignOwnerRole() {
  try {
    console.log('🔍 Looking for users to assign owner role...')
    
    // Get all users
    const users = await prisma.user.findMany({
      include: {
        roles: true
      }
    })
    
    if (users.length === 0) {
      console.log('❌ No users found. Please sign in first to create your account.')
      return
    }
    
    console.log(`\n👥 Found ${users.length} user(s):`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - UID: ${user.uid}`)
      console.log(`   Roles: ${user.roles.map(r => r.name).join(', ') || 'None'}`)
    })
    
    // Check if any user already has owner role
    const hasOwner = users.some(user => user.roles.some(role => role.name === 'owner'))
    
    if (hasOwner) {
      console.log('\n✅ Owner role already assigned')
      return
    }
    
    // Assign owner role to the first user
    const firstUser = users[0]
    console.log(`\n👑 Assigning owner role to: ${firstUser.name} (${firstUser.email})`)
    
    await prisma.role.create({
      data: {
        userId: firstUser.id,
        name: 'owner'
      }
    })
    
    console.log('✅ Owner role assigned successfully!')
    console.log('\n🎉 You now have admin access!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignOwnerRole()
