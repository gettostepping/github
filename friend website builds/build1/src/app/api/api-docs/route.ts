import { NextRequest, NextResponse } from 'next/server'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

interface Endpoint {
  path: string
  methods: string[]
  filePath: string
}

/**
 * Static list of all API endpoints with their supported methods
 * This avoids filesystem scanning issues in production environments
 */
const staticEndpoints: Endpoint[] = [
  // Auth endpoints
  { path: '/api/auth/[...nextauth]', methods: ['GET', 'POST'], filePath: 'src/app/api/auth/[...nextauth]/route.ts' },
  { path: '/api/auth/register', methods: ['POST'], filePath: 'src/app/api/auth/register/route.ts' },
  { path: '/api/auth/discord/complete-registration', methods: ['POST'], filePath: 'src/app/api/auth/discord/complete-registration/route.ts' },
  { path: '/api/auth/discord/mark-invite-used', methods: ['POST'], filePath: 'src/app/api/auth/discord/mark-invite-used/route.ts' },
  
  // Profiles
  { path: '/api/profiles', methods: ['GET', 'PUT'], filePath: 'src/app/api/profiles/route.ts' },
  
  // TMDB
  { path: '/api/tmdb/search', methods: ['GET', 'POST'], filePath: 'src/app/api/tmdb/search/route.ts' },
  { path: '/api/tmdb/details', methods: ['GET'], filePath: 'src/app/api/tmdb/details/route.ts' },
  { path: '/api/tmdb/popular', methods: ['GET'], filePath: 'src/app/api/tmdb/popular/route.ts' },
  { path: '/api/tmdb/trending', methods: ['GET'], filePath: 'src/app/api/tmdb/trending/route.ts' },
  { path: '/api/tmdb/recommendations', methods: ['GET'], filePath: 'src/app/api/tmdb/recommendations/route.ts' },
  { path: '/api/tmdb/related', methods: ['GET'], filePath: 'src/app/api/tmdb/related/route.ts' },
  { path: '/api/tmdb/seasons', methods: ['GET'], filePath: 'src/app/api/tmdb/seasons/route.ts' },
  { path: '/api/tmdb/episodes', methods: ['GET'], filePath: 'src/app/api/tmdb/episodes/route.ts' },
  
  // Ratings
  { path: '/api/ratings', methods: ['GET', 'POST'], filePath: 'src/app/api/ratings/route.ts' },
  { path: '/api/ratings/public', methods: ['GET'], filePath: 'src/app/api/ratings/public/route.ts' },
  
  // Comments
  { path: '/api/comments', methods: ['GET', 'POST', 'DELETE'], filePath: 'src/app/api/comments/route.ts' },
  { path: '/api/comments/like', methods: ['POST'], filePath: 'src/app/api/comments/like/route.ts' },
  
  // Watchlist
  { path: '/api/watchlist', methods: ['GET', 'POST', 'DELETE'], filePath: 'src/app/api/watchlist/route.ts' },
  
  // Activity
  { path: '/api/activity', methods: ['POST'], filePath: 'src/app/api/activity/route.ts' },
  { path: '/api/activity/stop', methods: ['POST'], filePath: 'src/app/api/activity/stop/route.ts' },
  { path: '/api/activity/cleanup', methods: ['POST'], filePath: 'src/app/api/activity/cleanup/route.ts' },
  
  // Presence
  { path: '/api/presence', methods: ['GET', 'POST'], filePath: 'src/app/api/presence/route.ts' },
  
  // Reports
  { path: '/api/reports', methods: ['POST'], filePath: 'src/app/api/reports/route.ts' },
  
  // Invitations
  { path: '/api/invitations', methods: ['GET'], filePath: 'src/app/api/invitations/route.ts' },
  
  // Discord
  { path: '/api/discord/status', methods: ['GET'], filePath: 'src/app/api/discord/status/route.ts' },
  { path: '/api/discord/login', methods: ['GET'], filePath: 'src/app/api/discord/login/route.ts' },
  { path: '/api/discord/callback', methods: ['GET'], filePath: 'src/app/api/discord/callback/route.ts' },
  { path: '/api/discord/register', methods: ['GET', 'POST'], filePath: 'src/app/api/discord/register/route.ts' },
  { path: '/api/discord/me', methods: ['GET'], filePath: 'src/app/api/discord/me/route.ts' },
  { path: '/api/discord/refresh', methods: ['POST'], filePath: 'src/app/api/discord/refresh/route.ts' },
  
  // Website
  { path: '/api/website/status', methods: ['GET'], filePath: 'src/app/api/website/status/route.ts' },
  
  // Pending Registration
  { path: '/api/pending-registration/check', methods: ['POST'], filePath: 'src/app/api/pending-registration/check/route.ts' },
  
  // Admin endpoints
  { path: '/api/admin/check', methods: ['GET'], filePath: 'src/app/api/admin/check/route.ts' },
  { path: '/api/admin/stats', methods: ['GET'], filePath: 'src/app/api/admin/stats/route.ts' },
  { path: '/api/admin/api-status', methods: ['GET'], filePath: 'src/app/api/admin/api-status/route.ts' },
  { path: '/api/admin/user-lookup', methods: ['GET'], filePath: 'src/app/api/admin/user-lookup/route.ts' },
  { path: '/api/admin/users', methods: ['GET'], filePath: 'src/app/api/admin/users/route.ts' },
  { path: '/api/admin/users/delete', methods: ['DELETE'], filePath: 'src/app/api/admin/users/delete/route.ts' },
  { path: '/api/admin/ban', methods: ['POST', 'DELETE'], filePath: 'src/app/api/admin/ban/route.ts' },
  { path: '/api/admin/check-ban', methods: ['GET'], filePath: 'src/app/api/admin/check-ban/route.ts' },
  { path: '/api/admin/warn', methods: ['POST'], filePath: 'src/app/api/admin/warn/route.ts' },
  { path: '/api/admin/assign', methods: ['POST', 'DELETE'], filePath: 'src/app/api/admin/assign/route.ts' },
  { path: '/api/admin/remove', methods: ['POST'], filePath: 'src/app/api/admin/remove/route.ts' },
  { path: '/api/admin/reports', methods: ['GET', 'PATCH'], filePath: 'src/app/api/admin/reports/route.ts' },
  { path: '/api/admin/pending-registrations', methods: ['GET', 'POST'], filePath: 'src/app/api/admin/pending-registrations/route.ts' },
  { path: '/api/admin/invites', methods: ['GET', 'POST'], filePath: 'src/app/api/admin/invites/route.ts' },
  { path: '/api/admin/invites/mass', methods: ['POST'], filePath: 'src/app/api/admin/invites/mass/route.ts' },
  { path: '/api/admin/invites/:id', methods: ['POST', 'DELETE'], filePath: 'src/app/api/admin/invites/[id]/route.ts' },
  { path: '/api/admin/invites/:id/toggle', methods: ['POST'], filePath: 'src/app/api/admin/invites/[id]/toggle/route.ts' },
  { path: '/api/admin/invites/:id/toggle-testing', methods: ['POST'], filePath: 'src/app/api/admin/invites/[id]/toggle-testing/route.ts' },
  { path: '/api/admin/api-keys', methods: ['GET', 'POST', 'DELETE', 'PATCH'], filePath: 'src/app/api/admin/api-keys/route.ts' },
  { path: '/api/admin/api-keys/:id', methods: ['GET'], filePath: 'src/app/api/admin/api-keys/[id]/route.ts' },
  
  // API Docs
  { path: '/api/api-docs', methods: ['GET'], filePath: 'src/app/api/api-docs/route.ts' }
]

async function getHandler(req: NextRequest) {
  try {
    return NextResponse.json({ endpoints: staticEndpoints })
  } catch (error) {
    console.error('Error returning endpoints:', error)
    return NextResponse.json({ error: 'Failed to fetch endpoints' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)

