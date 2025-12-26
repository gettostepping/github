import { NextRequest, NextResponse } from 'next/server'
import { tmdbGet } from '@/lib/tmdb'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { withRequestLogging } from '@/lib/security/api-request-logger-wrapper'

const prisma = new PrismaClient()

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, results } = body
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }
    
    // Track search if user is authenticated
    const session = await getServerSession(authOptions)
    console.log('🔍 Search tracking POST - Session:', session ? 'Found' : 'Not found')
    
    if (session?.user?.email) {
      try {
        console.log('🔍 Looking up user for search tracking...')
        const user = await prisma.user.findUnique({ 
          where: { email: session.user.email },
          select: { id: true, name: true }
        })
        
        if (user) {
          console.log(`📝 Creating search record for user ${user.name} (${user.id})`)
          await prisma.search.create({
            data: {
              userId: user.id,
              query: query,
              results: results || 0
            }
          })
          console.log(`✅ Search recorded: "${query}" with ${results || 0} results`)
        } else {
          console.log('❌ User not found for search tracking')
        }
      } catch (error) {
        console.error('❌ Search tracking error:', error)
      }
    } else {
      console.log('❌ No session for search tracking')
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Search tracking POST error:', error)
    return NextResponse.json({ error: 'Failed to track search' }, { status: 500 })
  }
}

export const GET = withRequestLogging(getHandler)
export const POST = withRequestLogging(postHandler)

// Fuzzy match score (0-1, higher is better)
function fuzzyMatchScore(searchQuery: string, title: string): number {
  const query = searchQuery.toLowerCase()
  const target = title.toLowerCase()
  
  // Exact match
  if (target === query) return 1.0
  
  // Starts with query
  if (target.startsWith(query)) return 0.9
  
  // Contains exact query
  if (target.includes(query)) return 0.8
  
  // Word boundary match (e.g., "lenox" matches "lenox hill")
  const words = target.split(/\s+/)
  if (words.some(w => w.startsWith(query))) return 0.7
  
  // Partial word match
  if (words.some(w => w.includes(query))) return 0.6
  
  // If the query appears anywhere in the title (even as part of a word), give it a score
  if (target.includes(query)) return 0.5
  
  // Calculate character overlap
  let matchedChars = 0
  let queryIdx = 0
  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      matchedChars++
      queryIdx++
    }
  }
  
  // If most characters match in order, give partial score (lowered threshold)
  const matchRatio = matchedChars / query.length
  if (matchRatio > 0.4) return 0.2 + (matchRatio * 0.3) // Lowered threshold from 0.6 to 0.4
  
  // Even if characters don't match perfectly, if query is a substring, give minimal score
  if (target.includes(query.substring(0, Math.max(1, Math.floor(query.length * 0.6))))) {
    return 0.15
  }
  
  return 0 // No match
}

// Clean and normalize search query
function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove special chars except spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })
  
  // Check API key authentication for public API
  const { verifyApiKey, hasApiKeyPermission } = await import('@/lib/security/api-key-auth')
  const { rateLimiters } = await import('@/lib/security/rate-limit')
  const { blockPublicApiWrites } = await import('@/lib/security/auth')
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth')
  
  const apiKey = await verifyApiKey(req)
  const session = await getServerSession(authOptions)
  
  // If API key is used, check permissions and rate limit
  if (apiKey) {
    // Check if has public.search, public.*, admin.*, or * permission
    // admin.* grants access to all endpoints including public ones
    const hasAccess = hasApiKeyPermission(apiKey, 'public.search') || 
                      hasApiKeyPermission(apiKey, 'public.*') || 
                      hasApiKeyPermission(apiKey, 'admin.*') ||
                      hasApiKeyPermission(apiKey, '*')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions. Requires public.search' }, { status: 403 })
    }
    
    // Apply rate limiting for API keys
    const rateLimitResult = await rateLimiters.apiKey(req)
    if (rateLimitResult) return rateLimitResult
  } else if (!session?.user?.email) {
    // Allow unauthenticated users for search (optional - remove if you want auth required)
    // return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  try {
    const cleanedQuery = cleanQuery(q)
    const originalQuery = q
    
    // Try multiple search variations for better results
    const searchQueries = [
      originalQuery, // Try original first (best for exact matches)
      cleanedQuery,  // Cleaned version
    ]
    
    // If query has multiple words, also try first word only
    const words = cleanedQuery.split(' ')
    if (words.length > 1) {
      searchQueries.push(words[0]) // First word
      searchQueries.push(words.slice(0, 2).join(' ')) // First two words
    }
    
    // Remove duplicates
    const uniqueQueries = Array.from(new Set(searchQueries))
    
    // Collect all results from different queries, fetching multiple pages for more results
    const allResults: any[] = []
    const seenIds = new Set<string>()
    
    for (const searchQuery of uniqueQueries) {
      try {
        // Fetch multiple pages to get more results (up to 3 pages = 60 results per query)
        for (let page = 1; page <= 3; page++) {
          const data = await tmdbGet<any>('/search/multi', {
            query: searchQuery,
            include_adult: false,
            language: 'en-US',
            page: page,
          })
          
          const results = (data?.results || [])
            .filter((r: any) => {
              if (!r || (r.media_type !== 'movie' && r.media_type !== 'tv')) return false
              const id = `${r.media_type}-${r.id}`
              if (seenIds.has(id)) return false
              seenIds.add(id)
              return true
            })
          
          allResults.push(...results)
          
          // Stop if we got fewer results than expected (last page)
          if (!data?.results || data.results.length < 20) break
        }
      } catch (e) {
        console.error(`Search failed for query: ${searchQuery}`, e)
      }
    }
    
    // Apply fuzzy matching and score results
    const scoredResults = allResults.map((r: any) => {
      const title = r.media_type === 'movie' ? (r.title || '') : (r.name || '')
      const score = fuzzyMatchScore(cleanedQuery, title)
      const popularity = r.popularity || 0
      
      // If title contains the search query (even partially), give it a minimum score
      const titleLower = title.toLowerCase()
      const queryLower = cleanedQuery.toLowerCase()
      let minScore = 0
      if (titleLower.includes(queryLower)) {
        minScore = 0.3 // Minimum score for any title containing the query
      }
      
      // Combined score: fuzzy match (50%) + popularity (20%) + minimum boost (30%)
      // Reduced popularity weight to show less popular results too
      const finalScore = Math.max(
        (score * 0.5) + (Math.min(popularity / 2000, 1) * 0.2) + minScore,
        minScore // Ensure minimum score if query is in title
      )
      
      return {
        ...r,
        _searchScore: finalScore
      }
    })
    
    // Filter out very low scores and sort (lowered threshold to be less strict)
    const filtered = scoredResults
      .filter((r: any) => r._searchScore > 0.05) // Lowered from 0.2 to 0.05 to be less strict
      .sort((a: any, b: any) => {
        // Prioritize 1997 Titanic movie to the very top if present
        const aIs1997Titanic = a.media_type === 'movie' && (a.title || '').toLowerCase() === 'titanic' && (a.release_date || '').startsWith('1997')
        const bIs1997Titanic = b.media_type === 'movie' && (b.title || '').toLowerCase() === 'titanic' && (b.release_date || '').startsWith('1997')
        if (aIs1997Titanic && !bIs1997Titanic) return -1
        if (bIs1997Titanic && !aIs1997Titanic) return 1
        
        // Sort by search score
        return b._searchScore - a._searchScore
      })
      .map(({ _searchScore, ...r }) => r) // Remove internal score from output
    
    // Search tracking is now handled client-side by SearchTracker component
    
    return NextResponse.json({ results: filtered })
  } catch (e: any) {
    console.error('Search error:', e)
    return NextResponse.json({ error: 'tmdb_error' }, { status: 502 })
  }
}


