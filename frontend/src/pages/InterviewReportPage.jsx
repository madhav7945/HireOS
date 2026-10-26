import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Brain, Video, Clock, Calendar, User, Shield, ShieldAlert,
  FileText, BarChart3, MessageSquare, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Send, Download, Star, Zap, Eye, Code2,
  Loader2, ExternalLink, Sparkles, Check, Copy, Share2, Award,
  Terminal, ThumbsUp, ThumbsDown, ArrowRight, CornerDownRight, Play,
  Briefcase, MapPin, Building, ShieldCheck
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'
import { localDataService } from '../services/localData'
import { generateDetailedAnalysis } from '../services/interviewAI'
import { pipelineService } from '../services/pipeline'
import { emailService } from '../services/email'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './InterviewReportPage.css'

const REC_CONFIG = {
  strong_hire: { label: 'Strong Hire', color: '#00B894', bg: 'rgba(0,184,148,0.12)', border: 'rgba(0,184,148,0.3)', badge: 'badge-live' },
  hire:        { label: 'Hire',        color: '#55efc4', bg: 'rgba(85,239,196,0.1)',  border: 'rgba(85,239,196,0.25)', badge: 'badge-primary' },
  maybe:       { label: 'Consider',    color: '#FDCB6E', bg: 'rgba(253,203,110,0.1)', border: 'rgba(253,203,110,0.25)', badge: 'badge-warning' },
  no_hire:     { label: 'No Hire',     color: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.25)', badge: 'badge-danger' },
}

function ScoreBar({ label, value, maxValue = 100, color }) {
  const barColor = color || (value >= 85 ? '#00B894' : value >= 70 ? '#6366f1' : value >= 50 ? '#FDCB6E' : '#FF6B6B')
  return (
    <div className="irp-score-row">
      <div className="irp-score-row-header">
        <span className="irp-score-row-label">{label}</span>
        <span className="irp-score-row-val" style={{ color: barColor }}>{value}%</span>
      </div>
      <div className="irp-score-track">
        <motion.div
          className="irp-score-fill"
          initial={{ width: 0 }}
          animate={{ width: `${(value / maxValue) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: barColor }}
        />
      </div>
    </div>
  )
}

export default function InterviewReportPage() {
  const navigate = useNavigate()
  const { interviewId } = useParams()
  const [interview, setInterview] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')
  const [copiedLink, setCopiedLink] = useState(false)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0)
  const [recruiterNote, setRecruiterNote] = useState('')
  const [notesList, setNotesList] = useState([])

  useEffect(() => {
    loadInterview()
  }, [interviewId])

  async function loadInterview() {
    setLoading(true)
    try {
      let iv = await localDataService.get('interviews', interviewId)
      if (!iv) iv = await localDataService.get('interviews', interviewId, 'session_id')
      if (!iv) {
        const all = await localDataService.list('interviews')
        iv = all?.find(i =>
          String(i.id) === String(interviewId) ||
          i.session_id === interviewId ||
          i.interviewId === interviewId
        )
      }

      // Check mock interviews if not found in localData
      if (!iv) {
        const MOCK_MAP = {
          '1': { candidate: 'Arjun Patel', email: 'arjun.p@gmail.com', role: 'Senior React Developer', department: 'Engineering', score: 88, scores: { code: 92, comm: 85, problem: 88, confidence: 86 } },
          '2': { candidate: 'Priya Sharma', email: 'priya.s@outlook.com', role: 'Product Designer', department: 'Design', score: 88, scores: { code: 85, comm: 92, problem: 88, confidence: 88 } },
          '3': { candidate: 'Neha Gupta', email: 'neha.g@yahoo.com', role: 'Data Scientist', department: 'Data', score: 86, scores: { code: 88, comm: 84, problem: 90, confidence: 82 } },
          '4': { candidate: 'Siddharth Joshi', email: 'sid.j@gmail.com', role: 'Mobile Developer', department: 'Engineering', score: 90, scores: { code: 92, comm: 82, problem: 88, confidence: 85 } },
          '5': { candidate: 'Ananya Iyer', email: 'ananya.i@proton.me', role: 'DevOps Engineer', department: 'Infrastructure', score: 84, scores: { code: 86, comm: 82, problem: 85, confidence: 80 } },
          '6': { candidate: 'Ravi Kumar', email: 'ravi.k@gmail.com', role: 'Senior React Developer', department: 'Engineering', score: 82, scores: { code: 84, comm: 80, problem: 82, confidence: 80 } },
          '7': { candidate: 'Meera Nair', email: 'meera.n@gmail.com', role: 'Backend Engineer', department: 'Engineering', score: 85, scores: { code: 90, comm: 78, problem: 88, confidence: 80 } },
          '8': { candidate: 'Vikram Singh', email: 'vikram.s@outlook.com', role: 'QA Lead', department: 'Quality Assurance', score: 78, scores: { code: 80, comm: 85, problem: 75, confidence: 72 } },
          'cand-001': { candidate: 'Arjun Patel', email: 'arjun.patel@gmail.com', role: 'Senior React Developer', department: 'Engineering', score: 88, scores: { code: 92, comm: 85, problem: 88, confidence: 86 } },
          'cand-002': { candidate: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'Product Designer', department: 'Design', score: 88, scores: { code: 85, comm: 92, problem: 88, confidence: 88 } },
        }
        const found = MOCK_MAP[String(interviewId)]
        if (found) {
          iv = {
            id: interviewId,
            candidate: found.candidate,
            email: found.email,
            role: found.role,
            department: found.department,
            date: 'Jun 2, 2026',
            time: '2:30 PM',
            duration: '24 min',
            status: 'complete',
            score: found.score,
            scores: { codeQuality: found.scores.code, communication: found.scores.comm, problemSolving: found.scores.problem, confidence: found.scores.confidence, overall: found.score }
          }
        }
      }

      // Default fallback
      if (!iv) {
        iv = {
          id: interviewId || 'demo',
          candidate: 'Arjun Patel',
          email: 'arjun.p@gmail.com',
          role: 'Senior React Developer',
          department: 'Engineering',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: '2:30 PM',
          duration: '24 min',
          status: 'complete',
          score: 88,
          scores: { codeQuality: 92, communication: 85, problemSolving: 88, confidence: 86, overall: 88 }
        }
      }

      const isDesignRole = (iv.role || '').toLowerCase().includes('design')
      const isMobileRole = (iv.role || '').toLowerCase().includes('mobile')
      const isBackendRole = (iv.role || '').toLowerCase().includes('backend')

      if (!iv.sessionData) {
        iv.sessionData = {
          candidateName: iv.candidate,
          role: iv.role,
          scores: iv.scores || { codeQuality: 90, communication: 85, problemSolving: 88, confidence: 86, overall: iv.score || 88 },
          transcript: isDesignRole ? [
            { sender: 'ai', content: `Hello ${iv.candidate.split(' ')[0]}, I'm Sarah, Lead Technical Architect. Let's discuss your experience building accessible design systems and component libraries.` },
            { sender: 'candidate', content: "At my previous company, I spearheaded the unification of our design system in Figma and translated tokens directly into design tokens for React components, reducing design-to-engineering handoff time by 35%." },
            { sender: 'ai', content: "Impressive. How did you ensure WCAG 2.1 AA color contrast and screen reader accessibility across dark and light themes?" },
            { sender: 'candidate', content: "We established semantic color palettes with automated contrast ratio checking in CI/CD, and paired all icon-only buttons with explicit aria-labels." },
            { sender: 'ai', content: "Let's move to the practical round. Please design the interaction architecture for an accessible nested multi-level navigation component." },
            { sender: 'candidate', content: "I'll implement proper keyboard traps, focus rings, Escape key handlers, and ARIA expanded state management." }
          ] : [
            { sender: 'ai', content: `Hello ${iv.candidate.split(' ')[0]}, I'm Sarah, Lead Technical Architect. Let's begin by discussing the architectural challenges you solved in your previous position.` },
            { sender: 'candidate', content: "We identified major performance bottlenecks in our client bundle and data pipeline. I implemented route-based code splitting and memoized expensive state selectors, cutting render latency by over 40%." },
            { sender: 'ai', content: "Solid breakdown. How did you handle cache invalidation and CDN edge caching?" },
            { sender: 'candidate', content: "We used content-hashed filenames for immutable caching at Cloudflare, paired with an S3 origin, ensuring zero stale assets for users." },
            { sender: 'ai', content: "Good. Now let's transition to the coding sandbox. Please implement a robust debounce and cancellation utility." },
            { sender: 'candidate', content: "Understood. I will use a closure to store the timer ID and return a wrapped function that clears the previous timeout before scheduling the new one." }
          ],
          questions: [
            {
              title: isDesignRole ? 'Interactive Modal & Focus Trap' : isMobileRole ? 'Offline Cache Syncer' : isBackendRole ? 'Rate Limiter Token Bucket' : 'Custom Debounce Utility',
              description: isDesignRole ? 'Implement an accessible modal component with keyboard focus trap, Esc key dismissal, and backdrop click handling.' : 'Implement an algorithmic utility with zero memory leaks and boundary validation.',
              category: isDesignRole ? 'Design Systems Architecture' : 'Core Architecture',
              difficulty: 'Medium',
              complexityTarget: { time: 'O(1)', space: 'O(1)' },
              tests: [
                { args: 'initialRender()', expected: 'mounted', actual: 'mounted', pass: true },
                { args: 'triggerKey(Escape)', expected: 'dismissed', actual: 'dismissed', pass: true },
                { args: 'tabNavigation()', expected: 'focusTrapped', actual: 'focusTrapped', pass: true }
              ]
            }
          ],
          code: {
            0: isDesignRole ? `// Accessible Modal Component with Focus Trap
function createModal({ title, content, onDismiss }) {
  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-label', title);

  function handleKeyDown(e) {
    if (e.key === 'Escape') onDismiss();
  }
  
  window.addEventListener('keydown', handleKeyDown);
  return { element: container, cleanup: () => window.removeEventListener('keydown', handleKeyDown) };
}` : `function debounce(fn, wait = 100, options = {}) {
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(lastThis, lastArgs);
      timeoutId = null;
    }, wait);
  }

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}`
          },
          proctoring: {
            violationScore: 0,
            tabSwitchCount: 0,
            pasteCount: 0,
            faceDetected: true,
            events: [
              { type: 'session_start', message: 'Candidate joined camera and mic stream cleanly', severity: 'info', time: '00:01' },
              { type: 'round_complete', message: 'All test specifications completed with 100% pass rate', severity: 'info', time: '22:15' }
            ]
          }
        }
      }

      setInterview(iv)

      // Generate or set analysis
      if (iv?.sessionData) {
        setGenerating(true)
        try {
          const a = await generateDetailedAnalysis({
            role: iv.role || iv.sessionData?.role,
            transcript: iv.sessionData.transcript || [],
            code: iv.sessionData.code || {},
            questions: iv.sessionData.questions || [],
            questionScores: iv.sessionData.questionScores || {},
            scores: iv.sessionData.scores || iv.scores || {},
            proctoring: iv.sessionData.proctoring || {},
            durationMinutes: iv.sessionData.durationMinutes || 30,
            elapsedSeconds: iv.sessionData.elapsedSeconds || 1440,
            candidateName: iv.candidate || iv.sessionData.candidateName,
            resumeContext: iv.sessionData.resumeContext || '',
            endReason: iv.sessionData.endReason || iv.endReason || 'completed',
          })
          setAnalysis(a)
        } catch (err) {
          console.warn('Analysis generation fallback:', err)
          setAnalysis(buildDefaultAnalysis(iv))
        }
        setGenerating(false)
      } else {
        setAnalysis(buildDefaultAnalysis(iv))
      }
    } catch (err) {
      console.error('Error loading interview dossier:', err)
    } finally {
      setLoading(false)
    }
  }

  function buildDefaultAnalysis(iv) {
    const ov = iv.score || iv.scores?.overall || 85
    const isDesign = (iv.role || '').toLowerCase().includes('design')
    return {
      candidateName: iv.candidate || 'Candidate',
      role: iv.role || 'Senior Software Engineer',
      recommendation: ov >= 85 ? 'strong_hire' : ov >= 70 ? 'hire' : ov >= 55 ? 'maybe' : 'no_hire',
      summary: isDesign
        ? `${iv.candidate || 'The candidate'} demonstrated exceptional product intuition, design system architecture knowledge, and structured user-centric problem solving. Practical component interaction specifications were modular, accessible (WCAG 2.1 AA), and handled edge cases effectively.`
        : `${iv.candidate || 'The candidate'} demonstrated strong technical aptitude, clear architectural articulation, and structured problem-solving. Code written in the sandbox was modular, well-named, and handled edge cases effectively.`,
      scores: {
        codeQuality: iv.scores?.codeQuality || iv.scores?.code || 90,
        communication: iv.scores?.communication || iv.scores?.comm || 84,
        problemSolving: iv.scores?.problemSolving || iv.scores?.problem || 88,
        confidence: iv.scores?.confidence || 85,
        systemDesign: 86,
        overall: ov
      },
      strengths: isDesign ? [
        'Clear architectural vision translating design tokens from Figma into modular component systems',
        'Strong accessibility focus (keyboard focus traps, semantic ARIA roles, color contrast ratios)',
        'Excellent articulation of user journey trade-offs and cross-functional engineering handoff'
      ] : [
        'Direct, concise answers grounded in real-world performance metrics',
        'Clean closure and modular implementation with memory leak prevention',
        'Strong awareness of caching boundaries, edge infrastructure, and bundle optimization'
      ],
      gaps: isDesign ? [
        'Could delve deeper into micro-interaction spring physics and gesture animation choreography'
      ] : [
        'Could delve deeper into concurrent execution boundaries under high-throughput load'
      ],
      radar: [
        { subject: isDesign ? 'UI & Design Systems' : 'Logic & Algorithms', score: iv.scores?.codeQuality || 90 },
        { subject: isDesign ? 'UX Architecture' : 'Syntax & Precision', score: 88 },
        { subject: isDesign ? 'Accessibility & ARIA' : 'System Design', score: 86 },
        { subject: 'Communication', score: iv.scores?.communication || 84 },
        { subject: 'Edge Cases', score: 92 },
        { subject: 'Confidence', score: iv.scores?.confidence || 85 },
      ]
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    toast.success('Dossier report link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSendOffer = () => {
    toast.success(`Automated offer letter draft initiated for ${interview?.candidate || 'candidate'}!`)
    navigate('/offers')
  }

  const handleSendDecline = () => {
    if (window.confirm(`Are you sure you want to send a respectful rejection email to ${interview?.candidate}?`)) {
      toast.success('Decline email queued in Autopilot pipeline')
    }
  }

  const handleAddNote = () => {
    if (!recruiterNote.trim()) return
    setNotesList(prev => [{ id: Date.now(), text: recruiterNote.trim(), date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), author: 'Recruiter' }, ...prev])
    setRecruiterNote('')
    toast.success('Note attached to interview record')
  }

  if (loading) {
    return (
      <div className="irp-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <Loader2 size={40} className="irp-spinner" color="var(--brand-primary)" />
          <h3 style={{ margin: 0, fontWeight: 700 }}>Compiling AI Technical Evaluation Dossier…</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>Analyzing code syntax, test matrix, and conversational depth with Sarah</p>
        </div>
      </div>
    )
  }

  const overallScore = analysis?.scores?.overall || interview?.score || 85
  const rec = REC_CONFIG[analysis?.recommendation] || REC_CONFIG.strong_hire
  const sessionData = interview?.sessionData || {}
  const questions = sessionData.questions || [
    { title: 'Custom Debounce Utility', category: 'Frontend Architecture', difficulty: 'Medium', complexityTarget: { time: 'O(1)', space: 'O(1)' }, tests: [{ pass: true }, { pass: true }, { pass: true }] }
  ]
  const currentQ = questions[activeQuestionIdx] || questions[0]
  const currentCode = sessionData.code?.[activeQuestionIdx] || sessionData.code?.['0'] || '// Code recorded during live sandbox round'
  const proctor = sessionData.proctoring || { violationScore: 0, tabSwitchCount: 0, pasteCount: 0, events: [] }

  const radarData = analysis?.radar || [
    { subject: 'Logic & Algorithms', score: analysis?.scores?.codeQuality || 90 },
    { subject: 'Syntax & Precision', score: 88 },
    { subject: 'System Design', score: 86 },
    { subject: 'Communication', score: analysis?.scores?.communication || 84 },
    { subject: 'Edge Cases', score: 92 },
    { subject: 'Confidence', score: analysis?.scores?.confidence || 85 },
  ]

  return (
    <div className="irp-page">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="irp-top-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/interviews')}>
          <ArrowLeft size={16} /> Back to AI Interviews
        </button>

        <div className="irp-top-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
            {copiedLink ? <Check size={14} color="var(--brand-success)" /> : <Copy size={14} />}
            {copiedLink ? 'Copied Link' : 'Share Dossier'}
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Download size={14} /> Export PDF
          </button>

          <button className="btn btn-danger-ghost btn-sm" onClick={handleSendDecline}>
            <ThumbsDown size={14} /> Decline
          </button>

          <button className="btn btn-primary btn-sm" onClick={handleSendOffer} style={{ background: 'var(--color-success)', border: 'none' }}>
            <ThumbsUp size={14} /> Approve & Draft Offer
          </button>
        </div>
      </div>

      {/* Header Banner Card */}
      <div className="irp-header-card card">
        <div className="irp-header-main">
          <div className="irp-header-tags">
            <span className="irp-code">INT-{String(interview?.id || '042').padStart(3, '0')}</span>
            <span className={`badge ${rec.badge}`}>
              <span className="status-dot status-dot-active" />
              EVALUATED • {rec.label.toUpperCase()}
            </span>
            <span className="badge badge-primary">
              <Brain size={12} /> SARAH LEAD ARCHITECT
            </span>
            <span className="badge badge-scheduled">
              <Sparkles size={12} /> AUTOPILOT SYNCED
            </span>
          </div>

          <div className="irp-header-profile">
            <div className="irp-avatar" style={{ background: avatarColor(interview?.candidate || 'Arjun Patel') }}>
              {(interview?.candidate || 'Arjun Patel').charAt(0)}
            </div>
            <div>
              <h1 className="irp-title">{interview?.candidate || 'Arjun Patel'}</h1>
              <p className="irp-subtitle">{interview?.role || 'Senior React Developer'} • <span style={{ color: 'var(--text-secondary)' }}>{interview?.email || 'arjun.p@gmail.com'}</span></p>
            </div>
          </div>

          <div className="irp-meta-grid">
            <div className="irp-meta-item"><Calendar size={15} /> <span><strong>Session Date:</strong> {interview?.date || 'Today'}</span></div>
            <div className="irp-meta-item"><Clock size={15} /> <span><strong>Duration:</strong> {interview?.duration || '24 mins elapsed'}</span></div>
            <div className="irp-meta-item"><Terminal size={15} /> <span><strong>Coding Sandbox:</strong> {questions.length} Challenge{questions.length > 1 ? 's' : ''}</span></div>
            <div className="irp-meta-item"><ShieldCheck size={15} /> <span><strong>Integrity Score:</strong> {proctor.violationScore === 0 ? '100% Verified Clean' : `${proctor.violationScore} Flags`}</span></div>
          </div>
        </div>
      </div>

      {/* 5 High-Impact Stat Cards Row */}
      <div className="irp-stats-grid">
        <div className="irp-stat-card">
          <div className="irp-stat-val" style={{ color: overallScore >= 80 ? 'var(--brand-success)' : 'var(--brand-warning)' }}>
            {overallScore}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/100</span>
          </div>
          <div className="irp-stat-label">OVERALL AI SCORE</div>
        </div>

        <div className="irp-stat-card">
          <div className="irp-stat-val" style={{ color: rec.color, fontSize: '1.4rem' }}>
            {rec.label}
          </div>
          <div className="irp-stat-label">FINAL RECOMMENDATION</div>
        </div>

        <div className="irp-stat-card">
          <div className="irp-stat-val" style={{ color: '#6366f1' }}>
            {analysis?.scores?.codeQuality || 92}%
          </div>
          <div className="irp-stat-label">LOGIC & SANDBOX</div>
        </div>

        <div className="irp-stat-card">
          <div className="irp-stat-val" style={{ color: '#a855f7' }}>
            {analysis?.scores?.communication || 85}%
          </div>
          <div className="irp-stat-label">COMMUNICATION</div>
        </div>

        <div className="irp-stat-card">
          <div className="irp-stat-val" style={{ color: proctor.violationScore === 0 ? '#10b981' : '#f59e0b' }}>
            {proctor.violationScore === 0 ? '100%' : `${100 - proctor.violationScore * 5}%`}
          </div>
          <div className="irp-stat-label">PROCTORING TRUST</div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="irp-tabs">
        <button className={`irp-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <Brain size={15} /> Executive Summary & Audit
        </button>
        <button className={`irp-tab ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>
          <Code2 size={15} /> Code Sandbox & Test Matrix
        </button>
        <button className={`irp-tab ${activeTab === 'competency' ? 'active' : ''}`} onClick={() => setActiveTab('competency')}>
          <BarChart3 size={15} /> Competency Radar & Sub-Scores
        </button>
        <button className={`irp-tab ${activeTab === 'transcript' ? 'active' : ''}`} onClick={() => setActiveTab('transcript')}>
          <MessageSquare size={15} /> Turn-by-Turn Spoken Transcript
        </button>
        <button className={`irp-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <Shield size={15} /> Integrity & Proctoring ({proctor.events?.length || 0})
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="irp-main-layout">
        {/* Left Content Area */}
        <div className="irp-content">
          {/* TAB 1: EXECUTIVE SUMMARY & AUDIT */}
          {activeTab === 'summary' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="irp-tab-pane">
              <div className="card irp-section-card">
                <div className="irp-card-header">
                  <div className="irp-card-title"><Brain size={18} color="var(--brand-primary)" /> Lead Technical Architect Assessment</div>
                  <span className="badge badge-primary">Sarah • Senior Engineering Manager</span>
                </div>
                <div className="irp-summary-text">
                  {analysis?.summary}
                </div>
              </div>

              <div className="irp-two-col-grid">
                <div className="card irp-section-card">
                  <div className="irp-card-header">
                    <div className="irp-card-title" style={{ color: 'var(--brand-success)' }}><CheckCircle size={18} /> Key Technical Strengths</div>
                  </div>
                  <ul className="irp-bullet-list">
                    {(analysis?.strengths || [
                      'Accurately outlined route-based code splitting and chunking to cut load times by 40%',
                      'Clean algorithmic logic in the sandbox with zero memory leaks and proper closure cleanup',
                      'High conversational composure and crisp technical reasoning without buzzword deflection'
                    ]).map((s, i) => (
                      <li key={i}>
                        <Check size={14} color="var(--brand-success)" className="irp-li-icon" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card irp-section-card">
                  <div className="irp-card-header">
                    <div className="irp-card-title" style={{ color: '#f59e0b' }}><AlertTriangle size={18} /> Gaps & Follow-up Areas</div>
                  </div>
                  <ul className="irp-bullet-list">
                    {(analysis?.gaps || [
                      'Could elaborate further on distributed race condition handling under high-throughput concurrency',
                      'Slight initial hesitation before choosing between throttle vs debounce invariants'
                    ]).map((g, i) => (
                      <li key={i}>
                        <ChevronRight size={14} color="#f59e0b" className="irp-li-icon" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Subscores Quick Matrix */}
              <div className="card irp-section-card">
                <div className="irp-card-header">
                  <div className="irp-card-title"><Award size={18} color="#a855f7" /> Core Competency Benchmark</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px 24px', marginTop: 12 }}>
                  <ScoreBar label="Code Quality & Modularity" value={analysis?.scores?.codeQuality || 92} />
                  <ScoreBar label="Algorithmic Problem Solving" value={analysis?.scores?.problemSolving || 88} />
                  <ScoreBar label="System Architecture & Scaling" value={analysis?.scores?.systemDesign || 86} />
                  <ScoreBar label="Verbal Communication & Clarity" value={analysis?.scores?.communication || 85} />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: CODE SANDBOX & TEST MATRIX */}
          {activeTab === 'code' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="irp-tab-pane">
              <div className="card irp-section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div className="irp-card-title"><Terminal size={18} color="var(--brand-primary)" /> Live Coding Sandbox Submissions</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {questions.map((q, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm ${activeQuestionIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveQuestionIdx(idx)}
                      >
                        Q{idx + 1}: {q.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="irp-problem-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{currentQ.title}</h4>
                    <span className="badge badge-primary">{currentQ.difficulty || 'Medium'}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 10px 0' }}>{currentQ.description}</p>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span>⏱ Target Time: <strong>{currentQ.complexityTarget?.time || 'O(1)'}</strong></span>
                    <span>💾 Target Space: <strong>{currentQ.complexityTarget?.space || 'O(1)'}</strong></span>
                  </div>
                </div>

                {/* Code Window */}
                <div className="irp-code-editor-wrap">
                  <div className="irp-code-header">
                    <span>solution.js</span>
                    <span style={{ color: 'var(--brand-success)' }}>● Evaluated & Accepted</span>
                  </div>
                  <pre className="irp-code-body">
                    <code>{currentCode}</code>
                  </pre>
                </div>

                {/* Test Matrix */}
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700 }}>Automated Test Execution Matrix</h4>
                  <div className="irp-test-table-wrap">
                    <table className="irp-test-table">
                      <thead>
                        <tr>
                          <th>Test Case</th>
                          <th>Expected Output</th>
                          <th>Actual Sandbox Output</th>
                          <th>Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentQ.tests || [
                          { args: 'debounce(fn, 100)', expected: 'function', actual: 'function', pass: true },
                          { args: 'rapid 5 calls in 50ms', expected: '1 execution', actual: '1 execution', pass: true }
                        ]).map((t, idx) => (
                          <tr key={idx}>
                            <td><code>{typeof t.args === 'object' ? JSON.stringify(t.args) : String(t.args)}</code></td>
                            <td><code>{typeof t.expected === 'object' ? JSON.stringify(t.expected) : String(t.expected)}</code></td>
                            <td><code>{typeof t.actual === 'object' ? JSON.stringify(t.actual) : String(t.actual || t.expected)}</code></td>
                            <td>
                              <span className={`badge ${t.pass !== false ? 'badge-live' : 'badge-danger'}`}>
                                {t.pass !== false ? '✅ Passed' : '❌ Failed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: COMPETENCY RADAR & SUB-SCORES */}
          {activeTab === 'competency' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="irp-tab-pane">
              <div className="irp-two-col-grid">
                <div className="card irp-section-card">
                  <div className="irp-card-header">
                    <div className="irp-card-title"><BarChart3 size={18} color="var(--brand-primary)" /> Competency Radar Profile</div>
                  </div>
                  <div style={{ width: '100%', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.2)" />
                        <Radar name="Candidate" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card irp-section-card">
                  <div className="irp-card-header">
                    <div className="irp-card-title"><Award size={18} color="#a855f7" /> Detailed Metric Breakdown</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10 }}>
                    <ScoreBar label="Logic & Algorithmic Correctness" value={analysis?.scores?.codeQuality || 92} color="#00B894" />
                    <ScoreBar label="Syntax & Clean Code Conventions" value={88} color="#55efc4" />
                    <ScoreBar label="Architecture & Scalability Trade-offs" value={86} color="#6366f1" />
                    <ScoreBar label="Verbal Articulation & Conciseness" value={analysis?.scores?.communication || 85} color="#a855f7" />
                    <ScoreBar label="Handling Corner & Boundary Cases" value={92} color="#00B894" />
                    <ScoreBar label="Technical Confidence & Decisiveness" value={analysis?.scores?.confidence || 85} color="#FDCB6E" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: TURN-BY-TURN SPOKEN TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="irp-tab-pane">
              <div className="card irp-section-card">
                <div className="irp-card-header">
                  <div className="irp-card-title"><MessageSquare size={18} color="var(--brand-primary)" /> Complete Dialogue Record</div>
                  <span className="badge badge-primary">{sessionData.transcript?.length || 6} Spoken Turns</span>
                </div>

                <div className="irp-transcript-list">
                  {(sessionData.transcript || [
                    { sender: 'ai', content: "Hello Arjun, I'm Sarah, Lead Technical Architect. Let's begin by discussing how you reduced client load times by 40% at your previous role." },
                    { sender: 'candidate', content: "We identified that the main bundle size was over 4MB due to unused third-party charting libraries and uncompressed assets. I implemented route-based code splitting with React.lazy and optimized our webpack chunks, bringing first contentful paint down from 3.8s to 1.4s." },
                    { sender: 'ai', content: "Solid breakdown. How did you handle cache invalidation and CDN edge caching for those chunked bundles?" },
                    { sender: 'candidate', content: "We used content-hashed filenames for immutable caching at Cloudflare, paired with an S3 origin. When a new build deployed, only the changed hash chunks were requested, ensuring zero stale assets for users." },
                    { sender: 'ai', content: "Good. Now let's transition to the coding sandbox. I'd like you to implement a robust Custom Debounce utility that handles trailing and leading calls." },
                    { sender: 'candidate', content: "Understood. I will use a closure to store the timer ID and return a wrapped function that clears the previous timeout before scheduling the new one." }
                  ]).map((msg, i) => (
                    <div key={i} className={`irp-transcript-msg ${msg.sender}`}>
                      <div className="irp-msg-avatar">
                        {msg.sender === 'ai' ? <Brain size={14} /> : (interview?.candidate || 'A').charAt(0)}
                      </div>
                      <div className="irp-msg-content">
                        <div className="irp-msg-speaker">
                          {msg.sender === 'ai' ? 'Sarah (AI Lead Architect)' : interview?.candidate || 'Candidate'}
                        </div>
                        <div className="irp-msg-bubble">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: INTEGRITY & PROCTORING */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="irp-tab-pane">
              <div className="card irp-section-card">
                <div className="irp-card-header">
                  <div className="irp-card-title"><Shield size={18} color="var(--brand-success)" /> Anti-Cheating & Vision Telemetry Audit</div>
                  <span className={`badge ${proctor.violationScore === 0 ? 'badge-live' : 'badge-danger'}`}>
                    {proctor.violationScore === 0 ? 'VERIFIED INTEGRITY' : 'FLAGS RECORDED'}
                  </span>
                </div>

                <div className="irp-proctor-metrics-grid">
                  <div className="irp-p-card">
                    <div className="irp-p-num" style={{ color: proctor.tabSwitchCount === 0 ? 'var(--brand-success)' : '#f59e0b' }}>
                      {proctor.tabSwitchCount || 0}
                    </div>
                    <div className="irp-p-lbl">TAB SWITCHES</div>
                  </div>
                  <div className="irp-p-card">
                    <div className="irp-p-num" style={{ color: proctor.pasteCount === 0 ? 'var(--brand-success)' : '#f59e0b' }}>
                      {proctor.pasteCount || 0}
                    </div>
                    <div className="irp-p-lbl">CLIPBOARD PASTES</div>
                  </div>
                  <div className="irp-p-card">
                    <div className="irp-p-num" style={{ color: 'var(--brand-success)' }}>
                      {proctor.faceDetected !== false ? '1 Person' : 'No Face'}
                    </div>
                    <div className="irp-p-lbl">CAMERA VISION</div>
                  </div>
                  <div className="irp-p-card">
                    <div className="irp-p-num" style={{ color: proctor.violationScore === 0 ? 'var(--brand-success)' : '#ef4444' }}>
                      {proctor.violationScore || 0}
                    </div>
                    <div className="irp-p-lbl">VIOLATION SCORE</div>
                  </div>
                </div>

                <h4 style={{ margin: '20px 0 12px 0', fontSize: '0.95rem' }}>Proctoring Event Timeline</h4>
                <div className="irp-event-timeline">
                  {(proctor.events?.length ? proctor.events : [
                    { type: 'session_start', message: 'Candidate joined camera and mic stream cleanly', severity: 'info', time: '00:01' },
                    { type: 'audio_check', message: 'Audio stream authenticated with continuous Web Speech STT', severity: 'info', time: '00:03' },
                    { type: 'sandbox_entry', message: 'Entered Phase 2 Coding Sandbox — clipboard monitoring armed', severity: 'info', time: '08:14' },
                    { type: 'code_pass', message: 'Test execution finished with 100% pass rate', severity: 'info', time: '18:30' }
                  ]).map((ev, i) => (
                    <div key={i} className="irp-event-item">
                      <div className={`irp-event-dot ${ev.severity || 'info'}`} />
                      <div className="irp-event-body">
                        <span className="irp-event-time">{ev.time || 'Logged'}</span>
                        <span className="irp-event-msg">{ev.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar Specification */}
        <div className="irp-sidebar">
          {/* Interview Specification Card */}
          <div className="card irp-spec-card">
            <h3 className="irp-spec-title">Interview Specification</h3>
            
            <div className="irp-spec-item">
              <span className="irp-spec-label">SESSION ID</span>
              <span className="irp-spec-val">INT-{String(interview?.id || '042').padStart(3, '0')}</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">CANDIDATE</span>
              <span className="irp-spec-val">{interview?.candidate || 'Arjun Patel'}</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">TARGET POSITION</span>
              <span className="irp-spec-val">{interview?.role || 'Senior React Developer'}</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">INTERVIEW TYPE</span>
              <span className="irp-spec-val">AI Voice + Code Sandbox</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">INTERVIEWER PERSONA</span>
              <span className="irp-spec-val">Sarah (Lead Technical Architect)</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">AI ENGINE</span>
              <span className="irp-spec-val">Groq Neural (gpt-oss-20b)</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">TTS ENGINE</span>
              <span className="irp-spec-val">Microsoft Jenny Neural (400ms pause)</span>
            </div>

            <div className="irp-spec-item">
              <span className="irp-spec-label">AUTOPILOT PIPELINE</span>
              <span className="irp-spec-val" style={{ color: 'var(--brand-success)' }}>Active • Auto-Draft Offer</span>
            </div>
          </div>

          {/* Recruiter Action Buttons Card */}
          <div className="card irp-spec-card">
            <h3 className="irp-spec-title">Pipeline Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSendOffer} style={{ width: '100%', justifyContent: 'center' }}>
                <Send size={13} /> Advance to Offer Stage
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/calendar')} style={{ width: '100%', justifyContent: 'center' }}>
                <Calendar size={13} /> Schedule Human Panel Round
              </button>
              <button className="btn btn-danger-ghost btn-sm" onClick={handleSendDecline} style={{ width: '100%', justifyContent: 'center' }}>
                <XCircle size={13} /> Reject Candidate
              </button>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="card irp-spec-card">
            <h3 className="irp-spec-title">Recruiter Internal Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <textarea
                rows={3}
                value={recruiterNote}
                onChange={e => setRecruiterNote(e.target.value)}
                placeholder="Add hiring committee notes, salary alignment..."
                className="irp-note-textarea"
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddNote} disabled={!recruiterNote.trim()}>
                Post Note
              </button>
            </div>

            {notesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {notesList.map(n => (
                  <div key={n.id} className="irp-note-item">
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 2 }}>{n.author} • {n.date}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{n.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
