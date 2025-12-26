require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupOwner() {
  const ownerEmail = process.argv[2]
  const ownerName = process.argv[3] || 'Owner'
  const ownerPassword = process.argv[4]

  if (!ownerEmail || !ownerPassword) {
    console.error('❌ Usage: node scripts/setup-owner.js <email> <name> <password>')
    console.error('   Example: node scripts/setup-owner.js owner@example.com "Admin User" mypassword123')
    process.exit(1)
  }

  try {
    console.log(`🔍 Checking for existing user: ${ownerEmail}`)
    
    let user = await prisma.user.findUnique({
      where: { email: ownerEmail }
    })

    if (!user) {
      console.log(`👤 Creating new user...`)
      const hashedPassword = await bcrypt.hash(ownerPassword, 10)
      
      // Get next UID
      const lastUser = await prisma.user.findFirst({
        orderBy: { uid: 'desc' },
        select: { uid: true }
      })
      const nextUid = (lastUser?.uid ?? 0) + 1

      user = await prisma.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          password: hashedPassword,
          uid: nextUid,
          image: '/UnknownUser1024.png'
        }
      })
      console.log(`✅ User created with UID: ${user.uid}`)

      // Create profile
      await prisma.profile.create({
        data: {
          userId: user.id,
          bio: 'Website Owner & Administrator'
        }
      })
      console.log(`✅ Profile created`)
    } else {
      console.log(`✅ User found with UID: ${user.uid}`)
    }

    // Set Owner role
    const existingRole = await prisma.role.findFirst({
      where: { 
        userId: user.id,
        name: 'Owner'
      }
    })

    if (existingRole) {
      console.log(`✅ Owner role already exists`)
    } else {
      await prisma.role.create({
        data: {
          userId: user.id,
          name: 'Owner'
        }
      })
      console.log(`✅ Created Owner role`)
    }

    console.log(`\n🎉 Setup complete!`)
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔢 UID: ${user.uid}`)
    console.log(`👑 Role: Owner`)
    console.log(`\nYou can now sign in with these credentials.`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupOwner()

