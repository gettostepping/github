'use client'

import { motion } from 'framer-motion'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'card' | 'text' | 'circle' | 'rect'
}

export default function LoadingSkeleton({ className = '', variant = 'rect' }: LoadingSkeletonProps) {
  const baseStyles = 'bg-neutral-800 rounded'
  
  const variantStyles = {
    card: 'aspect-[2/3] w-full',
    text: 'h-4 w-full',
    circle: 'rounded-full w-12 h-12',
    rect: 'h-20 w-full'
  }

  return (
    <motion.div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden">
      <LoadingSkeleton variant="card" />
      <div className="p-3 space-y-2">
        <LoadingSkeleton variant="text" className="h-4" />
        <LoadingSkeleton variant="text" className="h-3 w-3/4" />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <CardSkeleton />
        </motion.div>
      ))}
    </div>
  )
}

