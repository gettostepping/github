'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface ScheduleItem {
  id: string
  time: string
  name: string
  episode: number
  airingTimestamp: number
}

interface ScheduleByDate {
  date: string
  dayName: string
  items: ScheduleItem[]
}

export default function AnimeSchedule() {
  const [schedule, setSchedule] = useState<ScheduleByDate[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadSchedule()
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/aniwatch/schedule?days=6')
      if (response.ok) {
        const data = await response.json()
        const results: Array<{ date: string; scheduledAnimes: ScheduleItem[] }> =
          data.results || []

        const formatted = results.map((result) => {
          const date = new Date(result.date)
          return {
            date: result.date,
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            items: (result.scheduledAnimes || []).sort(
              (a, b) => a.airingTimestamp - b.airingTimestamp
            )
          }
        })

        setSchedule(formatted)
      }
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: number, fallbackTime: string): string => {
    if (timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    return fallbackTime
  }

  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'long' })
    return `${month} ${day}${getOrdinalSuffix(day)}`
  }

  const getTimezone = (): string => {
    // Get timezone name (e.g., "EST", "PST", "CST")
    const timeZoneName = Intl.DateTimeFormat('en-US', { 
      timeZoneName: 'short' 
    }).formatToParts(currentTime).find(part => part.type === 'timeZoneName')?.value || 'Local'
    
    // Also show offset
    const offset = -currentTime.getTimezoneOffset() / 60
    const sign = offset >= 0 ? '+' : '-'
    const hours = Math.abs(offset).toString().padStart(2, '0')
    return `${timeZoneName} (GMT${sign}${hours}:00)`
  }

  const formatCurrentTime = (): string => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 w-[300px]"
      >
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white">Estimated Schedule</h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="rounded-full h-8 w-8 border-2 border-brand-400 border-t-transparent"
          />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 w-[340px]"
    >
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">Estimated Schedule</h2>
        </div>
        
        {/* Timezone and Current Time */}
        <div className="bg-brand-600/20 border border-brand-500/50 rounded-lg p-3 mb-2">
          <div className="text-brand-400 text-xs font-medium mb-1">{getTimezone()}</div>
          <div className="text-white text-2xl font-mono font-bold">{formatCurrentTime()}</div>
        </div>
      </div>

      {/* Schedule by Date */}
      <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto -mx-4 px-4 pr-3">
        {schedule.map((daySchedule, dayIndex) => (
          <motion.div
            key={daySchedule.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
            className="border-b border-neutral-700/50 pb-4 last:border-b-0 last:pb-0"
          >
            {/* Date Header */}
            <div className="bg-neutral-700/30 border border-neutral-600/50 rounded-lg p-2.5 mb-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-bold text-base">{formatDate(daySchedule.date)}</span>
                <span className="bg-brand-600/20 border border-brand-500/30 rounded px-2 py-1 text-xs text-brand-300 font-medium">
                  {daySchedule.dayName}
                </span>
              </div>
            </div>

            {/* Schedule Items */}
            <div className="space-y-3 mt-3">
              {daySchedule.items.map((item) => (
                <Link
                  key={`${daySchedule.date}-${item.id}-${item.episode}`}
                  href={`/watch/${item.id}?type=tv&aniId=${item.id}`}
                  className="block"
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-neutral-700/20 border border-neutral-600/50 rounded-lg p-3 hover:bg-neutral-700/40 hover:border-brand-500/50 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="bg-neutral-800/50 border border-neutral-600/50 rounded-lg px-2.5 py-1.5 min-w-[70px] flex items-center justify-center">
                        <span className="text-brand-400 font-mono font-medium text-xs">
                          {formatTime(item.airingTimestamp, item.time)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                        <div className="text-white truncate font-medium mb-1 w-full">
                          {item.name}
                        </div>
                        <div className="text-neutral-400 text-xs">
                          Episode {item.episode}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {schedule.length === 0 && (
        <div className="text-center py-8 text-neutral-400">
          <p>No upcoming schedule available</p>
        </div>
      )}
    </motion.div>
  )
}

