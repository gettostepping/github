import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface RequestLogData {
  endpoint: string
  method: string
  statusCode: number
  apiKeyId?: string | null
  responseTime: number
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Log an API request to the database
 * This should be called after the request is processed
 */
export async function logApiRequest(data: RequestLogData): Promise<void> {
  try {
    await prisma.apiRequestLog.create({
      data: {
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        apiKeyId: data.apiKeyId || null,
        responseTime: data.responseTime,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      }
    })
  } catch (error) {
    // Don't throw - logging failures shouldn't break the API
    console.error('Failed to log API request:', error)
  }
}

/**
 * Get IP address from request
 */
export function getIpAddress(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         null
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent') || null
}

