"use client"

import { useState, useEffect } from 'react'

interface RatingStarsProps {
  tmdbId: number
  type: 'movie' | 'tv'
  userRating?: number | null
  averageRating?: number
  totalRatings?: number
  onRatingChange?: (rating: number) => void
}

export default function RatingStars({ 
  tmdbId, 
  type, 
  userRating, 
  averageRating = 0, 
  totalRatings = 0,
  onRatingChange 
}: RatingStarsProps) {
  const [currentRating, setCurrentRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Load rating from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRating = localStorage.getItem(`rating-${tmdbId}-${type}`)
      if (savedRating) {
        setCurrentRating(parseInt(savedRating))
      } else if (userRating) {
        setCurrentRating(userRating)
      }
    }
  }, [tmdbId, type, userRating])

  const handleRating = async (rating: number) => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdbId,
          type,
          rating
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentRating(rating)
        // Save rating to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`rating-${tmdbId}-${type}`, rating.toString())
        }
        onRatingChange?.(rating)
      }
    } catch (error) {
      console.error('Error saving rating:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isLoading}
            className={`text-2xl transition-colors ${
              star <= (hoverRating || currentRating)
                ? 'text-yellow-400'
                : 'text-neutral-600 hover:text-yellow-300'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ★
          </button>
        ))}
        {isLoading && <span className="text-sm text-neutral-400 ml-2">Saving...</span>}
      </div>
      
      {averageRating > 0 && (
        <div className="text-sm text-neutral-400">
          Average: {averageRating.toFixed(1)} ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  )
}
