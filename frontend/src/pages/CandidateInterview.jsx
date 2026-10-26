import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Brain, Video, VideoOff, Mic, MicOff, Monitor, Phone,
  MessageSquare, Code2, FileText, Send, ChevronLeft, ChevronRight,
  ChevronDown, Play, RotateCcw, Copy, Terminal, Timer, Users,
  Shield, User, Settings, LayoutGrid
} from 'lucide-react'
import { useInterviewSessionStore } from '../store/interviewSessionStore'
import { AI_INTERVIEW_QUESTIONS, AI_INTERVIEW_SESSION } from '../data/mockData'
import { getInterviewerReply, getInterviewerReplyStream, getCodeFeedback, getHint, getTieredHint, getQuestionsForRole, scoreInterview, isInterviewAIConfigured, parseInterviewerReply, transcribeAudio, generateCodingQuestions } from '../services/interviewAI'
import { runCode, formatRunOutput, summarizeRun } from '../utils/codeRunner'
import { highlightCode } from '../utils/highlight'
import { useProctoring } from '../hooks/useProctoring'
import { startFaceProctor } from '../utils/faceProctor'
import { localDataService } from '../services/localData'
import AudioWaveform from '../components/ai-interview/AudioWaveform'
import { playEdgeNeural, stopEdgeNeural } from '../services/edgeTTS'
import Logo from '../components/ui/Logo'
import { Lightbulb, ShieldAlert, ShieldCheck, ScanFace, AlertTriangle, CheckCircle, XCircle, Info, Sparkles, Check, ChevronUp } from 'lucide-react'
import './CandidateInterview.css'


// Module-scoped guard: survives StrictMode's dev unmount/remount (a component
// ref does NOT, so the greeting would otherwise fire twice). Keyed by sessionId
// so each interview greets exactly once.
const greetedSessions = new Set()

function AIOrb({ speaking }) {
  return (
    <div className="ci-ai-orb-wrap">
      <div className={`ci-ai-ring ${speaking ? 'active' : ''}`} />
      <div className={`ci-ai-ring ${speaking ? 'active' : ''}`} />
      <div className={`ci-ai-ring ${speaking ? 'active' : ''}`} />
      <div className="ci-ai-orb"><Brain size={36} /></div>
    </div>
  )
}

export default function CandidateInterview() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const store = useInterviewSessionStore()
  const { mode, status, candidate, ai, hr, messages, questions, currentQuestionIndex,
    code, language, elapsedSeconds, scores, proctoring, durationMinutes, phase } = store

  const [sideTab, setSideTab] = useState('question')
  const [chatInput, setChatInput] = useState('')
  const [showLangDD, setShowLangDD] = useState(false)
  const [showConsole, setShowConsole] = useState(false)
  const [consoleOut, setConsoleOut] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [activeTestIndex, setActiveTestIndex] = useState(0)
  const [hintTier, setHintTier] = useState(1)
  const [currentHintText, setCurrentHintText] = useState('')
  const [showHintDrawer, setShowHintDrawer] = useState(false)
  const [hintsUsed, setHintsUsed] = useState({}) // { [qIndex]: count }
  const codeRef = useRef(null)

  const lineNumsRef = useRef(null)
  const highlightRef = useRef(null)
  const chatEndRef = useRef(null)
  const faceStopRef = useRef(null)
  const prevFaceRef = useRef({ faceDetected: true, faceCount: 1 })
  const lastAIReactRef = useRef(0)
  const lastActivityRef = useRef(Date.now())
  const inactivityStrikesRef = useRef(0)
  const greetedRef = useRef(false)
  const lastAnalyzedCodeRef = useRef('')   // last code the AI already commented on
  const codeIdleTimerRef = useRef(null)    // debounce for "paused typing" nudges
  const voicesRef = useRef([])
  const activeUtteranceRef = useRef(null) // keeps Chrome from GC'ing the voice mid-sentence
  const warmedUpRef = useRef(false)
  const sttSilenceRef = useRef(null)
  const ttsGenRef = useRef(0)
  // --- Hire-Wire-style STT/TTS turn-taking refs ---
  const isAiSpeakingRef = useRef(false)      // true while the AI is talking → mic paused
  const isMicMutedRef = useRef(false)        // mirrors candidate.micOn
  const isProcessingInputRef = useRef(false) // hard lock: one candidate→AI turn at a time
  const isFinalizingRef = useRef(false)      // interview ending → don't auto-restart STT
  const lastSubmittedTextRef = useRef('')    // de-dupe guard (text)
  const lastSubmittedTimeRef = useRef(0)     // de-dupe guard (time)
  const hasReceivedGreetingRef = useRef(false) // Prevents startup mic race condition
  const [interimText, setInterimText] = useState('')
  const [aiStreamingText, setAiStreamingText] = useState('')
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const screenRef = useRef(null)
  const [showSettings, setShowSettings] = useState(false)
  const [joined, setJoined] = useState(false)
  const [joinError, setJoinError] = useState('')
  // Google-Meet-style pre-join preview (shares the single session stream)
  const lobbyVideoRef = useRef(null)
  const [previewMicOn, setPreviewMicOn] = useState(true)
  const [previewCamOn, setPreviewCamOn] = useState(true)
  const [devices, setDevices] = useState({ audio: [], video: [] })
  const [selectedAudioId, setSelectedAudioId] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState('')

  const handleSwitchAudio = async (deviceId) => {
    setSelectedAudioId(deviceId)
    if (!stream) return
    try {
      const newMedia = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      const oldTrack = stream.getAudioTracks()[0]
      const newTrack = newMedia.getAudioTracks()[0]
      if (oldTrack) {
        stream.removeTrack(oldTrack)
        oldTrack.stop()
      }
      if (newTrack) {
        stream.addTrack(newTrack)
      }
      toast.success('Microphone changed!')
    } catch (err) {
      console.warn('Switch mic error:', err)
      toast.error('Could not switch to that microphone.')
    }
  }

  const handleSwitchVideo = async (deviceId) => {
    setSelectedVideoId(deviceId)
    if (!stream) return
    try {
      const newMedia = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      })
      const oldTrack = stream.getVideoTracks()[0]
      const newTrack = newMedia.getVideoTracks()[0]
      if (oldTrack) {
        stream.removeTrack(oldTrack)
        oldTrack.stop()
      }
      if (newTrack) {
        stream.addTrack(newTrack)
      }
      if (videoRef.current) videoRef.current.srcObject = stream
      toast.success('Camera changed!')
    } catch (err) {
      console.warn('Switch camera error:', err)
      toast.error('Could not switch to that camera.')
    }
  }
  
  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(380)
  const isDragging = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return
      const newWidth = window.innerWidth - e.clientX
      // constrain width between 300px and 80% of screen
      if (newWidth > 300 && newWidth < window.innerWidth * 0.8) {
        setPanelWidth(newWidth)
      }
    }
    const handleMouseUp = () => { isDragging.current = false; document.body.style.cursor = 'default' }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const toggleFocusMode = () => {
    if (panelWidth > window.innerWidth * 0.6) {
      setPanelWidth(380) // reset
    } else {
      setPanelWidth(window.innerWidth * 0.75) // focus code
    }
  }

  const question = questions[currentQuestionIndex]
  // Only fall back to starter code when this slot has NEVER been edited. Using `||`
  // here snapped the editor back to the starter the instant the candidate cleared it
  // (an empty string is falsy) — which read as "the editor doesn't work".
  const codeKey = `${currentQuestionIndex}-${language}`
  const currentCode = Object.prototype.hasOwnProperty.call(code, codeKey)
    ? code[codeKey]
    : (question?.starterCode?.[language] || '')
  const langs = ['javascript', 'python', 'java']

  // Init session
  useEffect(() => {
    let done = false
    ;(async () => {
      let candidateInfo = {
        name: AI_INTERVIEW_SESSION.candidateName || 'Alex Morgan',
        email: 'alex.morgan@example.com',
        role: AI_INTERVIEW_SESSION.role || 'Senior Frontend / Fullstack Engineer'
      }
      let opts = {
        durationMinutes: 30,
        aiSettings: { difficulty: 'Medium', persona: 'Senior Principal Engineer', style: 'Balanced' },
        resumeContext: 'Alex Morgan — Senior Engineer with 5+ years experience building high-scale React, TypeScript, and Node.js applications. Strong in state management, async rendering, micro-frontends, caching patterns, WebSockets, and distributed system architectures. Previously reduced client load times by 40% at Acme Corp.',
        jobContext: 'Senior Software Engineer (Frontend / Fullstack). Required Skills: React, TypeScript, JavaScript algorithms, State Architecture, Clean Code, Performance Optimization. Responsibilities: Design resilient UI architectures, build optimized component systems, and solve complex algorithms.',
      }
      try {
        const itv = sessionId && sessionId !== 'demo' ? await localDataService.get('interviews', sessionId, 'session_id') : null
        if (itv) {
          const candName = typeof itv.candidate === 'string'
            ? itv.candidate
            : (itv.candidate ? `${itv.candidate.firstName || ''} ${itv.candidate.lastName || ''}`.trim() : candidateInfo.name);
          const candEmail = itv.email || itv.candidate?.email || candidateInfo.email;
          const candRole = itv.role || itv.candidate?.role || candidateInfo.role;
          candidateInfo = { name: candName || 'Candidate', email: candEmail || '', role: candRole || 'Engineer' };
          // Find the job by id or title to read its AI interview settings.
          const jobs = await localDataService.list('jobs')
          const job = jobs.find(j => j.id === itv.jobId) || jobs.find(j => (j.title || '').toLowerCase() === (itv.role || '').toLowerCase())
          // Find the candidate record for a résumé / cover letter.
          const cands = await localDataService.list('candidates')
          const cand = cands.find(c => c.email && itv.email && c.email.toLowerCase() === itv.email.toLowerCase())
            || cands.find(c => (c.name || '').toLowerCase() === (itv.candidate || '').toLowerCase())
          opts = {
            durationMinutes: Number(job?.interviewDuration) || Number(itv.duration_minutes) || 30,
            aiSettings: {
              persona: job?.aiPersona || 'Senior Principal Engineer', difficulty: job?.interviewDifficulty || 'Adaptive', style: job?.interviewStyle || 'Balanced',
              language: job?.interviewLanguage || 'English', numCodingQuestions: job?.numCodingQuestions || 2,
              phase2At: job?.phase2At, phase3At: job?.phase3At,
            },
            resumeContext: itv.resumeText || cand?.resumeText || cand?.coverLetter || opts.resumeContext,
            jobContext: job ? `${job.title} (${job.department || ''}). Skills: ${(job.skills || []).join(', ')}. ${String(job.description || '').slice(0, 400)}` : opts.jobContext,
          }
        }
      } catch (_) { /* keep rich defaults */ }
      if (!done && status === 'idle') {
        const initialQuestions = getQuestionsForRole({
          role: candidateInfo.role,
          skills: opts.jobContext,
          department: candidateInfo.role,
          difficulty: opts.aiSettings?.difficulty || 'Adaptive',
          count: Number(opts.aiSettings?.numCodingQuestions) || 3,
        })
        store.initSession(sessionId || 'demo', candidateInfo, initialQuestions?.length ? initialQuestions : AI_INTERVIEW_QUESTIONS, opts)
      }
    })()
    return () => { done = true; store.disconnectRealtime() }
  }, [])

  // Only go live once the candidate clicks "Join" — that click is the user
  // gesture that unlocks browser audio (TTS) and confirms mic permission (STT).
  useEffect(() => {
    if (status === 'lobby' && joined) store.startSession()
  }, [status, joined])

  // Timer
  useEffect(() => {
    if (status !== 'active') return
    const id = setInterval(store.tick, 1000)
    return () => clearInterval(id)
  }, [status])

  // Opening turn: when the room goes live, the interviewer GREETS and SPEAKS the
  // first line. Matches Hire-Wire protocol via backend /api/start-interview.
  useEffect(() => {
    if (status !== 'active' || mode !== 'ai') return
    const key = sessionId || 'demo'
    if (greetedRef.current || greetedSessions.has(key)) return
    greetedRef.current = true
    greetedSessions.add(key)
    ;(async () => {
      try {
        store.setAIStatus('thinking')
        const res = await fetch('http://localhost:3001/api/start-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId: sessionId || 'demo',
            candidateName: candidate.name,
            role: candidate.role,
            resumeText: store.resumeContext
          })
        })
        const data = await res.json()
        hasReceivedGreetingRef.current = true
        if (data?.greeting) {
          emitInterviewerReply(data.greeting)
        } else {
          emitInterviewerReply(`Hello ${candidate.name || 'there'}, I'm Sarah, Senior Principal Engineer. We'll start with a quick walk through your background, then dive into coding. To begin, tell me about your most complex architecture project.`)
        }
      } catch (err) {
        hasReceivedGreetingRef.current = true
        emitInterviewerReply(`Hello ${candidate.name || 'there'}, I'm Sarah, Senior Principal Engineer. We'll start with a quick walk through your background, then dive into coding. To begin, tell me about your most complex architecture project.`)
      }
    })()
  }, [status, mode])

  // ---- STT & TTS Logic ----
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  
  const misconductCountRef = useRef(0)

  // AI Response generator (strict, adaptive, context-aware fallback when offline)
  const generateAIResponse = (input) => {
    const text = input.toLowerCase()
    const name = candidate?.name || 'there'
    const roleTitle = candidate?.role || 'Senior Software Engineer'
    const qTitle = question?.title || 'the current challenge'

    if (text.includes('pizza') || text.includes('food') || text.includes('joke') || text.includes('game') || text.includes('movie') || text.includes('weather') || text.includes('spiderman')) {
      misconductCountRef.current++
      if (misconductCountRef.current > 1) {
        return `[[END:misconduct]] You were already warned about off-topic remarks earlier. I am terminating this interview now. Goodbye.`
      }
      return `${name}, this is a formal technical interview, not a casual chat. Keep your focus on the engineering problem. If this continues, I will terminate the session.`
    }
    if (text.includes('very easy') || text.includes('database manipulation') || text.includes('ai integration') || text.includes('promotion') || text.includes('next question')) {
      return `${name}, saying 'database manipulation' or 'it was very easy' is not a technical answer. What exact query, index, or architectural pattern did you implement?`
    }
    if (text.includes("don't know") || text.includes('dont know') || text.includes('no idea') || text.includes('pass')) {
      return `If you are unfamiliar with this specific concept, state what related data structures or techniques you have used, or let's move directly to coding.`
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      return `Hello ${name}. Let's discuss your technical background and engineering approach to ${qTitle}.`
    }
    if (text.includes('who') || text.includes('resume') || text.includes('background')) {
      return `Yes ${name}, I have your background as a ${roleTitle}. How do you plan to structure your solution for ${qTitle}?`
    }
    if (text.includes('yes') || text.includes('ready') || text.includes('sure') || text.includes('start')) {
      return `Please state your high-level strategy for ${qTitle} first, including your target Big-O time and space complexity, before writing code in the editor.`
    }
    if (text.includes('time complexity') || text.includes('big o') || text.includes('complexity') || text.includes('o(n)')) {
      return `Good analysis on complexity. Now consider the edge cases: empty inputs, duplicate elements, or boundary values. How does your algorithm handle those?`
    }
    if (text.includes('done') || text.includes('submit') || text.includes('finished') || text.includes('run')) {
      return `Understood. Please click the 'Run' button on the code editor to execute the test suite against your solution.`
    }
    if (text.includes('hint') || text.includes('help') || text.includes('stuck')) {
      return `Take a step back and think about the optimal data structure. Would a hash map, sliding window, or two-pointer approach reduce redundant computations?`
    }
    return `Understood. As your interviewer, I want to ensure your solution for ${qTitle} is both robust and optimal. Please explain the reasoning behind your chosen approach and proceed with the code.`
  }

  // Pick the most natural available voice (Edge/macOS/Chrome/Windows cascade).
  const pickVoice = () => {
    const v = voicesRef.current || []
    return (
      v.find(x => x.name.includes('Jenny') && x.name.includes('Natural')) ||   // Edge ultra-realistic
      v.find(x => x.name.includes('Aria') && x.name.includes('Natural')) ||    // Edge ultra-realistic
      v.find(x => x.name.includes('Sonia') && x.name.includes('Natural')) ||   // Edge ultra-realistic
      v.find(x => x.name.includes('Natural') && x.lang.startsWith('en')) ||    // any Edge Natural EN
      v.find(x => x.name.includes('Google US English')) ||                     // Chrome native
      v.find(x => x.name.includes('Samantha')) ||                              // macOS native
      v.find(x => x.name.includes('Zira')) ||                                  // Windows offline
      v.find(x => (x.name.toLowerCase().includes('female')) && x.lang.startsWith('en')) ||
      v.find(x => x.lang.startsWith('en-US')) ||
      v.find(x => x.lang.startsWith('en')) ||
      v[0]
    )
  }

  // ===== Unified Speech Engine with Instant Cut-off & Mutual Exclusion =====
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const streamActiveRef = useRef(false)
  const pendingEndRef = useRef(null)
  const pendingAiTextRef = useRef('')

  const cancelAllSpeech = () => {
    ttsGenRef.current++
    try { window.speechSynthesis?.cancel() } catch (_) {}
    stopEdgeNeural()
    audioQueueRef.current = []
    isPlayingRef.current = false
    streamActiveRef.current = false
    isAiSpeakingRef.current = false
    isProcessingInputRef.current = false
    activeUtteranceRef.current = null
    pendingAiTextRef.current = ''
    setAiStreamingText('')
  }

  const speakOne = async (sentence, gen) => {
    const clean = String(sentence || '')
      .replace(/\[\[.*?\]\]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[*_~`#]/g, '')
      .trim()
    if (!clean || gen !== ttsGenRef.current) return

    await new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { setTimeout(resolve, Math.min(2200, clean.length * 45)); return }
      const u = new SpeechSynthesisUtterance(clean)
      activeUtteranceRef.current = u // Prevents Chrome GC dropping voice
      const v = pickVoice()
      if (v) u.voice = v
      u.rate = 1.05
      u.pitch = 1.0
      let settled = false
      const wd = setTimeout(() => { if (!settled) { settled = true; resolve() } }, Math.min(15000, Math.max(2500, clean.length * 90)))
      const done = () => { if (settled) return; settled = true; clearTimeout(wd); resolve() }
      u.onend = done; u.onerror = done
      window.speechSynthesis.speak(u)
    })
  }

  const beginAiTurn = () => {
    if (isAiSpeakingRef.current) return
    isAiSpeakingRef.current = true
    store.setAIStatus('speaking')
    try { recognitionRef.current?.stop() } catch (_) {}
  }

  const endAiTurn = () => {
    isAiSpeakingRef.current = false
    isProcessingInputRef.current = false
    activeUtteranceRef.current = null
    setAiStreamingText('')
    if (pendingAiTextRef.current) { store.addMessage('ai', pendingAiTextRef.current); pendingAiTextRef.current = '' }
    const endReason = pendingEndRef.current
    pendingEndRef.current = null
    store.setAIStatus('listening')
    if (endReason) { finishInterview(endReason); return }
    beginListening()
  }

  const pumpQueue = async () => {
    if (isPlayingRef.current) return
    isPlayingRef.current = true
    beginAiTurn()
    const gen = ttsGenRef.current
    while (audioQueueRef.current.length > 0 && gen === ttsGenRef.current) {
      const s = audioQueueRef.current.shift()
      await speakOne(s, gen)
      if (audioQueueRef.current.length > 0 && gen === ttsGenRef.current) {
        await new Promise(r => setTimeout(r, 400)) // Hire-Wire 400ms human breathing pause
      }
    }
    isPlayingRef.current = false
    if (!streamActiveRef.current && audioQueueRef.current.length === 0 && gen === ttsGenRef.current) {
      endAiTurn()
    }
  }

  const enqueueSentence = (text) => {
    const t = String(text || '').trim()
    if (!t) return
    audioQueueRef.current.push(t)
    pumpQueue()
  }

  const speak = (text, onDone) => {
    cancelAllSpeech()
    const clean = String(text || '').replace(/\[\[.*?\]\]/g, '').replace(/\[.*?\]/g, '').replace(/[*_~`#]/g, '').trim()
    if (!clean) { onDone?.(); return }
    const sentences = clean.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [clean]
    for (const s of sentences) enqueueSentence(s)
  }

  // Stream an interviewer reply and speak it sentence-by-sentence. Returns true if
  // it produced speech; false → caller falls back to the blocking path.
  const streamAiReply = async (ctx) => {
    if (!isInterviewAIConfigured()) return false
    isProcessingInputRef.current = true
    streamActiveRef.current = true
    pendingEndRef.current = null
    pendingAiTextRef.current = ''
    store.setAIStatus('thinking')
    setAiStreamingText('')
    let sentenceBuf = ''
    const onToken = (tok, fullSoFar) => {
      sentenceBuf += tok
      setAiStreamingText(String(fullSoFar).replace(/\[\[.*?\]\]/g, '').trim())
      // Flush each completed sentence to the speech queue immediately.
      if (/[.?!]["')\]]?\s|\n/.test(sentenceBuf)) {
        const parts = sentenceBuf.split(/(?<=[.?!]["')\]]?)\s+/)
        if (parts.length > 1) {
          for (let i = 0; i < parts.length - 1; i++) enqueueSentence(parts[i])
          sentenceBuf = parts[parts.length - 1]
        }
      }
    }
    const result = await getInterviewerReplyStream(ctx, onToken)
    if (sentenceBuf.trim()) enqueueSentence(sentenceBuf.trim())
    streamActiveRef.current = false

    const finalText = String(result || '').trim()
    if (!finalText) { // stream failed → let caller fall back
      if (!isPlayingRef.current && audioQueueRef.current.length === 0) { isProcessingInputRef.current = false; setAiStreamingText('') }
      return false
    }
    const { text, control } = parseInterviewerReply(finalText)
    if (control.phase && control.phase > store.phase) store.setPhase(control.phase)
    if (control.warn) store.logProctorEvent({ type: 'ai_warning', message: 'AI interviewer issued a formal warning', severity: 'critical' })
    if (control.end) {
      store.logProctorEvent({ type: 'ai_end', message: `AI ended the interview (${control.end})`, severity: control.end === 'completed' || control.end === 'time' ? 'info' : 'critical' })
      pendingEndRef.current = control.end
    }
    pendingAiTextRef.current = text || finalText
    // Nothing got queued (e.g. one short clause with no sentence break) → finalize now.
    if (!isPlayingRef.current && audioQueueRef.current.length === 0) endAiTurn()
    return true
  }

  // End the interview cleanly (records the reason, lets the AI's closing finish).
  const finishInterview = (reason = 'completed') => {
    isFinalizingRef.current = true
    try { window.speechSynthesis?.cancel() } catch (_) {}
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop() } catch (_) {} }
    store.endSession(reason)
    // ── Persist the full session data (transcript, scores, proctoring, code) ──
    // This must happen before the pipeline call so the report page has data.
    store.saveSessionData().catch(() => {})
    // Hand off to the Hiring Autopilot: persist scores, run HR analysis, then
    // auto-draft an offer (or send a decline). Fire-and-forget — never blocks exit.
    const finalState = useInterviewSessionStore.getState()
    import('../services/pipeline').then(m => {
      m.pipelineService.onInterviewComplete({ sessionId, scores: finalState.scores, reason })
      // Notify HR about interview completion
      const overall = finalState.scores?.overall || 0
      const rec = overall >= 85 ? 'strong_hire' : overall >= 70 ? 'hire' : overall >= 55 ? 'maybe' : 'no_hire'
      m.pipelineService.notifyHROnInterviewComplete({
        sessionId,
        candidateName: finalState.candidate?.name || 'Candidate',
        jobTitle: finalState.candidate?.role || 'Position',
        score: overall,
        recommendation: rec,
      })
    }).catch(() => {})
    setTimeout(() => navigate('/'), 1800)
  }

  // A live, human summary of the proctoring state for the AI to act on.
  const buildProctoringSummary = () => {
    const p = store.proctoring
    const bits = []
    if (p.phoneDetected) bits.push('PHONE visible on camera')
    if (p.multipleFaces) bits.push(`MULTIPLE people in frame (${p.personCount})`)
    if (!p.faceDetected && p.faceVisionActive) bits.push('candidate not visible')
    if (p.suspiciousObjects?.length) bits.push(`device(s) in frame: ${p.suspiciousObjects.join(', ')}`)
    if (p.tabSwitchCount) bits.push(`${p.tabSwitchCount} tab switch(es)`)
    if (p.pasteCount) bits.push(`${p.pasteCount} paste(s)`)
    if (p.violationScore >= 12) bits.push(`HIGH integrity-risk score (${p.violationScore})`)
    return bits.length ? bits.join('; ') : 'clean — no integrity flags'
  }

  // Full context handed to the interviewer each turn (résumé, code, run, phase, settings…).
  const buildAIContext = (extraInstruction = '') => ({
    candidateName: candidate.name,
    role: candidate.role,
    question,
    code: currentCode,
    language,
    transcript: extraInstruction
      ? [...store.messages, { sender: 'system', content: extraInstruction }]
      : store.messages,
    runOutput: store.lastRun?.summary || '',
    jobContext: store.jobContext || '',
    resumeContext: store.resumeContext || '',
    proctoringSummary: buildProctoringSummary(),
    minutesRemaining: Math.max(0, Math.ceil(durationMinutes - store.elapsedSeconds / 60)),
    phase: store.phase,
    aiSettings: store.aiSettings || {},
  })

  // Route an interviewer reply: parse silent control tokens, speak the rest, act.
  const emitInterviewerReply = (raw) => {
    const { text, control } = parseInterviewerReply(raw)
    if (control.phase && control.phase > store.phase) store.setPhase(control.phase)
    if (control.warn) {
      store.logProctorEvent({ type: 'ai_warning', message: 'AI interviewer issued a formal warning', severity: 'critical' })
    }
    const spoken = text || (control.end ? 'Thank you for your time. That concludes the interview.' : '')
    if (spoken) store.addMessage('ai', spoken)
    if (control.end) {
      store.logProctorEvent({ type: 'ai_end', message: `AI ended the interview (${control.end})`, severity: control.end === 'completed' || control.end === 'time' ? 'info' : 'critical' })
      speak(spoken, () => finishInterview(control.end))
    } else if (spoken) {
      speak(spoken)
    }
  }

  // --- HIRE-WIRE SEAMLESS INTERVIEW ENGINE (Zero-Button Hands-Free Voice) ---
  const handleCandidateInput = async (text, isSpeech = false) => {
    if (!text || !text.trim() || isProcessingInputRef.current) return

    const now = Date.now()
    const cleanText = text.toLowerCase().trim().replace(/[^\w\s]/gi, '')
    if (isSpeech && (now - lastSubmittedTimeRef.current < 3500)) {
      if (cleanText === lastSubmittedTextRef.current || lastSubmittedTextRef.current.includes(cleanText)) {
        return
      }
    }

    isProcessingInputRef.current = true
    lastSubmittedTextRef.current = cleanText
    lastSubmittedTimeRef.current = now

    // Stop candidate speech recognition immediately while AI processes & speaks
    try { recognitionRef.current?.stop() } catch (_) {}
    cancelAllSpeech()
    clearTimeout(sttSilenceRef.current)
    setInterimText('')

    // Reset inactivity tracker
    lastActivityRef.current = Date.now()
    inactivityStrikesRef.current = 0

    // Add candidate message to store
    store.addMessage('candidate', text.trim())
    store.setAIStatus('thinking')
    setAiStreamingText('')

    let sentenceBuffer = ''
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateMessage: text.trim(),
          phase: store.phase || 1,
          interviewId: sessionId || 'demo',
          role: candidate.role,
          candidateName: candidate.name,
          code: currentCode,
          language,
          warningCount: store.proctoring?.violationScore || 0,
          transcript: store.messages
        })
      })

      if (!response.ok || !response.body) {
        throw new Error(`Chat API error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim()
            if (dataStr === '[DONE]') break
            try {
              const parsed = JSON.parse(dataStr)
              const token = parsed.chunk || ''
              fullText += token
              sentenceBuffer += token
              setAiStreamingText(fullText)

              if (/[.?!]\s|[\n]/.test(sentenceBuffer)) {
                const parts = sentenceBuffer.split(/(?<=[.?!])\s+/)
                if (parts.length > 1) {
                  for (let i = 0; i < parts.length - 1; i++) {
                    enqueueSentence(parts[i])
                  }
                  sentenceBuffer = parts[parts.length - 1]
                }
              }
            } catch (_) {}
          }
        }
      }

      if (sentenceBuffer.trim().length > 0) {
        enqueueSentence(sentenceBuffer.trim())
      }

      if (fullText.trim()) {
        pendingAiTextRef.current = fullText.trim()
        if (fullText.includes('[END_CALL]')) {
          pendingEndRef.current = 'completed'
        }
      }
    } catch (err) {
      console.warn('Backend chat stream error, using local reply:', err)
      const fallback = generateAIResponse(text.trim())
      emitInterviewerReply(fallback)
    } finally {
      const waitForAudio = () => new Promise(resolve => {
        const int = setInterval(() => {
          if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
            clearInterval(int)
            resolve()
          }
        }, 100)
      })
      await waitForAudio()
      isProcessingInputRef.current = false
      setAiStreamingText('')
      if (!isMicMutedRef.current && !isAiSpeakingRef.current && !isFinalizingRef.current) {
        beginListening()
      }
    }
  }

  // --- SIMPLE STT ENGINE (Hire-Wire Matching) ---
  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onresult = null
        recognitionRef.current.stop()
      } catch (_) {}
      recognitionRef.current = null
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = navigator.language || 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript
          else interim += event.results[i][0].transcript
        }

        setInterimText(interim)
        clearTimeout(sttSilenceRef.current)

        if (final.trim()) {
          setInterimText('')
          if (!isAiSpeakingRef.current && !isFinalizingRef.current) {
            handleCandidateInput(final.trim(), true)
          }
        } else if (interim.trim()) {
          sttSilenceRef.current = setTimeout(() => {
            if (!isAiSpeakingRef.current && !isFinalizingRef.current) {
              handleCandidateInput(interim.trim(), true)
              setInterimText('')
              try { recognition.stop() } catch (_) {}
            }
          }, 1800) // 1.8s silence threshold for snappy natural turn-taking
        }
      }

      recognition.onerror = (e) => {
        if (e.error === 'no-speech') return
        console.warn('SpeechRecognition error:', e.error)
        if (e.error === 'network' || e.error === 'aborted') {
          setTimeout(() => {
            if (!isFinalizingRef.current && !isMicMutedRef.current && !isAiSpeakingRef.current && !isProcessingInputRef.current) {
              try { recognition.start() } catch (_) {}
            }
          }, 500)
        }
      }

      recognition.onend = () => {
        clearTimeout(sttSilenceRef.current)
        if (!isFinalizingRef.current && !isMicMutedRef.current && !isAiSpeakingRef.current && !isProcessingInputRef.current) {
          try { recognition.start() } catch (_) {}
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
      if (!isAiSpeakingRef.current && !isMicMutedRef.current) {
        try { recognition.start() } catch (_) {}
      }
    } catch (e) {
      console.warn('Speech recognition setup error:', e)
    }
  }

  const beginListening = () => {
    if (isMicMutedRef.current || isFinalizingRef.current) return
    if (useInterviewSessionStore.getState().status !== 'active') return
    setIsListening(true)
    setupSpeechRecognition()
  }

  // Kick off listening once the interview is live (and not muted).
  useEffect(() => {
    if (status === 'active' && candidate.micOn && stream) beginListening()
  }, [status, stream])

  // Mic toggle → pause/resume listening.
  useEffect(() => {
    isMicMutedRef.current = !candidate.micOn
    if (status !== 'active') return
    if (!candidate.micOn) {
      setInterimText('')
      setIsListening(false)
      try { recognitionRef.current?.stop() } catch (_) {}
    } else {
      beginListening()
    }
  }, [candidate.micOn, status])

  // Tear down on unmount.
  useEffect(() => () => {
    isFinalizingRef.current = true
    clearTimeout(sttSilenceRef.current)
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop() } catch (_) {} }
  }, [])

  // React to the newest message: AI replies to the candidate; HR's spoken words
  // are relayed to the candidate via TTS even when the AI is paused (HR control).
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]

    // HR has the floor — speak their message to the candidate (works in hr mode).
    if (lastMsg.sender === 'hr') {
      speak(lastMsg.content)
      return
    }
  }, [messages.length]) // Trigger only when message count changes

  // Scores — real AI scoring when an API key is configured. With a live AI we
  // wait for real scores (no fake flashing); only demo mode shows a placeholder.
  const candidateMsgCount = messages.filter(m => m.sender === 'candidate').length
  useEffect(() => {
    if (status !== 'active') return
    if (isInterviewAIConfigured()) {
      if (candidateMsgCount < 3) return
      const t = setTimeout(async () => {
        const result = await scoreInterview({
          role: candidate.role,
          transcript: store.messages,
          code: currentCode,
          question,
        })
        if (result) store.updateScores(result)
      }, 5000)
      return () => clearTimeout(t)
    }
    // Demo mode (no AI key): show a single illustrative placeholder.
    const t = setTimeout(() => store.updateScores({ codeQuality: 78, communication: 85, problemSolving: 82, confidence: 88, overall: 83 }), 3000)
    return () => clearTimeout(t)
  }, [status, store.phase, currentQuestionIndex])

  // Acquire camera + mic ONCE on mount and keep it for the whole session — both
  // the lobby preview AND the live interview share this single stream. This matches
  // Hire-Wire: the mic is never released/re-grabbed mid-call, so speech recognition
  // stays stable (releasing and re-acquiring is what was breaking the mic).
  useEffect(() => {
    let s = null
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
      .then(stream => {
        s = stream
        setStream(stream)
        setJoinError('')
        return navigator.mediaDevices.enumerateDevices()
      })
      .then(devs => {
        if (devs) setDevices({ audio: devs.filter(d => d.kind === 'audioinput'), video: devs.filter(d => d.kind === 'videoinput') })
      })
      .catch(() => setJoinError('Allow camera & microphone access to preview and join the interview.'))
    return () => { s?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Video element attachment with instant callback refs (never drops stream, never flickers)
  const attachLobbyVideo = useCallback((node) => {
    lobbyVideoRef.current = node
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream
      node.play().catch(() => {})
    }
  }, [stream])

  const attachLiveVideo = useCallback((node) => {
    videoRef.current = node
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream
      node.play().catch(() => {})
    }
  }, [stream])

  // Show the (single) stream in the lobby preview.
  useEffect(() => {
    if (!joined && lobbyVideoRef.current && stream && lobbyVideoRef.current.srcObject !== stream) {
      lobbyVideoRef.current.srcObject = stream
      lobbyVideoRef.current.play().catch(() => {})
    }
  }, [stream, joined, previewCamOn])

  const togglePreviewMic = () => {
    const t = stream?.getAudioTracks()[0]
    if (t) { t.enabled = !t.enabled; setPreviewMicOn(t.enabled) }
  }
  const togglePreviewCam = () => {
    const t = stream?.getVideoTracks()[0]
    if (t) { t.enabled = !t.enabled; setPreviewCamOn(t.enabled) }
  }

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream, joined, candidate.cameraOn])

  const handleToggleMic = () => {
    const nextState = !candidate.micOn
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = nextState })
    }
    store.toggleMic()
  }

  const handleToggleCamera = () => {
    const nextState = !candidate.cameraOn
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = nextState })
    }
    store.toggleCamera()
  }
  
  useEffect(() => {
    if (screenRef.current && screenStream) screenRef.current.srcObject = screenStream
  }, [screenStream])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, interimText, aiStreamingText])

  // ---- Load TTS voices (they arrive async on first load) ----
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices() || [] }
    load()
    window.speechSynthesis.addEventListener?.('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load)
  }, [])

  // ---- TTS warm-up: browsers block speech until a user gesture; unlock on first interaction ----
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const warm = () => {
      if (warmedUpRef.current) return
      warmedUpRef.current = true
      try {
        const u = new SpeechSynthesisUtterance('')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch (_) {}
    }
    window.addEventListener('pointerdown', warm, { once: true })
    window.addEventListener('keydown', warm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', warm)
      window.removeEventListener('keydown', warm)
    }
  }, [])

  const proctorActive = status === 'active'

  // Have the interviewer verbally address a serious integrity event (throttled).
  const aiReactToProctoring = async (note) => {
    if (mode !== 'ai' || status !== 'active') return
    const now = Date.now()
    if (now - lastAIReactRef.current < 9000) return // don't pile on
    lastAIReactRef.current = now
    if (!isInterviewAIConfigured()) return
    store.setAIStatus('thinking')
    const raw = await getInterviewerReply(buildAIContext(note))
    if (raw) emitInterviewerReply(raw)
  }

  // Move to a new phase and have the interviewer speak the transition.
  const aiAdvancePhase = async (n) => {
    if (n <= store.phase || status !== 'active') return
    store.setPhase(n)
    if (mode !== 'ai' || !isInterviewAIConfigured()) return
    store.setAIStatus('thinking')
    const raw = await getInterviewerReply(buildAIContext())
    if (raw) emitInterviewerReply(raw)
  }

  // ---- Browser proctoring engine (tab/blur/paste/fullscreen/devtools) ----
  useProctoring({
    active: proctorActive,
    onEvent: ({ type, message, severity }) => {
      store.logProctorEvent({ type, message, severity })
      if (type === 'tab_switch') store.updateProctoring({ tabSwitchCount: store.proctoring.tabSwitchCount + 1 })
      if (type === 'paste') store.updateProctoring({ pasteCount: store.proctoring.pasteCount + 1 })
      // Let the interviewer call out the serious ones in real time.
      if (severity === 'critical') aiReactToProctoring(`(candidate integrity alert: ${message})`)
    },
  })

  // ---- Computer-vision monitoring (TF.js COCO-SSD: people + phone + devices) ----
  useEffect(() => {
    if (!proctorActive || !stream || !candidate.cameraOn || !videoRef.current) return
    let stop = null
    let alive = true
    startFaceProctor(
      videoRef.current,
      ({ faceDetected, personCount, multiplePeople, phoneDetected, suspiciousObjects }) => {
        const prev = prevFaceRef.current
        store.updateProctoring({ faceDetected, personCount, multipleFaces: multiplePeople, phoneDetected, suspiciousObjects, singlePerson: personCount <= 1 })

        // No person in frame (candidate left / stepped away)
        if (prev.faceDetected && !faceDetected) {
          store.logProctorEvent({ type: 'no_face', message: 'Candidate not visible in frame', severity: 'warn' })
        }
        // Second person appears
        if (multiplePeople && !prev.multiplePeople) {
          store.logProctorEvent({ type: 'multiple_people', message: `${personCount} people detected — another person is present`, severity: 'critical' })
          aiReactToProctoring('(candidate integrity alert: a second person appeared on camera)')
        }
        // Phone appears — the key cheating signal
        if (phoneDetected && !prev.phoneDetected) {
          store.logProctorEvent({ type: 'phone', message: 'Phone detected in frame — possible second-screen cheating', severity: 'critical' })
          aiReactToProctoring('(candidate integrity alert: a mobile phone is visible on camera)')
        }
        // Other devices appear
        const newDevices = (suspiciousObjects || []).filter((d) => !(prev.suspiciousObjects || []).includes(d))
        if (newDevices.length) {
          store.logProctorEvent({ type: 'device', message: `Device(s) in frame: ${newDevices.join(', ')}`, severity: 'warn' })
        }
        prevFaceRef.current = { faceDetected, personCount, multiplePeople, phoneDetected, suspiciousObjects: suspiciousObjects || [] }
      },
      {
        onReady: () => { store.updateProctoring({ faceVisionActive: true }); store.logProctorEvent({ type: 'cv_ready', message: 'AI vision monitoring active (people + phone detection)', severity: 'info' }) },
        onUnavailable: () => store.logProctorEvent({ type: 'cv_unavailable', message: 'Vision model could not load (offline?) — running without CV', severity: 'info' }),
      },
    ).then((s) => { if (alive) stop = s; else s?.() })
    return () => { alive = false; stop?.(); store.updateProctoring({ faceVisionActive: false }) }
  }, [proctorActive, stream, candidate.cameraOn])

  // ---- Duration: pass time to the AI; hard-stop after the grace window ----
  useEffect(() => {
    if (status !== 'active') return
    const limit = durationMinutes * 60
    const hardCap = limit + 600 // allow up to ~10 min of wrap-up
    if (elapsedSeconds === limit) {
      store.logProctorEvent({ type: 'time', message: 'Scheduled interview time reached — wrapping up', severity: 'info' })
    }
    if (elapsedSeconds >= hardCap) {
      store.logProctorEvent({ type: 'time', message: 'Maximum time reached — interview auto-ended', severity: 'info' })
      finishInterview('time')
    }
  }, [elapsedSeconds, status, durationMinutes])

  // ---- Phase pacing: auto-advance through Intro→Coding→Q&A by time used ----
  // The 25% / 80% split is configurable per job via aiSettings (phase2At / phase3At).
  useEffect(() => {
    if (status !== 'active' || mode !== 'ai') return
    const total = durationMinutes * 60
    const s = store.aiSettings || {}
    const p2 = Number(s.phase2At) > 0 && Number(s.phase2At) < 1 ? Number(s.phase2At) : 0.25
    const p3 = Number(s.phase3At) > 0 && Number(s.phase3At) < 1 ? Number(s.phase3At) : 0.80
    if (store.phase === 1 && elapsedSeconds >= total * p2) aiAdvancePhase(2)
    else if (store.phase === 2 && elapsedSeconds >= total * Math.max(p2 + 0.05, p3)) aiAdvancePhase(3)
  }, [elapsedSeconds, status, mode])

  // ---- Editor-first layout: when the coding phase starts, bring the editor front
  // and centre — auto-open the Code tab and widen the panel (industry standard:
  // CoderPad/CodeSignal put the IDE at the centre during coding). Q&A returns to chat.
  useEffect(() => {
    if (status !== 'active') return
    if (phase === 2) {
      setSideTab('code')
      setPanelWidth(w => Math.max(w, Math.min(window.innerWidth * 0.62, 920)))
    } else if (phase === 3) {
      setSideTab('chat')
      setPanelWidth(w => (w > window.innerWidth * 0.55 ? 420 : w))
    }
  }, [phase, status])

  // ---- Inactivity / no-answer watcher with deterministic escalation ----
  // Any candidate activity (speaking, typing, or AI speaking) resets the strike counter.
  useEffect(() => { lastActivityRef.current = Date.now(); inactivityStrikesRef.current = 0 }, [candidateMsgCount, currentCode, interimText])
  useEffect(() => {
    if (status !== 'active' || mode !== 'ai') return
    const id = setInterval(() => {
      // Don't count inactivity while the AI is speaking or thinking
      if (isAiSpeakingRef.current || isProcessingInputRef.current) {
        lastActivityRef.current = Date.now()
        return
      }
      if (Date.now() - lastActivityRef.current <= 75000) return
      lastActivityRef.current = Date.now()
      const strike = ++inactivityStrikesRef.current
      if (strike === 1) {
        // First lapse: gentle verbal nudge
        store.logProctorEvent({ type: 'inactive', message: 'Candidate inactive 75s+ (no answer / no typing)', severity: 'warn' })
        aiReactToProctoring('(system: the candidate has been quiet. Do NOT greet or introduce yourself. In ONE short natural sentence, check if they are still there and prompt them to continue with the current topic.)')
      } else if (strike === 2) {
        // Still nothing: formal warning
        store.logProctorEvent({ type: 'inactive', message: 'Still unresponsive — formal warning issued', severity: 'critical' })
        aiReactToProctoring('(system: candidate STILL unresponsive after a prompt — issue a formal [[WARN]] that the interview ends if they stay silent)')
      } else {
        // Repeated non-response → the interview ends itself (no LLM required).
        store.logProctorEvent({ type: 'inactive', message: 'Candidate unresponsive after warning — interview auto-ended', severity: 'critical' })
        store.addMessage('ai', "I haven't heard from you for a while, so I'll end the interview here. Thank you for your time.")
        speak("I haven't heard from you for a while, so I'll end the interview here. Thank you for your time.", () => finishInterview('unresponsive'))
      }
    }, 15000)
    return () => clearInterval(id)
  }, [status, mode])

  // ---- Idle-in-editor nudge (Hire-Wire's live code analysis) ----
  // When the candidate pauses typing during the coding phase, the interviewer
  // proactively reacts to their CURRENT code — a brief observation or a probing
  // question (never a hint, fix, or the optimal approach). Fires once per code state.
  useEffect(() => {
    if (status !== 'active' || mode !== 'ai' || store.phase !== 2) return
    const codeNow = currentCode || ''
    if (codeNow.trim().length < 15) return
    if (codeNow === lastAnalyzedCodeRef.current) return
    clearTimeout(codeIdleTimerRef.current)
    codeIdleTimerRef.current = setTimeout(async () => {
      // Only chime in when the room is genuinely quiet (don't interrupt).
      if (isAiSpeakingRef.current || isProcessingInputRef.current || isFinalizingRef.current) return
      if ((currentCode || '') === lastAnalyzedCodeRef.current) return
      lastAnalyzedCodeRef.current = currentCode || ''
      // One-off hidden instruction appended to the context (not shown in chat).
      const ctx = buildAIContext()
      ctx.transcript = [
        ...store.messages,
        { sender: 'system', content: 'the candidate has paused typing — react to their CURRENT code in the editor with ONE short observation or a probing question (e.g. about an edge case, complexity, or their approach). Do NOT give a hint, the fix, or the optimal solution.' },
      ]
      const streamed = await streamAiReply(ctx)
      if (!streamed) {
        const r = await getCodeFeedback({ candidateName: candidate.name, role: candidate.role, question, code: currentCode, language, runSummary: 'Candidate paused while writing code (no run yet).' })
        aiSpeak(r)
      }
    }, 13000) // ~13s of no typing
    return () => clearTimeout(codeIdleTimerRef.current)
  }, [currentCode, status, mode])

  const fmt = (s) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  // Advancing questions — flags a skip if the candidate never attempted this one.
  const handleQuestionNext = () => {
    const starter = (question?.starterCode?.[language] || '').trim()
    const untouched = !currentCode.trim() || currentCode.trim() === starter
    if (untouched && status === 'active' && question?.type === 'coding') {
      store.logProctorEvent({ type: 'skip', message: `Skipped "${question.title}" without attempting it`, severity: 'warn' })
      aiReactToProctoring(`(system: candidate is moving past "${question.title}" without attempting it — address this directly)`)
    }
    store.nextQuestion()
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const text = chatInput.trim()
    setChatInput('')
    handleCandidateInput(text, false)
  }

  // Make the AI interviewer react to a code event (run / hint), speaking the reply.
  const aiSpeak = (text) => {
    if (!text) return
    store.addMessage('ai', text)
    speak(text)
  }

  const handleRun = async () => {
    if (!question) return
    setIsRunning(true); setShowConsole(true); setRunResult(null)
    setConsoleOut(language === 'javascript' ? '⏳ Running…' : '⏳ Running on the remote runner…')

    // JavaScript runs instantly in the local sandbox; other languages compile & run
    // on the public Piston runner and are graded against the same test cases.
    const result = await runCode(
      { code: currentCode, fnName: question.fnName, tests: question.tests || [], language },
      { timeoutMs: language === 'javascript' ? 4000 : 12000 },
    )
    const text = formatRunOutput(result)
    const summary = summarizeRun(result)
    setRunResult(result)
    setConsoleOut(text || summary || 'No output.')
    setIsRunning(false)
    setActiveTestIndex(0)

    // Share with the store (so HR observers + scoring see it) and let the AI react.
    store.setLastRun({ ok: result.ok, summary, results: result.results || [] })
    if (mode === 'ai') {
      store.setAIStatus('thinking')
      const feedback = await getCodeFeedback({
        candidateName: candidate.name, role: candidate.role,
        question, code: currentCode, language, runSummary: summary,
      })
      aiSpeak(feedback)
    }
  }

  const handleHint = async () => {
    if (hintLoading) return
    setHintLoading(true)
    store.setAIStatus('thinking')
    const nextTier = showHintDrawer ? Math.min(3, hintTier + 1) : 1
    setHintTier(nextTier)
    const hint = await getTieredHint({ role: candidate.role, question, code: currentCode, language, level: nextTier })
    setCurrentHintText(hint)
    setShowHintDrawer(true)
    setHintsUsed(prev => ({ ...prev, [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1 }))
    aiSpeak(hint)
    setHintLoading(false)
  }

  const handleSubmit = () => {
    setShowConsole(true)
    const passed = runResult?.results?.length ? runResult.results.filter(r => r.pass).length : null
    const total = runResult?.results?.length || 0
    const verdict = passed === null
      ? '🚀 Submitted for review.'
      : passed === total
        ? `🚀 Submitting…\n\n══════════════\n  ACCEPTED ✅  (${passed}/${total} tests)\n══════════════`
        : `🚀 Submitting…\n\n  PARTIAL — ${passed}/${total} tests passed.\n  You can keep improving or move on.`
    setConsoleOut(verdict)
    if (mode === 'ai') aiSpeak(passed === total && total > 0
      ? "Great, all tests pass. Let's move on to the next one."
      : "Thanks for submitting. Let's talk through it before we continue.")
    setTimeout(() => { if (currentQuestionIndex < questions.length - 1) { store.nextQuestion(); setShowConsole(false); setRunResult(null); setShowHintDrawer(false); setHintTier(1) } }, 2200)
  }

  // ---- Editor key handling: Tab indents, Enter auto-indents, brackets close ----
  const handleEditorKeyDown = (e) => {
    const ta = e.target
    const { selectionStart: start, selectionEnd: end, value } = ta
    const setVal = (next, caret) => {
      store.setCode(currentQuestionIndex, language, next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = caret })
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      setVal(value.slice(0, start) + '  ' + value.slice(end), start + 2)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const indent = (value.slice(lineStart, start).match(/^\s*/) || [''])[0]
      const prevChar = value[start - 1]
      const extra = /[{([]/.test(prevChar || '') ? '  ' : ''
      const insert = '\n' + indent + extra
      setVal(value.slice(0, start) + insert + value.slice(end), start + insert.length)
    } else if (['(', '[', '{', '"', "'", '`'].includes(e.key)) {
      const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' }
      e.preventDefault()
      setVal(value.slice(0, start) + e.key + pairs[e.key] + value.slice(end), start + 1)
    }
  }

  // Keep the line-number gutter and the syntax-highlight overlay scroll-synced with the editor.
  const handleEditorScroll = (e) => {
    if (lineNumsRef.current) lineNumsRef.current.scrollTop = e.target.scrollTop
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop
      highlightRef.current.scrollLeft = e.target.scrollLeft
    }
  }
  
  const handleToggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop())
      setScreenStream(null)
      store.toggleScreen(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null)
          store.toggleScreen(false)
        }
        setScreenStream(stream)
        store.toggleScreen(true)
      } catch (err) {
        console.error("Screen share error", err)
      }
    }
  }

  if (!question) return null

  const aiLive = isInterviewAIConfigured()

  // ---- Join: the click is the user gesture that unlocks browser audio (TTS) and
  // carries the candidate's mic/cam choice into the live session. Permission was
  // already granted by the pre-join preview. ----
  const handleJoin = () => {
    // Unlock autoplay (HTML5 audio) INSIDE the click gesture.
    try {
      const a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA')
      a.volume = 0
      a.play().catch(() => {})
    } catch {}
    // Unlock speechSynthesis INSIDE the same gesture (empty utterance).
    try {
      window.speechSynthesis?.cancel()
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis?.speak(u)
      voicesRef.current = window.speechSynthesis?.getVoices() || voicesRef.current
    } catch {}
    warmedUpRef.current = true
    // Carry the lobby mic/cam choice into the interview and guarantee active tracks.
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = previewMicOn })
      stream.getVideoTracks().forEach(t => { t.enabled = previewCamOn })
    }
    useInterviewSessionStore.setState(state => ({
      candidate: { ...state.candidate, micOn: previewMicOn, cameraOn: previewCamOn }
    }))
    isMicMutedRef.current = !previewMicOn
    hasReceivedGreetingRef.current = true
    setJoined(true)
  }

  if (!joined) {
    const ctrlBtn = (on, onClick, OnIcon, OffIcon, label) => (
      <button onClick={onClick} title={label} style={{
        width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'rgba(255,255,255,0.16)' : '#ea4335', color: '#fff',
      }}>{on ? <OnIcon size={22} /> : <OffIcon size={22} />}</button>
    )
    return (
      <div className="ci-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center', justifyContent: 'center', maxWidth: 1100, width: '100%' }}>
          {/* Camera preview */}
          <div style={{ position: 'relative', width: 'min(640px, 92vw)', aspectRatio: '16 / 9', background: '#0c0c1c', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {stream && previewCamOn ? (
              <video ref={attachLobbyVideo} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'rgba(108,92,231,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                  {typeof candidate?.name === 'string' ? (candidate.name.charAt(0) || '?') : (candidate?.name?.firstName?.charAt(0) || '?')}
                </div>
                <span style={{ fontSize: '0.85rem' }}>{stream ? 'Camera is off' : 'Waiting for camera & mic permission…'}</span>
              </div>
            )}
            {/* Mic/cam toggles overlaid (Google Meet style) */}
            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
              {ctrlBtn(previewMicOn, togglePreviewMic, Mic, MicOff, previewMicOn ? 'Mute mic' : 'Unmute mic')}
              {ctrlBtn(previewCamOn, togglePreviewCam, Video, VideoOff, previewCamOn ? 'Turn off camera' : 'Turn on camera')}
            </div>
          </div>

          {/* Ready to join panel */}
          <div style={{ flex: '1 1 280px', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}><Logo size={32} withWordmark wordmarkSize={22} /></div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary, #fff)', margin: '0 0 4px' }}>Ready to join?</h1>
            <p style={{ color: 'var(--text-secondary, #a0a0cc)', fontSize: '0.92rem', marginBottom: 4 }}>{candidate.role || 'Technical Interview'}</p>
            <p style={{ color: 'var(--text-tertiary, #888)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 20 }}>
              This is a live, voice-based AI interview. It speaks out loud and listens to you — keep your <strong style={{ color: '#fff' }}>camera &amp; mic on</strong> and your speakers up.
            </p>
            {joinError && <p style={{ color: '#ff6b6b', fontSize: '0.82rem', marginBottom: 14 }}>{joinError}</p>}
            <button onClick={handleJoin} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #6C5CE7, #a855f7)', color: '#fff', border: 'none', borderRadius: 30, fontSize: '1.02rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Video size={18} /> Join now
            </button>
            <p style={{ color: '#666', fontSize: '0.7rem', marginTop: 14 }}>
              Engine: {aiLive ? 'AI • Live' : 'Demo mode'} · works best in Chrome or Edge
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isSpeaking = ai.isSpeaking && mode === 'ai'
  const lastCandidateMsg = [...messages].reverse().find(m => m.sender === 'candidate')

  return (
    <div className="ci-page">
      {/* HR Banner */}
      <AnimatePresence>
        {mode === 'hr' && (
          <motion.div className="ci-hr-banner" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <span className="ci-hr-dot" /> {hr.name || 'HR'} has joined the interview
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="ci-topbar">
        <div className="ci-topbar-left">
          <Logo size={24} withWordmark wordmarkSize={15} />
          <div className="ci-topbar-divider" />
          <div className="ci-session-info">
            <span className="ci-session-role">{candidate.role}</span>
            <span className="ci-session-sub">Technical Interview</span>
          </div>
        </div>
        <div className="ci-topbar-center">
          <div className="ci-progress">
            <span className="ci-progress-label">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <div className="ci-progress-track">
              {questions.map((_, idx) => (
                <span key={idx} className={`ci-progress-seg ${idx <= currentQuestionIndex ? 'done' : ''} ${idx === currentQuestionIndex ? 'current' : ''}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="ci-topbar-right">
          <div className={`ci-engine-pill ${aiLive ? 'live' : 'demo'}`} title={aiLive ? 'Connected to your AI provider' : 'No API key — running in demo mode'}>
            <span className="ci-engine-dot" />
            {aiLive ? 'AI Engine • Live' : 'Demo Mode'}
          </div>
          <div className={`ci-mode-pill ${mode === 'hr' ? 'hr' : 'ai'}`}>
            <span className="mode-dot" />
            {mode === 'hr' ? 'HR Live' : 'AI Interview'}
          </div>
          <div className="ci-phase-pill" title="Interview phase">
            {phase === 1 ? '① Intro & Résumé' : phase === 2 ? '② Coding' : '③ Q&A'}
          </div>
          <button
            className={`ci-proctor-pill ${proctoring.violationScore >= 12 ? 'high' : proctoring.violationScore > 0 ? 'med' : 'ok'}`}
            onClick={() => setSideTab('logs')}
            title="Proctoring & security log"
          >
            {proctoring.violationScore >= 12 ? <ShieldAlert size={13} /> : <Shield size={13} />}
            {proctoring.violationScore > 0 ? proctoring.violationScore : 'Secure'}
          </button>
          <div className="ci-participants"><Users size={13} /> {mode === 'hr' ? 3 : 2}</div>
        </div>
      </div>

      {/* Main */}
      <div className="ci-main">
        {/* Video Area */}
        <div className="ci-video-area">
          <div className={`ci-video-grid ${(mode === 'hr' || screenStream) ? 'two-up' : ''}`}>
            
            {/* Screen Share Tile (if sharing) */}
            {screenStream && (
              <div className="ci-tile" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                <video ref={screenRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <span className="ci-tile-badge you" style={{ background: 'rgba(255,255,255,0.8)', color: '#000' }}>Your Screen</span>
              </div>
            )}
            
            {/* Main tile: AI or HR */}
            <div className={`ci-tile ${isSpeaking ? 'speaking' : ''} ${mode === 'hr' ? 'hr-speaking' : ''}`}>
              {mode === 'hr' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #ffa500, #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={32} color="white" />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{hr.name}</span>
                  </div>
                  <span className="ci-tile-badge hr">HR</span>
                </>
              ) : (
                <>
                  <AIOrb speaking={isSpeaking} />
                  <span className="ci-tile-badge ai">AI Interviewer</span>
                  <div className="ci-tile-label">
                    <Brain size={12} /> {ai.name} • {ai.status === 'speaking' ? 'Speaking...' : ai.status === 'thinking' ? 'Thinking...' : 'Listening'}
                  </div>
                </>
              )}
            </div>

            {/* Second tile when HR is present - shows AI in background */}
            {mode === 'hr' && !screenStream && (
              <div className="ci-tile" style={{ opacity: 0.5 }}>
                <AIOrb speaking={false} />
                <span className="ci-tile-badge ai">AI</span>
                <div className="ci-tile-label"><Brain size={12} /> AI • Paused</div>
              </div>
            )}
          </div>

          {/* Self PIP */}
          <div className="ci-self-pip">
            {stream && candidate.cameraOn ? (
              <video ref={attachLiveVideo} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)' }}>
                <VideoOff size={28} />
                <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>Camera Off</span>
              </div>
            )}
            <div className="ci-tile-label">You</div>
          </div>

          {/* Live caption / status strip with Audio Waveform */}
          <div className="ci-caption">
            <div className={`ci-caption-status ${ai.status}`}>
              <AudioWaveform
                stream={stream}
                isSpeaking={isSpeaking || (candidate.micOn && isListening)}
                mode={isSpeaking ? 'ai' : candidate.micOn ? 'candidate' : 'idle'}
                height={20}
                bars={16}
              />
              <span style={{ marginLeft: 6 }}>
                {ai.status === 'speaking'
                  ? 'AI is speaking…'
                  : ai.status === 'thinking'
                    ? 'AI is thinking…'
                    : !candidate.micOn
                      ? 'Mic muted'
                      : 'Listening (speak anytime)…'}
              </span>
            </div>
            <div className="ci-caption-text">
              {interimText
                ? <span className="ci-caption-interim">🗣️ {interimText}…</span>
                : lastCandidateMsg ? `“${lastCandidateMsg.content}”` : 'Speak naturally into your microphone, or type in Chat.'}
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div 
          className="ci-resizer" 
          onMouseDown={() => { isDragging.current = true; document.body.style.cursor = 'col-resize' }}
        />

        {/* Side Panel */}
        <div className="ci-sidepanel" style={{ width: panelWidth }}>
          <div className="ci-sidepanel-tabs">
            <button className={`ci-sidepanel-tab ${sideTab === 'question' ? 'active' : ''}`} onClick={() => setSideTab('question')}><FileText size={14} /> Question</button>
            <button className={`ci-sidepanel-tab ${sideTab === 'code' ? 'active' : ''}`} onClick={() => setSideTab('code')}><Code2 size={14} /> Code</button>
            <button className={`ci-sidepanel-tab ${sideTab === 'chat' ? 'active' : ''}`} onClick={() => setSideTab('chat')}><MessageSquare size={14} /> Chat</button>
            <button className={`ci-sidepanel-tab ${sideTab === 'logs' ? 'active' : ''}`} onClick={() => setSideTab('logs')}>
              <Shield size={14} /> Security
              {proctoring.events.filter(e => e.severity !== 'info').length > 0 && (
                <span className="ci-logs-badge">{proctoring.events.filter(e => e.severity !== 'info').length}</span>
              )}
            </button>
            <button
              className="ci-sidepanel-tab"
              style={{ flex: 'none', padding: '0 12px', color: panelWidth > window.innerWidth * 0.6 ? 'var(--brand-primary-light)' : '' }} 
              onClick={toggleFocusMode}
              title="Toggle Layout"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
          <div className="ci-sidepanel-body">
            {/* Question Tab */}
            {sideTab === 'question' && (
              <div className="ci-question-wrap">
                <div className="ci-q-nav">
                  <button disabled={currentQuestionIndex === 0} onClick={store.prevQuestion}><ChevronLeft size={14} /> Prev</button>
                  <span className="ci-q-num">Q{currentQuestionIndex + 1} of {questions.length}</span>
                  <button disabled={currentQuestionIndex === questions.length - 1} onClick={handleQuestionNext}>Next <ChevronRight size={14} /></button>
                </div>

                {/* Enhanced Metadata Badges */}
                <div className="ci-q-meta-row">
                  {question.category && (
                    <span className="ci-q-badge category">
                      <Sparkles size={11} /> {question.category.replace('_', ' ')}
                    </span>
                  )}
                  <span className={`ci-q-badge ${(question.difficulty || 'Medium').toLowerCase()}`}>
                    {question.difficulty || 'Medium'}
                  </span>
                  {question.complexityTarget && (
                    <span className="ci-q-badge complexity" title="Target Complexity">
                      {question.complexityTarget.time ? `⏱ ${question.complexityTarget.time}` : ''} {question.complexityTarget.space ? `💾 ${question.complexityTarget.space}` : ''}
                    </span>
                  )}
                </div>

                <div className="ci-q-tags">{question.tags?.map(t => <span key={t} className="ci-q-tag">{t}</span>)}</div>
                <h3 className="ci-q-title">{question.title}</h3>
                <div className="ci-q-desc">{question.description?.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>
                {question.examples?.map((ex, i) => (
                  <div key={i} className="ci-example">
                    <div className="ci-example-label">Example {i + 1}</div>
                    <div>Input: <code>{typeof ex.input === 'object' ? JSON.stringify(ex.input) : ex.input}</code></div>
                    <div>Output: <code>{typeof ex.output === 'object' ? JSON.stringify(ex.output) : ex.output}</code></div>
                    {ex.explanation && <div style={{ marginTop: 4, color: 'var(--text-tertiary)' }}>{ex.explanation}</div>}
                  </div>
                ))}
                {question.constraints?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6 }}>Constraints</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {question.constraints.map((c, i) => <li key={i}><code>{c}</code></li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Code Tab */}
            {sideTab === 'code' && (
              <div className="ci-editor-wrap">
                <div className="ci-editor-toolbar">
                  <div className="ci-editor-toolbar-left"><Code2 size={13} /> Editor</div>
                  <div className="ci-editor-toolbar-right">
                    <div className="ci-lang-btn" onClick={() => setShowLangDD(!showLangDD)}>
                      {language} <ChevronDown size={11} />
                      {showLangDD && (
                        <div className="ci-lang-dd">
                          {langs.map(l => <button key={l} className={l === language ? 'active' : ''} onClick={e => { e.stopPropagation(); store.setLanguage(l); setShowLangDD(false) }}>{l}</button>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => store.setCode(currentQuestionIndex, language, question.starterCode?.[language] || '')} title="Reset"><RotateCcw size={13} /></button>
                    <button onClick={() => navigator.clipboard.writeText(currentCode)} title="Copy"><Copy size={13} /></button>
                  </div>
                </div>

                {/* Progressive 3-Tier Hint Drawer */}
                {showHintDrawer && currentHintText && (
                  <motion.div className="ci-hint-drawer" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="ci-hint-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lightbulb size={14} color="#ffeaa7" />
                        <span>Hint (Tier {hintTier}/3)</span>
                      </div>
                      <div className="ci-hint-level-pills">
                        <span className={`ci-hint-pill ${hintTier >= 1 ? 'active' : ''}`}>1. Nudge</span>
                        <span className={`ci-hint-pill ${hintTier >= 2 ? 'active' : ''}`}>2. Approach</span>
                        <span className={`ci-hint-pill ${hintTier >= 3 ? 'active' : ''}`}>3. Invariant</span>
                      </div>
                    </div>
                    <div className="ci-hint-content">{currentHintText}</div>
                    <div className="ci-hint-actions">
                      {hintTier < 3 && (
                        <button className="ci-hint-next-btn" onClick={handleHint} disabled={hintLoading}>
                          {hintLoading ? 'Loading…' : `Reveal Tier ${hintTier + 1} Hint →`}
                        </button>
                      )}
                      <button className="ci-hint-next-btn" style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--text-tertiary)' }} onClick={() => setShowHintDrawer(false)}>
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="ci-code-area">
                  <div className="ci-line-nums" ref={lineNumsRef}>{currentCode.split('\n').map((_, i) => <span key={i}>{i + 1}<br /></span>)}</div>
                  <div className="ci-code-editor">
                    <pre className="ci-code-highlight" ref={highlightRef} aria-hidden="true">
                      <code dangerouslySetInnerHTML={{ __html: highlightCode(currentCode, language) + '\n' }} />
                    </pre>
                    <textarea
                      ref={codeRef}
                      className="ci-code-textarea"
                      value={currentCode}
                      onChange={e => store.setCode(currentQuestionIndex, language, e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={handleEditorScroll}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      placeholder="Write your solution…"
                    />
                  </div>
                </div>
                <div className="ci-editor-actions">
                  <button className="ci-hint-btn" onClick={handleHint} disabled={hintLoading} title="Ask the interviewer for a progressive hint">
                    <Lightbulb size={13} /> {hintLoading ? 'Thinking…' : `Hint (${hintTier}/3)`}
                  </button>
                  <button className="ci-run-btn" onClick={handleRun} disabled={isRunning}><Play size={13} /> {isRunning ? 'Running…' : 'Run'}</button>
                  <button className="ci-submit-btn" onClick={handleSubmit}><Send size={13} /> Submit</button>
                </div>
                <AnimatePresence>
                  {showConsole && (
                    <motion.div className="ci-console" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
                      <div className="ci-console-header">
                        <span><Terminal size={12} /> Test Execution Matrix</span>
                        {runResult?.results?.length > 0 && (
                          <span className={`ci-run-badge ${runResult.ok ? 'pass' : 'fail'}`}>
                            {runResult.results.filter(r => r.pass).length}/{runResult.results.length} passed
                          </span>
                        )}
                        <button onClick={() => setShowConsole(false)}>×</button>
                      </div>

                      {/* Interactive Test Case Tabs & Detail Card */}
                      {runResult?.results?.length > 0 && (
                        <div className="ci-test-matrix">
                          <div className="ci-test-tabs">
                            {runResult.results.map((r, i) => (
                              <button
                                key={i}
                                className={`ci-test-tab ${r.pass ? 'pass' : 'fail'} ${activeTestIndex === i ? 'active' : ''}`}
                                onClick={() => setActiveTestIndex(i)}
                              >
                                {r.pass ? <Check size={11} color="#00B894" /> : <XCircle size={11} color="#FF6B6B" />}
                                Case {i + 1}
                              </button>
                            ))}
                          </div>

                          {runResult.results[activeTestIndex] && (
                            <div className="ci-test-detail-card">
                              <div className="ci-test-detail-row">
                                <span className="ci-test-label">Input:</span>
                                <span className="ci-test-val">{JSON.stringify(runResult.results[activeTestIndex].args)}</span>
                              </div>
                              <div className="ci-test-detail-row">
                                <span className="ci-test-label">Expected:</span>
                                <span className="ci-test-val">{JSON.stringify(runResult.results[activeTestIndex].expected)}</span>
                              </div>
                              <div className="ci-test-detail-row">
                                <span className="ci-test-label">Actual:</span>
                                <span className={`ci-test-val ${runResult.results[activeTestIndex].pass ? 'pass' : 'fail'}`}>
                                  {runResult.results[activeTestIndex].error ? `Error: ${runResult.results[activeTestIndex].error}` : JSON.stringify(runResult.results[activeTestIndex].actual)}
                                </span>
                              </div>
                              <div className="ci-test-detail-row">
                                <span className="ci-test-label">Verdict:</span>
                                <span className={`ci-test-val ${runResult.results[activeTestIndex].pass ? 'pass' : 'fail'}`}>
                                  {runResult.results[activeTestIndex].pass ? '✅ Passed' : '❌ Failed'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <pre className="ci-console-output">{consoleOut}</pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}


            {/* Chat Tab */}
            {sideTab === 'chat' && (
              <div className="ci-chat">
                <div className="ci-chat-messages">
                  {messages.map(msg => {
                    if (msg.sender === 'system') return <div key={msg.id} className="ci-chat-msg system"><span className="ci-chat-system"><Shield size={9} /> {msg.content}</span></div>
                    return (
                      <div key={msg.id} className={`ci-chat-msg ${msg.sender}`}>
                        <div className={`ci-chat-avatar ${msg.sender}`}>
                          {msg.sender === 'ai' && <Brain size={12} />}
                          {msg.sender === 'candidate' && (typeof candidate?.name === 'string' ? (candidate.name.charAt(0) || '?') : (candidate?.name?.firstName?.charAt(0) || '?'))}
                          {msg.sender === 'hr' && 'HR'}
                        </div>
                        <div className="ci-chat-bubble">{msg.content}</div>
                      </div>
                    )
                  })}
                  {/* Live AI reply — streams in word-by-word as it's spoken. */}
                  {aiStreamingText && (
                    <div className="ci-chat-msg ai">
                      <div className="ci-chat-avatar ai"><Brain size={12} /></div>
                      <div className="ci-chat-bubble">{aiStreamingText}</div>
                    </div>
                  )}
                  {/* Live interim transcript — your words appear here as you speak. */}
                  {interimText && (
                    <div className="ci-chat-msg candidate">
                      <div className="ci-chat-avatar candidate">{typeof candidate?.name === 'string' ? (candidate.name.charAt(0) || '?') : (candidate?.name?.firstName?.charAt(0) || '?')}</div>
                      <div className="ci-chat-bubble" style={{ opacity: 0.65, fontStyle: 'italic' }}>{interimText}…</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="ci-chat-input">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Type a message..." />
                  <button onClick={handleSendChat}><Send size={14} /></button>
                </div>
              </div>
            )}

            {/* Security / Logs Tab */}
            {sideTab === 'logs' && (
              <div className="ci-logs">
                <div className={`ci-integrity ${proctoring.violationScore >= 12 ? 'high' : proctoring.violationScore > 0 ? 'med' : 'ok'}`}>
                  {proctoring.violationScore >= 12 ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                  <div>
                    <strong>{proctoring.violationScore >= 12 ? 'High integrity risk' : proctoring.violationScore > 0 ? 'Minor flags' : 'No integrity issues'}</strong>
                    <span>Risk score: {proctoring.violationScore}</span>
                  </div>
                </div>

                <div className="ci-proctor-stats">
                  <div className="ci-proctor-stat"><span>{proctoring.tabSwitchCount}</span>Tab switches</div>
                  <div className="ci-proctor-stat"><span>{proctoring.pasteCount}</span>Pastes</div>
                  <div className="ci-proctor-stat">
                    <span className={proctoring.multipleFaces || !proctoring.faceDetected ? 'bad' : ''}>{proctoring.faceVisionActive ? proctoring.personCount : '—'}</span>
                    People
                  </div>
                  <div className="ci-proctor-stat">
                    <span className={proctoring.phoneDetected ? 'bad' : ''}>{proctoring.faceVisionActive ? (proctoring.phoneDetected ? 'YES' : 'No') : '—'}</span>
                    Phone
                  </div>
                </div>

                <div className={`ci-cv-status ${(proctoring.phoneDetected || proctoring.multipleFaces || (!proctoring.faceDetected && proctoring.faceVisionActive)) ? 'alert' : ''}`}>
                  <ScanFace size={13} />
                  {!proctoring.faceVisionActive
                    ? 'Vision monitoring loading / unavailable'
                    : proctoring.phoneDetected ? '📱 Phone detected in frame'
                    : proctoring.multipleFaces ? `${proctoring.personCount} people detected`
                    : !proctoring.faceDetected ? 'Candidate not visible'
                    : proctoring.suspiciousObjects?.length ? `Device in frame: ${proctoring.suspiciousObjects.join(', ')}`
                    : 'Vision monitoring active — all clear'}
                </div>

                <div className="ci-logs-list">
                  {proctoring.events.length === 0 && <div className="ci-logs-empty">No security events yet.</div>}
                  {[...proctoring.events].reverse().map((e, i) => (
                    <div key={i} className={`ci-log-row ${e.severity}`}>
                      {e.severity === 'critical' ? <ShieldAlert size={12} /> : e.severity === 'warn' ? <AlertTriangle size={12} /> : <Shield size={12} />}
                      <span className="ci-log-msg">{e.message}</span>
                      <span className="ci-log-time">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="ci-bottombar">
        <div className="ci-bottombar-left">{fmt(elapsedSeconds)}</div>
        <div className="ci-bottombar-center">
          <button className={`ci-media-btn ${candidate.micOn ? 'on' : 'off'}`} onClick={handleToggleMic} title="Toggle Mic">{candidate.micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
          <button className={`ci-media-btn ${candidate.cameraOn ? 'on' : 'off'}`} onClick={handleToggleCamera} title="Toggle Camera">{candidate.cameraOn ? <Video size={20} /> : <VideoOff size={20} />}</button>
          <button className={`ci-media-btn ${candidate.isScreenSharing ? 'on' : 'off'}`} onClick={handleToggleScreenShare} title="Share Screen"><Monitor size={20} /></button>
          <button className="ci-media-btn on" onClick={() => setShowSettings(true)} title="Settings"><Settings size={20} /></button>
          <button className="ci-end-btn" onClick={() => finishInterview('manual')}><Phone size={16} /> Leave</button>
        </div>
        <div className="ci-bottombar-right">
          <button className={`ci-bottom-action ${sideTab === 'chat' ? 'active' : ''}`} onClick={() => setSideTab('chat')}><MessageSquare size={14} /> Chat</button>
          <button className={`ci-bottom-action ${sideTab === 'code' ? 'active' : ''}`} onClick={() => setSideTab('code')}><Code2 size={14} /> Code</button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div className="ci-settings-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="ci-settings-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className="ci-settings-header">
                <h3><Settings size={16} /> Device Settings</h3>
                <button onClick={() => setShowSettings(false)}>×</button>
              </div>
              <div className="ci-settings-body">
                <div className="ci-form-group">
                  <label>Camera</label>
                  <select value={selectedVideoId} onChange={e => handleSwitchVideo(e.target.value)}>
                    {devices.video.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Camera'}</option>)}
                  </select>
                </div>
                <div className="ci-form-group">
                  <label>Microphone</label>
                  <select value={selectedAudioId} onChange={e => handleSwitchAudio(e.target.value)}>
                    {devices.audio.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
