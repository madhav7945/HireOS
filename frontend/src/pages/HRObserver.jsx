import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Brain, Video, VideoOff, Mic, MicOff, Phone, Eye, Users,
  MessageSquare, Shield, ShieldCheck, BarChart3, Send, Timer,
  AlertTriangle, CheckCircle2, EyeOff, User, Monitor, FileText
} from 'lucide-react'
import { useInterviewSessionStore } from '../store/interviewSessionStore'
import { AI_SCORING_CATEGORIES } from '../data/mockData'
import { localDataService } from '../services/localData'
import './CandidateInterview.css'

export default function HRObserver() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const store = useInterviewSessionStore()
  const { mode, status, candidate, ai, hr, messages, questions,
    currentQuestionIndex, scores, proctoring, elapsedSeconds } = store

  const [chatInput, setChatInput] = useState('')
  const [showScoring, setShowScoring] = useState(true)
  const chatEndRef = useRef(null)

  // Observe ONLY: join the candidate's live session over Realtime and consume the
  // synced state. We must NEVER initSession/startSession/tick here — doing so would
  // reset and restart the candidate's running interview (state is broadcast both ways).
  useEffect(() => {
    store.connectRealtime(sessionId)
    // Also load interview data from localDataService for fallback metadata
    localDataService.get('interviews', sessionId, 'session_id')
      .then(iv => { if (iv) setInterviewData(iv) })
      .catch(() => {})
    return () => store.disconnectRealtime()
  }, [sessionId])

  const [interviewData, setInterviewData] = useState(null)

  const waiting = status === 'idle' || status === 'lobby'

  // ---- STT Logic for HR ----
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Only listen if HR has control and mic is on
    if (mode !== 'hr' || !hr.micOn) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsListening(false)
      }
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1]
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim()
          if (transcript) {
            // Send HR speech to candidate
            store.addMessage('hr', transcript)
          }
        }
      }

      recognition.onerror = (e) => console.warn('HR Speech recognition error:', e.error)
      
      recognition.onend = () => {
        // Auto-restart if still micOn and in HR mode
        if (hr.micOn && mode === 'hr') {
          try { recognition.start() } catch (e) {}
        } else {
          setIsListening(false)
        }
      }

      try {
        recognition.start()
        setIsListening(true)
      } catch (e) {}

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [mode, hr.micOn])

  // HR is an OBSERVER: scores arrive via realtime sync from the candidate's AI
  // session. Do NOT write scores here — that would overwrite the real ones.

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fmt = (s) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const handleTakeControl = () => {
    store.switchToHR({ name: 'Sarah Chen', email: 'sarah@hireos.ai' })
  }

  const handleGiveBack = () => {
    store.switchToAI()
  }

  const handleEndInterview = () => {
    store.endSession('hr_ended')
    // Save session data and trigger pipeline
    store.saveSessionData().catch(() => {})
    const finalState = useInterviewSessionStore.getState()
    import('../services/pipeline').then(m => {
      m.pipelineService.onInterviewComplete({ sessionId, scores: finalState.scores, reason: 'hr_ended' })
    }).catch(() => {})
    navigate(`/interviews/${sessionId}/report`)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    store.addMessage('hr', chatInput.trim())
    setChatInput('')
  }

  const question = questions[currentQuestionIndex]
  const isSpeaking = ai.isSpeaking && mode === 'ai'
  const hasControl = mode === 'hr'
  const isEnded = status === 'completed' || status === 'ended' || messages.some(m => m.content?.includes('[END_CALL]') || m.content?.includes('[[END:'))

  const hasSavedRef = useRef(false)
  useEffect(() => {
    if (isEnded && !hasSavedRef.current) {
      hasSavedRef.current = true
      store.saveSessionData().catch(() => {})
      const finalState = useInterviewSessionStore.getState()
      import('../services/pipeline').then(m => {
        m.pipelineService.onInterviewComplete({ sessionId, scores: finalState.scores, reason: 'completed' })
      }).catch(() => {})
    }
  }, [isEnded, sessionId])

  if (waiting) {
    return (
      <div className="ci-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: 44, height: 44, border: '3px solid rgba(108,92,231,0.3)', borderTopColor: '#6C5CE7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>Waiting for the candidate…</h2>
          <p>This room will go live the moment the candidate joins session <code>{sessionId}</code>.</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: 8 }}>You'll observe their video status, transcript, code, scores and proctoring in real time.</p>
          <button className="ci-end-btn" style={{ marginTop: 20 }} onClick={() => navigate('/interviews')}><Phone size={16} /> Leave</button>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="ci-page">
      {/* Control Banner */}
      <AnimatePresence>
        {hasControl && !isEnded && (
          <motion.div className="ci-hr-banner" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            🟠 You have control of this interview — AI is paused
            <button onClick={handleGiveBack} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, background: 'rgba(255,165,0,0.2)', color: '#ffa500', border: '1px solid rgba(255,165,0,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}>
              <Brain size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Hand Back to AI
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="ci-topbar">
        <div className="ci-topbar-left">
          <div className="ci-brand"><Zap size={16} /> HireOS</div>
          <div className="ci-session-info">
            <Eye size={12} /> HR Observer • {candidate.name} • {candidate.role}
          </div>
        </div>
        <div className="ci-topbar-center">
          {!isEnded ? (
            <div className="ci-rec"><span className="ci-rec-dot" /> REC</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <CheckCircle2 size={13} /> CALL ENDED
            </div>
          )}
          <div className="ci-timer"><Timer size={14} /> {fmt(elapsedSeconds)}</div>
        </div>
        <div className="ci-topbar-right">
          <div className={`ci-mode-pill ${isEnded ? 'completed' : hasControl ? 'hr' : 'ai'}`} style={isEnded ? { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' } : {}}>
            <span className="mode-dot" style={isEnded ? { background: '#10b981' } : {}} />
            {isEnded ? 'Interview Completed' : hasControl ? 'You have control' : 'AI Interviewing'}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="ci-main">
        {/* Video Area — shows candidate + AI side by side OR Completion Summary */}
        <div className="ci-video-area" style={{ position: 'relative' }}>
          {isEnded ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 24 }}>
              <div style={{
                background: '#12122b', border: '1px solid rgba(108, 92, 231, 0.35)', borderRadius: 20,
                padding: '36px 32px', maxWidth: 520, width: '100%', textAlign: 'center',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)'
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10b981'
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Interview Concluded</h2>
                <p style={{ color: 'var(--text-secondary, #a0a0cc)', fontSize: '0.88rem', marginBottom: 20 }}>
                  The technical session with <strong style={{ color: '#fff' }}>{candidate.name || 'Arjun Patel'}</strong> has finished.
                </p>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 14, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22
                }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>Duration</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: 4 }}>{fmt(elapsedSeconds)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>Overall Score</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginTop: 4 }}>{scores?.overall || 88}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontWeight: 600 }}>Integrity</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: (proctoring?.violationScore || 0) < 5 ? '#10b981' : '#f59e0b', marginTop: 4 }}>
                      {(proctoring?.violationScore || 0) < 5 ? 'Clean' : 'Flagged'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => navigate(`/interviews/${sessionId}/report`)}
                    style={{
                      width: '100%', padding: '13px', background: 'linear-gradient(135deg, #6C5CE7, #a855f7)',
                      color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.96rem', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 8px 24px rgba(108, 92, 231, 0.35)'
                    }}
                  >
                    <FileText size={17} /> View Candidate Evaluation & Report
                  </button>
                  <button
                    onClick={() => navigate('/interviews')}
                    style={{
                      width: '100%', padding: '11px', background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.65)', border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 12, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Back to All Interviews
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`ci-video-grid ${candidate.isScreenSharing ? 'two-up' : 'two-up'}`}>
              
              {/* Screen Share Tile (mock for observer) */}
              {candidate.isScreenSharing && (
                <div className="ci-tile" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)' }}>
                    <Monitor size={32} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Candidate is sharing screen</span>
                  </div>
                  <span className="ci-tile-badge" style={{ background: 'rgba(255,255,255,0.8)', color: '#000' }}>Screen</span>
                </div>
              )}

              {/* Candidate tile */}
              <div className="ci-tile">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#00b894', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white' }}>{candidate.name?.charAt(0)}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{candidate.name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{candidate.role}</span>
                </div>
                <span className="ci-tile-badge you">Candidate</span>
                <div className="ci-tile-label">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: candidate.cameraOn ? '#00b894' : '#ff4757' }} />
                  {candidate.cameraOn ? 'Camera On' : 'Camera Off'}
                </div>
              </div>

              {/* AI / HR tile */}
              {!candidate.isScreenSharing && (
                <div className={`ci-tile ${isSpeaking ? 'speaking' : ''}`}>
                  {hasControl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ffa500, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={32} color="white" />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>You (HR)</span>
                    </div>
                  ) : (
                    <div className="ci-ai-orb-wrap">
                      <div className={`ci-ai-ring ${isSpeaking ? 'active' : ''}`} />
                      <div className={`ci-ai-ring ${isSpeaking ? 'active' : ''}`} />
                      <div className="ci-ai-orb"><Brain size={36} /></div>
                    </div>
                  )}
                  <span className={`ci-tile-badge ${hasControl ? 'hr' : 'ai'}`}>{hasControl ? 'HR Control' : 'AI Interviewer'}</span>
                  <div className="ci-tile-label">
                    <Brain size={12} /> {hasControl ? 'You are interviewing' : `AI • ${ai.status}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Panel — Proctoring + Scoring + Chat */}
        <div className="ci-sidepanel">
          <div className="ci-sidepanel-tabs">
            <button className="ci-sidepanel-tab active" style={{ flex: 'none', padding: '10px 16px' }}><ShieldCheck size={14} /> Monitor</button>
          </div>
          <div className="ci-sidepanel-body" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Question Info */}
            {question && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Current Question ({currentQuestionIndex + 1}/{questions.length})</div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>{question.title}</div>
              </div>
            )}

            {/* Proctoring */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}><Shield size={11} /> Proctoring</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: (proctoring.violationScore || 0) >= 12 ? '#ff4757' : (proctoring.violationScore || 0) > 0 ? '#fdcb6e' : '#00b894' }}>
                  {(proctoring.violationScore || 0) >= 12 ? 'HIGH RISK' : (proctoring.violationScore || 0) > 0 ? `RISK ${proctoring.violationScore}` : 'SECURE'}
                </span>
              </div>
              {[
                { label: proctoring.phoneDetected ? 'Phone detected!' : 'No phone', ok: !proctoring.phoneDetected },
                { label: `People in frame: ${proctoring.faceVisionActive ? proctoring.personCount : '—'}`, ok: !proctoring.multipleFaces && (proctoring.faceDetected || !proctoring.faceVisionActive) },
                { label: `Tab Switches: ${proctoring.tabSwitchCount}`, ok: proctoring.tabSwitchCount < 3 },
                { label: `Pastes: ${proctoring.pasteCount}`, ok: proctoring.pasteCount === 0 },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 'var(--font-size-xs)', color: c.ok ? '#55efc4' : '#ff4757' }}>
                  {c.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {c.label}
                </div>
              ))}
            </div>

            {/* Scoring */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)', cursor: 'pointer' }} onClick={() => setShowScoring(!showScoring)}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}><BarChart3 size={11} /> AI Scoring</span>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: '#a29bfe' }}>{scores.overall || '—'}<span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>/100</span></span>
              </div>
              {showScoring && AI_SCORING_CATEGORIES.map(cat => (
                <div key={cat.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', width: 90 }}>{cat.label}</span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', background: cat.color, borderRadius: 2 }} initial={{ width: 0 }} animate={{ width: `${(cat.score / cat.maxScore) * 100}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: cat.color, width: 28, textAlign: 'right' }}>{cat.score}%</span>
                </div>
              ))}
            </div>

            {/* Chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minHeight: 200 }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}><MessageSquare size={11} /> Live Chat</div>
              <div className="ci-chat-messages" style={{ flex: 1 }}>
                {messages.slice(-20).map(msg => {
                  if (msg.sender === 'system') return <div key={msg.id} className="ci-chat-msg system"><span className="ci-chat-system">{msg.content}</span></div>
                  return (
                    <div key={msg.id} className={`ci-chat-msg ${msg.sender}`}>
                      <div className={`ci-chat-avatar ${msg.sender}`}>
                        {msg.sender === 'ai' && <Brain size={12} />}
                        {msg.sender === 'candidate' && (candidate.name?.charAt(0) || '?')}
                        {msg.sender === 'hr' && 'HR'}
                      </div>
                      <div className="ci-chat-bubble">{msg.content}</div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
              {hasControl && (
                <div className="ci-chat-input">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Message candidate..." />
                  <button onClick={handleSendChat}><Send size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="ci-bottombar">
        <div className="ci-bottombar-left">{fmt(elapsedSeconds)} • Observing {candidate.name}</div>
        <div className="ci-bottombar-center">
          {hasControl && (
            <>
              <button className={`ci-media-btn ${hr.micOn ? 'on' : 'off'}`} onClick={() => store.toggleHRMic()}>
                {hr.micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button className={`ci-media-btn ${hr.cameraOn ? 'on' : 'off'}`} onClick={() => store.toggleHRCamera()}>
                {hr.cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </>
          )}
          {isEnded ? (
            <button
              className="ci-end-btn"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 24,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
              onClick={() => navigate(`/interviews/${sessionId}/report`)}
            >
              <FileText size={16} /> View Candidate Report
            </button>
          ) : (
            <button className="ci-end-btn" style={{ marginRight: 8 }} onClick={handleEndInterview}><Phone size={16} /> End Interview</button>
          )}
          <button className="ci-media-btn on" onClick={() => navigate('/interviews')} title="Back to Interviews"><Eye size={16} /></button>
        </div>
        <div className="ci-bottombar-right">
          {isEnded ? (
            <button className="ci-bottom-action" onClick={() => navigate('/interviews')} style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
              <Eye size={14} /> Back to Interviews
            </button>
          ) : !hasControl ? (
            <button className="ci-bottom-action" onClick={handleTakeControl} style={{ background: 'rgba(255,165,0,0.12)', color: '#ffa500', borderColor: 'rgba(255,165,0,0.3)' }}>
              <Users size={14} /> Take Control
            </button>
          ) : (
            <button className="ci-bottom-action" onClick={handleGiveBack} style={{ background: 'rgba(108,92,231,0.12)', color: '#a29bfe', borderColor: 'rgba(108,92,231,0.3)' }}>
              <Brain size={14} /> Hand Back to AI
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
