import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security/auth'
import { rateLimiters } from '@/lib/security/rate-limit'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// GET - Fetch all pending registrations
async function getHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Auth check - supports both session and API key
    const authResponse = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResponse) return authResponse

    // Check API key permissions if using API key
    const apiKey = (req as any).apiKey
    if (apiKey) {
      const { hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
      if (!hasApiKeyPermission(apiKey, 'admin.users.read') && !hasApiKeyPermission(apiKey, 'admin.*')) {
        return NextResponse.json({ error: 'Insufficient permissions. Requires admin.users.read' }, { status: 403 })
      }
    }
    
    const pendingRegistrations = await prisma.pendingRegistration.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ registrations: pendingRegistrations })
    
  } catch (error) {
    console.error('Error fetching pending registrations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending registrations' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Approve or Deny a registration
async function postHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Auth check - supports both session and API key
    const authResponse = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResponse) return authResponse

    // Check API key permissions if using API key
    const apiKey = (req as any).apiKey
    if (apiKey) {
      const { hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
      if (!hasApiKeyPermission(apiKey, 'admin.users.read') && !hasApiKeyPermission(apiKey, 'admin.*')) {
        return NextResponse.json({ error: 'Insufficient permissions. Requires admin.users.read' }, { status: 403 })
      }
    }
    
    const body = await req.json()
    const { registrationId, action } = body // action: 'approve' or 'deny'
    
    if (!registrationId || !action) {
      return NextResponse.json(
        { error: 'Registration ID and action are required' },
        { status: 400 }
      )
    }
    
    const registration = await prisma.pendingRegistration.findUnique({
      where: { id: registrationId }
    })
    
    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }
    
    if (action === 'approve') {
      // Create the user account
      console.log(`✅ Approving registration for ${registration.email}`)
      
      // Generate unique UID - check both active users AND deleted users to never reuse UIDs
      const lastUser = await prisma.user.findFirst({
        orderBy: { uid: 'desc' },
        select: { uid: true }
      })
      
      const lastDeletedUser = await prisma.trackedIdentity.findFirst({
        orderBy: { originalUid: 'desc' },
        select: { originalUid: true },
        where: { originalUid: { not: null } }
      })
      
      // Use the highest UID from either active or deleted users
      const highestUid = Math.max(lastUser?.uid ?? 0, lastDeletedUser?.originalUid ?? 0)
      const nextUid = highestUid + 1
      
      console.log(`📊 UID Generation: Last active UID: ${lastUser?.uid ?? 0}, Last deleted UID: ${lastDeletedUser?.originalUid ?? 0}, Assigning: ${nextUid}`)
      
      // Create user (with password from pending registration)
      await prisma.user.create({
        data: {
          email: registration.email,
          name: registration.name,
          password: registration.password, // Use stored hashed password
          discordId: registration.discordId,
          image: registration.avatarUrl || '/noprofilepicture.jpg',
          banner: registration.bannerUrl,
          uid: nextUid,
          profile: {
            create: {}
          }
        }
      })
      
      // Remove from tracked identities (they're approved now)
      await prisma.trackedIdentity.deleteMany({
        where: {
          OR: [
            { discordId: registration.discordId },
            { email: registration.email }
          ]
        }
      })
      
      // Mark invite as used if it's a valid invite code
      if (registration.inviteCode && registration.inviteCode !== 'TRACKED_USER') {
        await prisma.invites.updateMany({
          where: { code: registration.inviteCode },
          data: { usedBy: nextUid }
        })
      }
      
      // Update pending registration status
      await prisma.pendingRegistration.update({
        where: { id: registrationId },
        data: { status: 'approved' }
      })
      
      console.log(`✅ Approved and created user: ${registration.email} (UID: ${nextUid})`)
      
      return NextResponse.json({
        success: true,
        message: `Registration approved for ${registration.name}`,
        uid: nextUid
      })
      
    } else if (action === 'deny') {
      // Mark registration as denied
      await prisma.pendingRegistration.update({
        where: { id: registrationId },
        data: { status: 'denied' }
      })
      
      // Disable the invite code and mark it as denied (usedBy: -1)
      if (registration.inviteCode && registration.inviteCode !== 'TRACKED_USER') {
        await prisma.invites.updateMany({
          where: { code: registration.inviteCode },
          data: { 
            enabled: false,
            usedBy: -1  // Special value indicating denied registration
          }
        })
        console.log(`🔒 Disabled invite code (denied registration): ${registration.inviteCode}`)
      }
      
      console.log(`❌ Denied registration for ${registration.email}`)
      
      return NextResponse.json({
        success: true,
        message: `Registration denied for ${registration.name}`
      })
      
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "deny"' },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Error processing registration:', error)
      return NextResponse.json(
        { error: 'Failed to process registration', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    } finally {
      await prisma.$disconnect()
    }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)

