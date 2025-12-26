/**
 * GET: Retrieve plain API key (Owner/Developer only)
 * This allows Owners/Developers to view API keys even after creation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { rateLimiters } from '@/lib/security/rate-limit'
import { decrypt } from '@/lib/security/encryption'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Extract key ID from URL pathname
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const keyId = pathParts[pathParts.length - 1]

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    // IMPORTANT: Only allow session-based auth (Owner/Developer only)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Session authentication required' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only Owner and Developer can retrieve plain keys
    const userRoles = user.roles.map(r => r.name.toLowerCase())
    const isOwnerOrDeveloper = userRoles.includes('owner') || userRoles.includes('developer')

    if (!isOwnerOrDeveloper) {
      return NextResponse.json({ error: 'Only Owners and Developers can retrieve API keys' }, { status: 403 })
    }

    // Fetch the API key
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        plainKey: true,
        name: true,
        revoked: true
      }
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (apiKey.revoked) {
      return NextResponse.json({ error: 'Cannot retrieve revoked API key' }, { status: 400 })
    }

    if (!apiKey.plainKey) {
      return NextResponse.json({ error: 'Plain key not available for this API key' }, { status: 404 })
    }

    // Decrypt the plain key
    try {
      const plainKey = decrypt(apiKey.plainKey)
      return NextResponse.json({
        key: plainKey,
        id: apiKey.id,
        name: apiKey.name
      })
    } catch (error) {
      console.error('Error decrypting API key:', error)
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error retrieving API key:', error)
    return NextResponse.json({ error: 'Failed to retrieve API key' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)

