'use client'

import { useEffect, useRef } from 'react'

interface SearchTrackerProps {
  query: string
  results: any[]
}

export default function SearchTracker({ query, results }: SearchTrackerProps) {
  const trackedQueries = useRef(new Set<string>())

  useEffect(() => {
    if (!query || results.length === 0) return

    // Only track if we haven't tracked this exact query before
    if (trackedQueries.current.has(query)) {
      console.log(`⏭️ Skipping duplicate tracking for: "${query}"`)
      return
    }

    // Track the search on the client side
    const trackSearch = async () => {
      try {
        trackedQueries.current.add(query)
        await fetch('/api/tmdb/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            results: results.length
          })
        })
        console.log(`✅ Search tracked: "${query}" with ${results.length} results`)
      } catch (error) {
        console.error('❌ Failed to track search:', error)
        trackedQueries.current.delete(query) // Remove on error so it can retry
      }
    }

    trackSearch()
  }, [query, results])

  return null // This component doesn't render anything
}
