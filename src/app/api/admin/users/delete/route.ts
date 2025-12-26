import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// Helper function to check if user is admin/owner/developer
async function isAdminUser(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: true }
  })
  
  if (!user) return false
  
  const adminRoles = user.roles.map(r => r.name.toLowerCase())
  return adminRoles.some(role => ['owner', 'developer', 'admin'].includes(role))
}

async function deleteHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if requesting user is admin/owner/developer
    const isAdmin = await isAdminUser(session.user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    const body = await req.json()
    const { uid } = body
    
    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 })
    }
    
    // Find the user by UID
    const targetUser = await prisma.user.findFirst({
      where: { uid: Number(uid) },
      include: {
        profile: true,
        roles: true
      }
    })
    
    if (!targetUser) {
      return NextResponse.json({ error: `User with UID ${uid} not found` }, { status: 404 })
    }
    
    // Get requesting user info
    const requestingUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })
    
    if (!requestingUser) {
      return NextResponse.json({ error: 'Requesting user not found' }, { status: 404 })
    }
    
    // Prevent users from deleting themselves
    if (targetUser.id === requestingUser.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account through this interface. Please contact another owner or use account settings.' },
        { status: 403 }
      )
    }
    
    // Prevent deletion of owner/developer accounts by non-owners
    const targetRoles = targetUser.roles.map(r => r.name.toLowerCase())
    const requestingRoles = requestingUser.roles.map(r => r.name.toLowerCase())
    const isOwner = requestingRoles.includes('owner')
    
    if ((targetRoles.includes('owner') || targetRoles.includes('developer')) && !isOwner) {
      return NextResponse.json(
        { error: 'Only owners can delete owner/developer accounts' },
        { status: 403 }
      )
    }
    
    // Delete all associated data in the correct order to satisfy foreign key constraints
    console.log(`🗑️  Deleting user "${targetUser.name}" (UID: ${targetUser.uid})`)
    
    // Delete profile views where this user's profile was viewed
    if (targetUser.profile) {
      await prisma.profileView.deleteMany({ where: { profileId: targetUser.profile.id } })
    }
    
    // Delete profile views by this user
    await prisma.profileView.deleteMany({ where: { viewerId: targetUser.id } })
    
    // Delete searches
    await prisma.search.deleteMany({ where: { userId: targetUser.id } })
    
    // Delete comment likes
    await prisma.commentLike.deleteMany({ where: { userId: targetUser.id } })
    
    // Delete reports
    await prisma.report.deleteMany({ where: { reporterId: targetUser.id } })
    
    // Delete comments
    await prisma.profileComment.deleteMany({ where: { authorId: targetUser.id } })
    
    // Delete ratings
    await prisma.rating.deleteMany({ where: { userId: targetUser.id } })
    
    // Delete watchlists
    await prisma.watchlist.deleteMany({ where: { userId: targetUser.id } })
    
    // Delete presence
    await prisma.presence.deleteMany({ where: { userId: targetUser.id } })
    
    // Delete profile
    if (targetUser.profile) {
      await prisma.profile.delete({ where: { userId: targetUser.id } })
    }
    
    // Delete roles
    await prisma.role.deleteMany({ where: { userId: targetUser.id } })
    
    // Create TrackedIdentity record before deleting (for multi-account prevention)
    // Skip tracking for Owner/Developer accounts (they can create test accounts freely)
    const isOwnerOrDev = targetRoles.includes('owner') || targetRoles.includes('developer')
    
    if (isOwnerOrDev) {
      console.log(`⚠️  Skipping TrackedIdentity for Owner/Developer account (UID: ${targetUser.uid})`)
    } else {
      console.log(`📝 Creating TrackedIdentity for deleted user...`)
      try {
        if (targetUser.discordId) {
          await prisma.trackedIdentity.upsert({
            where: { discordId: targetUser.discordId },
            create: {
              discordId: targetUser.discordId,
              email: targetUser.email,
              name: targetUser.name,
              reason: 'deleted',
              originalUid: targetUser.uid
            },
            update: {
              name: targetUser.name,
              reason: 'deleted',
              originalUid: targetUser.uid
            }
          })
          console.log(`📝 Tracked Discord ID: ${targetUser.discordId}`)
        }
        
        if (targetUser.email && !targetUser.discordId) {
          // If no Discord ID, track by email only
          await prisma.trackedIdentity.upsert({
            where: { email: targetUser.email },
            create: {
              email: targetUser.email,
              name: targetUser.name,
              reason: 'deleted',
              originalUid: targetUser.uid
            },
            update: {
              name: targetUser.name,
              reason: 'deleted',
              originalUid: targetUser.uid
            }
          })
          console.log(`📝 Tracked Email: ${targetUser.email}`)
        }
      } catch (trackError) {
        console.error('⚠️  Failed to create TrackedIdentity (non-fatal):', trackError)
      }
    }
    
    // Finally, delete the user
    await prisma.user.delete({ where: { id: targetUser.id } })
    
    console.log(`✅ Successfully deleted user "${targetUser.name}" (UID: ${targetUser.uid})`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted user "${targetUser.name}" (UID: ${targetUser.uid})`
    })
    
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export const DELETE = withRequestLogging(deleteHandler)

