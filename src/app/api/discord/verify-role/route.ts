import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyApiKey, hasApiKeyPermission } from '@/lib/security/api-key-auth'
import { rateLimiters } from '@/lib/security/rate-limit'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const discordId = searchParams.get('discordId')

  if (!discordId) {
    return NextResponse.json({ error: 'discordId required' }, { status: 400 })
  }

  // Check API key authentication
  const apiKey = await verifyApiKey(req)
  if (!apiKey) {
    return NextResponse.json({ error: 'Not authenticated. API key required.' }, { status: 401 })
  }

  // Check permissions - allow admin.* or public.discord.verify
  const hasAccess = hasApiKeyPermission(apiKey, 'admin.*') || 
                    hasApiKeyPermission(apiKey, 'public.discord.verify') ||
                    hasApiKeyPermission(apiKey, '*')
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Insufficient permissions. Requires admin.* or public.discord.verify' }, { status: 403 })
  }

  // Apply rate limiting for API keys
  const rateLimitResult = await rateLimiters.apiKey(req)
  if (rateLimitResult) return rateLimitResult

  try {
    // Find user by Discord ID
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({
        hasAccess: false,
        found: false,
        message: 'User not found with this Discord ID'
      })
    }

    // Check roles
    const isOwner = user.roles.some(r => r.name.toLowerCase() === 'owner')
    const isDeveloper = user.roles.some(r => r.name.toLowerCase() === 'developer')
    const isAdmin = user.roles.some(r => r.name.toLowerCase() === 'admin')
    const roles = user.roles.map(r => r.name)

    return NextResponse.json({
      hasAccess: isOwner || isDeveloper || isAdmin,
      isOwner,
      isDeveloper,
      isAdmin,
      roles,
      uid: user.uid,
      name: user.name,
      found: true
    })
  } catch (error) {
    console.error('Error verifying Discord role:', error)
    return NextResponse.json({ error: 'Failed to verify role' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)

