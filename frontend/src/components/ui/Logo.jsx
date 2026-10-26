import React from 'react'

/**
 * HireOS brand logo — a custom geometric "H" monogram in a rounded app-icon tile.
 * Professional, single-accent, theme-agnostic.
 *
 * Props:
 *  - size: pixel size of the mark (default 28)
 *  - withWordmark: render the "HireOS" wordmark next to the mark
 *  - wordmarkSize: font-size of the wordmark
 */
export default function Logo({ size = 28, withWordmark = false, wordmarkSize, color = '#FFFFFF' }) {
  const id = React.useId()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.34) }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="HireOS">
        <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
        <rect width="31" height="31" x="0.5" y="0.5" rx="7.5" fill="none" stroke="rgba(255,255,255,0.14)" />
        {/* Geometric H monogram */}
        <rect x="8.5" y="8" width="3" height="16" rx="1.5" fill={color} />
        <rect x="20.5" y="8" width="3" height="16" rx="1.5" fill={color} />
        <rect x="10" y="14.4" width="12" height="3.2" rx="1.6" fill={color} />
        {/* AI accent node */}
        <circle cx="22" cy="8.5" r="2.6" fill={`url(#${id}-bg)`} stroke={color} strokeWidth="1.4" />
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#4338CA" />
          </linearGradient>
        </defs>
      </svg>
      {withWordmark && (
        <span
          style={{
            fontWeight: 700,
            fontSize: wordmarkSize || Math.round(size * 0.62),
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          Hire<span style={{ color: 'var(--brand-primary-light)' }}>OS</span>
        </span>
      )}
    </span>
  )
}
