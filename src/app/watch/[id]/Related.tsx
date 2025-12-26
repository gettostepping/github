"use client"
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { getPosterUrl } from '@/lib/images'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface RelatedProps {
  id: string
  type: 'movie' | 'tv'
  items?: any[]
  skipFetch?: boolean
}

export default function Related({ id, type, items, skipFetch = false }: RelatedProps) {
  const shouldFetch = !items && !skipFetch
  const { data, error } = useSWR(
    shouldFetch ? `/api/tmdb/related?id=${id}&type=${type}` : null,
    fetcher
  )

  const list = items || data?.results || []

  if (shouldFetch && error) {
    return (
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">&gt; RELATED</h3>
        <div className="text-neutral-400 text-sm">Failed to load related content</div>
      </div>
    )
  }

  if (shouldFetch && !data) {
    return (
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">&gt; RELATED</h3>
        <div className="text-neutral-400 text-sm">Loading related content...</div>
      </div>
    )
  }

  if (!list.length) {
    return (
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">&gt; RELATED</h3>
        <div className="text-neutral-400 text-sm">No related content found</div>
      </div>
    )
  }

  return (
    <div className="bg-neutral-900/70 border border-neutral-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">&gt; RELATED</h3>
      <div className="space-y-2">
        {list.slice(0, 5).map((item: any) => {
          const isTvItem = item.item_type === 'TV' || item.media_type === 'tv' || type === 'tv'
          const title = item.title || item.name
          const destinationId = item.aniwatch_id || item.id

          const params = new URLSearchParams()
          params.set('type', isTvItem ? 'tv' : 'movie')
          if (item.aniwatch_id) {
            params.set('aniId', item.aniwatch_id)
          } else if (item.anilist_id) {
            params.set('anilistId', item.anilist_id)
          }

          return (
            <Link
              key={`${destinationId}`}
              href={`/watch/${destinationId}?${params.toString()}`}
              className="flex items-center gap-3 p-2 rounded hover:bg-neutral-800 transition-colors"
            >
              <div className="relative w-12 h-8 flex-shrink-0">
                <Image
                  src={getPosterUrl(item.poster_path)}
                  alt={title}
                  fill
                  sizes="64px"
                  className="object-cover rounded"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{title}</div>
                <div className="text-neutral-400 text-xs">
                  {(item.media_type || (isTvItem ? 'tv' : 'movie')).toUpperCase()}
                </div>
              </div>
              <div className="text-neutral-500 text-xs">
                {item.vote_average?.toFixed(1) || item.rank || 'N/A'}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}