import { useState, useCallback } from 'react'

/**
 * Reusable Zoho-style column chooser.
 * @param {string} storageKey  unique localStorage key per page
 * @param {Array}  allColumns  [{ key, label, default? }]
 * Returns { visible (Set of keys), toggle, isVisible, activeColumns }
 */
export function useColumnChooser(storageKey, allColumns) {
  const [visible, setVisible] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (Array.isArray(saved)) return saved
    } catch {}
    return allColumns.filter(c => c.default !== false).map(c => c.key)
  })

  const toggle = useCallback((key) => {
    setVisible(prev => {
      const col = allColumns.find(c => c.key === key)
      if (col?.required) return prev
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey, allColumns])

  const isVisible = useCallback((key) => visible.includes(key), [visible])
  // Preserve original column order
  const activeColumns = allColumns.filter(c => visible.includes(c.key))

  return { visible, toggle, isVisible, activeColumns }
}
