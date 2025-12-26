const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function assignOwnerRole() {
  try {
    // Get the first user (you) and assign owner role
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!user) {
      console.log('No users found in database')
      return
    }

    console.log(`Found user: ${user.name} (${user.email}) with UID: ${user.uid}`)

    // Assign owner role
    await prisma.role.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: 'owner'
        }
      },
      update: {},
      create: {
        userId: user.id,
        name: 'owner'
      }
    })

    console.log('✅ Owner role assigned successfully!')
    console.log(`User ${user.name} is now the owner with UID ${user.uid}`)
  } catch (error) {
    console.error('Error assigning owner role:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignOwnerRole()
