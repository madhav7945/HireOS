// Auto-Post Engine - distributes a job to boards without paid APIs
// ================================================================

import { getSharePlatforms, buildPostText } from '../utils/jobShare'

export const AUTO_POST_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SKIPPED: 'skipped',
  OPENED: 'opened',
  DONE: 'done',
  WAITING: 'waiting',
  ERROR: 'error',
}

export function runAutoPost(job, boardIds, onUpdate) {
  const platforms = getSharePlatforms(job)
  const selected = platforms.filter((p) => boardIds.includes(p.id))

  selected.forEach((board) => {
    if (board.kind === 'feed') {
      onUpdate?.(board.id, {
        status: AUTO_POST_STATUS.DONE,
        message: 'Already auto-synced via feed. No action needed.',
      })
    } else {
      // Open the board’s URL in a new tab (intent / preview / manual all have a href/board URL)
      const url = board.href || board.board
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      // Copy the ready-formatted post for manual boards
      if (board.kind === 'manual' && board.post) {
        writeClipboard(board.post)
      }

      onUpdate?.(board.id, {
        status: AUTO_POST_STATUS.OPENED,
        message:
          board.kind === 'manual'
            ? 'Board opened in a new tab and post text copied to clipboard. Paste and submit.'
            : 'Pre-filled composer opened in a new tab. Click Post to publish.',
      })
    }
  })
}

function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return legacyCopy(text)
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
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}
