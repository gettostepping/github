/**
 * Comprehensive API Endpoint Test Script
 * 
 * Tests all API endpoints that support API key authentication
 * 
 * Usage:
 *   npx ts-node scripts/test-all-api-endpoints.ts <API_KEY>
 *   
 * Or with environment variable:
 *   API_KEY=your_key npx ts-node scripts/test-all-api-endpoints.ts
 * 
 * Options:
 *   --base-url <url>     Base URL for API (default: http://localhost:3000)
 *   --verbose            Show detailed request/response information
 *   --skip-public        Skip public API endpoint tests
 *   --skip-admin         Skip admin/private API endpoint tests
 */

// Use Node.js 18+ built-in fetch (no dependencies needed)

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

// Parse command line arguments
const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const skipPublic = args.includes('--skip-public')
const skipAdmin = args.includes('--skip-admin')
const baseUrlArg = args.indexOf('--base-url')
const baseUrl = baseUrlArg !== -1 && args[baseUrlArg + 1] ? args[baseUrlArg + 1] : BASE_URL

// API Keys configuration - pass keys as: --public-key KEY --private-key KEY --mixed-key KEY
// Or use environment variables: PUBLIC_API_KEY, PRIVATE_API_KEY, MIXED_API_KEY
const getApiKeyArg = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index !== -1 && args[index + 1] ? args[index + 1] : null
}

const API_KEYS = {
  public: getApiKeyArg('public-key') || process.env.PUBLIC_API_KEY || '',
  private: getApiKeyArg('private-key') || process.env.PRIVATE_API_KEY || '',
  mixed: getApiKeyArg('mixed-key') || process.env.MIXED_API_KEY || ''
}

// Fallback to first argument if no specific keys provided
const fallbackKey = args.find(arg => !arg.startsWith('--') && !args[args.indexOf(arg) - 1]?.startsWith('--')) || process.env.API_KEY || ''
if (fallbackKey && !API_KEYS.public && !API_KEYS.private && !API_KEYS.mixed) {
  API_KEYS.public = fallbackKey
  API_KEYS.private = fallbackKey
  API_KEYS.mixed = fallbackKey
}

// Test results
interface TestResult {
  endpoint: string
  method: string
  status: number
  success: boolean
  duration: number
  error?: string
  response?: any
}

const results: TestResult[] = []
let totalTests = 0
let passedTests = 0
let failedTests = 0

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

// Helper function to determine which API key to use based on endpoint type
function getApiKeyForEndpoint(endpoint: string, requiredPermission?: string, preferMixed?: boolean): string {
  // If preferMixed is true, use mixed key if available (for testing mixed key specifically)
  if (preferMixed && API_KEYS.mixed) {
    return API_KEYS.mixed
  }
  
  // Admin endpoints that only need stats.read can use mixed key
  if (endpoint.startsWith('/api/admin/')) {
    if (endpoint.includes('/stats') || endpoint.includes('/api-status')) {
      // Stats endpoints - prefer mixed if available, then private
      if (API_KEYS.mixed) return API_KEYS.mixed
      if (API_KEYS.private) return API_KEYS.private
    } else {
      // Other admin endpoints - prefer private, then mixed
      if (API_KEYS.private) return API_KEYS.private
      if (API_KEYS.mixed) return API_KEYS.mixed
    }
  }
  
  // Public endpoints - distribute: some use public, some use mixed
  if (endpoint.startsWith('/api/tmdb/') || 
      endpoint.startsWith('/api/profiles') ||
      endpoint.startsWith('/api/ratings') ||
      endpoint.startsWith('/api/comments')) {
    // For testing, use mixed key for some public endpoints to test it
    if (preferMixed && API_KEYS.mixed) return API_KEYS.mixed
    if (API_KEYS.public) return API_KEYS.public
    if (API_KEYS.mixed) return API_KEYS.mixed
    if (API_KEYS.private) return API_KEYS.private
  }
  
  // Fallback to any available key
  return API_KEYS.private || API_KEYS.mixed || API_KEYS.public || ''
}

// Helper function to make API requests
async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  queryParams?: Record<string, string | number>,
  requiredPermission?: string,
  preferMixed: boolean = false
): Promise<TestResult> {
  const startTime = Date.now()
  const url = new URL(endpoint, baseUrl)
  
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  const apiKey = getApiKeyForEndpoint(endpoint, requiredPermission, preferMixed)
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    const duration = Date.now() - startTime
    let responseData: any = null

    try {
      const text = await response.text()
      if (text) {
        responseData = JSON.parse(text)
      }
    } catch {
      // Response is not JSON
    }

    const result: TestResult = {
      endpoint,
      method,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      duration,
      response: responseData
    }

    if (!result.success && responseData?.error) {
      result.error = responseData.error
    }

    return result
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      duration: Date.now() - startTime,
      error: error.message || 'Network error'
    }
  }
}

// Test definitions
const publicApiTests = [
  {
    name: 'Search Movies & TV Shows',
    endpoint: '/api/tmdb/search',
    method: 'GET',
    queryParams: { q: 'inception', type: 'movie' },
    requiredPermission: 'public.search'
  },
  {
    name: 'Get Movie Details',
    endpoint: '/api/tmdb/details',
    method: 'GET',
    queryParams: { id: 27205, type: 'movie' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get TV Show Details',
    endpoint: '/api/tmdb/details',
    method: 'GET',
    queryParams: { id: 1396, type: 'tv' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get Trending Content',
    endpoint: '/api/tmdb/trending',
    method: 'GET',
    queryParams: { type: 'movie' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get Popular Content',
    endpoint: '/api/tmdb/popular',
    method: 'GET',
    queryParams: { type: 'movie' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get Related Content',
    endpoint: '/api/tmdb/related',
    method: 'GET',
    queryParams: { id: 27205, type: 'movie' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get Recommendations',
    endpoint: '/api/tmdb/recommendations',
    method: 'GET',
    queryParams: { id: 27205, type: 'movie' },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get TV Seasons',
    endpoint: '/api/tmdb/seasons',
    method: 'GET',
    queryParams: { id: 1396, season: 1 },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get TV Episodes',
    endpoint: '/api/tmdb/episodes',
    method: 'GET',
    queryParams: { id: 1396, season: 1, episode: 1 },
    requiredPermission: 'public.content.read'
  },
  {
    name: 'Get User Profile',
    endpoint: '/api/profiles',
    method: 'GET',
    queryParams: { uid: 1 }, // Adjust based on your test user
    requiredPermission: 'public.profiles.read'
  },
  {
    name: 'Get Ratings',
    endpoint: '/api/ratings',
    method: 'GET',
    queryParams: { tmdbId: 27205, type: 'movie' },
    requiredPermission: 'public.ratings.read'
  },
  {
    name: 'Get Public Ratings',
    endpoint: '/api/ratings/public',
    method: 'GET',
    queryParams: { tmdbId: 27205, type: 'movie' },
    requiredPermission: 'public.ratings.read'
  },
  {
    name: 'Get Comments',
    endpoint: '/api/comments',
    method: 'GET',
    queryParams: { profileId: 'test-user-id' }, // Adjust based on your test user
    requiredPermission: 'public.comments.read'
  }
]

const adminApiTests = [
  {
    name: 'List Users',
    endpoint: '/api/admin/users',
    method: 'GET',
    requiredPermission: 'admin.users.read'
  },
  {
    name: 'User Lookup by UID',
    endpoint: '/api/admin/user-lookup',
    method: 'GET',
    queryParams: { type: 'uid', query: '1' },
    requiredPermission: 'admin.users.read'
  },
  {
    name: 'System Statistics',
    endpoint: '/api/admin/stats',
    method: 'GET',
    requiredPermission: 'admin.stats.read'
  },
  {
    name: 'API Status Dashboard',
    endpoint: '/api/admin/api-status',
    method: 'GET',
    queryParams: { range: '24h' },
    requiredPermission: 'admin.stats.read'
  },
  {
    name: 'Get Reports',
    endpoint: '/api/admin/reports',
    method: 'GET',
    requiredPermission: 'admin.reports.read'
  },
  {
    name: 'Get Pending Registrations',
    endpoint: '/api/admin/pending-registrations',
    method: 'GET',
    requiredPermission: 'admin.users.read'
  },
  {
    name: 'List Invites',
    endpoint: '/api/admin/invites',
    method: 'GET',
    requiredPermission: 'admin.invites.manage'
  }
]

// Run a test
async function runTest(test: any, category: string, preferMixed: boolean = false) {
  totalTests++
  const result = await testEndpoint(
    test.endpoint,
    test.method,
    test.body,
    test.queryParams,
    test.requiredPermission,
    preferMixed
  )

  results.push(result)

  const statusIcon = result.success ? '✓' : '✗'
  const statusColor = result.success ? colors.green : colors.red
  const statusText = result.success ? 'PASS' : 'FAIL'

  console.log(
    `${statusColor}${statusIcon}${colors.reset} ${colors.cyan}[${result.status}]${colors.reset} ` +
    `${colors.blue}${test.method}${colors.reset} ${test.name} ` +
    `${colors.gray}(${result.duration}ms)${colors.reset}`
  )

  if (result.success) {
    passedTests++
  } else {
    failedTests++
    if (verbose || result.error) {
      console.log(`  ${colors.red}Error:${colors.reset} ${result.error || 'Unknown error'}`)
    }
  }

  if (verbose && result.response) {
    console.log(`  ${colors.gray}Response:${colors.reset} ${JSON.stringify(result.response, null, 2).substring(0, 200)}...`)
  }

  return result
}

// Main test runner
async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║${colors.reset}     API Endpoint Test Suite - Comprehensive Testing     ${colors.cyan}║${colors.reset}`)
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`)

  const hasAnyKey = API_KEYS.public || API_KEYS.private || API_KEYS.mixed
  if (!hasAnyKey) {
    console.log(`${colors.yellow}⚠ Warning: No API keys provided. Some tests may fail.${colors.reset}`)
    console.log(`${colors.gray}   Usage: npx ts-node scripts/test-all-api-endpoints.ts --public-key KEY --private-key KEY --mixed-key KEY${colors.reset}`)
    console.log(`${colors.gray}   Or: PUBLIC_API_KEY=key PRIVATE_API_KEY=key npx ts-node scripts/test-all-api-endpoints.ts${colors.reset}\n`)
  } else {
    console.log(`${colors.green}✓ API Keys configured:${colors.reset}`)
    if (API_KEYS.public) console.log(`${colors.blue}  Public: ${API_KEYS.public.substring(0, 20)}...${colors.reset}`)
    if (API_KEYS.private) console.log(`${colors.cyan}  Private: ${API_KEYS.private.substring(0, 20)}...${colors.reset}`)
    if (API_KEYS.mixed) console.log(`${colors.yellow}  Mixed: ${API_KEYS.mixed.substring(0, 20)}...${colors.reset}`)
    console.log()
  }

  console.log(`${colors.blue}Base URL:${colors.reset} ${baseUrl}\n`)

  // Test public API endpoints
  if (!skipPublic) {
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.cyan}Testing Public API Endpoints${colors.reset}`)
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

    // Test some public endpoints with mixed key to ensure it's tested
    let testIndex = 0
    for (const test of publicApiTests) {
      // Use mixed key for every 3rd test to ensure it's tested
      const useMixed = !!(testIndex % 3 === 2 && API_KEYS.mixed)
      await runTest(test, 'public', useMixed)
      testIndex++
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Test admin/private API endpoints
  if (!skipAdmin) {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.cyan}Testing Admin/Private API Endpoints${colors.reset}`)
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

    for (const test of adminApiTests) {
      await runTest(test, 'admin')
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Print summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.cyan}Test Summary${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)

  console.log(`Total Tests: ${totalTests}`)
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`)
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`)
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`)

  // Show failed tests
  const failedResults = results.filter(r => !r.success)
  if (failedResults.length > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`)
    failedResults.forEach(result => {
      console.log(`  ${colors.red}✗${colors.reset} ${result.method} ${result.endpoint} - Status: ${result.status}`)
      if (result.error) {
        console.log(`    ${colors.gray}Error: ${result.error}${colors.reset}`)
      }
    })
    console.log()
  }

  // Show timing statistics
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const maxDuration = Math.max(...results.map(r => r.duration))
  const minDuration = Math.min(...results.map(r => r.duration))

  console.log(`${colors.blue}Performance Statistics:${colors.reset}`)
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`)
  console.log(`  Min: ${minDuration}ms`)
  console.log(`  Max: ${maxDuration}ms`)
  console.log()

  // Exit code
  process.exit(failedTests > 0 ? 1 : 0)
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error)
  process.exit(1)
})

