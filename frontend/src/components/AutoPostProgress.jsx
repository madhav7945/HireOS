import React from 'react'
import toast from 'react-hot-toast'
import { getSharePlatforms } from '../utils/jobShare'

function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

function StatusIcon({ state }) {
  const style = {
    width: 18, height: 18, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
  }
  switch (state) {
    case 'done':
      return <span style={{ ...style, background: '#10B981', color: '#fff' }}>✓</span>
    case 'running':
      return <span style={{ ...style, border: '2px solid #6C5CE7', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    case 'error':
      return <span style={{ ...style, background: '#EF4444', color: '#fff' }}>✕</span>
    default:
      return <span style={{ ...style, border: '2px solid var(--border-default)' }} />
  }
}

export default function AutoPostProgress({ job, boardIds, onClose }) {
  const [boardMap, setBoardMap] = React.useState({})
  const [started, setStarted] = React.useState(false)

  const platforms = getSharePlatforms(job)

  const selectedBoards = React.useMemo(
    () => platforms.filter(p => boardIds.includes(p.id)),
    [platforms, boardIds],
  )

  // Build display boards with state
  const boards = React.useMemo(() => {
    return selectedBoards.map(b => ({
      ...b,
      state: boardMap[b.id]?.state || 'idle',
      message: boardMap[b.id]?.message || '',
    }))
  }, [selectedBoards, boardMap])

  const setBoardState = (id, state, message = '') => {
    setBoardMap(prev => ({ ...prev, [id]: { state, message } }))
  }

  const openTab = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const runAll = async () => {
    if (started || selectedBoards.length === 0) return
    setStarted(true)

    for (const board of selectedBoards) {
      if (board.kind === 'feed') {
        setBoardState(board.id, 'done', 'Auto-synced via feed')
        await new Promise(r => setTimeout(r, 500))
      } else if (board.kind === 'manual') {
        setBoardState(board.id, 'running')
        openTab(board.board)
        if (board.post) {
          try { await writeClipboard(board.post) } catch { }
        }
        setBoardState(board.id, 'done', 'Tab opened — paste with Ctrl+V')
        await new Promise(r => setTimeout(r, 500))
      } else if (board.kind === 'preview') {
        setBoardState(board.id, 'running')
        if (board.post) {
          try { await writeClipboard(board.post) } catch { }
        }
        openTab(board.href)
        setBoardState(board.id, 'done', 'Tab opened with post copied')
        await new Promise(r => setTimeout(r, 500))
      } else if (board.href) {
        setBoardState(board.id, 'running')
        openTab(board.href)
        setBoardState(board.id, 'done', 'Tab opened')
        await new Promise(r => setTimeout(r, 500))
      }
    }

    toast.success('Auto-post complete! Check each tab to finish posting.', { duration: 4000 })
  }

  const allDone = boards.length > 0 && boards.every(b => b.state === 'done')

  return (
    <div style={styles.overlay} className="auto-post-overlay">
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>Auto-Post Progress</span>
          <button style={styles.closeBtn} onClick={onClose}>Close</button>
        </div>

        <div style={styles.body}>
          {boards.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No boards selected.
            </p>
          )}

          {boards.map(board => (
            <div
              key={board.id}
              style={{
                ...styles.row,
                borderLeft: `3px solid ${board.color || 'var(--border-subtle)' }`,
              }}
            >
              <div style={styles.rowTop}>
                <StatusIcon state={board.state} />
                <div style={styles.rowInfo}>
                  <strong style={styles.rowName}>{board.name}</strong>
                  <small style={styles.rowMessage}>
                    {board.message || (
                      board.kind === 'feed' ? 'Auto-synced via feed' :
                      board.kind === 'manual' ? 'Copy & open board' :
                      board.kind === 'preview' ? 'Rich preview share' : 'One-click share'
                    )}
                  </small>
                </div>
                <span style={styles.kindTag(board.kind)}>
                  {board.kind}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          {!started && (
            <button
              style={styles.primaryBtn}
              onClick={runAll}
              disabled={boards.length === 0}
            >
              Auto-Post All
            </button>
          )}
          {started && !allDone && (
            <button
              style={{ ...styles.primaryBtn, opacity: 0.6, cursor: 'wait' }}
              disabled
            >
              Working...
            </button>
          )}
          {allDone && (
            <button
              style={{ ...styles.primaryBtn, background: '#10B981' }}
              onClick={onClose}
            >
              Done — Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(0,0,0,0.5)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: '12px', width: '100%', maxWidth: 520, maxHeight: '85vh',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontWeight: 600, fontSize: '1rem' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' },
  body: { flex: 1, overflow: 'auto', padding: '16px 20px' },
  row: {
    padding: '12px 16px', marginBottom: '8px', borderRadius: '8px',
    background: 'var(--surface-elevated)',
  },
  rowTop: { display: 'flex', alignItems: 'center', gap: 12 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' },
  rowMessage: { display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 },
  kindTag: (kind) => ({
    fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600, addictionson: '0.05em',
    padding: '2px 8px', borderRadius: '4px',
    background:
      kind === 'feed'    ? '#E0F2FE' :
      kind === 'preview' ? '#F3E8FF' :
      kind === 'manual'  ? '#FEF3C7' :
      kind === 'intent'  ? '#D1FAE5' : '#F3F4F6',
    color:
      kind === 'feed'    ? '#0369A1' :
      kind === 'preview' ? '#7C3AED' :
      kind === 'manual'  ? '#D97706' :
      kind === 'intent'  ? '#059669' : '#6B7280',
  }),
  footer: {
    padding: '12px 20px', borderTop: '1px solid var(--border-subtle)',
    textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 8,
  },
  primaryBtn: {
    background: '#6C5CE7', color: '#fff', border: 'none',
    padding: '8px 20px', borderRadius: '8px', fontWeight: 600,
    cursor: 'pointer', fontSize: '0.9rem',
  },
}
