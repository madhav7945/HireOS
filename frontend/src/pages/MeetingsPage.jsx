import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Video, Plus, Users, Calendar, ExternalLink, Phone, X,
  MonitorPlay, ShieldCheck, Award, Clock, Copy, Check,
  Search, Filter, Sparkles, User, Briefcase, Zap, Download,
  CalendarPlus, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useInterviews, useScheduleInterview, useCandidates } from '../hooks/useSupabase'
import StatCards from '../components/ui/StatCards'
import { avatarColor } from '../utils/avatar'
import './InterviewsPage.css'

function downloadICS(meeting) {
  const title = `HireOS Interview: ${meeting.candidate || 'Candidate'} (${meeting.role || 'Role'})`
  const desc = `Human-led video interview on HireOS. Room: ${window.location.origin}/meet/${meeting.meetingRoom || meeting.id}`
  const now = new Date()
  const start = meeting.date ? new Date(`${meeting.date}T${meeting.time || '10:00'}:00`) : new Date(now.getTime() + 3600000)
  const end = new Date(start.getTime() + 45 * 60000)

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HireOS//Video Meetings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${window.location.origin}/meet/${meeting.meetingRoom || meeting.id}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meeting-${meeting.candidate || 'interview'}.ics`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Calendar invite (.ics) downloaded!')
}

export default function MeetingsPage() {
  const navigate = useNavigate()
  const { data: interviews = [], isLoading } = useInterviews()
  const { data: candidates = [] } = useCandidates()
  const scheduleInterview = useScheduleInterview()

  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusTab, setStatusTab] = useState('all') // 'all' | 'scheduled' | 'completed'
  const [copiedId, setCopiedId] = useState(null)
  const [form, setForm] = useState({
    candidate: '',
    role: 'Senior React Developer',
    date: new Date().toISOString().split('T')[0],
    time: '15:00',
    participants: '',
    notes: ''
  })

  // Filter only human/manual video meetings
  const meetings = interviews
    .filter((i) => i.meetingRoom || i.mode === 'manual' || i.type === 'HR Interview' || i.type === 'Technical Panel')
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

  const filteredMeetings = meetings.filter((m) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = (m.candidate || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.meetingRoom || '').toLowerCase().includes(q)
    const matchesTab = statusTab === 'all' || (statusTab === 'scheduled' ? m.status !== 'completed' : m.status === 'completed')
    return matchesSearch && matchesTab
  })

  const link = (m) => `${window.location.origin}/meet/${m.meetingRoom || m.id}`

  const copyMeetingLink = (m) => {
    const url = link(m)
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(m.id)
      toast.success('Meeting link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const startInstantMeeting = () => {
    const instantRoomId = `meet-${Date.now().toString(36)}`
    toast.success('Launching Instant Google Meet Room...')
    navigate(`/meet/${instantRoomId}`)
  }

  const handleSelectCandidate = (candName) => {
    const cand = candidates.find(c => c.name === candName)
    if (cand) {
      setForm(prev => ({
        ...prev,
        candidate: cand.name,
        role: cand.appliedFor || cand.currentTitle || 'Interview',
        participants: cand.email || prev.participants
      }))
    } else {
      setForm(prev => ({ ...prev, candidate: candName }))
    }
  }

  const createMeeting = async () => {
    if (!form.candidate.trim()) {
      toast.error('Candidate name is required')
      return
    }
    const roomId = `meet-${Date.now().toString(36)}`
    const emails = form.participants.split(',').map((s) => s.trim()).filter(Boolean)

    try {
      await scheduleInterview.mutateAsync({
        candidate: form.candidate.trim(),
        email: emails[0] || '',
        role: form.role.trim() || 'Senior React Developer',
        type: 'HR Interview',
        mode: 'manual',
        status: 'scheduled',
        date: form.date || '',
        time: form.time || '',
        duration: '45 min',
        meetingRoom: roomId,
        participants: emails,
      })

      const url = `${window.location.origin}/meet/${roomId}`
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success('Video meeting created — link copied to clipboard!')
      setShowCreate(false)
      setForm({
        candidate: '',
        role: 'Senior React Developer',
        date: new Date().toISOString().split('T')[0],
        time: '15:00',
        participants: '',
        notes: ''
      })
    } catch (e) {
      toast.error(e?.message || 'Could not create the meeting')
    }
  }

  return (
    <div className="interviews-page">
      {/* Header Bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Video size={24} style={{ color: 'var(--color-primary)' }} /> Live Video Meetings (HR &amp; Panels)
          </h1>
          <p className="page-subtitle">
            Human-led Google Meet-style video calls with candidates &amp; hiring panels. Encrypted P2P WebRTC. No AI.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={startInstantMeeting}>
            <Zap size={16} color="#f59e0b" /> Start Instant Meeting
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Schedule Video Meeting
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <StatCards items={[
        { icon: Video, value: meetings.length, label: 'Total Meetings', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
        { icon: Calendar, value: meetings.filter((m) => m.status === 'scheduled').length, label: 'Upcoming Today', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
        { icon: Users, value: meetings.reduce((s, m) => s + (m.participants?.length || 1), 0), label: 'Active Panelists & Candidates', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      ]} />

      {/* Search & Tabs Filter Bar */}
      <div className="candidates-filters" style={{ margin: 'var(--space-4) 0', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="jobs-search-wrapper" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} className="jobs-search-icon" />
          <input
            type="text"
            className="jobs-search"
            placeholder="Search meetings by candidate, role, or room ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'scheduled', 'completed'].map((tab) => (
            <button
              key={tab}
              className={`btn btn-sm ${statusTab === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusTab(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'all' ? 'All Meetings' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Grid */}
      {filteredMeetings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <MonitorPlay size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: '1.2rem', fontWeight: 700 }}>No video meetings found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 460, margin: '0 auto 20px', fontSize: '0.9rem' }}>
            Start an instant meeting or schedule an HR panel interview with automated calendar invites.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Schedule Video Meeting
          </button>
        </motion.div>
      ) : (
        <div className="interviews-card-grid">
          {filteredMeetings.map((m, i) => (
            <motion.div
              key={m.id}
              className="interview-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ background: 'var(--surface-card, #12141a)', border: '1px solid var(--border-default, #2a2e3d)', borderRadius: 16, padding: 22 }}
            >
              <div className="interview-card-header" style={{ marginBottom: 14 }}>
                <div className="interview-card-candidate">
                  <div className="interview-card-avatar" style={{ background: avatarColor(m.candidate || m.id) }}>
                    {(m.candidate || 'C').charAt(0)}
                  </div>
                  <div>
                    <div className="interview-card-name" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                      {m.candidate || 'Candidate'}
                    </div>
                    <div className="interview-card-role" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {m.role || 'Senior React Developer'}
                    </div>
                  </div>
                </div>
                <span className="badge badge-live" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={11} /> Human Panel
                </span>
              </div>

              <div className="interview-card-meta" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} /> Schedule:
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {[m.date, m.time].filter(Boolean).join(' at ') || 'Today, 3:00 PM'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} /> Panelists:
                  </span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    {m.participants?.length ? `${m.participants.length} invited` : 'Open meeting link'}
                  </span>
                </div>
              </div>

              <div className="interview-card-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => copyMeetingLink(m)}
                  title="Copy Invite Link"
                >
                  {copiedId === m.id ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  {copiedId === m.id ? 'Copied' : 'Copy'}
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => downloadICS(m)}
                  title="Add to Google/Outlook Calendar"
                >
                  <CalendarPlus size={14} /> Calendar
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1.4, justifyContent: 'center', fontWeight: 700 }}
                  onClick={() => navigate(`/meet/${m.meetingRoom || m.id}`)}
                >
                  <Video size={14} /> Join Call →
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <motion.div
              className="modal-container"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
            >
              <div className="modal-header">
                <h2><Video size={18} /> Schedule Live Video Meeting</h2>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCreate(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  Create an encrypted WebRTC video room for HR &amp; panel discussions. Automated calendar invite and invite link will be generated.
                </p>

                <div className="form-group">
                  <label className="form-label">Candidate Name *</label>
                  <input
                    type="text"
                    list="candidates-list"
                    value={form.candidate}
                    onChange={(e) => handleSelectCandidate(e.target.value)}
                    placeholder="Type candidate name or pick from directory..."
                  />
                  <datalist id="candidates-list">
                    {candidates.map((c) => (
                      <option key={c.id} value={c.name}>{c.appliedFor} ({c.currentCompany || 'Candidate'})</option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Opening / Role</label>
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Senior React Developer"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Invited Emails (comma separated)</label>
                  <input
                    type="text"
                    value={form.participants}
                    onChange={(e) => setForm({ ...form, participants: e.target.value })}
                    placeholder="candidate@gmail.com, lead.architect@company.com"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createMeeting}
                  disabled={!form.candidate.trim()}
                >
                  <Video size={14} /> Create Video Meeting &amp; Copy Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
