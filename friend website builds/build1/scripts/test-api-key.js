const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function testApiKey() {
  try {
    console.log('🔑 Testing API Key System\n')
    
    // Step 1: Check if we have a user to create the key for
    const users = await prisma.user.findMany({
      take: 1,
      include: { roles: true }
    })
    
    if (users.length === 0) {
      console.log('❌ No users found in database')
      console.log('   You need at least one user to create an API key')
      return
    }
    
    const user = users[0]
    const userRoles = user.roles.map(r => r.name.toLowerCase())
    const hasPermission = ['owner', 'developer', 'admin'].some(role => 
      userRoles.includes(role.toLowerCase())
    )
    
    if (!hasPermission) {
      console.log(`⚠️  User "${user.name}" doesn't have owner/developer/admin role`)
      console.log('   Assigning owner role for testing...')
      
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
      console.log('   ✅ Owner role assigned\n')
    }
    
    // Step 2: Create a test API key manually
    console.log('📝 Creating test API key...')
    
    // Generate key
    const randomBytes = crypto.randomBytes(32)
    const plainKey = `ct_${randomBytes.toString('hex')}`
    
    // Hash the key
    const hashedKey = await bcrypt.hash(plainKey, 12)
    
    // Create in database
    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: 'Test API Key',
        createdBy: user.id,
        permissions: ['admin.read', 'users.read']
      }
    })
    
    console.log('✅ API key created successfully!\n')
    console.log('─'.repeat(60))
    console.log('🔑 YOUR API KEY (save this - it won\'t be shown again!):')
    console.log('─'.repeat(60))
    console.log(plainKey)
    console.log('─'.repeat(60))
    console.log('\n📋 Key Details:')
    console.log(`   ID: ${apiKey.id}`)
    console.log(`   Name: ${apiKey.name}`)
    console.log(`   Permissions: ${apiKey.permissions.join(', ')}`)
    console.log(`   Created By: ${user.name} (${user.email})`)
    
    // Step 3: Test the API key
    console.log('\n🧪 Testing API key authentication...')
    
    // Test by calling the API endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    console.log(`\n📡 Testing endpoint: ${baseUrl}/api/admin/stats`)
    console.log('   Using API key authentication...\n')
    
    const response = await fetch(`${baseUrl}/api/admin/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${plainKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ API key authentication successful!')
      console.log('\n📊 Response data:')
      console.log(JSON.stringify(data, null, 2))
    } else {
      const error = await response.json()
      console.log('❌ API key authentication failed!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${error.error || 'Unknown error'}`)
    }
    
    // Step 4: Show usage examples
    console.log('\n📚 Usage Examples:')
    console.log('─'.repeat(60))
    console.log('\n1. Using curl:')
    console.log(`   curl -H "Authorization: Bearer ${plainKey.substring(0, 20)}..." \\`)
    console.log(`        ${baseUrl}/api/admin/stats`)
    
    console.log('\n2. Using JavaScript/TypeScript:')
    console.log(`   const response = await fetch('${baseUrl}/api/admin/stats', {`)
    console.log(`     headers: {`)
    console.log(`       'Authorization': 'Bearer ${plainKey.substring(0, 20)}...'`)
    console.log(`     }`)
    console.log(`   })`)
    
    console.log('\n3. Using Postman/Insomnia:')
    console.log(`   - Method: GET`)
    console.log(`   - URL: ${baseUrl}/api/admin/stats`)
    console.log(`   - Headers: Authorization: Bearer ${plainKey.substring(0, 20)}...`)
    
    console.log('\n⚠️  Important: Save your API key now!')
    console.log(`   Key: ${plainKey}`)
    console.log('   This key will not be shown again.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure your dev server is running:')
      console.log('   npm run dev')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testApiKey()

