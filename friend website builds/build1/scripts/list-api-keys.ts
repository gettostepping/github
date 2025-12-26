/**
 * List all API keys to help identify which keys to use for testing
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function listApiKeys() {
  try {
    const keys = await prisma.apiKey.findMany({
      where: {
        revoked: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch user info for keys that have userId
    const keysWithUsers = await Promise.all(
      keys.map(async (key) => {
        if (key.userId) {
          const user = await prisma.user.findUnique({
            where: { id: key.userId },
            select: { name: true, uid: true, image: true }
          })
          return { ...key, user }
        }
        return { ...key, user: null }
      })
    )

    console.log('\n📋 Available API Keys:\n')
    console.log('═'.repeat(80))

    if (keysWithUsers.length === 0) {
      console.log('No API keys found.')
      return
    }

    keysWithUsers.forEach((key, index) => {
      const keyType = getApiTypeFromPermissions(key.permissions)
      const typeLabel = keyType === 'public' ? 'Public' : keyType === 'private' ? 'Private' : 'Mixed'
      const typeColor = keyType === 'public' ? '\x1b[34m' : keyType === 'private' ? '\x1b[35m' : '\x1b[33m'
      
      console.log(`\n${index + 1}. ${key.name}`)
      console.log(`   ID: ${key.id}`)
      console.log(`   Type: ${typeColor}${typeLabel}\x1b[0m`)
      console.log(`   Status: ${key.frozen ? '\x1b[33mFrozen\x1b[0m' : '\x1b[32mActive\x1b[0m'}`)
      console.log(`   Permissions: ${key.permissions.length} permission(s)`)
      if (key.user) {
        console.log(`   Tied to: ${key.user.name} (UID: ${key.user.uid})`)
      }
      if (key.expiresAt) {
        const daysUntilExpiry = Math.ceil((key.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        console.log(`   Expires: ${key.expiresAt.toLocaleDateString()} (${daysUntilExpiry} days)`)
      } else {
        console.log(`   Expires: Never`)
      }
      console.log(`   Last Used: ${key.lastUsedAt ? key.lastUsedAt.toLocaleString() : 'Never'}`)
      console.log(`   Created: ${key.createdAt.toLocaleString()}`)
    })

    console.log('\n' + '═'.repeat(80))
    console.log('\n⚠️  Note: For security reasons, the actual API key values cannot be retrieved.')
    console.log('   You need to use the keys you saved when they were created.')
    console.log('   If you don\'t have the keys, you\'ll need to create new ones.\n')

  } catch (error) {
    console.error('Error listing API keys:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getApiTypeFromPermissions(permissions: string[]): 'public' | 'private' | 'mixed' {
  const hasPublic = permissions.some(p => p.startsWith('public.'))
  const hasPrivate = permissions.some(p => p.startsWith('admin.'))
  
  if (permissions.includes('admin.*')) {
    const hasIndividualPublic = permissions.some(p => 
      p.startsWith('public.') && p !== 'public.*'
    )
    return hasIndividualPublic ? 'mixed' : 'private'
  }
  
  if (permissions.includes('public.*') && !hasPrivate) {
    return 'public'
  }
  
  if (hasPublic && hasPrivate) return 'mixed'
  if (hasPrivate) return 'private'
  return 'public'
}

listApiKeys()

