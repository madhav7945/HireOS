import React from 'react'
import { motion } from 'framer-motion'
import './StatCards.css'

/**
 * Shared summary stat-cards row used across all list pages for a consistent layout.
 * items: [{ icon?, value, label, color?, bg?, active?, onClick? }]
 * compact: smaller cards (used for many items like candidate stages)
 */
export default function StatCards({ items, compact = false }) {
  return (
    <div className={`stat-cards ${compact ? 'compact' : ''}`}>
      {items.map((s, i) => {
        const Icon = s.icon
        return (
          <motion.div
            key={s.label}
            className={`stat-card ${s.active ? 'active' : ''} ${s.onClick ? 'clickable' : ''}`}
            onClick={s.onClick}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            {Icon && (
              <div className="stat-card-icon">
                <Icon size={compact ? 16 : 20} />
              </div>
            )}
            <div className="stat-card-body">
              <span className="stat-card-value">{s.value}</span>
              <span className="stat-card-label">{s.label}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
