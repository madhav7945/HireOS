import { useEffect, useRef } from 'react'

// ============================================================
// Browser-side proctoring engine for the interview room.
//
// Watches for the classic integrity-risk signals and reports each via onEvent:
//   - tab/app switch (Page Visibility) and window blur
//   - copy / paste / cut (esp. pasting code)
//   - exiting fullscreen
//   - right-click / context menu
//   - obvious devtools-style shortcuts
//   - prolonged inactivity (no answer) — surfaced by the caller via markActivity
//
// onEvent({ type, message, severity }) — severity: 'info' | 'warn' | 'critical'
// Returns nothing; cleans up its own listeners. Pass active=false to disable.
// ============================================================
export function useProctoring({ active, onEvent }) {
  const cb = useRef(onEvent)
  cb.current = onEvent

  useEffect(() => {
    if (!active) return
    const emit = (type, message, severity = 'warn') => cb.current?.({ type, message, severity })

    // ---- Tab / app switch ----
    const onVisibility = () => {
      if (document.hidden) emit('tab_switch', 'Candidate switched away from the interview tab', 'warn')
      else emit('tab_return', 'Candidate returned to the interview tab', 'info')
    }
    const onBlur = () => emit('window_blur', 'Interview window lost focus', 'warn')

    // ---- Clipboard ----
    const onPaste = (e) => {
      const text = (e.clipboardData || window.clipboardData)?.getData('text') || ''
      const big = text.length > 40
      emit('paste', big ? `Large paste detected (${text.length} chars) — possible external code` : 'Paste detected', big ? 'critical' : 'warn')
    }
    const onCopy = () => emit('copy', 'Candidate copied content', 'info')
    const onCut = () => emit('cut', 'Candidate cut content', 'info')

    // ---- Fullscreen ----
    const onFullscreen = () => {
      if (!document.fullscreenElement) emit('fullscreen_exit', 'Candidate exited fullscreen', 'warn')
    }

    // ---- Context menu / devtools shortcuts ----
    const onContextMenu = (e) => { e.preventDefault(); emit('context_menu', 'Right-click / context menu opened', 'info') }
    const onKeyDown = (e) => {
      const k = e.key?.toLowerCase()
      if (e.key === 'F12') emit('devtools', 'DevTools shortcut (F12) pressed', 'critical')
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) emit('devtools', `DevTools shortcut (Ctrl+Shift+${k.toUpperCase()}) pressed`, 'critical')
      else if ((e.ctrlKey || e.metaKey) && k === 'u') emit('view_source', 'View-source shortcut pressed', 'warn')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('copy', onCopy, true)
    document.addEventListener('cut', onCut, true)
    document.addEventListener('fullscreenchange', onFullscreen)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('copy', onCopy, true)
      document.removeEventListener('cut', onCut, true)
      document.removeEventListener('fullscreenchange', onFullscreen)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active])
}
