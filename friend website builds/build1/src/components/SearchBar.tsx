"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'

export default function SearchBar() {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const router = useRouter()
  
  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onSubmit={(e) => {
        e.preventDefault()
        router.push(`/search?q=${encodeURIComponent(q.trim())}`)
      }}
      className="flex items-center gap-2 w-full max-w-xl mx-auto"
    >
      <motion.div
        className="flex-1 relative"
        animate={{
          scale: focused ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search movies, TV shows..."
          className="w-full rounded-lg bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 px-4 py-3 text-white placeholder-neutral-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
      </motion.div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
        aria-label="Search"
      >
        <FontAwesomeIcon icon={faSearch} />
        <span className="hidden sm:inline">Search</span>
      </motion.button>
    </motion.form>
  )
}


