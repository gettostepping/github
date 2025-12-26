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
  return levels[role as keyof typeof levels] || 0
}

function getHighestRole(roles: any[]): string {
  if (!roles || roles.length === 0) return 'user'
  
  const roleLevels = roles.map(r => ({ name: r.name, level: getRoleLevel(r.name) }))
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
    const { userId, reason } = await req.json()
    
    if (!userId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the current user and check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has trial_mod or higher
    const hasPermission = user.roles.some(r => 
      ['owner', 'developer', 'admin', 'moderator', 'trial_mod'].includes(r.name)
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get target user to check their role
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Prevent warning the owner
    const isTargetOwner = targetUser.roles.some(r => r.name.toLowerCase() === 'owner')
    if (isTargetOwner) {
      return NextResponse.json({ error: 'Cannot warn the owner' }, { status: 403 })
    }

    // Role hierarchy: can't warn users with equal or higher roles
    const currentUserRole = getHighestRole(user.roles)
    const targetUserRole = getHighestRole(targetUser.roles)
    
    if (getRoleLevel(targetUserRole) >= getRoleLevel(currentUserRole)) {
      return NextResponse.json({ 
        error: `Cannot warn users with ${targetUserRole} role or higher` 
      }, { status: 403 })
    }

    // Create warning record (you might want to add a Warning model to your schema)
    // For now, we'll just log it or store it in a simple way
    console.log(`User ${user.id} warned user ${userId} for: ${reason}`)
    
    // You could add a Warning model to track warnings:
    // const warning = await prisma.warning.create({
    //   data: {
    //     userId,
    //     warnedBy: user.id,
    //     reason,
    //     createdAt: new Date()
    //   }
    // })

    return NextResponse.json({ success: true, message: 'User warned successfully' })
  } catch (error) {
    console.error('Error warning user:', error)
    return NextResponse.json({ error: 'Failed to warn user' }, { status: 500 })
  }
}

export const POST = withRequestLogging(postHandler)
