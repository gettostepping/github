import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { verifyApiKey } from './api-key-auth'

const prisma = new PrismaClient()

export interface AuthUser {
  id: string
  uid: number
  email: string | null
  name: string | null
  roles: string[]
}

// Extend Request to include user and apiKey
declare global {
  interface Request {
    user?: AuthUser | null
    apiKey?: { id: string; permissions: string[] } | null
  }
}

/**
 * Get authenticated user from request (API key or session)
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // Check API key first
  const apiKey = await verifyApiKey(req)
  if (apiKey) {
    // API keys don't have user context
    return null
  }

  // Fall back to session
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { roles: true }
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    uid: user.uid,
    email: user.email,
    name: user.name,
    roles: user.roles.map(r => r.name)
  }
}

/**
 * Middleware that returns 401 if not authenticated
 */
export function requireAuth() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    return null
  }
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user) return false
  return user.roles.some(r => r.toLowerCase() === role.toLowerCase())
}

/**
 * Middleware to block public API keys from write operations
 */
export function blockPublicApiWrites() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const apiKey = await verifyApiKey(req)
    if (!apiKey) {
      return null // Not an API key, skip check
    }

    const { isPublicApiKey } = await import('./api-key-auth')
    const isPublic = isPublicApiKey(apiKey)

    // Block write operations (POST, PUT, DELETE, PATCH) for public API keys
    const method = req.method.toUpperCase()
    if (isPublic && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return NextResponse.json(
        { error: 'Public API keys are read-only. Write operations require a private API key.' },
        { status: 403 }
      )
    }

    return null
  }
}

/**
 * Middleware for admin endpoints - supports both session and API key auth
 * IMPORTANT: Session-based auth is restricted to Owner/Developer only (not regular admins)
 * API keys can access if they have the required permissions
 */
export function requireAdmin(roles: string[] = ['owner', 'developer', 'admin']) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Check API key first
    const apiKey = await verifyApiKey(req)
    if (apiKey) {
      // Block public API keys from admin endpoints
      const { isPublicApiKey, hasApiKeyPermission } = await import('./api-key-auth')
      if (isPublicApiKey(apiKey)) {
        return NextResponse.json({ error: 'Public API keys cannot access admin endpoints' }, { status: 403 })
      }

      // Check if API key has required admin permission
      const hasPermission = 
        hasApiKeyPermission(apiKey, 'admin.*') ||
        roles.some(role => hasApiKeyPermission(apiKey, `admin.${role}`)) ||
        // Check for specific admin permissions
        hasApiKeyPermission(apiKey, 'admin.users.read') ||
        hasApiKeyPermission(apiKey, 'admin.users.ban') ||
        hasApiKeyPermission(apiKey, 'admin.users.warn') ||
        hasApiKeyPermission(apiKey, 'admin.users.assign') ||
        hasApiKeyPermission(apiKey, 'admin.users.remove') ||
        hasApiKeyPermission(apiKey, 'admin.reports.read') ||
        hasApiKeyPermission(apiKey, 'admin.reports.resolve') ||
        hasApiKeyPermission(apiKey, 'admin.stats.read') ||
        hasApiKeyPermission(apiKey, 'admin.invites.manage')
      
      if (!hasPermission) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // Attach API key to request
      ;(req as any).apiKey = apiKey
      return null
    }

    // Fall back to session - RESTRICTED TO OWNER/DEVELOPER ONLY (not admins)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated. Use API key authentication or login as Owner/Developer.' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { roles: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userRoles = user.roles.map(r => r.name.toLowerCase())
    
    // STRICT: Only Owner and Developer can access via session auth (not regular admins)
    const isOwner = userRoles.includes('owner')
    const isDeveloper = userRoles.includes('developer')
    
    if (!isOwner && !isDeveloper) {
      return NextResponse.json({ 
        error: 'Access denied. API endpoints are only accessible via API key authentication or by Owner/Developer roles. Regular admins must use API keys.' 
      }, { status: 403 })
    }

    // Attach user to request
    ;(req as any).user = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      roles: user.roles.map(r => r.name)
    }

    return null
  }
}

/**
 * Middleware for public API endpoints - supports API key auth
 */
export function requirePublicApi(requiredPermission: string) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Check API key first
    const apiKey = await verifyApiKey(req)
    if (apiKey) {
      const { hasApiKeyPermission, isPublicApiKey } = await import('./api-key-auth')
      
      // Only allow public API keys or wildcard
      if (!isPublicApiKey(apiKey) && !apiKey.permissions.includes('*')) {
        return NextResponse.json({ error: 'This endpoint requires a public API key' }, { status: 403 })
      }

      // Check if API key has required permission
      if (!hasApiKeyPermission(apiKey, requiredPermission)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      // Attach API key to request
      ;(req as any).apiKey = apiKey
      return null
    }

    // Fall back to session (allow normal users)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    return null
  }
}

/**
 * Extract user from request (null if API key auth)
 */
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  return (req as any).user || null
}

/**
 * Extract API key info from request (null if session auth)
 */
export function getApiKeyFromRequest(req: NextRequest): { id: string; permissions: string[] } | null {
  return (req as any).apiKey || null
}

