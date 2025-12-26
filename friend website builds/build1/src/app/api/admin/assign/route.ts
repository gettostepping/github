import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

// Role hierarchy helper functions
function getRoleLevel(role: string): number {
  const levels = {
    'owner': 5,
    'developer': 4,
    'admin': 3,
    'moderator': 2,
    'trial_mod': 1,
    'premium': 0,
    'vip': 0,
    'user': 0
  }
  // Convert to lowercase for case-insensitive comparison
  return levels[role.toLowerCase() as keyof typeof levels] || 0
}

function getHighestRole(roles: any[]): string {
  if (!roles || roles.length === 0) return 'user'
  
  // Convert role names to lowercase for case-insensitive comparison
  const roleLevels = roles.map(r => ({ name: r.name.toLowerCase(), level: getRoleLevel(r.name) }))
  const highest = roleLevels.reduce((prev, current) => 
    prev.level > current.level ? prev : current
  )
  return highest.name
}

async function postHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { targetUid, role } = await req.json()

    // Check if current user has permission to assign roles
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
    
    // Only owner, developer, and admin can assign roles
    if (!isOwner && !isDeveloper && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Only owner and developer can assign owner/developer roles
    if ((role === 'owner' || role === 'developer') && !isOwner && !isDeveloper) {
      return NextResponse.json({ error: 'Only owner/developer can assign owner/developer roles' }, { status: 403 })
    }

    // Get target user to check their current role
    const targetUser = await prisma.user.findFirst({
      where: { uid: Number(targetUid) },
      include: { roles: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Prevent changing owner's role
    const isTargetOwner = targetUser.roles.some(r => r.name.toLowerCase() === 'owner')
    if (isTargetOwner && !isOwner) {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 })
    }

    // Role hierarchy: can't assign roles higher than your own
    const currentUserRole = getHighestRole(currentUser.roles)
    const targetRoleLevel = getRoleLevel(role)
    const currentUserRoleLevel = getRoleLevel(currentUserRole)
    
    if (targetRoleLevel > currentUserRoleLevel) {
      return NextResponse.json({ 
        error: `Cannot assign ${role} role - insufficient permissions` 
      }, { status: 403 })
    }


    // Remove all existing roles first, then assign new role
    await prisma.role.deleteMany({
      where: { userId: targetUser.id }
    })

    // Assign new role
    await prisma.role.create({
      data: {
        userId: targetUser.id,
        name: role
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
  }
}

async function deleteHandler(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const { targetUid } = await req.json()

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
    
    // Only owner, developer, and admin can remove roles
    if (!isOwner && !isDeveloper && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Find target user by UID
    const targetUser = await prisma.user.findFirst({
      where: { uid: Number(targetUid) },
      include: { roles: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Prevent removing owner's role
    const isTargetOwner = targetUser.roles.some(r => r.name.toLowerCase() === 'owner')
    if (isTargetOwner && !isOwner) {
      return NextResponse.json({ error: 'Cannot remove owner role' }, { status: 403 })
    }

    // Remove all roles (make them a regular user)
    await prisma.role.deleteMany({
      where: { userId: targetUser.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing role:', error)
    return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
export const DELETE = withRequestLogging(deleteHandler)
