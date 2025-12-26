require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateOldAvatars() {
  try {
    console.log('🔍 Finding users with old UnknownUser1024 image URLs...')
    
    // Find all users with the old Discord CDN URL
    const usersWithOldImage = await prisma.user.findMany({
      where: {
        OR: [
          { image: { contains: 'UnknownUser1024' } },
          { image: { contains: '1431052716796547072' } }
        ]
      },
      select: {
        id: true,
        uid: true,
        name: true,
        image: true,
        discordId: true
      }
    })

    console.log(`📊 Found ${usersWithOldImage.length} users with old image URLs`)

    if (usersWithOldImage.length === 0) {
      console.log('✅ No users need updating!')
      return
    }

    // Update all users to use the new image
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { image: { contains: 'UnknownUser1024' } },
          { image: { contains: '1431052716796547072' } }
        ]
      },
      data: {
        image: '/noprofilepicture.jpg'
      }
    })

    console.log(`✅ Updated ${result.count} users to use /noprofilepicture.jpg`)
    console.log('\n📋 Updated users:')
    usersWithOldImage.forEach(user => {
      console.log(`  - ${user.name || 'Unknown'} (UID: ${user.uid}) - ${user.discordId ? 'Has Discord' : 'No Discord'}`)
    })

  } catch (error) {
    console.error('❌ Error updating avatars:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateOldAvatars()

