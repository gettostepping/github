import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from './api-key-auth'

interface RateLimitStore {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitStore>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimiterConfig {
  limit: number
  windowMs: number
}

function createRateLimiter(config: RateLimiterConfig) {
  return (req: NextRequest): NextResponse | null => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const key = `${ip}:${userAgent}`

    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new entry
      store.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null
    }

    if (entry.count >= config.limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Retry-After': retryAfter.toString()
          }
        }
      )
    }

    // Increment count
    entry.count++
    const remaining = config.limit - entry.count

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', config.limit.toString())
    headers.set('X-RateLimit-Remaining', remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())

    return null
  }
}

/**
 * Rate limiter for API keys - different limits for public vs private
 */
async function apiKeyRateLimiter(req: NextRequest): Promise<NextResponse | null> {
  const apiKey = await verifyApiKey(req)
  if (!apiKey) {
    return null // Not an API key request, skip
  }

  // Determine if public or private API key
  const isPublic = apiKey.permissions.some(p => p.startsWith('public.')) && 
                   !apiKey.permissions.some(p => p.startsWith('admin.'))
  
  // Use different limits: Public = 100/hour, Private = 1000/hour
  const config = isPublic 
    ? { limit: 100, windowMs: 60 * 60 * 1000 } // 100 requests / hour
    : { limit: 1000, windowMs: 60 * 60 * 1000 } // 1000 requests / hour

  const key = `apikey:${apiKey.id}`
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetTime < now) {
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return null
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          'Retry-After': retryAfter.toString()
        }
      }
    )
  }

  entry.count++
  const remaining = config.limit - entry.count

  return null
}

export const rateLimiters = {
  strict: createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 }), // 5 requests / 15 minutes
  moderate: createRateLimiter({ limit: 60, windowMs: 60 * 1000 }), // 60 requests / minute
  lenient: createRateLimiter({ limit: 100, windowMs: 60 * 1000 }), // 100 requests / minute
  admin: createRateLimiter({ limit: 30, windowMs: 60 * 1000 }), // 30 requests / minute
  apiKey: apiKeyRateLimiter // API key rate limiter (differentiates public/private)
}

