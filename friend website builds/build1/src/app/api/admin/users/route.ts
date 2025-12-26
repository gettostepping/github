import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { rateLimiters } from '@/lib/security/rate-limit'
import { requireAdmin, getUserFromRequest } from '@/lib/security/auth'
import { sanitizeUsers } from '@/lib/security/sanitize'
import { logAdminAction } from '@/lib/security/audit'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Authentication
    const authResult = await requireAdmin(['owner', 'developer', 'admin'])(req)
    if (authResult) return authResult

    const admin = getUserFromRequest(req)

    // Get all users with their roles (no email in list view)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        uid: true,
        image: true,
        discordId: true,
        createdAt: true,
        roles: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Sanitize users
    const sanitized = sanitizeUsers(users, {
      currentUserId: admin?.id,
      isAdmin: true
    })

    // Audit log
    if (admin) {
      await logAdminAction(admin.id, 'view_users_list', req)
    }

    return NextResponse.json({ users: sanitized })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)