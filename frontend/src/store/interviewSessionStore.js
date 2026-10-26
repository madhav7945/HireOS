import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * Interview Session Store
 *
 * Central state machine for the 3-mode AI interview system.
 * Manages: mode switching, participants, chat, scores, recording, proctoring.
 *
 * Cross-participant sync uses TWO transports, layered:
 *   1. BroadcastChannel — instant sync between tabs on the SAME browser.
 *   2. Supabase Realtime broadcast — sync across DIFFERENT machines
 *      (e.g. a remote candidate and a remote HR observer), keyed by sessionId.
 *
 * Both carry the same function-free state snapshot. Incoming snapshots are
 * applied with the raw `set` (never re-broadcast) so the two transports can't
 * form a feedback loop. Supabase broadcasts are sent with { self: false } so a
 * client never receives its own message back.
 */

const INITIAL_SCORES = {
  codeQuality: 0,
  communication: 0,
  problemSolving: 0,
  confidence: 0,
  overall: 0,
}

// Same-machine, cross-tab transport.
const localChannel = new BroadcastChannel('hireos-interview-sync')

// Cross-machine transport — (re)created per session in connectRealtime().
let realtimeChannel = null
let realtimeReady = false
let currentSessionId = null

function serializeState(state) {
  // Strip functions; only plain state travels over the wire.
  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => typeof value !== 'function')
  )
}

export const useInterviewSessionStore = create((set, get) => {

  // Apply an inbound snapshot WITHOUT re-broadcasting (prevents loops).
  const applyRemoteState = (payload) => {
    if (payload && typeof payload === 'object') set(payload, false)
  }

  // Listen for state updates from other tabs on the same machine.
  localChannel.onmessage = (event) => {
    if (event.data?.type === 'SYNC_STATE' && event.data.payload) {
      const cur = get().sessionId
      // Only sync if both tabs are targeting the exact same session ID
      if (cur && event.data.payload.sessionId && cur === event.data.payload.sessionId) {
        applyRemoteState(event.data.payload)
      }
    }
  }

  // Connect (or reconnect) the Supabase Realtime broadcast channel for a session.
  const connectRealtime = (sessionId) => {
    if (!sessionId) return
    const url = import.meta.env.VITE_SUPABASE_URL
    if (!url || url.includes('placeholder')) return // skip when using local mode
    if (realtimeChannel && currentSessionId === sessionId) return // already connected

    // Tear down a stale channel from a previous session.
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel) } catch (_) {}
      realtimeChannel = null
      realtimeReady = false
    }

    currentSessionId = sessionId
    try {
      realtimeChannel = supabase
        .channel(`interview-sync-${sessionId}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'state' }, ({ payload }) => applyRemoteState(payload))
        .subscribe((status) => {
          realtimeReady = status === 'SUBSCRIBED'
        })
    } catch (e) {
      console.warn('[HireOS] Realtime channel unavailable, same-machine sync only:', e?.message || e)
      realtimeChannel = null
      realtimeReady = false
    }
  }

  const disconnectRealtime = () => {
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel) } catch (_) {}
    }
    realtimeChannel = null
    realtimeReady = false
    currentSessionId = null
  }

  // set + fan the new snapshot out over both transports.
  const broadcastSet = (partial, replace) => {
    set(partial, replace)
    const payload = serializeState(get())

    // Same-machine tabs.
    try {
      localChannel.postMessage({ type: 'SYNC_STATE', payload })
    } catch (e) {
      console.warn('Failed to broadcast state locally:', e)
    }

    // Other machines (best-effort; only once the channel is subscribed).
    if (realtimeChannel && realtimeReady) {
      try {
        realtimeChannel.send({ type: 'broadcast', event: 'state', payload })
      } catch (e) {
        console.warn('Failed to broadcast state over Realtime:', e)
      }
    }
  }

  return {
    // Expose connection lifecycle so pages can disconnect on unmount.
    connectRealtime,
    disconnectRealtime,

    // ---- Session metadata ----
    sessionId: null,
    status: 'idle', // idle | lobby | active | completed
    mode: 'ai',     // ai | hr | observer
    previousMode: null,

  // ---- Participants ----
  candidate: {
    name: '',
    email: '',
    role: '',
    avatarColor: '#6C5CE7',
    cameraOn: true,
    micOn: true,
    isScreenSharing: false,
    isActive: true, // false when in observer mode
  },
  ai: {
    name: 'HireOS AI',
    status: 'idle', // idle | listening | thinking | speaking
    isSpeaking: false,
    isActive: true,
  },
  hr: {
    name: null,
    email: null,
    isPresent: false,
    hasControl: false,
    cameraOn: false,
    micOn: false,
  },

  // ---- Interview content ----
  questions: [],
  currentQuestionIndex: 0,
  code: {},           // { 'qIndex-language': 'code string' }
  language: 'javascript',
  lastRun: null,      // { ok, results, logs, summary } of the most recent code run (synced)
  
  // ---- Chat / conversation ----
  messages: [],
  
  // ---- Scoring ----
  scores: { ...INITIAL_SCORES },
  questionScores: {}, // { questionIndex: { codeQuality, communication, ... } }

  // ---- Recording ----
  isRecording: false,
  recordingStartTime: null,
  elapsedSeconds: 0,

  // ---- Duration / phases / ending ----
  durationMinutes: 30,   // configured interview length (from the job opening)
  phase: 1,              // 1 = Intro & résumé, 2 = Coding rounds, 3 = Q&A
  aiSettings: {},        // from the job opening: { persona, difficulty, style, language, numCodingQuestions, focus }
  resumeContext: '',     // candidate résumé summary (the AI "has already read this")
  jobContext: '',        // role/skills/description context
  endReason: null,       // why the interview ended: 'completed' | 'duration' | 'integrity' | 'ai' | 'manual'

  // ---- Proctoring ----
  proctoring: {
    faceDetected: true,
    singlePerson: true,
    multipleFaces: false,    // 2+ people in frame
    phoneDetected: false,    // a phone is visible (second-screen cheating)
    suspiciousObjects: [],   // other devices seen (laptop/tv/book…)
    personCount: 1,
    faceVisionActive: false, // true once the CV model is loaded & running
    tabSwitchCount: 0,
    pasteCount: 0,
    noFaceSeconds: 0,
    lookingAway: false,
    eyeTracking: 'focused',
    audioLevel: 'normal',
    suspiciousActivity: false,
    violationScore: 0,       // weighted integrity score (higher = worse)
    warnings: [],
    events: [],              // chronological security log [{type, message, severity, at}]
  },

  // ---- Actions: Session lifecycle ----
  initSession: (sessionId, candidate, questions, opts = {}) => {
    connectRealtime(sessionId) // join the cross-machine sync channel for this session
    broadcastSet({
    sessionId,
    status: 'lobby',
    mode: 'ai',
    candidate: { ...get().candidate, ...candidate, cameraOn: true, micOn: true, isActive: true },
    questions,
    currentQuestionIndex: 0,
    messages: [],
    scores: { ...INITIAL_SCORES },
    code: {},
    elapsedSeconds: 0,
    durationMinutes: opts.durationMinutes || 30,
    phase: 1,
    aiSettings: opts.aiSettings || {},
    resumeContext: opts.resumeContext || '',
    jobContext: opts.jobContext || '',
    endReason: null,
    proctoring: {
      faceDetected: true, singlePerson: true, multipleFaces: false, phoneDetected: false,
      suspiciousObjects: [], personCount: 1, faceVisionActive: false,
      tabSwitchCount: 0, pasteCount: 0, noFaceSeconds: 0, lookingAway: false,
      eyeTracking: 'focused', audioLevel: 'normal', suspiciousActivity: false,
      violationScore: 0, warnings: [], events: [],
    },
    })
  },

  // Go live. The interviewer's opening line is generated AND spoken by the
  // candidate page (so TTS plays and ai.status correctly returns to 'listening'),
  // not hard-coded here — otherwise the AI looks like it's speaking forever and
  // the no-barge-in guard would swallow every candidate utterance.
  startSession: () => broadcastSet({
    status: 'active',
    isRecording: true,
    recordingStartTime: Date.now(),
    ai: { ...get().ai, status: 'thinking', isSpeaking: false, isActive: true },
    candidate: { ...get().candidate, cameraOn: true, micOn: true, isActive: true },
    messages: [
      ...get().messages,
      {
        id: Date.now(),
        sender: 'system',
        content: 'Interview session started',
        timestamp: new Date().toISOString(),
      },
    ],
  }),

  endSession: (reason = 'manual') => broadcastSet({
    status: 'completed',
    isRecording: false,
    endReason: reason,
    ai: { ...get().ai, status: 'idle', isSpeaking: false },
    messages: [
      ...get().messages,
      {
        id: Date.now(),
        sender: 'system',
        content: `Interview ended (${reason})`,
        timestamp: new Date().toISOString(),
      },
    ],
  }),

  // ---- Actions: Mode switching ----
  switchToAI: () => {
    const state = get()
    broadcastSet({
      previousMode: state.mode,
      mode: 'ai',
      ai: { ...state.ai, status: 'speaking', isSpeaking: true, isActive: true },
      hr: { ...state.hr, hasControl: false },
      candidate: { ...state.candidate, cameraOn: true, micOn: true, isActive: true },
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          sender: 'system',
          content: state.previousMode === 'hr' 
            ? `${state.hr.name || 'HR'} handed control back to AI`
            : 'Candidate rejoined the interview',
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },

  switchToHR: (hrInfo) => {
    const state = get()
    broadcastSet({
      previousMode: state.mode,
      mode: 'hr',
      ai: { ...state.ai, status: 'idle', isSpeaking: false, isActive: false },
      hr: {
        name: hrInfo?.name || state.hr.name || 'HR Manager',
        email: hrInfo?.email || state.hr.email,
        isPresent: true,
        hasControl: true,
        cameraOn: true,
        micOn: true,
      },
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          sender: 'system',
          content: `${hrInfo?.name || 'HR Manager'} has taken control of the interview`,
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },

  switchToObserver: () => {
    const state = get()
    broadcastSet({
      previousMode: state.mode,
      mode: 'observer',
      candidate: { ...state.candidate, cameraOn: false, micOn: false, isActive: false },
      ai: { ...state.ai, status: 'thinking', isSpeaking: false },
      messages: [
        ...state.messages,
        {
          id: Date.now(),
          sender: 'system',
          content: 'Candidate entered observer mode',
          timestamp: new Date().toISOString(),
        },
      ],
    })
  },

  // ---- Actions: Chat ----
  addMessage: (sender, content) => broadcastSet({
    messages: [
      ...get().messages,
      {
        id: Date.now() + Math.random(),
        sender, // 'ai' | 'candidate' | 'hr' | 'system'
        content,
        timestamp: new Date().toISOString(),
      },
    ],
  }),

  // ---- Actions: AI status ----
  setAIStatus: (status) => broadcastSet({
    ai: { ...get().ai, status, isSpeaking: status === 'speaking' },
  }),

  // ---- Actions: Media controls ----
  toggleCamera: () => broadcastSet({
    candidate: { ...get().candidate, cameraOn: !get().candidate.cameraOn },
  }),

  toggleMic: () => broadcastSet({
    candidate: { ...get().candidate, micOn: !get().candidate.micOn },
  }),
  
  toggleScreen: (isSharing) => broadcastSet({
    candidate: { ...get().candidate, isScreenSharing: isSharing },
  }),

  toggleHRMic: () => broadcastSet({
    hr: { ...get().hr, micOn: !get().hr.micOn },
  }),

  toggleHRCamera: () => broadcastSet({
    hr: { ...get().hr, cameraOn: !get().hr.cameraOn },
  }),

  // ---- Actions: Code ----
  setCode: (questionIndex, language, code) => broadcastSet({
    code: { ...get().code, [`${questionIndex}-${language}`]: code },
  }),

  setLanguage: (language) => broadcastSet({ language }),

  // Replace the question set (e.g. with role-relevant questions the AI generated
  // from the job). Resets the editor position to the first question.
  setQuestions: (questions) => broadcastSet({
    questions: Array.isArray(questions) && questions.length ? questions : get().questions,
    currentQuestionIndex: 0,
  }),

  // Interview phase (1 Intro/résumé → 2 Coding → 3 Q&A). Logs a system note so
  // the AI pivots and HR sees the transition.
  setPhase: (phase) => {
    if (phase === get().phase) return
    const labels = { 1: 'Introduction & résumé', 2: 'Coding round', 3: 'Q&A' }
    broadcastSet({
      phase,
      messages: [
        ...get().messages,
        { id: Date.now() + Math.random(), sender: 'system', content: `Phase ${phase} — ${labels[phase] || ''}`, timestamp: new Date().toISOString() },
      ],
    })
  },

  // Most recent run result — synced so HR observers (and scoring) can see it too.
  setLastRun: (lastRun) => broadcastSet({ lastRun }),

  nextQuestion: () => {
    const state = get()
    if (state.currentQuestionIndex < state.questions.length - 1) {
      broadcastSet({ currentQuestionIndex: state.currentQuestionIndex + 1 })
    }
  },

  prevQuestion: () => {
    const state = get()
    if (state.currentQuestionIndex > 0) {
      broadcastSet({ currentQuestionIndex: state.currentQuestionIndex - 1 })
    }
  },

  // ---- Actions: Scoring (simulated, Phase 9 will use AI API) ----
  updateScores: (newScores) => broadcastSet({
    scores: { ...get().scores, ...newScores },
  }),

  updateQuestionScore: (questionIndex, scoreData) => broadcastSet({
    questionScores: {
      ...get().questionScores,
      [questionIndex]: scoreData,
    },
  }),

  // ---- Actions: Timer ----
  tick: () => broadcastSet({ elapsedSeconds: get().elapsedSeconds + 1 }),

  // ---- Actions: Proctoring ----
  updateProctoring: (data) => broadcastSet({
    proctoring: { ...get().proctoring, ...data },
  }),

  addProctoringWarning: (message) => broadcastSet({
    proctoring: {
      ...get().proctoring,
      warnings: [
        ...get().proctoring.warnings,
        { message, timestamp: new Date().toISOString() },
      ],
    },
  }),

  // Append a security event to the live log + bump the weighted integrity score.
  // severity: 'info' | 'warn' | 'critical'  (weights 0 / 4 / 12)
  logProctorEvent: ({ type, message, severity = 'warn' }) => {
    const p = get().proctoring
    const weight = severity === 'critical' ? 12 : severity === 'warn' ? 4 : 0
    const event = { type, message, severity, at: new Date().toISOString() }
    broadcastSet({
      proctoring: {
        ...p,
        events: [...p.events.slice(-199), event], // cap history
        violationScore: p.violationScore + weight,
        suspiciousActivity: p.violationScore + weight >= 12,
      },
    })
  },

  // ---- Session persistence: save everything for the report ----
  // Persists the complete interview session to the interviews collection so
  // the report page, pipeline, and HR can access it after the interview ends.
  saveSessionData: async () => {
    const state = get()
    if (!state.sessionId) return null
    const { localDataService } = await import('../services/localData')
    let interview = await localDataService.get('interviews', state.sessionId, 'session_id')
    if (!interview) {
      interview = await localDataService.get('interviews', state.sessionId)
    }
    if (!interview) {
      const all = await localDataService.list('interviews')
      interview = all?.find(i => String(i.id) === String(state.sessionId) || i.session_id === state.sessionId || i.interviewId === state.sessionId)
    }
    if (!interview) {
      try {
        interview = await localDataService.create('interviews', {
          id: state.sessionId,
          session_id: state.sessionId,
          candidate: state.candidate?.name || 'Arjun Patel',
          role: state.candidate?.role || 'Senior React Developer',
          email: state.candidate?.email || 'arjun.p@gmail.com',
          type: 'AI Interview',
          status: 'complete',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          duration: `${Math.ceil((state.elapsedSeconds || 60) / 60)} min`
        })
      } catch (_) {}
    }

    const sessionData = {
      transcript: state.messages || [],
      code: state.code || {},
      language: state.language,
      questions: state.questions || [],
      questionScores: state.questionScores || {},
      scores: state.scores || {},
      proctoring: {
        tabSwitchCount: state.proctoring.tabSwitchCount || 0,
        pasteCount: state.proctoring.pasteCount || 0,
        violationScore: state.proctoring.violationScore || 0,
        warnings: state.proctoring.warnings || [],
        events: state.proctoring.events || [],
        suspiciousActivity: state.proctoring.suspiciousActivity || false,
        faceVisionActive: state.proctoring.faceVisionActive || false,
      },
      phase: state.phase,
      durationMinutes: state.durationMinutes,
      elapsedSeconds: state.elapsedSeconds,
      endReason: state.endReason || 'manual',
      candidateName: state.candidate?.name || '',
      candidateEmail: state.candidate?.email || '',
      role: state.candidate?.role || '',
      resumeContext: state.resumeContext || '',
      jobContext: state.jobContext || '',
      aiSettings: state.aiSettings || {},
      savedAt: new Date().toISOString(),
    }

    if (interview?.id) {
      await localDataService.update('interviews', interview.id, {
        sessionData,
        status: 'complete',
        score: state.scores?.overall || 88,
        scores: state.scores || { codeQuality: 92, communication: 85, problemSolving: 88, confidence: 86, overall: 88 },
        endReason: state.endReason || 'completed',
      })
    }

    return sessionData
  },

  // ---- Computed helpers ----
  getCurrentQuestion: () => {
    const state = get()
    return state.questions[state.currentQuestionIndex] || null
  },

  getCurrentCode: () => {
    const state = get()
    return state.code[`${state.currentQuestionIndex}-${state.language}`] || ''
  },

  getParticipantCount: () => {
    const state = get()
    let count = 1 // candidate always present
    if (state.ai.isActive) count++
    if (state.hr.isPresent) count++
    return count
  }
}
})

