import { Metadata } from 'next'
import { tmdbGet } from '@/lib/tmdb'
import { headers } from 'next/headers'

// Force dynamic rendering to ensure metadata is generated per request
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Get type from URL - try multiple sources for maximum compatibility
  let type = 'movie'
  
  try {
    const headersList = await headers()
    
    // Try middleware-injected header first (if available)
    const headerType = headersList.get('x-watch-type')
    if (headerType === 'tv' || headerType === 'movie') {
      type = headerType
    } else {
      // Fallback: Try to extract from request URL in headers
      // Next.js sometimes provides the URL in various headers
      const referer = headersList.get('referer') || ''
      const xUrl = headersList.get('x-url') || headersList.get('x-invoke-path') || ''
      const xForwardedUrl = headersList.get('x-forwarded-url') || ''
      
      // Try to parse URL from any available source
      const urlString = referer || xUrl || xForwardedUrl
      if (urlString) {
        try {
          // Handle both absolute and relative URLs
          const fullUrl = urlString.startsWith('http') 
            ? urlString 
            : `https://reminiscent.cc${urlString.startsWith('/') ? urlString : `/${urlString}`}`
          const url = new URL(fullUrl)
          const urlType = url.searchParams.get('type')
          if (urlType === 'tv' || urlType === 'movie') {
            type = urlType
          }
        } catch (e) {
          // If URL parsing fails, try string matching
          if (urlString.includes('?type=tv') || urlString.includes('&type=tv')) {
            type = 'tv'
          } else if (urlString.includes('?type=movie') || urlString.includes('&type=movie')) {
            type = 'movie'
          }
        }
      }
    }
  } catch (error) {
    // If we can't read headers, default to movie
    console.error('Error reading headers in generateMetadata:', error)
  }
  
  // Use the type from URL - try that first, then fallback ONLY if it fails
  let data = null
  let finalType = type
  
  try {
    data = await tmdbGet<any>(`/${type}/${params.id}`)
    finalType = type
  } catch (error) {
    // Only try fallback if the specified type fails
    try {
      const fallbackType = type === 'tv' ? 'movie' : 'tv'
      data = await tmdbGet<any>(`/${fallbackType}/${params.id}`)
      finalType = fallbackType
    } catch (fallbackError) {
      data = null
    }
  }
  
  if (!data) {
    return {
      title: 'Watch on Reminiscent',
      description: 'Stream movies and TV shows on Reminiscent',
    }
  }
  
  const title = data.title || data.name || 'Watch on Reminiscent'
  const overview = data.overview || 'Stream movies and TV shows on Reminiscent'
  
  // Use backdrop image for rich embeds (like HBO Max style)
  const backdrop = data.backdrop_path 
    ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
    : data.poster_path
      ? `https://image.tmdb.org/t/p/w1280${data.poster_path}`
      : undefined

  // Format description like HBO Max
  const description = finalType === 'tv' 
    ? `Stream the ${data.genres?.[0]?.name?.toLowerCase() || ''} series ${title} exclusively on Reminiscent. Sign up for must-see series, movies, and more.`
    : `Stream ${title} exclusively on Reminiscent. Sign up for must-see series, movies, and more.`

  return {
    title: `Watch ${title} | Reminiscent`,
    description: description,
    openGraph: {
      title: `Watch ${title} | Reminiscent`,
      description: description,
      images: backdrop ? [{ url: backdrop, width: 1280, height: 720, alt: title }] : [],
      type: 'website',
      siteName: 'Reminiscent',
      url: `https://reminiscent.cc/watch/${params.id}?type=${finalType}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Watch ${title} | Reminiscent`,
      description: description,
      images: backdrop ? [backdrop] : [],
    },
  }
}

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

