import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'hireos_custom_fields'

// Shape: { candidates: [{ key, label, type, options?, required }], jobs: [...] }
const DEFAULTS = { candidates: [], jobs: [] }

function read() {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

function write(value) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('hireos-custom-fields-changed'))
  }
}

export function slugify(label) {
  return 'cf_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export function useCustomFields(module) {
  const [all, setAll] = useState(read)

  useEffect(() => {
    const handler = () => setAll(read())
    window.addEventListener('hireos-custom-fields-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('hireos-custom-fields-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const fields = module ? (all[module] || []) : all

  const addField = useCallback((mod, field) => {
    const next = read()
    next[mod] = [...(next[mod] || []), field]
    write(next)
    setAll(next)
  }, [])

  const removeField = useCallback((mod, key) => {
    const next = read()
    next[mod] = (next[mod] || []).filter(f => f.key !== key)
    write(next)
    setAll(next)
  }, [])

  return { fields, all, addField, removeField }
}
