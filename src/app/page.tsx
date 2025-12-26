import SearchBar from '@/components/SearchBar'
import SectionGrid from '@/components/SectionGrid'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import NotSignedIn from "@/components/NotSignedIn";
import AnimatedHomeContent from '@/components/animations/AnimatedHomeContent'

const prisma = new PrismaClient()

async function fetchJson(path: string) {
  const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const res = await fetch(`${base}${path}`, { next: { revalidate: 60 } })
  if (!res.ok) return { results: [] }
  return res.json()
}

export default async function Home() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return (<NotSignedIn />)
    }

    // Fetch user's watchlist for "Continue Watching" section
    // Use session.user.id if available, otherwise query by email (fallback for safety)
    let userId: string | null = null
    if (session.user.id) {
      userId = session.user.id
    } else {
      // Fallback: query by email to get user ID
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      userId = user?.id || null
    }

    const rawItems = userId ? await prisma.watchlist.findMany({ 
      where: { userId }, 
      orderBy: { updatedAt: 'desc' } 
    }) : []

    const items = rawItems.map(item => ({
      ...item,
      id: item.tmdbId,
      poster_path: item.poster,
      media_type: item.type,
      original_id: item.id
    }))

    const id = items.length > 0 ? items[0].tmdbId : null
    const type = items.length > 0 ? items[0].type : null
  
  const [trendingMovies, trendingTv, trendingAll] = await Promise.all([
    fetchJson('/api/tmdb/trending?type=movie'),
    fetchJson('/api/tmdb/trending?type=tv'),
    fetchJson('/api/tmdb/trending'),
  ])

  // Combine trending movies and TV for "Trending Now"
  const trendingNow = [
    ...(trendingMovies.results || []).slice(0, 10),
    ...(trendingTv.results || []).slice(0, 10)
  ]
  const recommended = type && id ? items : []

  return (
    <AnimatedHomeContent 
      recommendedTitle="Continue Watching"
      recommended={recommended}
      trending={trendingNow}
      trendingMovies={trendingMovies.results || []}
      trendingTv={trendingTv.results || []}
    />
  )
}

