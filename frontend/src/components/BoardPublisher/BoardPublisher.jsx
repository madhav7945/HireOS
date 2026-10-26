import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Copy, Check, ExternalLink, Share2, Globe,
  Sparkles, Link2, Info, ChevronDown, Rocket,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getSharePlatforms, getApplyUrl, getShareUrl, buildPostText, REGIONS,
} from '../../utils/jobShare'
import './BoardPublisher.css'

const KIND_LABELS = {
  preview: 'Rich Preview',
  intent: 'One-Click Share',
  manual: 'Copy & Paste',
  feed: 'Fully Auto',
}

const KIND_ORDER = ['feed', 'preview', 'intent', 'manual']

export default function BoardPublisher({ job, onClose, selectedBoardIds = [] }) {
  const [region, setRegion] = useState('all')
  const [copiedKey, setCopiedKey] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)
  const [autoPosting, setAutoPosting] = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)
  const [clipboardReady, setClipboardReady] = useState(false)
  const [lastBoard, setLastBoard] = useState('')

  const applyUrl = getApplyUrl(job)
  const platforms = useMemo(() => getSharePlatforms(job, region), [job, region])

  const selected = new Set(selectedBoardIds)

  const grouped = useMemo(() => {
    const g = {}
    for (const p of platforms) {
      ;(g[p.kind] ||= []).push(p)
    }
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => (selected.has(b.id) ? 1 : 0) - (selected.has(a.id) ? 1 : 0))
    }
    return g
  }, [platforms, selectedBoardIds])

  // Write to clipboard + show permanent banner
  const writeToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        legacyCopy(text)
      }
      return true
    } catch {
      return legacyCopy(text)
    }
  }

  const copy = (text, key, label = 'Copied!') => {
    writeToClipboard(text).then(() => {
      setCopiedKey(key)
      toast.success(label)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800)
    })
  }

  // manual board: copy the ready post, then open the board's post-job page.
  const handleManual = async (p) => {
    const text = p.post || buildPostText(job)
    const ok = await writeToClipboard(text)
    setClipboardReady(ok)
    setLastBoard(p.name)
    toast.success(`Post copied! Opening ${p.name} - paste with Ctrl+V.`, { duration: 4000 })
    setTimeout(() => {
      try { window.open(p.board, '_blank', 'noopener,noreferrer') } catch {}
    }, 300)
  }

  // preview platforms (LinkedIn): copy caption + open share URL
  const handlePreview = async (p) => {
    const text = p.post || buildPostText(job)
    const ok = await writeToClipboard(text)
    setClipboardReady(ok)
    setLastBoard(p.name)
    toast.success(`Post copied! Opening ${p.name} - paste with Ctrl+V.`, { duration: 4000 })
    setTimeout(() => {
      try { window.open(p.href, '_blank', 'noopener,noreferrer') } catch {}
    }, 300)
  }

  const handleCardClick = (p) => {
    if (p.kind === 'manual') handleManual(p)
    else if (p.kind === 'preview') handlePreview(p)
    else if (p.kind === 'feed') {
      if (p.href) copy(p.href, p.id, '🔗 Feed URL copied')
      else copy(applyUrl, p.id, '🔗 Apply link copied (auto-indexed)')
    } else if (p.href) {
      window.open(p.href, '_blank', 'noopener,noreferrer')
    }
  }

  const getStatusBadge = (p) => {
    if (p.kind === 'feed') return { label: 'Auto', className: 'status-auto' }
    return { label: 'Ready', className: 'status-ready' }
  }

  const getActionLabel = (p) => {
    if (p.kind === 'manual') return 'Copy & Open'
    if (p.kind === 'preview') return 'Copy & Share'
    if (p.kind === 'feed') return 'Copy Feed URL'
    return 'Open'
  }

  // ── Auto-Post All ──
  const runAutoPost = async () => {
    if (autoPosting || selected.size === 0) return
    setAutoPosting(true)
    setAutoProgress(0)

    const ordered = []
    for (const kind of KIND_ORDER) {
      if (grouped[kind]) {
        for (const p of grouped[kind]) {
          if (selected.has(p.id)) ordered.push(p)
        }
      }
    }

    let done = 0
    for (const p of ordered) {
      if (p.kind === 'feed') {
        // feed boards are auto-done — nothing to open
      } else if (p.kind === 'manual') {
        await new Promise(r => setTimeout(r, 500))
        await handleManual(p)
      } else if (p.kind === 'preview') {
        await new Promise(r => setTimeout(r, 500))
        await handlePreview(p)
      } else if (p.href) {
        await new Promise(r => setTimeout(r, 500))
        window.open(p.href, '_blank', 'noopener')
      }
      done += 1
      setAutoProgress(Math.round((done / ordered.length) * 100))
    }

    toast.success('Auto-post complete! Check each tab to finish posting.', { duration: 4000 })
    setAutoPosting(false)
  }

  return (
    <div className="board-publisher-overlay">
      <motion.div
        className="board-publisher-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="board-publisher-header">
          <div className="board-publisher-header-icon">
            <Share2 size={22} color="#6366F1" />
          </div>
          <div className="board-publisher-header-text">
            <h2>Distribute Job</h2>
            <p>
              Publish <strong>{job?.title || 'this role'}</strong> across platforms — no API keys needed
            </p>
          </div>
          <button className="board-publisher-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Apply Link */}
        <div className="board-publisher-apply-link">
          <Link2 size={14} color="#71717A" />
          <span className="board-publisher-apply-url">{applyUrl}</span>
          <button
            className="board-publisher-copy-btn"
            onClick={() => copy(applyUrl, 'applyurl', 'Apply link copied!')}
          >
            {copiedKey === 'applyurl' ? <Check size={13} /> : <Copy size={13} />}
            {copiedKey === 'applyurl' ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Info Note */}
        <div className="board-publisher-info">
          <Info size={15} color="#818CF8" />
          <p>
            No paid API = no silent auto-post. Click any board and we copy the full job post
            to your clipboard, then open the post box. Just paste with <strong>Ctrl+V</strong>.
          </p>
        </div>

        {/* Region Filter */}
        <div className="board-publisher-filters">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              className={`board-publisher-filter ${region === r.key ? 'active' : ''}`}
              onClick={() => setRegion(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Grouped Platforms */}
        <div className="board-publisher-groups">
          {KIND_ORDER.filter((k) => grouped[k]?.length).map((kind) => (
            <div key={kind} className="board-publisher-group">
              <div className="board-publisher-group-header">
                <h4>{KIND_LABELS[kind]}</h4>
                <span>{grouped[kind].length} board{grouped[kind].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="board-publisher-grid">
                {grouped[kind].map((p) => {
                  const isSel = selected.has(p.id)
                  const isExpanded = expandedCard === p.id
                  const status = getStatusBadge(p)

                  return (
                    <motion.div
                      key={p.id}
                      className={`board-publisher-card ${isSel ? 'selected' : ''}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="board-publisher-card-top">
                        <div className="board-publisher-card-logo" style={{ backgroundColor: `${p.color}18`, color: p.color }}>
                          <span>{p.emoji}</span>
                        </div>
                        <div className="board-publisher-card-info">
                          <div className="board-publisher-card-name-row">
                            <span className="board-publisher-card-name">{p.name}</span>
                            {isSel && <span className="board-publisher-selected-badge">Selected</span>}
                          </div>
                          <div className="board-publisher-card-meta">
                            <span className={`board-publisher-status ${status.className}`}>{status.label}</span>
                            <span className="board-publisher-card-reach">{p.avgReach || p.reach} reach</span>
                          </div>
                        </div>
                      </div>

                      {p.note && (
                        <p className="board-publisher-card-note">{p.note}</p>
                      )}

                      <div className="board-publisher-card-actions">
                        <button
                          className="board-publisher-card-primary"
                          onClick={() => handleCardClick(p)}
                        >
                          {getActionLabel(p)} <ExternalLink size={12} />
                        </button>
                        <button
                          className="board-publisher-card-secondary"
                          onClick={() => setExpandedCard(isExpanded ? null : p.id)}
                        >
                          <ChevronDown size={14} className={isExpanded ? 'rotated' : ''} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            className="board-publisher-card-details"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="board-publisher-card-features">
                              {p.features?.map((f) => (
                                <span key={f} className="board-publisher-feature-tag">{f}</span>
                              ))}
                            </div>
                            {p.post && (
                              <button
                                className="board pricing-list-item-copy"
                                onClick={() => copy(p.post, p.id, `Copied for ${p.name}`)}
                              >
                                <Copy size={12} />
                                {copiedKey === p.id ? 'Copied!' : 'Copy formatted post'}
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {autoPosting && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ height: 4, background: 'var(--surface-elevated)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', width: `${autoProgress}%`, background: 'var(--brand-accent)',
                  borderRadius: 2, transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 4 }}>
              Auto-posting… {autoProgress}%
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="board-publisher-footer">
          <button
            className="board-publisher-copy-full"
            onClick={() => copy(buildPostText(job, applyUrl, { full: true }), 'post', 'Full post copied!')}
          >
            <Sparkles size={14} />
            Copy full formatted post (for any platform)
          </button>

          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="board-publisher-preview-link"
          >
            <ExternalLink size={14} /> Preview public apply page
          </a>

          {selected.size > 0 && (
            <button
              className="board-publisher-auto-btn"
              onClick={runAutoPost}
              disabled={autoPosting}
              style={{ background: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: autoPosting ? 'wait' : 'pointer', opacity: autoPosting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Rocket size={14} />
              {autoPosting ? 'Posting…' : 'Auto-Post All'}
            </button>
          )}

          <button className="board-publisher-done" onClick={onClose}>
            Done
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
