"use client"
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getPosterUrl } from '@/lib/images'

export default function Card({ item, index = 0 }: { item: any; index?: number }) {
  const isAniwatch = Boolean(item.aniwatch_id)
  const isTv =
    isAniwatch ||
    (item.media_type || '').includes('tv') ||
    !!item.first_air_date

  const title = item.title || item.name
  const destinationId = isAniwatch ? item.aniwatch_id : item.id

  const params = new URLSearchParams()
  params.set('type', isTv ? 'tv' : 'movie')

  if (isAniwatch) {
    params.set('aniId', item.aniwatch_id)
  } else if (item.anilist_id) {
    params.set('anilistId', item.anilist_id)
  }

  const href = item.url || `/watch/${destinationId}?${params.toString()}`
  const date = item.release_date || item.first_air_date
  const year = date ? new Date(date).getFullYear() : null
  const rating = item.vote_average?.toFixed(1)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={href}
        className="group bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden hover:bg-neutral-700/50 transition-all duration-300 hover:scale-105 block"
      >
        <div className="aspect-[3/4] relative overflow-hidden bg-neutral-700">
          <img
            src={getPosterUrl(item.poster_path)}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              // If image fails to load, use placeholder
              const target = e.target as HTMLImageElement
              if (target.src !== '/placeholder.png' && !target.src.includes('placeholder')) {
                target.src = '/placeholder.png'
              }
            }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-4 min-h-[80px] flex flex-col justify-between">
          <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-brand-400 transition-colors h-10">
            {title}
          </h3>
          <div className="flex items-center justify-between text-xs text-neutral-400 mt-auto">
            {year && <span>{year}</span>}
            {rating && <span>★ {rating}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}


