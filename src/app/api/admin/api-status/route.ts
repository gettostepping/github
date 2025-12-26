import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security/auth'
import { rateLimiters } from '@/lib/security/rate-limit'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function getHandler(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await rateLimiters.admin(req)
  if (rateLimitResponse) return rateLimitResponse

  // Auth check
  const authResponse = await requireAdmin(['owner', 'developer'])(req)
  if (authResponse) return authResponse

  try {
    // Get time range from query params (default: 24 hours)
    const timeRange = req.nextUrl.searchParams.get('range') || '24h'
    const keyId = req.nextUrl.searchParams.get('keyId') // Optional: filter by API key ID
    
    let startDate: Date
    const now = new Date()
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
        break
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 24 hours
    }

    // Get all API request logs in the time range
    const logsWhere: any = {
      createdAt: {
        gte: startDate
      }
    }
    
    // Get all API keys for name lookup (we'll use this for both recentActivity and keyActivity)
    const allApiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true
      }
    })
    const apiKeyMap = new Map(allApiKeys.map((k: any) => [k.id, k.name]))
    
    // If keyId is provided, filter by that API key
    if (keyId) {
      logsWhere.apiKeyId = keyId
    }
    
    const logs = await prisma.apiRequestLog.findMany({
      where: logsWhere,
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Limit to prevent huge queries
    })
    
    // If keyId is provided, return only key-specific activity
    if (keyId) {
      const keyActivity = logs.map((log: any) => ({
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        apiKeyId: log.apiKeyId,
        apiKeyName: log.apiKeyId ? apiKeyMap.get(log.apiKeyId) || null : null,
        responseTime: log.responseTime,
        timestamp: log.createdAt
      }))
      
      return NextResponse.json({ keyActivity })
    }

    // Get API key statistics - include all keys for selection
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        revoked: false
      },
      select: {
        id: true,
        name: true,
        frozen: true,
        lastUsedAt: true,
        permissions: true,
        createdAt: true,
        userId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch tied user info for all keys
    const keysWithUsers = await Promise.all(
      apiKeys.map(async (key: any) => {
        const tiedUser = key.userId ? await prisma.user.findUnique({
          where: { id: key.userId },
          select: { name: true, uid: true, image: true }
        }) : null

        return {
          id: key.id,
          name: key.name,
          frozen: key.frozen,
          lastUsedAt: key.lastUsedAt,
          permissions: key.permissions,
          createdAt: key.createdAt,
          userId: key.userId,
          tiedUserName: tiedUser?.name || null,
          tiedUserUid: tiedUser?.uid || null,
          tiedUserImage: tiedUser?.image || null
        }
      })
    )

    // If keyId is provided, return only key-specific activity (already handled above)
    
    // Calculate statistics
    const totalRequests = logs.length
    const successfulRequests = logs.filter((log: any) => log.statusCode >= 200 && log.statusCode < 300).length
    const errorRequests = logs.filter((log: any) => log.statusCode >= 400).length
    const rateLimitHits = logs.filter((log: any) => log.statusCode === 429).length
    
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0

    // Get requests from last hour for "recent" stats
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const recentLogs = logs.filter((log: any) => new Date(log.createdAt) >= oneHourAgo)
    const requestsLastHour = recentLogs.length

    // Get most used endpoints
    const endpointCounts = new Map<string, number>()
    logs.forEach((log: any) => {
      const count = endpointCounts.get(log.endpoint) || 0
      endpointCounts.set(log.endpoint, count + 1)
    })
    const topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }))

    // Get API key usage counts
    const keyUsageCounts = new Map<string, number>()
    logs.forEach((log: any) => {
      if (log.apiKeyId) {
        const count = keyUsageCounts.get(log.apiKeyId) || 0
        keyUsageCounts.set(log.apiKeyId, count + 1)
      }
    })

    // Get most active API keys
    const activeKeys = Array.from(keyUsageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyId, count]) => {
        const key = keysWithUsers.find((k: any) => k.id === keyId)
        return {
          id: keyId,
          name: key?.name || 'Unknown',
          count,
          frozen: key?.frozen || false
        }
      })

    // Get error breakdown
    const errorBreakdown = new Map<number, number>()
    logs.filter((log: any) => log.statusCode >= 400).forEach((log: any) => {
      const count = errorBreakdown.get(log.statusCode) || 0
      errorBreakdown.set(log.statusCode, count + 1)
    })

    // Get recent errors (last 10)
    const recentErrors = logs
      .filter((log: any) => log.statusCode >= 400)
      .slice(0, 10)
      .map((log: any) => ({
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        timestamp: log.createdAt
      })) || []

    // Get recent activity (last 10 requests)
    // If no logs, return empty array instead of undefined
    const recentActivity = logs.length > 0 
      ? logs.slice(0, 10).map((log: any) => ({
          endpoint: log.endpoint,
          method: log.method,
          statusCode: log.statusCode,
          apiKeyId: log.apiKeyId,
          apiKeyName: log.apiKeyId ? apiKeyMap.get(log.apiKeyId) || null : null,
          responseTime: log.responseTime,
          timestamp: log.createdAt
        }))
      : []

    // Calculate API health status
    let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy'
    if (errorRate > 25) {
      healthStatus = 'down'
    } else if (errorRate > 10) {
      healthStatus = 'degraded'
    }

    // Get API key statistics
    const activeKeysCount = apiKeys.filter((k: any) => !k.frozen && !k.revoked).length
    const frozenKeysCount = apiKeys.filter((k: any) => k.frozen).length
    const revokedKeysCount = await prisma.apiKey.count({
      where: { revoked: true }
    })

    // Check for rate limit warnings (keys near limits)
    // This is a simplified check - in production you'd check actual rate limiter state
    const rateLimitWarnings = 0 // Placeholder - would need to check rate limiter store

    return NextResponse.json({
      timeRange,
      stats: {
        totalRequests,
        requestsLastHour,
        successfulRequests,
        errorRequests,
        rateLimitHits,
        successRate: Math.round(successRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        healthStatus
      },
      apiKeys: {
        active: activeKeysCount,
        frozen: frozenKeysCount,
        revoked: revokedKeysCount,
        total: apiKeys.length,
        allKeys: keysWithUsers.map((k: any) => ({
          id: k.id,
          name: k.name,
          frozen: k.frozen,
          lastUsedAt: k.lastUsedAt,
          createdAt: k.createdAt,
          userId: k.userId,
          tiedUserName: k.tiedUserName,
          tiedUserUid: k.tiedUserUid,
          tiedUserImage: k.tiedUserImage,
          permissions: k.permissions
        }))
      },
      topEndpoints,
      activeKeys,
      errorBreakdown: Array.from(errorBreakdown.entries()).map(([code, count]) => ({ code, count })),
      recentErrors,
      recentActivity,
      rateLimitWarnings
    })
  } catch (error) {
    console.error('Failed to fetch API status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API status' },
      { status: 500 }
    )
  }
}

export const GET = withRequestLogging(getHandler)

