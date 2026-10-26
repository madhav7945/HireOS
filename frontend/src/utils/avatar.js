// Muted, professional avatar palette (deep jewel tones, not neon rainbow)
const AVATAR_COLORS = [
  '#4F46E5', // indigo
  '#475569', // slate
  '#0F766E', // teal
  '#6D28D9', // violet
  '#9F1239', // rose
  '#B45309', // amber
  '#047857', // emerald
  '#0E7490', // cyan
  '#7C3AED', // purple
  '#525252', // neutral
]

export function avatarColor(seed = 0) {
  let n = seed
  if (typeof seed === 'string') {
    n = 0
    for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i)
  }
  return AVATAR_COLORS[Math.abs(Math.round(n)) % AVATAR_COLORS.length]
}
