import { useState, useEffect } from 'react'

/**
 * Simulates an async data loading delay for realistic UX.
 * In production, replace with actual API calls.
 *
 * @param {number} duration - Loading duration in ms (default: 800)
 * @param {Array} deps - Optional dependency array to re-trigger loading
 * @returns {{ isLoading: boolean, startLoading: () => void }}
 */
export function useSimulatedLoading(duration = 800, deps = []) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, duration)
    return () => clearTimeout(timer)
  }, deps)

  const startLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), duration)
  }

  return { isLoading, startLoading }
}

/**
 * Simulates loading with a staggered reveal for multiple sections.
 * Each section gets its own loading state with increasing delays.
 *
 * @param {number} sectionCount - Number of sections
 * @param {number} baseDelay - Base delay per section in ms
 * @returns {{ sectionsLoaded: boolean[], allLoaded: boolean }}
 */
export function useStaggeredLoading(sectionCount = 3, baseDelay = 400) {
  const [sectionsLoaded, setSectionsLoaded] = useState(
    Array(sectionCount).fill(false)
  )

  useEffect(() => {
    const timers = Array.from({ length: sectionCount }).map((_, i) =>
      setTimeout(() => {
        setSectionsLoaded(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, baseDelay + i * 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const allLoaded = sectionsLoaded.every(Boolean)

  return { sectionsLoaded, allLoaded }
}

/**
 * Animated count-up effect for number displays.
 * Smoothly animates from 0 to the target value.
 *
 * @param {number} target - Final number to count to
 * @param {number} duration - Animation duration in ms (default: 1200)
 * @param {boolean} enabled - Whether to animate (skip if loading)
 * @returns {number} Current animated value
 */
export function useCountUp(target, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!enabled || typeof target !== 'number') {
      setValue(target)
      return
    }

    let startTime = null
    let animFrame = null
    const startVal = 0

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(startVal + (target - startVal) * eased))
      if (progress < 1) {
        animFrame = requestAnimationFrame(step)
      }
    }

    animFrame = requestAnimationFrame(step)
    return () => animFrame && cancelAnimationFrame(animFrame)
  }, [target, duration, enabled])

  return value
}
