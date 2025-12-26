'use client'

import { motion } from 'framer-motion'
import SearchBar from '@/components/SearchBar'
import SectionGrid from '@/components/SectionGrid'

interface AnimatedHomeContentProps {
  recommended?: any[]
  recommendedTitle?: string
  trending: any[]
  trendingMovies: any[]
  trendingTv: any[]
}

export default function AnimatedHomeContent({ recommended, recommendedTitle, trending, trendingMovies, trendingTv }: AnimatedHomeContentProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold text-white mb-4 text-center"
          >
            Welcome to <motion.span
              className="text-brand-400"
              animate={{ 
                textShadow: [
                  '0 0 0px rgba(139, 92, 246, 0)',
                  '0 0 20px rgba(139, 92, 246, 0.5)',
                  '0 0 0px rgba(139, 92, 246, 0)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >Reminiscent</motion.span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-neutral-400 mb-8 text-center w-full"
          >
            Your ultimate destination for movies and TV shows
          </motion.p>
          
          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-12">
          {recommended && recommended.length > 0 && (
            <SectionGrid title={recommendedTitle || "Recommended For You"} items={recommended} />
          )}
          <SectionGrid title="Trending Now" items={trending} />
          <SectionGrid title="Trending Movies" items={trendingMovies} />
          <SectionGrid title="Trending TV Shows" items={trendingTv} />
        </div>
      
        {/* Quick Access to All Content Types */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16"
        >
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-bold text-white mb-8 text-center"
          >
            Explore Content
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { href: '/movies', emoji: '🎬', title: 'Movies', desc: 'Watch the latest movies', color: 'blue' },
              { href: '/tv', emoji: '📺', title: 'TV Shows', desc: 'Binge your favorite series', color: 'green' }
            ].map((item, index) => (
              <motion.a
                key={item.href}
                href={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={`group bg-gradient-to-br from-${item.color}-600/20 to-${item.color === 'blue' ? 'cyan' : 'emerald'}-600/20 border border-${item.color}-500/30 rounded-xl p-6 transition-all duration-300`}
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className={`w-12 h-12 bg-${item.color}-600/20 rounded-lg flex items-center justify-center`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                  </motion.div>
                  <div>
                    <h3 className={`text-xl font-semibold text-white group-hover:text-${item.color}-400 transition-colors`}>
                      {item.title}
                    </h3>
                    <p className="text-neutral-400">{item.desc}</p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}

