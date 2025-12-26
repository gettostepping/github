import { NextRequest, NextResponse } from 'next/server'
import { logApiRequest, getIpAddress, getUserAgent } from './api-request-logger'
import { verifyApiKey } from './api-key-auth'

/**
 * Wraps an API route handler to automatically log requests
 * Usage:
 *   export const GET = withRequestLogging(async (req: NextRequest) => {
 *     // Your handler code
 *     return NextResponse.json({ data: '...' })
 *   })
 */
export function withRequestLogging<T extends NextRequest>(
  handler: (req: T) => Promise<NextResponse>
) {
  return async (req: T): Promise<NextResponse> => {
    const startTime = Date.now()
    const endpoint = new URL(req.url).pathname
    const method = req.method

    try {
      // Execute the handler
      const response = await handler(req)

      // Calculate response time
      const responseTime = Date.now() - startTime

      // Get API key ID if present
      let apiKeyId: string | null = null
      try {
        const apiKey = await verifyApiKey(req)
        apiKeyId = apiKey?.id || null
      } catch (error) {
        // Ignore - API key verification might fail for non-API-key requests
      }

      // Log the request (async, don't wait)
      logApiRequest({
        endpoint,
        method,
        statusCode: response.status,
        apiKeyId,
        responseTime,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req)
      }).catch(error => {
        // Don't throw - logging failures shouldn't break the API
        console.error('Failed to log API request:', error)
      })

      return response
    } catch (error) {
      // Log error responses too
      const responseTime = Date.now() - startTime
      
      let apiKeyId: string | null = null
      try {
        const apiKey = await verifyApiKey(req)
        apiKeyId = apiKey?.id || null
      } catch (e) {
        // Ignore
      }

      // Log as 500 error
      logApiRequest({
        endpoint,
        method,
        statusCode: 500,
        apiKeyId,
        responseTime,
        ipAddress: getIpAddress(req),
        userAgent: getUserAgent(req)
      }).catch(e => {
        console.error('Failed to log API request:', e)
      })

      throw error
    }
  }
}

