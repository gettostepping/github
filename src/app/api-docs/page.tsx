'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faCode, faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

interface Endpoint {
  path: string
  methods: string[]
  filePath: string
}

interface EndpointDetails {
  description: string
  authRequired: boolean
  adminOnly: boolean
  readOnly?: boolean // If true, endpoint is read-only (GET). If false, allows modifications (POST/PUT/DELETE)
  apiKeySupported?: boolean // Whether API key auth is supported
  requiredPermissions?: string[] // Required API key permissions
  rateLimit?: string // Rate limit description
  requestBody?: {
    description: string
    example: any
  }
  queryParams?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  responseExamples?: Array<{
    status: number
    description: string
    example: any
  }>
}

const endpointMetadata: Record<string, EndpointDetails> = {
  '/api/auth/[...nextauth]': {
    description: 'NextAuth authentication endpoints for session management and OAuth providers',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false
  },
  '/api/profiles': {
    description: 'Get or update user profile information including bio, theme, and customization settings',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['public.profiles.read'],
    rateLimit: '60 requests/minute (API key), 30 requests/minute (session)',
    queryParams: [
      { name: 'uid', type: 'string | number', required: true, description: 'User UID, email, or ID' }
    ],
    responseExamples: [
      {
        status: 200,
        description: 'Profile data',
        example: { user: { id: '...', uid: 123, name: 'User' }, profile: { bio: '...' } }
      }
    ]
  },
  '/api/tmdb/search': {
    description: 'Search for movies and TV shows using The Movie Database (TMDB) API',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.search'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'q', type: 'string', required: true, description: 'Search query' },
      { name: 'type', type: 'movie | tv', required: false, description: 'Filter by content type' }
    ],
    responseExamples: [
      {
        status: 200,
        description: 'Search results',
        example: { results: [{ id: 123, title: 'Movie Title', overview: '...' }] }
      }
    ]
  },
  '/api/ratings': {
    description: 'Get or create user ratings for movies and TV shows',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['public.ratings.read'],
    rateLimit: '60 requests/minute (API key), 30 requests/minute (session)',
    queryParams: [
      { name: 'tmdbId', type: 'number', required: true, description: 'TMDB movie or TV show ID' },
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ],
    responseExamples: [
      {
        status: 200,
        description: 'Rating data',
        example: { rating: 5, averageRating: 4.5, totalRatings: 100 }
      }
    ]
  },
  '/api/comments': {
    description: 'Get or manage profile comments (public read, authenticated write)',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['public.comments.read'],
    rateLimit: '60 requests/minute',
    queryParams: [
      { name: 'profileId', type: 'string', required: true, description: 'Profile user ID' }
    ],
    responseExamples: [
      {
        status: 200,
        description: 'Comments list',
        example: { comments: [{ id: '...', content: '...', author: { name: 'User' } }] }
      }
    ]
  },
  '/api/watchlist': {
    description: 'Manage user watchlist (add/remove movies and TV shows)',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/admin/users': {
    description: 'List all registered users with their roles and status information',
    authRequired: true,
    adminOnly: true,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.read', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    responseExamples: [
      {
        status: 200,
        description: 'List of users',
        example: { users: [{ id: '...', uid: 123, name: 'User', roles: ['user'] }] }
      }
    ]
  },
  '/api/admin/api-keys': {
    description: 'Create, list, revoke, and manage API keys for the platform',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: 'Owner/Developer session only (no API key)',
    requestBody: {
      description: 'For POST: { name, permissions[], expiresInDays?, userId? }',
      example: { name: 'Bot Key', permissions: ['admin.read'], expiresInDays: 30 }
    },
    responseExamples: [
      {
        status: 200,
        description: 'API key created (shown once)',
        example: { key: 'ct_...', id: '...', name: 'Bot Key' }
      }
    ]
  },
  '/api/admin/user-lookup': {
    description: 'Search for users by UID, name, or email with detailed information',
    authRequired: true,
    adminOnly: true,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.read', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    queryParams: [
      { name: 'type', type: 'uid | name | email', required: true, description: 'Search type' },
      { name: 'query', type: 'string', required: true, description: 'Search value' }
    ],
    responseExamples: [
      {
        status: 200,
        description: 'User information',
        example: { user: { id: '...', uid: 123, name: 'User', email: 'user@example.com' } }
      }
    ]
  },
  '/api/admin/stats': {
    description: 'Get comprehensive system statistics including user counts, activity metrics, and platform health',
    authRequired: true,
    adminOnly: true,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['admin.stats.read', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    responseExamples: [
      {
        status: 200,
        description: 'System stats',
        example: { totalUsers: 100, activeToday: 50, newRegistrations: 10, totalWatchlists: 500 }
      }
    ]
  },
  '/api/admin/assign': {
    description: 'Assign roles to users (ban, warn, assign/remove roles) - modifies user permissions',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.ban', 'admin.users.warn', 'admin.users.assign', 'admin.users.remove', 'admin.*'],
    rateLimit: 'Owner/Developer session only (no API key)',
    requestBody: {
      description: '{ action: "ban" | "warn" | "assign" | "remove", userId, role?, reason? }',
      example: { action: 'ban', userId: '...', reason: 'Violation of terms' }
    }
  },
  '/api/admin/reports': {
    description: 'View and resolve moderation reports submitted by users',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.reports.read', 'admin.reports.resolve', 'admin.*'],
    rateLimit: 'Owner/Developer session only (no API key)',
    responseExamples: [
      {
        status: 200,
        description: 'Reports list',
        example: { reports: [{ id: '...', reason: '...', status: 'pending' }] }
      }
    ]
  },
  '/api/admin/ban': {
    description: 'Ban users from the platform (Owner/Developer only or API key with ban permission)',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.ban', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    requestBody: {
      description: '{ userId, reason, duration? }',
      example: { userId: '...', reason: 'Violation of terms', duration: 86400000 }
    }
  },
  '/api/admin/warn': {
    description: 'Issue warnings to users (Owner/Developer only or API key with warn permission)',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.warn', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    requestBody: {
      description: '{ userId, reason }',
      example: { userId: '...', reason: 'Minor violation' }
    }
  },
  '/api/admin/remove': {
    description: 'Remove roles from users (Owner/Developer only or API key with remove permission)',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.remove', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session',
    requestBody: {
      description: '{ targetUid, role }',
      example: { targetUid: 123, role: 'moderator' }
    }
  },
  '/api/admin/invites': {
    description: 'Manage platform invitations (create, list, update)',
    authRequired: true,
    adminOnly: true,
    readOnly: false,
    apiKeySupported: true,
    requiredPermissions: ['admin.invites.manage', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session'
  },
  '/api/admin/pending-registrations': {
    description: 'View pending user registrations awaiting approval',
    authRequired: true,
    adminOnly: true,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['admin.users.read', 'admin.*'],
    rateLimit: '1000 requests/hour (API key) or Owner/Developer session'
  },
  '/api/admin/check': {
    description: 'Check user admin status and roles',
    authRequired: true,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '60 requests/minute',
    queryParams: [
      { name: 'userId', type: 'string', required: false, description: 'Optional user ID to check (defaults to current user)' }
    ]
  },
  '/api/admin/check-ban': {
    description: 'Check if current user is banned',
    authRequired: true,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '60 requests/minute'
  },
  '/api/tmdb/details': {
    description: 'Get detailed information about a movie or TV show from TMDB',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'id', type: 'number', required: true, description: 'TMDB movie or TV show ID' },
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ]
  },
  '/api/tmdb/episodes': {
    description: 'Get episode list for a specific TV show season',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'id', type: 'number', required: true, description: 'TMDB TV show ID' },
      { name: 'season', type: 'number', required: true, description: 'Season number' }
    ]
  },
  '/api/tmdb/seasons': {
    description: 'Get season information for a TV show',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'id', type: 'number', required: true, description: 'TMDB TV show ID' }
    ]
  },
  '/api/tmdb/popular': {
    description: 'Get popular movies and TV shows from TMDB',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ]
  },
  '/api/tmdb/trending': {
    description: 'Get trending movies and TV shows from TMDB',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'type', type: 'movie | tv', required: false, description: 'Content type (optional)' }
    ]
  },
  '/api/tmdb/related': {
    description: 'Get related/similar movies and TV shows',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'id', type: 'number', required: true, description: 'TMDB movie or TV show ID' },
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ]
  },
  '/api/tmdb/recommendations': {
    description: 'Get recommendations based on a movie or TV show',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.content.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'id', type: 'number', required: true, description: 'TMDB movie or TV show ID' },
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ]
  },
  '/api/ratings/public': {
    description: 'Get public rating statistics for movies and TV shows',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: true,
    requiredPermissions: ['public.ratings.read', 'public.*'],
    rateLimit: '100 requests/hour (public API key), 1000 requests/hour (private API key)',
    queryParams: [
      { name: 'tmdbId', type: 'number', required: true, description: 'TMDB movie or TV show ID' },
      { name: 'type', type: 'movie | tv', required: true, description: 'Content type' }
    ]
  },
  '/api/comments/like': {
    description: 'Like or unlike a profile comment',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute',
    requestBody: {
      description: '{ commentId, action: "like" | "unlike" }',
      example: { commentId: '...', action: 'like' }
    }
  },
  '/api/activity': {
    description: 'Track user activity (currently watching, etc.)',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/activity/stop': {
    description: 'Stop tracking current activity',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/presence': {
    description: 'Get or update user presence status',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/reports': {
    description: 'Submit or view moderation reports',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '10 requests/minute'
  },
  '/api/invitations': {
    description: 'Check invitation status or use invitation code',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/discord/status': {
    description: 'Get Discord integration status',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '60 requests/minute'
  },
  '/api/discord/login': {
    description: 'Initiate Discord OAuth login',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '10 requests/minute'
  },
  '/api/discord/callback': {
    description: 'Discord OAuth callback handler',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false
  },
  '/api/discord/register': {
    description: 'Register via Discord OAuth',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '10 requests/minute'
  },
  '/api/discord/me': {
    description: 'Get current user Discord information',
    authRequired: true,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '60 requests/minute'
  },
  '/api/discord/refresh': {
    description: 'Refresh Discord access token',
    authRequired: true,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '30 requests/minute'
  },
  '/api/auth/register': {
    description: 'Register a new user account',
    authRequired: false,
    adminOnly: false,
    readOnly: false,
    apiKeySupported: false,
    rateLimit: '5 requests/15 minutes',
    requestBody: {
      description: '{ email, password, name, inviteCode? }',
      example: { email: 'user@example.com', password: 'securePassword', name: 'Username', inviteCode: 'ABC123' }
    }
  },
  '/api/website/status': {
    description: 'Check website and API status',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '60 requests/minute'
  },
  '/api/pending-registration/check': {
    description: 'Check if email is pending registration approval',
    authRequired: false,
    adminOnly: false,
    readOnly: true,
    apiKeySupported: false,
    rateLimit: '30 requests/minute',
    queryParams: [
      { name: 'email', type: 'string', required: true, description: 'Email address to check' }
    ]
  }
}

export default function ApiDocsPage() {
  const { data: session } = useSession()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [faqExpanded, setFaqExpanded] = useState<Record<string, boolean>>({})
  const [adminData, setAdminData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEndpoints()
    if (session) {
      fetchAdminStatus()
    }
  }, [session])

  const fetchEndpoints = async () => {
    try {
      const res = await fetch('/api/api-docs')
      if (res.ok) {
        const data = await res.json()
        setEndpoints(data.endpoints || [])
        setError(null)
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch endpoints')
        console.error('Failed to fetch endpoints:', res.status, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error)
      setError('Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        const data = await res.json()
        setAdminData(data)
      }
    } catch (error) {
      console.error('Failed to fetch admin status:', error)
    }
  }

  const toggleExpand = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const toggleFaq = (faqId: string) => {
    setFaqExpanded(prev => ({ ...prev, [faqId]: !prev[faqId] }))
  }

  // Generate default description for endpoints without metadata
  const getDefaultDescription = (endpoint: Endpoint): EndpointDetails => {
    const isAdmin = endpoint.path.startsWith('/api/admin')
    const isReadOnly = endpoint.methods.includes('GET') && !endpoint.methods.some(m => ['POST', 'PUT', 'DELETE', 'PATCH'].includes(m))
    
    return {
      description: `${isAdmin ? 'Admin' : 'Public'} endpoint for ${endpoint.path.split('/').pop() || 'API operations'}`,
      authRequired: isAdmin,
      adminOnly: isAdmin,
      readOnly: isReadOnly,
      apiKeySupported: isAdmin ? true : false
    }
  }

  // Helper to match endpoint paths (handles both :id and [id] formats)
  const getEndpointMetadata = (endpointPath: string): EndpointDetails | undefined => {
    // Try exact match first
    if (endpointMetadata[endpointPath]) {
      return endpointMetadata[endpointPath]
    }
    
    // Try matching :id format to [id] format in metadata
    const normalizedPath = endpointPath.replace(/:([^/]+)/g, '[$1]')
    if (endpointMetadata[normalizedPath]) {
      return endpointMetadata[normalizedPath]
    }
    
    // Try matching [id] format to :id format in metadata
    const reverseNormalizedPath = endpointPath.replace(/\[([^\]]+)\]/g, ':$1')
    if (endpointMetadata[reverseNormalizedPath]) {
      return endpointMetadata[reverseNormalizedPath]
    }
    
    return undefined
  }

  // Check if user has dev or owner role (required to view API docs page)
  // NOTE: Admins are NOT allowed - only Owner and Developer roles
  const isDevOrOwner = adminData && (adminData.isOwner || adminData.isDeveloper)
  const isAdmin = adminData && (adminData.isOwner || adminData.isDeveloper || adminData.isAdmin)

  // Show access denied if not authenticated or not dev/owner (explicitly excluding admins)
  if (!loading && (!session || !isDevOrOwner)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-neutral-400">
              API documentation is only available to Developers and Owners. API key authentication is also supported.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Group endpoints by prefix
  const groupedEndpoints: Record<string, Endpoint[]> = {}
  endpoints.forEach(endpoint => {
    // Skip admin routes if not admin (dev/owner already checked above)
    if (endpoint.path.startsWith('/api/admin') && !isAdmin) return
    // Skip profiles and invitations if not authenticated
    if ((endpoint.path === '/api/profiles' || endpoint.path === '/api/invitations') && !session) return

    const prefix = endpoint.path.split('/').slice(0, 3).join('/') || '/api'
    if (!groupedEndpoints[prefix]) {
      groupedEndpoints[prefix] = []
    }
    groupedEndpoints[prefix].push(endpoint)
  })

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-green-400'
      case 'POST': return 'text-blue-400'
      case 'PUT': return 'text-yellow-400'
      case 'DELETE': return 'text-red-400'
      case 'PATCH': return 'text-purple-400'
      default: return 'text-neutral-400'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
        <div className="max-w-6xl mx-auto flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FontAwesomeIcon icon={faCode} className="text-brand-400" />
            Reminiscent Streaming API Documentation
          </h1>
          <p className="text-neutral-400">
            Complete API reference for Reminiscent Streaming platform. All endpoints support JSON responses.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && endpoints.length === 0 && (
          <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
            <p className="text-yellow-400">No endpoints found.</p>
          </div>
        )}

        {Object.entries(groupedEndpoints).map(([prefix, groupEndpoints]) => (
          <div key={prefix} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white capitalize">
              {prefix.replace('/api/', '').replace(/^\//, '') || 'Root'} Endpoints
            </h2>
            {groupEndpoints.map(endpoint => {
              const metadata = getEndpointMetadata(endpoint.path) || getDefaultDescription(endpoint)
              const isExpandedEndpoint = expanded[endpoint.path]

              return (
                <div
                  key={endpoint.path}
                  className="border border-neutral-700 rounded-lg overflow-hidden hover:border-brand-500/50 transition-colors"
                >
                  <button
                    onClick={() => toggleExpand(endpoint.path)}
                    className="w-full p-4 bg-neutral-900/50 hover:bg-neutral-800/50 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex gap-2">
                        {endpoint.methods.map(method => (
                          <span
                            key={method}
                            className={`px-2 py-1 rounded text-xs font-bold bg-neutral-700/50 ${getMethodColor(method)} border border-neutral-600/50`}
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                      <code className="text-brand-400 font-mono text-sm">{endpoint.path}</code>
                      <span className="text-neutral-400 text-sm">{metadata.description}</span>
                      {metadata && (
                        <div className="flex gap-2 flex-wrap">
                          {metadata.readOnly !== undefined && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              metadata.readOnly 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                              {metadata.readOnly ? 'Read-Only' : 'Write/Modify'}
                            </span>
                          )}
                          {metadata.apiKeySupported && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              API Key Supported
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <FontAwesomeIcon
                      icon={isExpandedEndpoint ? faChevronUp : faChevronDown}
                      className="text-neutral-400 w-4 h-4"
                    />
                  </button>

                  {isExpandedEndpoint && (
                    <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-300 mb-2">Description</h4>
                        <p className="text-neutral-400 text-sm">{metadata.description}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-neutral-300 mb-2">Authentication & Access</h4>
                        <div className="space-y-2 text-sm">
                          <div className="text-neutral-400">
                            <span className="font-medium">Auth Required:</span> {metadata.authRequired ? 'Yes' : 'No'}
                          </div>
                          {metadata.adminOnly && (
                            <div className="text-yellow-400">
                              <span className="font-medium">Restricted:</span> Owner/Developer only or API key with required permissions
                            </div>
                          )}
                          {metadata.apiKeySupported !== undefined && (
                            <div className={metadata.apiKeySupported ? 'text-green-400' : 'text-neutral-500'}>
                              <span className="font-medium">API Key Auth:</span> {metadata.apiKeySupported ? 'Supported' : 'Not Supported'}
                            </div>
                          )}
                          {metadata.requiredPermissions && metadata.requiredPermissions.length > 0 && (
                            <div>
                              <span className="font-medium text-neutral-300">Required Permissions:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {metadata.requiredPermissions.map(perm => (
                                  <span key={perm} className="px-2 py-0.5 bg-neutral-800 rounded text-xs font-mono text-brand-400 border border-neutral-700">
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {metadata.rateLimit && (
                            <div className="text-neutral-400">
                              <span className="font-medium">Rate Limit:</span> {metadata.rateLimit}
                            </div>
                          )}
                        </div>
                      </div>

                      {metadata.queryParams && metadata.queryParams.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-300 mb-2">Query Parameters</h4>
                          <div className="space-y-2">
                            {metadata.queryParams.map(param => (
                              <div key={param.name} className="text-sm">
                                <code className="text-brand-400 font-mono">{param.name}</code>
                                <span className="text-neutral-400 ml-2">
                                  ({param.type}) {param.required && <span className="text-red-400">*required</span>}
                                </span>
                                <div className="text-neutral-500 text-xs ml-4">{param.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {metadata.requestBody && (
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-300 mb-2">Request Body</h4>
                          <p className="text-neutral-400 text-sm mb-2">{metadata.requestBody.description}</p>
                          <pre className="bg-neutral-950 p-3 rounded text-xs overflow-x-auto border border-neutral-700">
                            <code className="text-neutral-300">
                              {JSON.stringify(metadata.requestBody.example, null, 2)}
                            </code>
                          </pre>
                        </div>
                      )}

                      {metadata.responseExamples && metadata.responseExamples.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-300 mb-2">Response Examples</h4>
                          <div className="space-y-3">
                            {metadata.responseExamples.map((example, idx) => (
                              <div key={idx}>
                                <div className="text-sm text-neutral-400 mb-1">
                                  {example.status} - {example.description}
                                </div>
                                <pre className="bg-neutral-950 p-3 rounded text-xs overflow-x-auto border border-neutral-700">
                                  <code className="text-neutral-300">
                                    {JSON.stringify(example.example, null, 2)}
                                  </code>
                                </pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* FAQ Section */}
        <div className="p-6 bg-neutral-900/50 border border-neutral-700/50 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
            <FontAwesomeIcon icon={faQuestionCircle} className="text-brand-400" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {/* FAQ Item 1 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('api-key-supported')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What does "API Key Supported" mean?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['api-key-supported'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['api-key-supported'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    <strong className="text-white">"API Key Supported"</strong> means the endpoint accepts API key authentication in addition to (or instead of) session-based authentication.
                  </p>
                  <p>
                    When you see this label, you can use an API key in the <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">Authorization: Bearer YOUR_API_KEY</code> header to access this endpoint.
                  </p>
                  <p>
                    <strong className="text-yellow-400">Important:</strong> If an endpoint doesn't have this label, it only accepts session-based authentication (you must be logged in).
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('api-key-auth')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What does "API Key Auth: Supported" mean in the description?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['api-key-auth'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['api-key-auth'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    This is the same as the "API Key Supported" label. It appears in the detailed endpoint information when you expand an endpoint card.
                  </p>
                  <p>
                    <strong className="text-green-400">"API Key Auth: Supported"</strong> means you can authenticate using an API key.
                  </p>
                  <p>
                    <strong className="text-neutral-500">"API Key Auth: Not Supported"</strong> means the endpoint only works with session authentication (requires login).
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('read-only-vs-write')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What's the difference between "Read-Only" and "Write/Modify" labels?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['read-only-vs-write'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['read-only-vs-write'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    <strong className="text-green-400">"Read-Only"</strong> endpoints only retrieve data. They use GET requests and don't modify anything on the server.
                  </p>
                  <p>
                    <strong className="text-orange-400">"Write/Modify"</strong> endpoints can create, update, or delete data. They use POST, PUT, DELETE, or PATCH requests.
                  </p>
                  <p className="mt-2">
                    <strong className="text-white">Important for Public API Keys:</strong> Public API keys are read-only. They can only access "Read-Only" endpoints. To use "Write/Modify" endpoints, you need a Private API key with the appropriate permissions.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('required-permissions')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What are "Required Permissions" and how do I use them?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['required-permissions'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['required-permissions'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    When using API key authentication, your API key must have the listed permissions to access the endpoint.
                  </p>
                  <p>
                    <strong className="text-white">Permission Format:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">public.*</code> - Full access to all public endpoints</li>
                    <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">admin.*</code> - Full access to all admin endpoints</li>
                    <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">public.search</code> - Specific permission for search endpoints</li>
                    <li><code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">admin.users.ban</code> - Permission to ban users</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-yellow-400">Creating API Keys:</strong> Only Owners and Developers can create API keys. Go to the Control Panel → API Key Management to create a key with the permissions you need.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 5 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('public-vs-private-api')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What's the difference between Public API and Private API?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['public-vs-private-api'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['public-vs-private-api'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    <strong className="text-blue-400">Public API:</strong> Read-only access to public data like profiles, ratings, comments, search results, and content details. Public API keys are restricted to read-only operations.
                  </p>
                  <p>
                    <strong className="text-purple-400">Private API:</strong> Full access including admin operations like banning users, assigning roles, viewing reports, and managing system settings. Private API keys can perform write operations.
                  </p>
                  <p className="mt-2">
                    <strong className="text-white">Key Differences:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Public API keys: 100 requests/hour, read-only</li>
                    <li>Private API keys: 1000 requests/hour, can modify data</li>
                    <li>Private API keys automatically include all public permissions</li>
                    <li>Public API keys cannot access admin endpoints</li>
                  </ul>
                </div>
              )}
            </div>

            {/* FAQ Item 6 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('how-to-use-api-key')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">How do I use an API key to make requests?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['how-to-use-api-key'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['how-to-use-api-key'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    Include your API key in the <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">Authorization</code> header:
                  </p>
                  <pre className="bg-neutral-950 p-3 rounded border border-neutral-700 overflow-x-auto mt-2">
                    <code className="text-neutral-300 text-xs">
{`Authorization: Bearer ct_your_api_key_here

Example with curl (requires full URL):
curl -H "Authorization: Bearer ct_..." \\
     http://localhost:3000/api/profiles?uid=123

# For production, use your domain:
# curl -H "Authorization: Bearer ct_..." \\
#      https://yourdomain.com/api/profiles?uid=123

Example with JavaScript (relative path works for same-origin):
fetch('/api/profiles?uid=123', {
  headers: {
    'Authorization': 'Bearer ct_your_api_key_here'
  }
})

# For external requests, use full URL:
# fetch('https://yourdomain.com/api/profiles?uid=123', { ... })`}
                    </code>
                  </pre>
                  <p className="mt-2">
                    <strong className="text-yellow-400">Important:</strong> Never share your API key publicly. Treat it like a password. If compromised, revoke it immediately in the Control Panel.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 7 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('rate-limits')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What are rate limits and what happens if I exceed them?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['rate-limits'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['rate-limits'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    Rate limits prevent abuse and ensure fair usage of the API. Each endpoint has different limits based on authentication method:
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                    <li><strong>Public API Keys:</strong> 100 requests/hour</li>
                    <li><strong>Private API Keys:</strong> 1000 requests/hour</li>
                    <li><strong>Session Auth (Owner/Developer):</strong> Varies by endpoint (typically 30-60 requests/minute)</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-red-400">If you exceed the limit:</strong> You'll receive a <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-red-400">429 Too Many Requests</code> status code. The response includes headers showing when the limit resets:
                  </p>
                  <pre className="bg-neutral-950 p-3 rounded border border-neutral-700 overflow-x-auto mt-2">
                    <code className="text-neutral-300 text-xs">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-05T10:00:00Z
Retry-After: 3600`}
                    </code>
                  </pre>
                </div>
              )}
            </div>

            {/* FAQ Item 8 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('restricted-endpoints')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What does "Restricted: Owner/Developer only or API key" mean?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['restricted-endpoints'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['restricted-endpoints'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    This means the endpoint is not publicly accessible. You can access it in two ways:
                  </p>
                  <ol className="list-decimal list-inside ml-2 space-y-2 mt-2">
                    <li>
                      <strong className="text-white">API Key Authentication:</strong> Use a Private API key with the required permissions (e.g., <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-brand-400">admin.users.read</code>)
                    </li>
                    <li>
                      <strong className="text-white">Session Authentication:</strong> Be logged in as an Owner or Developer role
                    </li>
                  </ol>
                  <p className="mt-2">
                    <strong className="text-red-400">Important:</strong> Regular admins cannot access these endpoints via session auth. They must use API keys. Only Owners and Developers can use session-based authentication for admin endpoints.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 9 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('method-badges')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What do the colored method badges (GET, POST, etc.) mean?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['method-badges'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['method-badges'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    These show the HTTP methods supported by each endpoint:
                  </p>
                  <ul className="list-none ml-0 space-y-2 mt-2">
                    <li><span className="text-green-400 font-bold">GET</span> - Retrieve data (read-only, safe)</li>
                    <li><span className="text-blue-400 font-bold">POST</span> - Create new resources or perform actions</li>
                    <li><span className="text-yellow-400 font-bold">PUT</span> - Update/replace entire resources</li>
                    <li><span className="text-red-400 font-bold">DELETE</span> - Remove resources</li>
                    <li><span className="text-purple-400 font-bold">PATCH</span> - Partial update of resources</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-white">Example:</strong> An endpoint with <span className="text-green-400 font-bold">GET</span> and <span className="text-blue-400 font-bold">POST</span> can both retrieve data (GET) and create new data (POST).
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 10 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('query-params-vs-body')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What's the difference between Query Parameters and Request Body?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['query-params-vs-body'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['query-params-vs-body'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    <strong className="text-white">Query Parameters:</strong> Used in the URL for GET requests (and sometimes other methods). Example:
                  </p>
                  <pre className="bg-neutral-950 p-3 rounded border border-neutral-700 overflow-x-auto mt-2">
                    <code className="text-neutral-300 text-xs">
{`GET /api/profiles?uid=123&includeStats=true`}
                    </code>
                  </pre>
                  <p className="mt-2">
                    <strong className="text-white">Request Body:</strong> Used in POST/PUT/PATCH requests to send data. Sent as JSON:
                  </p>
                  <pre className="bg-neutral-950 p-3 rounded border border-neutral-700 overflow-x-auto mt-2">
                    <code className="text-neutral-300 text-xs">
{`POST /api/admin/api-keys
Content-Type: application/json

{
  "name": "My Bot Key",
  "permissions": ["public.search"],
  "expiresInDays": 30
}`}
                    </code>
                  </pre>
                  <p className="mt-2">
                    <strong className="text-yellow-400">Tip:</strong> Required parameters are marked with <span className="text-red-400">*required</span> in the documentation.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 11 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('error-responses')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">What do different HTTP status codes mean?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['error-responses'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['error-responses'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <ul className="list-none ml-0 space-y-2">
                    <li><strong className="text-green-400">200 OK</strong> - Request succeeded</li>
                    <li><strong className="text-blue-400">201 Created</strong> - Resource created successfully</li>
                    <li><strong className="text-red-400">400 Bad Request</strong> - Invalid request (missing parameters, wrong format)</li>
                    <li><strong className="text-red-400">401 Unauthorized</strong> - Not authenticated (missing/invalid API key or session)</li>
                    <li><strong className="text-red-400">403 Forbidden</strong> - Authenticated but insufficient permissions</li>
                    <li><strong className="text-red-400">404 Not Found</strong> - Resource doesn't exist</li>
                    <li><strong className="text-red-400">429 Too Many Requests</strong> - Rate limit exceeded (see Retry-After header)</li>
                    <li><strong className="text-red-400">500 Internal Server Error</strong> - Server error (contact support if persistent)</li>
                  </ul>
                  <p className="mt-2">
                    Error responses include a JSON body with an <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-red-400">error</code> field describing the issue.
                  </p>
                </div>
              )}
            </div>

            {/* FAQ Item 12 */}
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq('creating-api-keys')}
                className="w-full p-4 bg-neutral-800/50 hover:bg-neutral-800/70 flex items-center justify-between text-left transition-colors"
              >
                <span className="text-white font-medium">How do I create an API key and what permissions should I give it?</span>
                <FontAwesomeIcon
                  icon={faqExpanded['creating-api-keys'] ? faChevronUp : faChevronDown}
                  className="text-neutral-400 w-4 h-4"
                />
              </button>
              {faqExpanded['creating-api-keys'] && (
                <div className="border-t border-neutral-700 bg-neutral-900/50 p-4 text-sm text-neutral-300 space-y-2">
                  <p>
                    <strong className="text-white">Who can create keys:</strong> Only Owners and Developers can create API keys through the Control Panel.
                  </p>
                  <p className="mt-2">
                    <strong className="text-white">Steps:</strong>
                  </p>
                  <ol className="list-decimal list-inside ml-2 space-y-1 mt-1">
                    <li>Go to Control Panel → API Key Management</li>
                    <li>Choose Public API (read-only) or Private API (full access)</li>
                    <li>Select specific permissions or use "All Permissions" for full access</li>
                    <li>Optionally tie the key to a specific user</li>
                    <li>Set expiration (optional)</li>
                    <li>Copy the key immediately (it's only shown once!)</li>
                  </ol>
                  <p className="mt-2">
                    <strong className="text-yellow-400">Best Practices:</strong>
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Use the minimum permissions needed (principle of least privilege)</li>
                    <li>Set expiration dates for temporary use cases</li>
                    <li>Name keys descriptively (e.g., "Production Discord Bot", "Analytics Script")</li>
                    <li>Revoke keys immediately if compromised</li>
                    <li>Use different keys for different applications</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

