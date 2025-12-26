import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security/auth'
import { rateLimiters } from '@/lib/security/rate-limit'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Auth check - supports both session and API key
    const authResponse = await requireAdmin(['owner', 'developer', 'admin', 'moderator', 'trial_mod'])(req)
    if (authResponse) return authResponse

    // Check API key permissions if using API key
    const apiKey = (req as any).apiKey
    if (apiKey) {
      const { hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
      if (!hasApiKeyPermission(apiKey, 'admin.reports.read') && !hasApiKeyPermission(apiKey, 'admin.*')) {
        return NextResponse.json({ error: 'Insufficient permissions. Requires admin.reports.read' }, { status: 403 })
      }
    }

    // Fetch reports with related data
    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: {
            name: true,
            image: true,
            uid: true
          }
        },
        comment: {
          include: {
            author: {
              select: {
                name: true,
                image: true,
                uid: true
              }
            },
            profile: {
              include: {
                user: {
                  select: {
                    name: true,
                    uid: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}

async function patchHandler(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimiters.admin(req)
    if (rateLimitResult) return rateLimitResult

    // Auth check - supports both session and API key
    const authResponse = await requireAdmin(['owner', 'developer', 'admin', 'moderator', 'trial_mod'])(req)
    if (authResponse) return authResponse

    // Check API key permissions if using API key
    const apiKey = (req as any).apiKey
    if (apiKey) {
      const { hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
      if (!hasApiKeyPermission(apiKey, 'admin.reports.resolve') && !hasApiKeyPermission(apiKey, 'admin.*')) {
        return NextResponse.json({ error: 'Insufficient permissions. Requires admin.reports.resolve' }, { status: 403 })
      }
    }

    const { reportId, status } = await req.json()
    
    if (!reportId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update report status
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status }
    })

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const PATCH = withRequestLogging(patchHandler)
