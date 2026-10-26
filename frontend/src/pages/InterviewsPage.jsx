import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Video, Calendar, Clock, User, Play, CheckCircle, AlertCircle,
  Send, Search, Filter, LayoutGrid, LayoutList, ChevronDown,
  ExternalLink, Eye, MoreHorizontal, Zap, Brain, Sparkles, Plus, Trash2
} from 'lucide-react'
import Skeleton from '../components/ui/Skeleton'
import { useInterviews, useScheduleInterview, useJobs, useCandidates } from '../hooks/useSupabase'
import { isSignedIn, createGoogleEvent } from '../services/googleCalendar'
import { useColumnChooser } from '../hooks/useColumnChooser'
import ColumnChooser from '../components/ui/ColumnChooser'
import StatCards from '../components/ui/StatCards'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './InterviewsPage.css'

const MOCK_INTERVIEWS = [
  { id: 1, candidate: 'Arjun Patel', email: 'arjun.p@gmail.com', role: 'Senior React Developer', type: 'AI Interview', status: 'live', score: null, date: 'Now', time: 'Live', duration: '12 min', scores: null, session_id: 'mock-live-1' },
  { id: 2, candidate: 'Priya Sharma', email: 'priya.s@outlook.com', role: 'Product Designer', type: 'AI Interview', status: 'complete', score: 88, date: 'Jun 2, 2026', time: '2:30 PM', duration: '24 min', scores: { code: 0, comm: 92, problem: 85, confidence: 88 }, session_id: 'mock-rep-2' },
  { id: 3, candidate: 'Neha Gupta', email: 'neha.g@yahoo.com', role: 'Data Scientist', type: 'AI Interview', status: 'scheduled', score: null, date: 'Jun 16, 2026', time: '11:00 AM', duration: '30 min', scores: null, session_id: 'mock-sch-3' },
  { id: 4, candidate: 'Siddharth Joshi', email: 'sid.j@gmail.com', role: 'Mobile Developer', type: 'AI Interview', status: 'complete', score: 90, date: 'Jun 12, 2026', time: '9:00 AM', duration: '26 min', scores: { code: 92, comm: 82, problem: 88, confidence: 85 }, session_id: 'mock-rep-4' },
  { id: 5, candidate: 'Ananya Iyer', email: 'ananya.i@proton.me', role: 'DevOps Engineer', type: 'AI Interview', status: 'pending', score: null, date: 'Jun 18, 2026', time: '3:00 PM', duration: '30 min', scores: null, session_id: 'mock-pen-5' },
  { id: 6, candidate: 'Ravi Kumar', email: 'ravi.k@gmail.com', role: 'Senior React Developer', type: 'AI Interview', status: 'scheduled', score: null, date: 'Jun 20, 2026', time: '4:00 PM', duration: '45 min', scores: null, session_id: 'mock-sch-6' },
  { id: 7, candidate: 'Meera Nair', email: 'meera.n@gmail.com', role: 'Backend Engineer', type: 'AI Interview', status: 'complete', score: 85, date: 'Jun 1, 2026', time: '1:00 PM', duration: '32 min', scores: { code: 90, comm: 72, problem: 88, confidence: 80 }, session_id: 'mock-rep-7' },
  { id: 8, candidate: 'Vikram Singh', email: 'vikram.s@outlook.com', role: 'QA Lead', type: 'AI Interview', status: 'complete', score: 78, date: 'May 30, 2026', time: '11:30 AM', duration: '40 min', scores: { code: 0, comm: 85, problem: 75, confidence: 72 }, session_id: 'mock-rep-8' },
]

function getScoreColor(score) {
  if (score >= 85) return 'var(--brand-success)'
  if (score >= 70) return 'var(--brand-warning)'
  return 'var(--brand-danger)'
}

function getStatusConfig(status) {
  const map = {
    live: { badge: 'badge-live', icon: <Video size={14} />, label: 'Live Now', color: '#ff4757' },
    complete: { badge: 'badge-live', icon: <CheckCircle size={14} />, label: 'Completed', color: 'var(--brand-success)' },
    scheduled: { badge: 'badge-scheduled', icon: <Calendar size={14} />, label: 'Scheduled', color: 'var(--brand-info)' },
    pending: { badge: 'badge-paused', icon: <Clock size={14} />, label: 'Pending', color: 'var(--brand-warning)' },
  }
  return map[status] || map.pending
}

const INTERVIEW_COLUMNS = [
  { key: 'candidate', label: 'Candidate', required: true, render: (iv) => (
    <div className="interview-candidate-cell">
      <div className="interview-avatar" style={{ background: avatarColor(iv.candidate || iv.id) }}>{iv.candidate.charAt(0)}</div>
      <div className="interview-candidate-info">
        <span className="interview-candidate-name">{iv.candidate}</span>
        <span className="interview-candidate-email">{iv.email}</span>
      </div>
    </div>
  ) },
  { key: 'role', label: 'Position', render: (iv) => <span style={{ color: 'var(--text-secondary)' }}>{iv.role}</span> },
  { key: 'type', label: 'Type', render: (iv) => <span className={`badge ${iv.type === 'AI Interview' ? 'badge-accent' : 'badge-primary'}`}>{iv.type === 'AI Interview' && <Zap size={10} />}{iv.type || 'AI Interview'}</span> },
  { key: 'status', label: 'Status', render: (iv) => { const cfg = getStatusConfig(iv.status); return <span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span> } },
  { key: 'score', label: 'AI Score', render: (iv) => iv.score ? (
    <div>
      <span className="interview-score" style={{ color: getScoreColor(iv.score) }}>{iv.score}</span>
      <div className="interview-score-bar"><div className="interview-score-fill" style={{ width: `${iv.score}%`, background: getScoreColor(iv.score) }} /></div>
    </div>
  ) : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
  { key: 'date', label: 'Date', render: (iv) => <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>{iv.date}<br />{iv.time}</span> },
  { key: 'duration', label: 'Duration', render: (iv) => <span style={{ color: 'var(--text-tertiary)' }}>{iv.duration || '30 min'}</span> },
]

export default function InterviewsPage() {
  const navigate = useNavigate()
  const { data: rawInterviews = [], isLoading } = useInterviews()
  const { data: jobs = [] } = useJobs()
  const { data: candidates = [] } = useCandidates()
  const scheduleInterview = useScheduleInterview()

  // Real-time synced interviews list
  const INTERVIEWS = rawInterviews.length > 0 ? rawInterviews : MOCK_INTERVIEWS

  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reportInterview, setReportInterview] = useState(null)
  
  // AI Interview Creation / Scheduling Modal State
  const [showScheduleAI, setShowScheduleAI] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    candidate: '',
    email: '',
    role: '',
    jobId: '',
    assessmentType: 'AI Technical Screening',
    status: 'scheduled',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00',
    duration: '30 min',
    duration_minutes: 30,
    skills: 'React, Algorithms, System Architecture',
    autoProctor: true,
  })

  const { visible: visibleColumns, toggle: toggleColumn, activeColumns } = useColumnChooser('hireos_interview_columns', INTERVIEW_COLUMNS)

  // Handle Candidate Selection from pre-existing list
  const handleSelectExistingCandidate = (candidateId) => {
    const cand = candidates.find(c => String(c.id) === String(candidateId) || String(c.candidateId) === String(candidateId))
    if (cand) {
      setScheduleForm(prev => ({
        ...prev,
        candidate: cand.name || cand.full_name || '',
        email: cand.email || '',
        role: cand.appliedFor || cand.currentTitle || prev.role,
        jobId: cand.jobId || prev.jobId,
        skills: Array.isArray(cand.skills) ? cand.skills.join(', ') : prev.skills
      }))
    }
  }

  // Handle Job Selection from pre-existing jobs
  const handleSelectJob = (jobId) => {
    const job = jobs.find(j => String(j.id) === String(jobId) || String(j.jobId) === String(jobId))
    if (job) {
      setScheduleForm(prev => ({
        ...prev,
        jobId: job.id,
        role: job.title || prev.role,
        skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || prev.skills)
      }))
    }
  }

  // Create an AI Interview (Instant Live or Scheduled)
  const handleCreateAIInterview = async () => {
    if (!scheduleForm.candidate.trim()) {
      toast.error('Candidate name is required')
      return
    }
    if (!scheduleForm.email.trim()) {
      toast.error('Candidate email is required')
      return
    }

    try {
      const sessionId = `int-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const isLive = scheduleForm.status === 'live'
      const formattedDate = isLive ? 'Now' : scheduleForm.date ? new Date(scheduleForm.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Tomorrow'
      const formattedTime = isLive ? 'Live' : scheduleForm.time || '10:00 AM'

      const interviewData = {
        candidate: scheduleForm.candidate.trim(),
        email: scheduleForm.email.trim(),
        role: scheduleForm.role.trim() || 'Software Engineer',
        job_id: scheduleForm.jobId || null,
        type: 'AI Interview',
        assessment_type: scheduleForm.assessmentType,
        status: scheduleForm.status || 'scheduled',
        date: formattedDate,
        time: formattedTime,
        duration: scheduleForm.duration || `${scheduleForm.duration_minutes || 30} min`,
        duration_minutes: scheduleForm.duration_minutes || 30,
        skills: scheduleForm.skills ? scheduleForm.skills.split(',').map(s => s.trim()).filter(Boolean) : ['Problem Solving'],
        session_id: sessionId,
      }

      const created = await scheduleInterview.mutateAsync(interviewData)
      const link = `${window.location.origin}/interview/${sessionId}`
      await navigator.clipboard.writeText(link).catch(() => {})

      let gcalMsg = ''
      if (isSignedIn() && !isLive && scheduleForm.date) {
        try {
          const start = new Date(`${scheduleForm.date}T${scheduleForm.time || '10:00'}:00`)
          const end = new Date(start.getTime() + (scheduleForm.duration_minutes || 30) * 60000)
          await createGoogleEvent({
            title: `HireOS AI Interview: ${interviewData.candidate} - ${interviewData.role}`,
            description: `Candidate Join Link: ${link}\nSession ID: ${sessionId}\nAssessment: ${scheduleForm.assessmentType}`,
            start,
            end,
            attendees: [interviewData.email],
          })
          gcalMsg = ' & added to Google Calendar'
        } catch (e) {
          console.warn('Google Calendar sync notice:', e)
        }
      }

      toast.success(`AI Interview created! Link copied to clipboard${gcalMsg}`)

      // Simulate sending candidate schedule email
      import('../services/email').then(m => {
        const when = isLive ? 'Immediately' : `${formattedDate} at ${formattedTime}`
        m.emailService.sendInterviewScheduled(interviewData.email, interviewData.candidate, when)
        m.emailService.sendInterviewLink(interviewData.email, interviewData.candidate, link)
      }).catch(err => console.warn('Email simulation notice:', err))

      setShowScheduleAI(false)
      setScheduleForm({
        candidate: '',
        email: '',
        role: '',
        jobId: '',
        assessmentType: 'AI Technical Screening',
        status: 'scheduled',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '10:00',
        duration: '30 min',
        duration_minutes: 30,
        skills: 'React, Algorithms, System Architecture',
        autoProctor: true,
      })

      if (isLive) {
        navigate(`/hr-observe/${created?.id || sessionId}`)
      }
    } catch (err) {
      toast.error(err?.message || 'Could not schedule AI interview')
    }
  }

  const filtered = INTERVIEWS.filter(i => {
    const matchSearch = i.candidate.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: INTERVIEWS.length,
    live: INTERVIEWS.filter(i => i.status === 'live').length,
    completed: INTERVIEWS.filter(i => i.status === 'complete').length,
    scheduled: INTERVIEWS.filter(i => i.status === 'scheduled').length,
    pending: INTERVIEWS.filter(i => i.status === 'pending').length,
  }

  const handleSendInterview = async () => {
    try {
      const interview = await scheduleInterview.mutateAsync({
        candidate: 'New Candidate',
        email: 'candidate@example.com',
        role: 'AI Screening Interview',
        type: 'AI Interview',
        status: 'scheduled',
        duration_minutes: 30,
      })
      const sessionId = interview.session_id || interview.sessionId || interview.id
      const link = `${window.location.origin}/interview/${sessionId}`
      await navigator.clipboard.writeText(link)
      
      let gcalMsg = ''
      if (isSignedIn()) {
        try {
          const start = new Date()
          start.setDate(start.getDate() + 1) // schedule for tomorrow
          const end = new Date(start.getTime() + 30 * 60000)
          await createGoogleEvent({
            title: `HireOS AI Interview: ${interview.candidate || 'New Candidate'} - ${interview.role || 'Screening'}`,
            description: `Interview link: ${link}\nSession ID: ${sessionId}`,
            start,
            end,
            attendees: ['candidate@example.com'],
          })
          gcalMsg = ' and added to Google Calendar'
        } catch (e) {
          console.warn('Google Calendar error:', e)
        }
      }
      
      toast.success(`AI interview created, link copied${gcalMsg}`)

      // --- EMAIL SIMULATION ---
      import('../services/ai').then(m => {
        // Immediate schedule email
        m.emailService.sendInterviewScheduled(interview.email, interview.candidate, 'Tomorrow at 10:00 AM')
        
        // Simulate 10-min warning (using 3s for demo)
        setTimeout(() => {
          m.emailService.sendInterviewReminder(interview.email, interview.candidate)
        }, 3000)

        // Simulate meeting room link (using 6s for demo)
        setTimeout(() => {
          m.emailService.sendInterviewLink(interview.email, interview.candidate, link)
        }, 6000)
      })

    } catch (error) {
      toast.error(error?.message || 'Unable to create interview')
    }
  }

  if (isLoading) {
    return <Skeleton.Page type="table" />
  }

  return (
    <div className="interviews-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interviews</h1>
          <p className="page-subtitle">Manage AI-powered interviews, real-time evaluations, and candidate scorecards</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ai-interview-room')}>
            <Brain size={16} /> Start Live Room
          </button>
          <button className="btn btn-primary" onClick={() => setShowScheduleAI(true)}>
            <Sparkles size={16} /> Schedule AI Interview
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatCards items={[
        { icon: Video, value: stats.total, label: 'Total Interviews', color: '#6C5CE7', bg: 'rgba(108, 92, 231, 0.12)' },
        { icon: Video, value: stats.live, label: 'Live Now', color: '#ff4757', bg: 'rgba(255, 71, 87, 0.12)' },
        { icon: CheckCircle, value: stats.completed, label: 'Completed', color: '#00B894', bg: 'rgba(0, 184, 148, 0.12)' },
        { icon: Calendar, value: stats.scheduled, label: 'Scheduled', color: '#74B9FF', bg: 'rgba(116, 185, 255, 0.12)' },
        { icon: AlertCircle, value: stats.pending, label: 'Pending Review', color: '#FDCB6E', bg: 'rgba(253, 203, 110, 0.12)' },
      ]} />

      {/* Toolbar */}
      <div className="interviews-toolbar">
        <div className="interviews-toolbar-left">
          <div className="search-wrapper">
            <Search size={14} />
            <input
              className="interviews-search"
              placeholder="Search candidates or roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="interviews-search"
            style={{ width: 160, paddingLeft: 'var(--space-3)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="live">Live Now</option>
            <option value="complete">Completed</option>
            <option value="scheduled">Scheduled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="interviews-toolbar-right">
          <div className="view-toggle">
            <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>
              <LayoutList size={16} />
            </button>
            <button className={`view-toggle-btn ${view === 'card' ? 'active' : ''}`} onClick={() => setView('card')}>
              <LayoutGrid size={16} />
            </button>
          </div>
          <ColumnChooser allColumns={INTERVIEW_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Table View */}
      {view === 'table' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="table-container">
          <table>
            <thead>
              <tr>
                {activeColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((interview, i) => {
                const sessionId = interview.session_id || interview.sessionId || interview.id
                return (
                  <motion.tr
                    key={interview.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {activeColumns.map(col => (
                      <td key={col.key}>{col.render(interview)}</td>
                    ))}
                    <td>
                      <div className="interview-actions">
                        {interview.status === 'live' && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ background: 'rgba(255,71,87,0.15)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.3)' }}
                              onClick={() => navigate(`/hr-observe/${sessionId}`)}
                            >
                              <Eye size={14} /> Observe
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/interview/${sessionId}`)
                                toast.success('Candidate interview link copied!')
                              }}
                            >
                              <ExternalLink size={14} /> Copy Link
                            </button>
                          </>
                        )}
                        {interview.status === 'complete' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/interviews/${sessionId}/report`)}>
                              <Play size={14} /> Full Report
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setReportInterview(interview)}>
                              <Brain size={14} /> Summary
                            </button>
                          </>
                        )}
                        {interview.status === 'scheduled' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/interview/${sessionId}`)
                                toast.success('Candidate interview link copied!')
                              }}
                            >
                              <ExternalLink size={14} /> Copy Link
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/hr-observe/${sessionId}`)}
                            >
                              <Eye size={14} /> Join as HR
                            </button>
                          </>
                        )}
                        {interview.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/interview/${sessionId}`)
                                toast.success('Interview link copied!')
                              }}
                            >
                              <ExternalLink size={14} /> Copy Link
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/interview/${sessionId}`)}
                            >
                              <Brain size={14} /> Launch
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Card View */}
      {view === 'card' && (
        <div className="interviews-card-grid">
          {filtered.map((interview, i) => {
            const statusCfg = getStatusConfig(interview.status)
            const sessionId = interview.session_id || interview.sessionId || interview.id
            return (
              <motion.div
                key={interview.id || i}
                className="interview-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="interview-card-header">
                  <div className="interview-card-candidate">
                    <div className="interview-card-avatar" style={{ background: avatarColor(interview.candidate || interview.id) }}>
                      {(interview.candidate || 'C').charAt(0)}
                    </div>
                    <div>
                      <div className="interview-card-name">{interview.candidate}</div>
                      <div className="interview-card-role">{interview.role}</div>
                    </div>
                  </div>
                  <span className={`badge ${statusCfg.badge}`}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>

                <div className="interview-card-meta">
                  <div className="interview-card-row">
                    <span className="interview-card-label"><Calendar size={13} /> Date</span>
                    <span>{interview.date} · {interview.time}</span>
                  </div>
                  <div className="interview-card-row">
                    <span className="interview-card-label"><Clock size={13} /> Duration</span>
                    <span>{interview.duration || '30 min'}</span>
                  </div>
                  <div className="interview-card-row">
                    <span className="interview-card-label">
                      <Zap size={13} /> Type
                    </span>
                    <span className="badge badge-accent">
                      {interview.type || 'AI Interview'}
                    </span>
                  </div>
                </div>

                {interview.scores && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    {[
                      { label: 'Code', value: interview.scores.code, color: '#6C5CE7' },
                      { label: 'Comm', value: interview.scores.comm, color: '#00D2FF' },
                      { label: 'Logic', value: interview.scores.problem, color: '#00B894' },
                      { label: 'Conf', value: interview.scores.confidence, color: '#FDCB6E' },
                    ].filter(s => s.value > 0).map(s => (
                      <div key={s.label} className="interview-card-score">
                        <span className="interview-card-score-label">{s.label}</span>
                        <div className="interview-card-score-track">
                          <div
                            className="interview-card-score-fill"
                            style={{ width: `${s.value}%`, background: s.color }}
                          />
                        </div>
                        <span className="interview-card-score-value" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="interview-card-footer">
                  {interview.score ? (
                    <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', color: getScoreColor(interview.score) }}>
                      {interview.score}/100
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>No score yet</span>
                  )}
                  {interview.status === 'live' && (
                    <button className="btn btn-primary btn-sm" style={{ background: 'rgba(255,71,87,0.15)', color: '#ff4757', border: '1px solid rgba(255,71,87,0.3)' }} onClick={() => navigate(`/hr-observe/${sessionId}`)}>
                      <Eye size={14} /> Observe Live
                    </button>
                  )}
                  {interview.status === 'complete' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/interviews/${sessionId}/report`)}>
                      <Play size={14} /> View Report
                    </button>
                  )}
                  {interview.status === 'scheduled' && (
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/hr-observe/${sessionId}`)}>
                      <Eye size={14} /> Join as HR
                    </button>
                  )}
                  {interview.status === 'pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/interview/${sessionId}`)}>
                      <Brain size={14} /> Launch
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Schedule AI Interview Modal */}
      <AnimatePresence>
        {showScheduleAI && (
          <div className="iv-modal-overlay" onClick={() => setShowScheduleAI(false)}>
            <motion.div
              className="iv-modal"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
            >
              <div className="iv-modal-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} /> Schedule AI Interview Session
                </span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowScheduleAI(false)}>✕</button>
              </div>
              <div className="iv-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  Configure an AI-conducted assessment with live technical evaluation, audio dialogue, and automated scoring.
                </p>

                {/* Candidate Selection */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Candidate *</label>
                    {candidates.length > 0 && (
                      <select
                        style={{ fontSize: '0.75rem', padding: '2px 8px', width: 'auto', height: 26 }}
                        onChange={(e) => handleSelectExistingCandidate(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Select existing candidate...</option>
                        {candidates.map(c => (
                          <option key={c.id || c.candidateId} value={c.id || c.candidateId}>
                            {c.name || c.full_name} ({c.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    value={scheduleForm.candidate}
                    onChange={(e) => setScheduleForm(f => ({ ...f, candidate: e.target.value }))}
                    placeholder="e.g. Arjun Patel"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Candidate Email *</label>
                  <input
                    type="email"
                    value={scheduleForm.email}
                    onChange={(e) => setScheduleForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. arjun.p@gmail.com"
                  />
                </div>

                {/* Role / Job Selection */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Target Position / Role *</label>
                    {jobs.length > 0 && (
                      <select
                        style={{ fontSize: '0.75rem', padding: '2px 8px', width: 'auto', height: 26 }}
                        onChange={(e) => handleSelectJob(e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Select open position...</option>
                        {jobs.map(j => (
                          <option key={j.id || j.jobId} value={j.id || j.jobId}>
                            {j.title} ({j.department})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    value={scheduleForm.role}
                    onChange={(e) => setScheduleForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>

                {/* Assessment Type & Timing */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Assessment Focus</label>
                    <select
                      value={scheduleForm.assessmentType}
                      onChange={(e) => setScheduleForm(f => ({ ...f, assessmentType: e.target.value }))}
                    >
                      <option>AI Technical Screening</option>
                      <option>Live Coding &amp; Algorithms</option>
                      <option>System Design &amp; Architecture</option>
                      <option>Behavioral &amp; Leadership Fit</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <select
                      value={scheduleForm.duration_minutes}
                      onChange={(e) => {
                        const mins = parseInt(e.target.value) || 30
                        setScheduleForm(f => ({ ...f, duration_minutes: mins, duration: `${mins} min` }))
                      }}
                    >
                      <option value={15}>15 minutes (Express)</option>
                      <option value={30}>30 minutes (Standard)</option>
                      <option value={45}>45 minutes (In-depth)</option>
                      <option value={60}>60 minutes (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time / Live Now Toggle */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Timing &amp; Availability</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className={`btn btn-xs ${scheduleForm.status === 'scheduled' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setScheduleForm(f => ({ ...f, status: 'scheduled' }))}
                      >
                        <Calendar size={12} /> Scheduled
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs ${scheduleForm.status === 'live' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setScheduleForm(f => ({ ...f, status: 'live' }))}
                      >
                        <Video size={12} /> Start Live Now
                      </button>
                    </div>
                  </div>

                  {scheduleForm.status === 'scheduled' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          value={scheduleForm.date}
                          onChange={(e) => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time</label>
                        <input
                          type="time"
                          value={scheduleForm.time}
                          onChange={(e) => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: 'var(--brand-success)', margin: 0 }}>
                      ⚡ Instant Session: A live candidate room will be provisioned immediately upon creation.
                    </p>
                  )}
                </div>

                {/* Skills focus */}
                <div className="form-group">
                  <label className="form-label">Core Skills / Topics to Probe</label>
                  <input
                    value={scheduleForm.skills}
                    onChange={(e) => setScheduleForm(f => ({ ...f, skills: e.target.value }))}
                    placeholder="e.g. React, TypeScript, System Architecture, Algorithms"
                  />
                </div>
              </div>
              <div className="iv-modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowScheduleAI(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateAIInterview}
                  disabled={scheduleInterview.isPending || !scheduleForm.candidate.trim() || !scheduleForm.email.trim()}
                >
                  <Sparkles size={14} /> {scheduleInterview.isPending ? 'Scheduling...' : scheduleForm.status === 'live' ? 'Create & Launch Now' : 'Schedule & Copy Link'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interview Report Modal */}
      <AnimatePresence>
        {reportInterview && (
          <div className="iv-modal-overlay" onClick={() => setReportInterview(null)}>
            <motion.div
              className="iv-modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
            >
              <div className="iv-modal-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={16} /> AI Interview Report
                </span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setReportInterview(null)}>✕</button>
              </div>
              <div className="iv-modal-body">
                <div className="iv-report-head">
                  <div className="iv-report-avatar" style={{ background: avatarColor(reportInterview.candidate || reportInterview.id || 1) }}>
                    {reportInterview.candidate.charAt(0)}
                  </div>
                  <div>
                    <div className="iv-report-name">{reportInterview.candidate}</div>
                    <div className="iv-report-role">{reportInterview.role} · {reportInterview.type}</div>
                    <div className="iv-report-meta">{reportInterview.date} · {reportInterview.time} · {reportInterview.duration}</div>
                  </div>
                  {reportInterview.score != null && (
                    <div className="iv-report-overall" style={{ color: getScoreColor(reportInterview.score) }}>
                      <span className="iv-report-overall-num">{reportInterview.score}</span>
                      <span className="iv-report-overall-label">Overall</span>
                    </div>
                  )}
                </div>

                <div className="iv-report-scores">
                  {[
                    { key: 'code', label: 'Code Quality' },
                    { key: 'comm', label: 'Communication' },
                    { key: 'problem', label: 'Problem Solving' },
                    { key: 'confidence', label: 'Confidence' },
                  ].map(({ key, label }) => {
                    const val = reportInterview.scores?.[key] ?? 0
                    return (
                      <div key={key} className="iv-report-score-row">
                        <span className="iv-report-score-label">{label}</span>
                        <div className="iv-report-bar"><div className="iv-report-bar-fill" style={{ width: `${val}%`, background: getScoreColor(val) }} /></div>
                        <span className="iv-report-score-val">{val}%</span>
                      </div>
                    )
                  })}
                </div>

                <div className="iv-report-summary">
                  <h4>AI Summary</h4>
                  <p>
                    {reportInterview.candidate.split(' ')[0]} demonstrated {reportInterview.score >= 85 ? 'strong' : reportInterview.score >= 70 ? 'solid' : 'developing'} performance
                    across the assessment for the {reportInterview.role} role. {reportInterview.scores?.comm >= 85 ? 'Communication was a clear strength. ' : ''}
                    {reportInterview.scores?.code >= 85 ? 'Coding fundamentals were excellent. ' : reportInterview.scores?.code === 0 ? 'No coding round was conducted for this interview. ' : ''}
                    Recommendation: <strong>{reportInterview.score >= 85 ? 'Strong Hire' : reportInterview.score >= 70 ? 'Hire' : 'Further Review'}</strong>.
                  </p>
                </div>
              </div>
              <div className="iv-modal-footer">
                <button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/interview/${reportInterview.session_id || reportInterview.id}`); toast.success('Interview link copied!') }}>
                  <ExternalLink size={14} /> Copy Link
                </button>
                <button className="btn btn-primary" onClick={() => setReportInterview(null)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
