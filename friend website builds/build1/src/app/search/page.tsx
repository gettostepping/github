import Link from 'next/link'
import SearchTracker from '@/components/SearchTracker'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim()
  const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const res = q ? await fetch(`${base}/api/tmdb/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' }) : null
  const data = res && res.ok ? await res.json() : { results: [] }
  const results = data.results || []

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <SearchTracker query={q} results={results} />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Search Results</h1>
          <p className="text-neutral-400">
            {q ? `Found ${results.length} results for "${q}"` : 'Enter a search term to find movies and TV shows'}
          </p>
        </div>

        {/* Content */}
        {results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-400">
              {q ? `No results found for "${q}"` : 'Enter a search term to find movies and TV shows'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((item: any) => (
              <Link
                key={`${item.media_type}-${item.id}`}
                href={`/watch/${item.id}?type=${item.media_type}`}
                className="group bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 hover:scale-105"
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/placeholder.png'}
                    alt={item.title || item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors">
                    {item.title || item.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      {item.media_type === 'movie' 
                        ? new Date(item.release_date).getFullYear()
                        : new Date(item.first_air_date).getFullYear()
                      }
                    </span>
                    <span>★ {item.vote_average.toFixed(1)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs text-brand-400 capitalize">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}


