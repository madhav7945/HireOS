import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video, VideoOff, Mic, MicOff, Copy, Check, Users, Phone,
  Monitor, MessageSquare, Send, Award, FileCode, CheckCircle2,
  Sparkles, Settings, ShieldCheck, Clock, Hand, HelpCircle,
  X, Pin, Volume2, Maximize2, Minimize2, Radio, Edit3, Star,
  Eye, ThumbsUp, Code2, AlertCircle, Share2, Palette, Download,
  Square, Circle, Move, Trash2, FileText, Smile, Zap, Heart,
  Lightbulb, Rocket, Lock, Timer, UserPlus, Info, CheckSquare
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import { localDataService } from '../services/localData'
import { useAuthStore } from '../store'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './ManualMeetingRoom.css'

const PEERJS_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
const PEER_OPTS = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
}

function loadPeer() {
  return new Promise((resolve, reject) => {
    if (window.Peer) return resolve(window.Peer)
    const s = document.createElement('script')
    s.src = PEERJS_SRC
    s.async = true
    s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('Video engine failed to load')))
    s.onerror = () => reject(new Error('Could not load video engine. Check your connection.'))
    document.body.appendChild(s)
  })
}

const initial = (s) => (s || '?').trim().charAt(0).toUpperCase() || '?'

const REACTIONS = [
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '👏', label: 'Applause' },
  { emoji: '💡', label: 'Great Idea' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🎉', label: 'Celebrate' },
]

export default function ManualMeetingRoom() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [meeting, setMeeting] = useState(null)
  const [candidateRecord, setCandidateRecord] = useState(null)
  const [joined, setJoined] = useState(false)
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [userRole, setUserRole] = useState(user?.role || (user ? 'HR Talent Lead' : 'Candidate'))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Devices & Interaction
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [pinnedPeer, setPinnedPeer] = useState(null)
  const [handRaised, setHandRaised] = useState(false)
  const [isRecording, setIsRecording] = useState(true)
  const [activeSidePanel, setActiveSidePanel] = useState('scorecard') // Default active like Stitch mockup
  const [captionsOn, setCaptionsOn] = useState(false)
  const [liveCaptionText, setLiveCaptionText] = useState('')
  const [sessionSeconds, setSessionSeconds] = useState(1455) // Initial 24:15 style counter
  const [floatingReactions, setFloatingReactions] = useState([])
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  // In-Meeting Chat
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'System', role: 'Security', text: 'Welcome to the Human-Led Interview Meeting. Encrypted WebRTC P2P.', time: '14:00' },
    { id: 2, sender: 'Sarah Chen', role: 'HR Lead', text: 'Hi everyone! Thanks for joining today’s technical panel.', time: '14:02' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  // HR Evaluation Scorecard (5-Star Categories)
  const [scorecard, setScorecard] = useState({
    problemSolving: 5,
    technicalFit: 4,
    communication: 5,
    culturalFit: 4,
    recommendation: 'strong_hire',
    notes: 'Candidate articulated distributed state caching and Redis cluster failover with exceptional clarity.'
  })
  const [scorecardSaved, setScorecardSaved] = useState(false)

  // Interactive Whiteboard Canvas State
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [penColor, setPenColor] = useState('#8b5cf6')
  const [penWidth, setPenWidth] = useState(3)
  const [whiteboardTool, setWhiteboardTool] = useState('pen')

  // Peers: peerId -> { stream, name, camOn, micOn, handRaised, role }
  const [remote, setRemote] = useState({})

  // WebRTC Machinery
  const lobbyVideoRef = useRef(null)
  const selfVideoRef = useRef(null)
  const streamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const peerRef = useRef(null)
  const callsRef = useRef(new Map())
  const connsRef = useRef(new Map())
  const rosterRef = useRef(new Set())
  const myIdRef = useRef(null)
  const isAnchorRef = useRef(false)
  const micRef = useRef(true)
  const camRef = useRef(true)
  const nameRef = useRef('')
  const roleRef = useRef('')
  const chatScrollRef = useRef(null)
  const recognitionRef = useRef(null)

  const inviteLink = `${window.location.origin}/meet/${roomId}`
  const canJoin = displayName.trim().length > 0

  useEffect(() => { nameRef.current = displayName }, [displayName])
  useEffect(() => { roleRef.current = userRole }, [userRole])
  useEffect(() => { micRef.current = micOn }, [micOn])
  useEffect(() => { camRef.current = camOn }, [camOn])

  // Timer counter
  useEffect(() => {
    if (!joined) return
    const interval = setInterval(() => setSessionSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [joined])

  // Load meeting & candidate data
  useEffect(() => {
    let active = true
    localDataService.list('interviews').then((list) => {
      if (!active) return
      const iv = list.find((i) => i.meetingRoom === roomId || i.session_id === roomId || String(i.id) === String(roomId))
      if (iv) {
        setMeeting(iv)
        localDataService.list('candidates').then((cands) => {
          if (!active) return
          const cand = cands.find((c) => c.name?.toLowerCase() === iv.candidate?.toLowerCase() || c.email === iv.email)
          if (cand) setCandidateRecord(cand)
        }).catch(() => {})
      }
    }).catch(() => {})
    return () => { active = false }
  }, [roomId])

  // Auto-scroll chat
  useEffect(() => {
    if (activeSidePanel === 'chat') {
      setUnreadChatCount(0)
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [chatMessages, activeSidePanel])

  // Pre-join Lobby Camera
  useEffect(() => {
    if (joined) return
    let cancelled = false
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch (_) {}
        streamRef.current = stream
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn))
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn))
        if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream
        setPreviewError('')
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Camera/mic blocked — enable access in browser settings.')
      })
    return () => { cancelled = true }
  }, [joined])

  // Speech Recognition for Live Captions (CC)
  useEffect(() => {
    if (!joined || !captionsOn) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      toast.error('Speech Recognition not supported in this browser.')
      setCaptionsOn(false)
      return
    }

    const rec = new SpeechRec()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interim += event.results[i][0].transcript
      }
      setLiveCaptionText(interim)
      broadcastMsg({ type: 'caption', sender: displayName, text: interim })
    }

    rec.onerror = () => {}
    rec.onend = () => { if (captionsOn) rec.start() }
    rec.start()
    recognitionRef.current = rec

    return () => rec.stop()
  }, [joined, captionsOn, displayName])

  // Broadcast helper across data channels
  const broadcastMsg = useCallback((msg) => {
    connsRef.current.forEach((c) => {
      try { if (c.open) c.send(msg) } catch (_) {}
    })
  }, [])

  const broadcastProfile = useCallback(() => {
    broadcastMsg({
      type: 'profile',
      name: nameRef.current,
      role: roleRef.current,
      micOn: micRef.current,
      camOn: camRef.current,
      handRaised
    })
  }, [broadcastMsg, handRaised])

  const toggleMic = () => {
    const v = !micOn
    setMicOn(v)
    micRef.current = v
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = v))
    broadcastProfile()
  }

  const toggleCam = () => {
    const v = !camOn
    setCamOn(v)
    camRef.current = v
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = v))
    broadcastProfile()
  }

  const toggleHand = () => {
    const v = !handRaised
    setHandRaised(v)
    broadcastMsg({ type: 'hand', sender: displayName, raised: v })
    toast(v ? '✋ Hand raised' : 'Hand lowered', { icon: v ? '✋' : '👌' })
  }

  // Floating Reactions Trigger
  const triggerReaction = (emoji) => {
    const rId = Date.now() + Math.random()
    setFloatingReactions((prev) => [...prev, { id: rId, emoji, left: Math.floor(Math.random() * 50) + 25 }])
    broadcastMsg({ type: 'reaction', emoji, sender: displayName })
    setShowReactionPicker(false)
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== rId))
    }, 2400)
  }

  // Screen Share
  const stopShare = useCallback(() => {
    const cam = streamRef.current?.getVideoTracks()[0]
    callsRef.current.forEach((call) => {
      const sender = call.peerConnection?.getSenders?.().find((s) => s.track && s.track.kind === 'video')
      if (sender && cam) sender.replaceTrack(cam).catch(() => {})
    })
    try { screenStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch (_) {}
    screenStreamRef.current = null
    if (selfVideoRef.current) selfVideoRef.current.srcObject = streamRef.current
    setSharing(false)
  }, [])

  const toggleShare = async () => {
    if (sharing) { stopShare(); return }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = ds
      const track = ds.getVideoTracks()[0]
      callsRef.current.forEach((call) => {
        const sender = call.peerConnection?.getSenders?.().find((s) => s.track && s.track.kind === 'video')
        if (sender) sender.replaceTrack(track).catch(() => {})
      })
      if (selfVideoRef.current) selfVideoRef.current.srcObject = ds
      track.onended = () => stopShare()
      setSharing(true)
    } catch (_) { /* cancelled */ }
  }

  const removePeer = useCallback((pid) => {
    callsRef.current.delete(pid)
    connsRef.current.delete(pid)
    setRemote((prev) => {
      const next = { ...prev }
      delete next[pid]
      return next
    })
  }, [])

  // Send Chat message
  const handleSendChat = (e) => {
    e?.preventDefault()
    if (!chatInput.trim()) return
    const msg = {
      id: Date.now(),
      sender: displayName || 'You',
      role: userRole,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setChatMessages((prev) => [...prev, msg])
    setChatInput('')
    broadcastMsg({ type: 'chat', msg })
  }

  // Save HR Evaluation Scorecard to CRM
  const handleSaveScorecard = async () => {
    const candidateId = candidateRecord?.id || meeting?.candidate_id
    const noteText = `📋 HR Panel Evaluation for ${meeting?.role || 'Interview'}:
• Problem Solving: ${scorecard.problemSolving}/5
• Technical Fit: ${scorecard.technicalFit}/5
• Communication: ${scorecard.communication}/5
• Cultural Fit: ${scorecard.culturalFit}/5
• Recommendation: ${scorecard.recommendation.toUpperCase().replace('_', ' ')}
• Remarks: ${scorecard.notes || 'Strong collaborative session.'}`

    try {
      if (candidateId) {
        const candidateNotes = [
          { id: Date.now(), text: noteText, author: displayName || 'HR Lead', date: new Date().toISOString() },
          ...(candidateRecord?.notes || [])
        ]
        await localDataService.update('candidates', candidateId, { notes: candidateNotes })
      }
      setScorecardSaved(true)
      toast.success('Evaluation scorecard synced to Candidate Profile!')
      setTimeout(() => setScorecardSaved(false), 3000)
    } catch (e) {
      toast.error('Failed to save scorecard')
    }
  }

  // Canvas Whiteboard Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (whiteboardTool === 'eraser') {
      ctx.strokeStyle = '#0e0e0e'
      ctx.lineWidth = 22
    } else {
      ctx.strokeStyle = penColor
      ctx.lineWidth = penWidth
      ctx.lineCap = 'round'
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const addArchitectureNode = (label, color = '#8b5cf6') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const x = Math.floor(Math.random() * 120) + 30
    const y = Math.floor(Math.random() * 120) + 30

    ctx.fillStyle = '#171626'
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x, y, 150, 50, [8])
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Geist, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + 75, y + 30)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    toast.success('Whiteboard cleared')
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `whiteboard-${roomId}.png`
    a.click()
    toast.success('Whiteboard exported as PNG!')
  }

  // ---- WebRTC Peer Mesh Setup ----
  useEffect(() => {
    if (!joined) return
    let destroyed = false
    const anchorId = `hireos-${String(roomId).replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'room'}`

    const broadcastRoster = () => {
      const ids = [...rosterRef.current]
      connsRef.current.forEach((c) => {
        try { if (c.open) c.send({ type: 'roster', ids }) } catch (_) {}
      })
    }

    const reconcile = () => {
      const peer = peerRef.current
      if (!peer || !myIdRef.current) return
      rosterRef.current.forEach((pid) => {
        if (pid === myIdRef.current || callsRef.current.has(pid)) return
        if (myIdRef.current < pid) {
          if (!connsRef.current.has(pid)) {
            try {
              setupConn(peer.connect(pid, { metadata: { name: nameRef.current, role: roleRef.current } }))
            } catch (_) {}
          }
          try {
            setupCall(peer.call(pid, streamRef.current, { metadata: { name: nameRef.current, role: roleRef.current } }))
          } catch (_) {}
        }
      })
    }

    const setupConn = (conn) => {
      if (!conn) return
      connsRef.current.set(conn.peer, conn)
      conn.on('open', () => {
        try {
          conn.send({
            type: 'profile',
            name: nameRef.current,
            role: roleRef.current,
            micOn: micRef.current,
            camOn: camRef.current,
            handRaised
          })
        } catch (_) {}
        if (isAnchorRef.current) {
          rosterRef.current.add(conn.peer)
          broadcastRoster()
          reconcile()
        }
      })
      conn.on('data', (data) => {
        if (!data || typeof data !== 'object') return
        if (data.type === 'roster' && Array.isArray(data.ids)) {
          rosterRef.current = new Set(data.ids)
          reconcile()
        } else if (data.type === 'profile') {
          setRemote((prev) => ({
            ...prev,
            [conn.peer]: {
              ...(prev[conn.peer] || {}),
              name: data.name,
              role: data.role,
              micOn: data.micOn,
              camOn: data.camOn,
              handRaised: data.handRaised
            }
          }))
        } else if (data.type === 'chat' && data.msg) {
          setChatMessages((prev) => [...prev, data.msg])
          if (activeSidePanel !== 'chat') setUnreadChatCount((c) => c + 1)
        } else if (data.type === 'caption') {
          setLiveCaptionText(`${data.sender}: ${data.text}`)
        } else if (data.type === 'reaction') {
          const rId = Date.now() + Math.random()
          setFloatingReactions((prev) => [...prev, { id: rId, emoji: data.emoji, left: Math.floor(Math.random() * 50) + 25 }])
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== rId))
          }, 2400)
        } else if (data.type === 'hand') {
          setRemote((prev) => ({
            ...prev,
            [conn.peer]: { ...(prev[conn.peer] || {}), handRaised: data.raised }
          }))
          if (data.raised) toast(`✋ ${data.sender} raised their hand`, { icon: '✋' })
        }
      })
      conn.on('close', () => {
        connsRef.current.delete(conn.peer)
        if (isAnchorRef.current) {
          rosterRef.current.delete(conn.peer)
          broadcastRoster()
        }
        removePeer(conn.peer)
      })
      conn.on('error', () => {})
    }

    const setupCall = (call) => {
      if (!call) return
      callsRef.current.set(call.peer, call)
      call.on('stream', (rstream) => {
        setRemote((prev) => ({
          ...prev,
          [call.peer]: {
            name: call.metadata?.name || 'Guest',
            role: call.metadata?.role || 'Participant',
            micOn: true,
            camOn: true,
            ...(prev[call.peer] || {}),
            stream: rstream
          }
        }))
      })
      call.on('close', () => removePeer(call.peer))
      call.on('error', () => removePeer(call.peer))
    }

    const boot = (asAnchor) => {
      let peer
      try {
        peer = new window.Peer(asAnchor ? anchorId : undefined, PEER_OPTS)
      } catch (e) {
        setError('Could not initialize video connection.')
        return
      }
      peerRef.current = peer
      isAnchorRef.current = asAnchor

      peer.on('open', (id) => {
        myIdRef.current = id
        if (asAnchor) {
          rosterRef.current = new Set([id])
          reconcile()
        } else {
          setupConn(peer.connect(anchorId, { metadata: { name: nameRef.current, role: roleRef.current } }))
        }
      })
      peer.on('connection', setupConn)
      peer.on('call', (call) => {
        try { call.answer(streamRef.current) } catch (_) {}
        setupCall(call)
      })
      peer.on('error', (err) => {
        if (err?.type === 'unavailable-id' && asAnchor) {
          try { peer.destroy() } catch (_) {}
          if (!destroyed) boot(false)
        }
      })
      peer.on('disconnected', () => {
        if (!destroyed) { try { peer.reconnect() } catch (_) {} }
      })
    }

    ;(async () => {
      try { await loadPeer() } catch (e) { setError(e.message); return }
      if (destroyed) return
      if (!streamRef.current) {
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        } catch (_) {
          streamRef.current = new MediaStream()
        }
      }
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = micRef.current))
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = camRef.current))
      if (selfVideoRef.current) selfVideoRef.current.srcObject = streamRef.current
      boot(true)
    })()

    return () => {
      destroyed = true
      try { callsRef.current.forEach((c) => c.close()) } catch (_) {}
      try { connsRef.current.forEach((c) => c.close()) } catch (_) {}
      try { peerRef.current?.destroy() } catch (_) {}
      try { screenStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch (_) {}
      try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch (_) {}
      callsRef.current.clear()
      connsRef.current.clear()
      rosterRef.current.clear()
      peerRef.current = null
      streamRef.current = null
    }
  }, [joined]) // eslint-disable-line react-hooks/exhaustive-deps

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      toast.success('Meeting link copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Pre-join Lobby View
  if (!joined) {
    return (
      <div className="mr-lobby-page">
        <header className="mr-lobby-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Logo size={28} withWordmark wordmarkSize={18} />
            <span className="badge badge-paused" style={{ fontSize: '0.72rem' }}>
              <Lock size={11} /> Obsidian &amp; Neon Encrypted
            </span>
          </div>
        </header>

        <div className="mr-lobby-container">
          {/* Camera Mirror */}
          <div className="mr-lobby-video-col">
            <div className="mr-lobby-video-card">
              <video
                ref={lobbyVideoRef}
                autoPlay
                playsInline
                muted
                className="mr-lobby-video"
                style={{ display: camOn ? 'block' : 'none' }}
              />
              {!camOn && (
                <div className="mr-lobby-video-placeholder">
                  <div className="mr-tile-avatar" style={{ background: avatarColor(displayName || 'You') }}>
                    {initial(displayName || 'You')}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Camera is turned off</p>
                </div>
              )}

              <div className="mr-lobby-controls-overlay">
                <button
                  className={`mr-lobby-ctrl-btn ${micOn ? 'active' : 'muted'}`}
                  onClick={toggleMic}
                  title={micOn ? 'Turn off microphone' : 'Turn on microphone'}
                >
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button
                  className={`mr-lobby-ctrl-btn ${camOn ? 'active' : 'muted'}`}
                  onClick={toggleCam}
                  title={camOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              </div>
            </div>

            {previewError && <p className="mr-lobby-error-msg">{previewError}</p>}
          </div>

          {/* Join Spec Card */}
          <div className="mr-lobby-join-col">
            <div className="mr-lobby-card">
              <div style={{ marginBottom: 14 }}>
                <span className="cdp-code" style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
                  {roomId}
                </span>
                <span className="badge badge-live" style={{ marginLeft: 8, fontSize: '0.72rem' }}>
                  ● HUMAN PANEL (NO AI)
                </span>
              </div>

              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 6px', color: '#fff' }}>
                {meeting?.role || 'Aura Connect Executive Suite'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 0 22px' }}>
                {meeting?.candidate ? `Candidate: ${meeting.candidate}` : 'Live multi-party panel session'}
              </p>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Your Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left', marginBottom: 22 }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Interview Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                >
                  <option value="HR Lead">HR Talent Lead</option>
                  <option value="Tech Lead">Tech Lead / Architect</option>
                  <option value="Hiring Manager">Hiring Manager</option>
                  <option value="Candidate">Candidate</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 700, borderRadius: 12, background: 'var(--color-primary)', border: 'none', color: '#fff' }}
                onClick={() => canJoin && setJoined(true)}
                disabled={!canJoin}
              >
                <Video size={18} /> Join Meeting Now
              </button>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: 10, padding: '12px', justifyContent: 'center', borderRadius: 12 }}
                onClick={copyInvite}
              >
                {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                {copied ? 'Invite Link Copied!' : 'Copy Meeting Invite Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // In-Meeting View (Stitch Obsidian & Neon Style)
  const peers = Object.entries(remote)
  const isMultiParty = peers.length > 0

  return (
    <div className="mr-page">
      {/* Floating Reactions Overlay */}
      <div className="mr-floating-reactions-layer">
        {floatingReactions.map((r) => (
          <motion.div
            key={r.id}
            className="mr-floating-reaction-item"
            style={{ left: `${r.left}%` }}
            initial={{ opacity: 1, y: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: -300, scale: 1.8 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </div>

      {/* TopAppBar (Obsidian & Neon Style) */}
      <header className="mr-topbar">
        <div style={{ display: 'flex', items: 'center', gap: 14 }}>
          <Logo size={24} withWordmark wordmarkSize={15} />
          <div className="mr-topbar-divider" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {meeting?.role || 'Aura Connect - Executive Interview Suite'}
            </span>
            {meeting?.candidate && (
              <span className="text-xs text-gray-400 font-mono">
                • {meeting.candidate}
              </span>
            )}
          </div>
        </div>

        <div className="mr-topbar-right">
          {isRecording && (
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="font-mono text-xs font-bold text-white">REC</span>
              <span className="font-mono text-xs text-gray-400 ml-1">{formatTimer(sessionSeconds)}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="mr-pill green" onClick={copyInvite} title="Copy invite link">
              <UserPlus size={12} /> Invite
            </button>
            <button className="p-2 text-gray-400 hover:text-white rounded-full transition-colors" title="Encrypted Connection">
              <Lock size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mr-main-area">
        {/* Video Grid Area */}
        <div className="mr-stage">
          {liveCaptionText && (
            <div className="mr-live-captions-banner">
              <span className="mr-captions-tag">CC</span>
              <span>{liveCaptionText}</span>
            </div>
          )}

          {/* 4-Party Video Grid (2x2 Dynamic Grid like Stitch Mockup) */}
          <div className={`mr-grid ${isMultiParty ? (peers.length >= 2 ? 'cols-2' : 'cols-2') : 'cols-1'}`}>
            {/* Tile 1: Self (Active Speaker with Neon Violet Frame) */}
            <div className={`mr-tile active-speaker ${pinnedPeer === 'self' ? 'pinned' : ''}`}>
              {(camOn || sharing) ? (
                <video ref={selfVideoRef} autoPlay playsInline muted className={sharing ? '' : 'mirror'} />
              ) : (
                <div className="mr-tile-avatar" style={{ background: avatarColor(displayName || 'You') }}>
                  {initial(displayName || 'You')}
                </div>
              )}
              {/* Overlay Glass Badge */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 glass-panel px-3 py-1 rounded-full">
                <span className="font-mono text-xs text-white font-bold">{displayName || 'You'}</span>
                <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] uppercase text-gray-300 border border-white/10">
                  {userRole}
                </span>
                {micOn ? (
                  <Mic size={14} className="text-emerald-400" />
                ) : (
                  <MicOff size={14} className="text-red-400" />
                )}
                {handRaised && <Hand size={14} className="text-violet-400" />}
              </div>
            </div>

            {/* Remote Peer Video Tiles */}
            {peers.map(([pid, p]) => (
              <div key={pid} className={`mr-tile ${pinnedPeer === pid ? 'pinned' : ''} border border-white/10`}>
                {p.stream && p.camOn !== false ? (
                  <video ref={(el) => { if (el && p.stream) el.srcObject = p.stream }} autoPlay playsInline />
                ) : (
                  <div className="mr-tile-avatar" style={{ background: avatarColor(p.name) }}>
                    {initial(p.name)}
                  </div>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 glass-panel px-3 py-1 rounded-full">
                  <span className="font-mono text-xs text-white font-bold">{p.name || 'Guest'}</span>
                  <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] uppercase text-gray-300 border border-white/10">
                    {p.role || 'Panelist'}
                  </span>
                  {p.micOn ? (
                    <Mic size={14} className="text-emerald-400" />
                  ) : (
                    <MicOff size={14} className="text-red-400" />
                  )}
                  {p.handRaised && <Hand size={14} className="text-violet-400" />}
                </div>
              </div>
            ))}

            {/* Simulated Candidate / Panelist Tiles when waiting for others */}
            {peers.length === 0 && (
              <>
                <div className="mr-tile border border-white/10 relative">
                  <div className="mr-tile-avatar" style={{ background: 'var(--color-success)' }}>
                    {initial(meeting?.candidate || 'Alex Rivera')}
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 glass-panel px-3 py-1 rounded-full">
                    <span className="font-mono text-xs text-white font-bold">{meeting?.candidate || 'Alex Rivera'}</span>
                    <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] uppercase text-emerald-400 border border-emerald-500/30">
                      Candidate
                    </span>
                    <span className="text-[10px] text-gray-400">Waiting to join...</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SideNavBar (Session Panel from Stitch Design) */}
        <aside className="w-80 h-full flex flex-col bg-surface-container-low/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-white">Session Panel</h2>
              <p className="text-xs text-gray-400">Executive Suite</p>
            </div>
            <div className="flex gap-1">
              {['scorecard', 'chat', 'whiteboard', 'profile'].map((tab) => (
                <button
                  key={tab}
                  className={`p-2 rounded-lg text-xs font-bold capitalize transition-all ${activeSidePanel === tab ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'text-gray-400 hover:text-white'}`}
                  onClick={() => setActiveSidePanel(tab)}
                  title={tab}
                >
                  {tab === 'scorecard' && <Award size={15} />}
                  {tab === 'chat' && <MessageSquare size={15} />}
                  {tab === 'whiteboard' && <Palette size={15} />}
                  {tab === 'profile' && <FileText size={15} />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* SCORECARD TAB (Active by default like Stitch mockup) */}
            {activeSidePanel === 'scorecard' && (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-200">Problem Solving</span>
                  <div className="flex text-emerald-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= scorecard.problemSolving ? 'fill-emerald-400' : 'text-gray-600'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setScorecard({ ...scorecard, problemSolving: s })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-200">Technical Fit</span>
                  <div className="flex text-emerald-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= scorecard.technicalFit ? 'fill-emerald-400' : 'text-gray-600'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setScorecard({ ...scorecard, technicalFit: s })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-200">Communication</span>
                  <div className="flex text-emerald-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= scorecard.communication ? 'fill-emerald-400' : 'text-gray-600'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setScorecard({ ...scorecard, communication: s })}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-200">Culture</span>
                  <div className="flex text-emerald-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={s <= scorecard.culturalFit ? 'fill-emerald-400' : 'text-gray-600'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setScorecard({ ...scorecard, culturalFit: s })}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs text-gray-300 uppercase">Final Recommendation</span>
                    <select
                      value={scorecard.recommendation}
                      onChange={(e) => setScorecard({ ...scorecard, recommendation: e.target.value })}
                      className="bg-black/60 border border-white/20 text-xs rounded-lg px-2 py-1 text-white"
                    >
                      <option value="strong_hire">Strong Hire</option>
                      <option value="hire">Hire</option>
                      <option value="consider">Consider</option>
                      <option value="no_hire">No Hire</option>
                    </select>
                  </div>

                  <textarea
                    rows={3}
                    value={scorecard.notes}
                    onChange={(e) => setScorecard({ ...scorecard, notes: e.target.value })}
                    placeholder="Confidential panelist notes..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-xs text-white resize-none"
                  />

                  <button
                    className="btn btn-primary btn-sm w-full mt-3 justify-center"
                    onClick={handleSaveScorecard}
                  >
                    {scorecardSaved ? <Check size={14} /> : <Award size={14} />}
                    {scorecardSaved ? 'Saved to Candidate Profile!' : 'Save Evaluation to CRM'}
                  </button>
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeSidePanel === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3" ref={chatScrollRef}>
                  {chatMessages.map((m) => (
                    <div key={m.id} className={`flex flex-col gap-1 ${m.sender === (displayName || 'You') ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <strong className="text-white">{m.sender}</strong>
                        {m.role && <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{m.role}</span>}
                        <span>{m.time}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl text-xs max-w-[90%] ${m.sender === (displayName || 'You') ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-gray-200'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send message to everyone..."
                    className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!chatInput.trim()}>
                    <Send size={13} />
                  </button>
                </form>
              </div>
            )}

            {/* WHITEBOARD TAB */}
            {activeSidePanel === 'whiteboard' && (
              <div className="flex flex-col h-full p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-2">
                    <button
                      className={`btn btn-xs ${whiteboardTool === 'pen' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setWhiteboardTool('pen')}
                    >
                      <Edit3 size={12} /> Pen
                    </button>
                    <button
                      className={`btn btn-xs ${whiteboardTool === 'eraser' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setWhiteboardTool('eraser')}
                    >
                      <Trash2 size={12} /> Eraser
                    </button>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={downloadCanvas} title="Export PNG">
                    <Download size={12} />
                  </button>
                </div>

                <div className="flex gap-1.5 mb-2">
                  {['#8b5cf6', '#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#ffffff'].map((c) => (
                    <div
                      key={c}
                      onClick={() => { setPenColor(c); setWhiteboardTool('pen') }}
                      className={`w-4 h-4 rounded-full cursor-pointer ${penColor === c ? 'ring-2 ring-white' : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>

                <div className="flex gap-1.5 flex-wrap mb-2">
                  <button className="mr-wb-chip text-[10px]" onClick={() => addArchitectureNode('Client App', '#38bdf8')}>+ Client</button>
                  <button className="mr-wb-chip text-[10px]" onClick={() => addArchitectureNode('Load Balancer', '#8b5cf6')}>+ Load Balancer</button>
                  <button className="mr-wb-chip text-[10px]" onClick={() => addArchitectureNode('API Service', '#10b981')}>+ API Service</button>
                  <button className="mr-wb-chip text-[10px]" onClick={() => addArchitectureNode('Redis Cache', '#ef4444')}>+ Redis</button>
                </div>

                <div className="flex-1 bg-black rounded-lg border border-white/10 overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={380}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              </div>
            )}

            {/* CANDIDATE PROFILE TAB */}
            {activeSidePanel === 'profile' && (
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: avatarColor(candidateRecord?.name || 'Candidate') }}>
                    {initial(candidateRecord?.name || 'C')}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{candidateRecord?.name || meeting?.candidate || 'Alex Rivera'}</h4>
                    <p className="text-xs text-gray-400">{candidateRecord?.currentTitle || 'Senior Frontend Engineer'}</p>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Target Opening</span>
                  <div className="font-bold text-violet-300 text-xs mt-0.5">{candidateRecord?.appliedFor || meeting?.role || 'Senior React Developer'}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-gray-400 uppercase">Experience</span>
                    <div className="font-bold text-xs mt-0.5">{candidateRecord?.experience || 6} Years</div>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-[10px] text-gray-400 uppercase">Expected CTC</span>
                    <div className="font-bold text-xs mt-0.5">{candidateRecord?.expectedSalary || '₹32.0L'}</div>
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase font-mono mb-1.5 block">Skills</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {(candidateRecord?.skills || ['React', 'TypeScript', 'Node.js', 'Redux', 'System Design']).map((s) => (
                      <span key={s} className="job-card-skill text-[10px]">{s}</span>
                    ))}
                  </div>
                </div>

                {candidateRecord?.id && (
                  <button
                    className="btn btn-secondary btn-sm w-full justify-center text-xs mt-1"
                    onClick={() => window.open(`/candidates/${candidateRecord.id}`, '_blank')}
                  >
                    <Eye size={13} /> View Full Candidate Dossier ↗
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* BottomNavBar (Floating Pill-Shaped Glassmorphic Dock from Stitch Design) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-2.5 bg-white/10 backdrop-blur-32 border border-white/20 shadow-[0px_20px_40px_rgba(139,92,246,0.1)] rounded-full">
        {/* Mic */}
        <button
          onClick={toggleMic}
          className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${micOn ? 'hover:bg-white/20' : 'bg-red-500'}`}
          title={micOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>

        {/* Cam */}
        <button
          onClick={toggleCam}
          className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${camOn ? 'hover:bg-white/20' : 'bg-red-500'}`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>

        {/* Screen Share */}
        <button
          onClick={toggleShare}
          className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${sharing ? 'bg-violet-600' : 'hover:bg-white/20'}`}
          title={sharing ? 'Stop Sharing' : 'Share Screen'}
        >
          <Monitor size={18} />
        </button>

        {/* Closed Captions */}
        <button
          onClick={() => { setCaptionsOn(!captionsOn); toast(captionsOn ? 'Captions off' : 'Captions on', { icon: '💬' }) }}
          className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${captionsOn ? 'bg-violet-600' : 'hover:bg-white/20'}`}
          title="Toggle Captions"
        >
          <span className="font-bold text-xs">CC</span>
        </button>

        {/* Hand Raise */}
        <button
          onClick={toggleHand}
          className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${handRaised ? 'bg-violet-600' : 'hover:bg-white/20'}`}
          title="Raise Hand"
        >
          <Hand size={18} />
        </button>

        {/* Reaction Popover */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className={`flex items-center justify-center text-white transition-all rounded-full w-11 h-11 ${showReactionPicker ? 'bg-violet-600' : 'hover:bg-white/20'}`}
            title="Send Reaction"
          >
            <Smile size={18} />
          </button>

          <AnimatePresence>
            {showReactionPicker && (
              <motion.div
                className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/20 px-3 py-1.5 rounded-full flex gap-2 shadow-2xl z-50"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
              >
                {REACTIONS.map((r) => (
                  <button
                    key={r.emoji}
                    className="hover:scale-125 transition-transform text-lg cursor-pointer bg-transparent border-none p-1"
                    onClick={() => triggerReaction(r.emoji)}
                  >
                    {r.emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* End Call */}
        <button
          onClick={() => navigate('/meetings')}
          className="flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition-all w-11 h-11 ml-2"
          title="Leave Meeting"
        >
          <Phone size={18} />
        </button>
      </div>
    </div>
  )
}
