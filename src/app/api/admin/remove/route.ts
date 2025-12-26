import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUid, role } = await req.json()
    
    if (!targetUid || !role) {
      return NextResponse.json({ error: 'Target UID and role are required' }, { status: 400 })
    }

    // Check if current user has permission to remove roles
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwner = currentUser.roles.some(r => r.name.toLowerCase() === 'owner')
    const isDeveloper = currentUser.roles.some(r => r.name.toLowerCase() === 'developer')
    const isAdmin = currentUser.roles.some(r => r.name.toLowerCase() === 'admin')

    // Only owners and developers can remove roles
    if (!isOwner && !isDeveloper) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find target user
    const targetUser = await prisma.user.findFirst({
      where: { uid: parseInt(targetUid) },
      include: { roles: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Check if target user has the role
    const hasRole = targetUser.roles.some(r => r.name === role)
    if (!hasRole) {
      return NextResponse.json({ error: 'User does not have this role' }, { status: 400 })
    }

    // Prevent removing owner role from the last owner
    if (role === 'owner') {
      const ownerCount = await prisma.role.count({
        where: { name: 'owner' }
      })
      
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last owner' }, { status: 400 })
      }
    }

    // Remove the role
    await prisma.role.deleteMany({
      where: {
        userId: targetUser.id,
        name: role
      }
    })

    return NextResponse.json({ success: true, message: 'Role removed successfully' })
  } catch (error) {
    console.error('Error removing role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
