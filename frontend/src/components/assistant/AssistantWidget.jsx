import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, X, Send, Loader2, Wand2 } from 'lucide-react'
import { useAssistantStore } from '../../store/assistantStore'
import { useAuthStore } from '../../store'
import { runAssistant, isAssistantConfigured } from '../../services/assistant'
import './AssistantWidget.css'

const SUGGESTIONS = [
  'How many live jobs do we have?',
  'Add a reminder to review the React shortlist tomorrow',
  'Post a Senior Backend Engineer role in Engineering, remote',
  'Take me to the pipeline',
]

export default function AssistantWidget() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { open, busy, messages, toggle, closePanel, addMessage, setBusy, setLastToolRuns, getHistory } =
    useAssistantStore()
  const user = useAuthStore((s) => s.user)
  const company = useAuthStore((s) => s.company)

  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [open, messages, busy])

  // Cmd/Ctrl+J toggles Zoe.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || busy) return
    setInput('')
    addMessage({ role: 'user', content: message })
    setBusy(true)

    const context = {
      userName: user?.name?.split(' ')[0] || 'there',
      userRole: user?.role || 'recruiter',
      companyName: company?.name || 'your company',
      currentPath: location.pathname,
      today: new Date().toISOString().slice(0, 10),
    }

    try {
      const { reply, toolRuns } = await runAssistant({
        history: getHistory(),
        userMessage: message,
        context,
        hooks: {
          navigate,
          invalidate: () => queryClient.invalidateQueries(),
        },
      })
      addMessage({ role: 'assistant', content: reply })
      if (toolRuns?.length) setLastToolRuns(toolRuns)
    } catch (err) {
      addMessage({ role: 'assistant', content: `Something went wrong: ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>


      {open && (
        <div className="zoe-panel" role="dialog" aria-label="Zoe assistant">
          <header className="zoe-header">
            <div className="zoe-id">
              <span className="zoe-avatar"><Sparkles size={16} /></span>
              <div>
                <strong>Zoe</strong>
                <span className="zoe-sub">{isAssistantConfigured() ? 'HireOS Operator' : 'Offline — add an AI key'}</span>
              </div>
            </div>
            <button className="zoe-close" onClick={closePanel} aria-label="Close"><X size={18} /></button>
          </header>

          <div className="zoe-messages" ref={scrollRef}>
            {messages.map((m) => (
              <div key={m.id} className={`zoe-msg zoe-${m.role}`}>
                <div className="zoe-bubble">{m.content}</div>
                {m.toolRuns?.length > 0 && (
                  <div className="zoe-tools">
                    {m.toolRuns.map((t, i) => (
                      <span key={i} className={`zoe-tool-badge ${t.result?.ok ? 'ok' : 'warn'}`}>
                        <Wand2 size={11} /> {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="zoe-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="zoe-chip" onClick={() => send(s)} disabled={busy}>{s}</button>
                ))}
              </div>
            )}

            {busy && (
              <div className="zoe-msg zoe-assistant">
                <div className="zoe-bubble zoe-typing"><Loader2 size={14} className="zoe-spin" /> Zoe is working…</div>
              </div>
            )}
          </div>

          <div className="zoe-input">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder="Ask Zoe to do something…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
            />
            <button className="zoe-send" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
