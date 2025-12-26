import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { rateLimiters } from '@/lib/security/rate-limit'
import { requireAdmin, getUserFromRequest } from '@/lib/security/auth'
import { logAdminAction } from '@/lib/security/audit'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'
import crypto from 'crypto'

const prisma = new PrismaClient()

// GET: List all API keys (metadata only)
async function getHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Authentication - requires admin
    const authResult = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResult) return authResult

    // Get all API keys with creator info
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Fetch creator names and tied user info
    const keysWithCreators = await Promise.all(
      keys.map(async (key) => {
        const creator = await prisma.user.findUnique({
          where: { id: key.createdBy },
          select: { name: true, uid: true }
        })

        const tiedUser = key.userId ? await prisma.user.findUnique({
          where: { id: key.userId },
          select: { name: true, uid: true, image: true }
        }) : null

        return {
          id: key.id,
          name: key.name,
          createdBy: key.createdBy,
          creatorName: creator?.name || 'Unknown',
          creatorUid: creator?.uid || null,
          userId: key.userId,
          tiedUserName: tiedUser?.name || null,
          tiedUserUid: tiedUser?.uid || null,
          tiedUserImage: tiedUser?.image || null,
          permissions: key.permissions,
          lastUsedAt: key.lastUsedAt,
          expiresAt: key.expiresAt,
          revoked: key.revoked,
          frozen: key.frozen,
          createdAt: key.createdAt,
          updatedAt: key.updatedAt,
          hasPlainKey: !!key.plainKey // Indicate if plain key is available
        }
      })
    )

    return NextResponse.json({ keys: keysWithCreators })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST: Create new API key (requires session-based auth, not API key)
async function postHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // IMPORTANT: Only allow session-based auth for creating keys (prevents key-ception)
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

    const userRoles = user.roles.map(r => r.name.toLowerCase())
    const hasRequiredRole = ['owner', 'developer', 'admin'].some(role => 
      userRoles.includes(role.toLowerCase())
    )

    if (!hasRequiredRole) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { name, permissions, expiresInDays, userId } = await req.json()

    if (!name || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Name and permissions required' }, { status: 400 })
    }

    // Validate userId if provided
    if (userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      })
      if (!targetUser) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
      }
    }

    // Generate API key: ct_<random hex>
    const randomBytes = crypto.randomBytes(32)
    const plainKey = `ct_${randomBytes.toString('hex')}`

    // Hash the key
    const hashedKey = await bcrypt.hash(plainKey, 12)

    // Encrypt plain key for Owner/Developer access
    const { encrypt } = await import('@/lib/security/encryption')
    const encryptedPlainKey = encrypt(plainKey)

    // Calculate expiration
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    // Store hashed key and encrypted plain key
    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        plainKey: encryptedPlainKey,
        name,
        createdBy: user.id,
        userId: userId || null,
        permissions,
        expiresAt
      }
    })

    // Log action
    await logAdminAction(user.id, 'api_key_created', req, { keyId: apiKey.id, name })

    // Return plain key ONCE (user must save immediately)
    return NextResponse.json({
      key: plainKey,
      id: apiKey.id,
      name: apiKey.name,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      warning: 'This key will only be shown once. Save it immediately!'
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}

// DELETE: Revoke API key (requires session-based auth)
async function deleteHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // IMPORTANT: Only allow session-based auth for revoking keys
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

    const userRoles = user.roles.map(r => r.name.toLowerCase())
    const hasRequiredRole = ['owner', 'developer', 'admin'].some(role => 
      userRoles.includes(role.toLowerCase())
    )

    if (!hasRequiredRole) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { keyId } = await req.json()

    if (!keyId) {
      return NextResponse.json({ error: 'keyId required' }, { status: 400 })
    }

    // Revoke the key (set revoked: true)
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revoked: true }
    })

    // Log action
    await logAdminAction(user.id, 'api_key_revoked', req, { keyId })

    return NextResponse.json({ success: true, message: 'API key revoked' })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}

// PATCH: Freeze/unfreeze API key (requires session-based auth)
async function patchHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // IMPORTANT: Only allow session-based auth
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

    const userRoles = user.roles.map(r => r.name.toLowerCase())
    const hasRequiredRole = ['owner', 'developer', 'admin'].some(role => 
      userRoles.includes(role.toLowerCase())
    )

    if (!hasRequiredRole) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { keyId, frozen, freezeAll, revokeAll } = await req.json()

    // Handle freeze all
    if (freezeAll === true) {
      const result = await prisma.apiKey.updateMany({
        where: { revoked: false, frozen: false },
        data: { frozen: true }
      })
      await logAdminAction(user.id, 'api_keys_frozen_all', req, { count: result.count })
      return NextResponse.json({ success: true, message: `Frozen ${result.count} API keys` })
    }

    // Handle revoke all
    if (revokeAll === true) {
      const result = await prisma.apiKey.updateMany({
        where: { revoked: false },
        data: { revoked: true }
      })
      await logAdminAction(user.id, 'api_keys_revoked_all', req, { count: result.count })
      return NextResponse.json({ success: true, message: `Revoked ${result.count} API keys` })
    }

    // Handle single key freeze/unfreeze
    if (!keyId || typeof frozen !== 'boolean') {
      return NextResponse.json({ error: 'keyId and frozen required' }, { status: 400 })
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { frozen }
    })

    await logAdminAction(user.id, frozen ? 'api_key_frozen' : 'api_key_unfrozen', req, { keyId })

    return NextResponse.json({ success: true, message: frozen ? 'API key frozen' : 'API key unfrozen' })
  } catch (error) {
    console.error('Error freezing/unfreezing API key:', error)
    return NextResponse.json({ error: 'Failed to freeze/unfreeze API key' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)
export const DELETE = withRequestLogging(deleteHandler)
export const PATCH = withRequestLogging(patchHandler)

