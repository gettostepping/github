'use client'

import { motion } from 'framer-motion'
import Card from '@/components/Card'

export default function SectionGrid({ title, items }: { title: string; items: any[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.h2 
        className="mb-3 text-xl font-semibold text-white"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {title}
      </motion.h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.slice(0, 12).map((it, index) => (
          <Card 
            key={`${it.media_type || it.title}-${it.id}`} 
            item={it} 
            index={index}
          />
        ))}
      </div>
    </motion.section>
  )
}


