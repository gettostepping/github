import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ApiKeyInfo {
  id: string
  permissions: string[]
}

/**
 * Verify API key from Authorization header
 * Supports both standard format (Authorization: Bearer <token>) and alternative (Bearer: <token>)
 */
export async function verifyApiKey(req: NextRequest): Promise<ApiKeyInfo | null> {
  // Try standard format first: Authorization: Bearer <token>
  let authHeader = req.headers.get('authorization')
  let key: string | null = null
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    key = authHeader.substring(7) // Remove 'Bearer ' prefix
  } else {
    // Fallback: Try Bearer: <token> format (for tools like Requestly)
    const bearerHeader = req.headers.get('bearer')
    if (bearerHeader) {
      key = bearerHeader.trim()
    }
  }
  
  if (!key) {
    return null
  }

  // Fetch all non-revoked, non-frozen, non-expired keys
  const now = new Date()
  const keys = await prisma.apiKey.findMany({
    where: {
      revoked: false,
      frozen: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    }
  })

  // Compare with bcrypt
  for (const apiKey of keys) {
    try {
      const isValid = await bcrypt.compare(key, apiKey.key)
      if (isValid) {
        // Update lastUsedAt
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: now }
        })

        return {
          id: apiKey.id,
          permissions: apiKey.permissions
        }
      }
    } catch (error) {
      // Continue to next key if comparison fails
      continue
    }
  }

  return null
}

/**
 * Check if API key has required permission
 */
export function hasApiKeyPermission(
  apiKey: ApiKeyInfo,
  requiredPermission: string
): boolean {
  // Wildcard permission grants all access
  if (apiKey.permissions.includes('*')) {
    return true
  }

  // Exact match
  if (apiKey.permissions.includes(requiredPermission)) {
    return true
  }

  // admin.* grants access to ALL permissions (both admin and public)
  // This makes sense because admins should have full access
  if (apiKey.permissions.includes('admin.*')) {
    return true
  }

  // Parent permission check (e.g., "admin.*" matches "admin.users.read")
  // This handles cases like "admin.users.*" matching "admin.users.read"
  const parts = requiredPermission.split('.')
  for (let i = parts.length; i > 0; i--) {
    const parentPermission = parts.slice(0, i).join('.') + '.*'
    if (apiKey.permissions.includes(parentPermission)) {
      return true
    }
  }

  return false
}

/**
 * Check if API key is a public API key (has public permissions, no admin)
 */
export function isPublicApiKey(apiKey: ApiKeyInfo): boolean {
  const hasPublic = apiKey.permissions.some(p => p.startsWith('public.') || p === '*')
  const hasAdmin = apiKey.permissions.some(p => p.startsWith('admin.'))
  
  // If has admin permissions, it's not public
  if (hasAdmin) return false
  
  // If has public permissions or wildcard, it's public
  return hasPublic
}

/**
 * Check if API key is a private API key (has admin permissions)
 */
export function isPrivateApiKey(apiKey: ApiKeyInfo): boolean {
  return apiKey.permissions.some(p => p.startsWith('admin.') || p === '*')
}

