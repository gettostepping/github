const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUserRoles() {
  try {
    // Get all users with their roles
    const users = await prisma.user.findMany({
      include: {
        roles: true
      }
    })

    console.log('All users and their roles:')
    users.forEach(user => {
      console.log(`User: ${user.name} (${user.email}) - UID: ${user.uid}`)
      console.log(`Roles: ${user.roles.map(r => r.name).join(', ') || 'None'}`)
      console.log('---')
    })

    // Check if there are any presence records
    const presence = await prisma.presence.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            uid: true
          }
        }
      }
    })

    console.log('\nPresence records:')
    presence.forEach(p => {
      console.log(`User: ${p.user.name} (${p.user.email}) - UID: ${p.user.uid} - Last seen: ${p.updatedAt}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserRoles()
