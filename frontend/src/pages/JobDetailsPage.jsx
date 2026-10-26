import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Building, MapPin, Briefcase, Users, Calendar, DollarSign,
  Copy, Check, ExternalLink, Trash2, Edit3, Edit2, Plus, MessageSquare, Share2, ShieldCheck,
  Bot, Globe, FileText, CheckCircle2, ChevronRight, Sparkles, Filter,
  Clock, Award, Layers, AlertCircle, ArrowUpRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useJob, useDeleteJob, useUpdateJob, useApplications } from '../hooks/useSupabase'
import Skeleton from '../components/ui/Skeleton'
import './JobDetailsPage.css'

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedLink, setCopiedLink] = useState(false)

  const { data: job, isLoading, error } = useJob(jobId)
  const deleteJob = useDeleteJob()
  const updateJob = useUpdateJob()
  const { data: allApplications = [] } = useApplications()

  const [noteText, setNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  if (isLoading) {
    return (
      <div className="job-details-page">
        <Skeleton.Page type="detail" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="job-details-page">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 16px' }} />
          <h2>Job Opening Not Found</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>The job posting you are looking for does not exist or has been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
            <ArrowLeft size={16} /> Back to Job Openings
          </button>
        </div>
      </div>
    )
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicApplyUrl = `${origin}/apply/${job.id || job.jobId}`

  // Candidates who applied for this specific job
  const jobApplications = allApplications.filter(
    (app) => app.jobId === job.id || app.postingTitle === job.title
  )

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicApplyUrl)
    setCopiedLink(true)
    toast.success('Public candidate apply link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the job opening "${job.title}"? This action cannot be undone.`)) {
      try {
        await deleteJob.mutateAsync(job.id)
        toast.success('Job opening deleted successfully')
        navigate('/jobs')
      } catch (err) {
        toast.error('Failed to delete job opening')
      }
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateJob.mutateAsync({ id: job.id, updates: { status: newStatus } })
      toast.success(`Job status changed to ${newStatus.toUpperCase()}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleAddJobNote = async () => {
    if (!noteText.trim() || !job) return
    const newNote = {
      id: Date.now(),
      text: noteText.trim(),
      author: 'Sarah Chen',
      date: new Date().toISOString(),
    }
    const updatedNotes = [newNote, ...(job.notes || [])]
    try {
      await updateJob.mutateAsync({ id: job.id, updates: { notes: updatedNotes } })
      setNoteText('')
      toast.success('Internal note added')
    } catch (err) {
      toast.error('Failed to add note')
    }
  }

  const handleEditJobNote = async (noteId) => {
    if (!editingNoteText.trim() || !job) return
    const updatedNotes = (job.notes || []).map((n, idx) => {
      const id = n.id || idx
      if (id === noteId) {
        return { ...n, text: editingNoteText.trim(), editedAt: new Date().toISOString() }
      }
      return n
    })
    try {
      await updateJob.mutateAsync({ id: job.id, updates: { notes: updatedNotes } })
      setEditingNoteId(null)
      setEditingNoteText('')
      toast.success('Note updated')
    } catch (err) {
      toast.error('Failed to update note')
    }
  }

  const handleDeleteJobNote = async (noteId) => {
    if (!job) return
    const updatedNotes = (job.notes || []).filter((n, idx) => (n.id || idx) !== noteId)
    try {
      await updateJob.mutateAsync({ id: job.id, updates: { notes: updatedNotes } })
      toast.success('Note deleted')
    } catch (err) {
      toast.error('Failed to delete note')
    }
  }

  const formatSalary = () => {
    if (job.salary && (job.salary.min || job.salary.max)) {
      const min = job.salary.min ? `₹${(job.salary.min / 100000).toFixed(1)}L` : ''
      const max = job.salary.max ? `₹${(job.salary.max / 100000).toFixed(1)}L` : ''
      return `${min} ${min && max ? '–' : ''} ${max} / ${job.salary.period || 'year'}`
    }
    if (job.salaryMin || job.salaryMax) {
      const min = job.salaryMin ? `₹${(Number(job.salaryMin) / 100000).toFixed(1)}L` : ''
      const max = job.salaryMax ? `₹${(Number(job.salaryMax) / 100000).toFixed(1)}L` : ''
      return `${min} ${min && max ? '–' : ''} ${max} ${job.currency || 'INR'}`
    }
    return 'Not specified'
  }

  const renderTextContent = (text) => {
    if (!text) return <p className="text-muted">No content provided.</p>
    if (text.includes('<p>') || text.includes('<ul>') || text.includes('<br>')) {
      return <div dangerouslySetInnerHTML={{ __html: text }} className="rich-rendered-text" />
    }
    return <p style={{ whiteSpace: 'pre-line' }}>{text}</p>
  }

  const statusStyle = {
    live: 'badge-live',
    draft: 'badge-draft',
    closed: 'badge-closed',
    paused: 'badge-paused',
  }[job.status?.toLowerCase()] || 'badge-live'

  return (
    <div className="job-details-page">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="jdp-top-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jobs')}>
          <ArrowLeft size={16} /> Back to Job Openings
        </button>

        <div className="jdp-top-actions">
          <select
            className="jdp-status-select"
            value={job.status?.toLowerCase() || 'live'}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="live">● Status: Live</option>
            <option value="draft">○ Status: Draft</option>
            <option value="paused">⏸ Status: Paused</option>
            <option value="closed">✕ Status: Closed</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
            {copiedLink ? <Check size={14} color="var(--brand-success)" /> : <Copy size={14} />}
            {copiedLink ? 'Copied Link' : 'Copy Apply Link'}
          </button>

          <a
            href={publicApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <ExternalLink size={14} /> Public Portal
          </a>

          <button className="btn btn-danger-ghost btn-sm" onClick={handleDelete} title="Delete Job">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="jdp-header-card card">
        <div className="jdp-header-main">
          <div className="jdp-header-tags">
            <span className="jdp-code">{job.jobId || job.id?.toUpperCase()}</span>
            <span className={`badge ${statusStyle}`}>
              <span className="status-dot status-dot-active" />
              {(job.status || 'LIVE').toUpperCase()}
            </span>
            {job.priority && (
              <span className={`badge ${job.priority === 'urgent' ? 'badge-danger' : 'badge-primary'}`}>
                {job.priority.toUpperCase()} PRIORITY
              </span>
            )}
            {job.confidential && <span className="badge badge-warning">CONFIDENTIAL</span>}
          </div>

          <h1 className="jdp-title">{job.title}</h1>

          <div className="jdp-meta-grid">
            <div className="jdp-meta-item"><Building size={15} /> <span><strong>Department:</strong> {job.department || 'General'}</span></div>
            <div className="jdp-meta-item"><MapPin size={15} /> <span><strong>Location:</strong> {job.location || 'Remote'}</span></div>
            <div className="jdp-meta-item"><Briefcase size={15} /> <span><strong>Type:</strong> {job.type || job.jobType || 'Full-time'} ({job.workMode || 'On-site'})</span></div>
            <div className="jdp-meta-item"><Users size={15} /> <span><strong>Openings:</strong> {job.openings || 1} Position{(Number(job.openings) !== 1) ? 's' : ''}</span></div>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="jdp-metrics-grid">
        <div className="jdp-metric-card card">
          <span className="jdp-metric-val">{job.applied || jobApplications.length || 0}</span>
          <span className="jdp-metric-lbl">Total Applications</span>
        </div>
        <div className="jdp-metric-card card">
          <span className="jdp-metric-val">{job.shortlisted || 0}</span>
          <span className="jdp-metric-lbl">Shortlisted Candidates</span>
        </div>
        <div className="jdp-metric-card card">
          <span className="jdp-metric-val">{job.aiInterviews || 0}</span>
          <span className="jdp-metric-lbl">AI Voice Interviews</span>
        </div>
        <div className="jdp-metric-card card">
          <span className="jdp-metric-val">{job.offers || 0}</span>
          <span className="jdp-metric-lbl">Offers Generated</span>
        </div>
        <div className="jdp-metric-card card">
          <span className="jdp-metric-val">{job.daysOpen || 0}d</span>
          <span className="jdp-metric-lbl">Days Active</span>
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="jdp-content-layout">
        {/* Left Column: 70% Width Main Sections */}
        <div className="jdp-main-column">
          {/* Navigation Tabs */}
          <div className="jdp-tabs-card card">
            <button
              className={`jdp-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FileText size={16} /> Job Overview & Requirements
            </button>
            <button
              className={`jdp-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={16} /> AI Voice Interview Config
            </button>
            <button
              className={`jdp-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <Globe size={16} /> Application Form & Boards
            </button>
            <button
              className={`jdp-tab-btn ${activeTab === 'applicants' ? 'active' : ''}`}
              onClick={() => setActiveTab('applicants')}
            >
              <Users size={16} /> Applicants ({jobApplications.length})
            </button>
            <button
              className={`jdp-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <MessageSquare size={16} /> Internal Notes ({(job.notes || []).length})
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jdp-pane">
              {/* Description */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><FileText size={18} /> Job Description</h3>
                <div className="jdp-text-content">
                  {renderTextContent(job.description)}
                </div>
              </div>

              {/* Responsibilities & Requirements */}
              {job.responsibilities && (
                <div className="card jdp-section-card">
                  <h3 className="jdp-section-heading"><CheckCircle2 size={18} /> Responsibilities & Requirements</h3>
                  <div className="jdp-text-content">
                    {renderTextContent(job.responsibilities)}
                  </div>
                </div>
              )}

              {/* Skills & Experience */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Award size={18} /> Skills & Qualifications</h3>
                
                <div className="jdp-info-row" style={{ marginBottom: 16 }}>
                  <div>
                    <span className="jdp-sub-lbl">Required Experience</span>
                    <span className="jdp-pill-lg">{job.experienceMin || 0} – {job.experienceMax || 5} Years</span>
                  </div>
                  <div>
                    <span className="jdp-sub-lbl">Minimum Education</span>
                    <span className="jdp-pill-lg">{job.education || 'Any Graduate'}</span>
                  </div>
                </div>

                {job.mustHave?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="jdp-sub-lbl" style={{ color: 'var(--brand-danger)' }}>Must-Have Required Skills</span>
                    <div className="jdp-tags-row">
                      {job.mustHave.map((s) => <span key={s} className="jdp-skill-tag must">{s}</span>)}
                    </div>
                  </div>
                )}

                {job.skills?.length > 0 && (
                  <div>
                    <span className="jdp-sub-lbl">Core & Technical Skills</span>
                    <div className="jdp-tags-row">
                      {job.skills.map((s) => <span key={s} className="jdp-skill-tag">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Compensation & Benefits */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><DollarSign size={18} /> Compensation & Benefits</h3>
                <div className="jdp-cards-grid">
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Salary Range</span>
                    <p className="jdp-mini-val">{formatSalary()}</p>
                  </div>
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Equity & Stocks</span>
                    <p className="jdp-mini-val">{job.equity ? (job.equityPercent || 'Offered') : 'None'}</p>
                  </div>
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Salary Negotiable</span>
                    <p className="jdp-mini-val">{job.negotiable ? 'Yes' : 'Fixed Range'}</p>
                  </div>
                </div>

                {job.perks?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <span className="jdp-sub-lbl">Perks & Company Benefits</span>
                    <div className="jdp-tags-row">
                      {job.perks.map((p) => <span key={p} className="jdp-perk-tag">{p}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 2: AI Voice Interview Config */}
          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jdp-pane">
              {/* AI Score Weight Allocation */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Sparkles size={18} /> AI Score Weight Distribution (100% Total)</h3>
                <div className="jdp-weights-container">
                  <div className="jdp-weight-box">
                    <span className="lbl">Technical Competency</span>
                    <span className="val">{job.weightTechnical ?? 35}%</span>
                  </div>
                  <div className="jdp-weight-box">
                    <span className="lbl">Work Experience</span>
                    <span className="val">{job.weightExperience ?? 25}%</span>
                  </div>
                  <div className="jdp-weight-box">
                    <span className="lbl">Screening Qs</span>
                    <span className="val">{job.weightScreening ?? 20}%</span>
                  </div>
                  <div className="jdp-weight-box">
                    <span className="lbl">Education</span>
                    <span className="val">{job.weightEducation ?? 10}%</span>
                  </div>
                  <div className="jdp-weight-box">
                    <span className="lbl">Communication</span>
                    <span className="val">{job.weightCommunication ?? 10}%</span>
                  </div>
                </div>
              </div>

              {/* AI Persona & Voice Settings */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Bot size={18} /> AI Voice Interviewer Configuration</h3>
                <div className="jdp-cards-grid">
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Interviewer Persona</span>
                    <p className="jdp-mini-val">{job.aiPersona || 'Aria (Empathetic & Professional)'}</p>
                  </div>
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Language & Duration</span>
                    <p className="jdp-mini-val">{job.interviewLanguage || 'English'} • {job.interviewDuration || '30'} Mins</p>
                  </div>
                  <div className="jdp-mini-card">
                    <span className="jdp-mini-title">Style & Difficulty</span>
                    <p className="jdp-mini-val">{job.interviewStyle || 'Balanced'} ({job.interviewDifficulty || 'Adaptive'})</p>
                  </div>
                </div>
              </div>

              {/* Pipeline Rules */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Filter size={18} /> Automated Pipeline & Threshold Rules</h3>
                <div className="jdp-rules-grid">
                  <div className="jdp-rule-item">
                    <span>Auto-Shortlist Score Floor</span>
                    <strong>{job.shortlistScoreFloor || 60}%</strong>
                  </div>
                  <div className="jdp-rule-item">
                    <span>Auto-Reject Candidates</span>
                    <strong>{job.autoRejectEnabled ? `Below ${job.autoRejectBelow || 50}%` : 'Disabled'}</strong>
                  </div>
                  <div className="jdp-rule-item">
                    <span>Require Work Authorization</span>
                    <strong>{job.requireWorkAuth ? 'Strictly Required' : 'Optional'}</strong>
                  </div>
                </div>
              </div>

              {/* Questions */}
              {job.screeningQuestions?.length > 0 && (
                <div className="card jdp-section-card">
                  <h3 className="jdp-section-heading"><FileText size={18} /> Screening Questions ({job.screeningQuestions.length})</h3>
                  <div className="jdp-questions-container">
                    {job.screeningQuestions.map((q, idx) => (
                      <div key={idx} className="jdp-q-card">
                        <span className="q-badge">Question {idx + 1}</span>
                        <p className="q-text">{typeof q === 'string' ? q : q.question || q.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab 3: Form & Channels */}
          {activeTab === 'form' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jdp-pane">
              {/* Shareable Link Box */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Globe size={18} /> Public Candidate Application URL</h3>
                <p className="text-muted" style={{ marginBottom: 12 }}>Candidates access this portal to review the job role and submit their applications or record AI interviews.</p>
                <div className="jdp-link-bar">
                  <input type="text" readOnly value={publicApplyUrl} className="jdp-link-input" />
                  <button className="btn btn-primary" onClick={handleCopyLink}>
                    {copiedLink ? <Check size={16} /> : <Copy size={16} />} {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                  <a href={publicApplyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <ExternalLink size={16} /> Open Portal
                  </a>
                </div>
              </div>

              {/* Job Boards */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><Layers size={18} /> Distribution Channels & Job Boards</h3>
                <div className="jdp-channels-grid">
                  {(job.selectedBoards?.length ? job.selectedBoards : job.publishTargets?.length ? job.publishTargets : ['linkedin', 'indeed', 'glassdoor', 'google_jobs']).map((b) => (
                    <div key={b} className="jdp-channel-card">
                      <CheckCircle2 size={18} color="var(--brand-success)" />
                      <span className="channel-name">{b.replace('_', ' ')}</span>
                      <span className="channel-status">Published & Live</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><CheckCircle2 size={18} /> Configured Application Form Fields</h3>
                <div className="jdp-form-fields">
                  {Object.entries(job.formFields || {}).map(([key, enabled]) => (
                    <div key={key} className={`jdp-field-badge ${enabled ? 'active' : 'inactive'}`}>
                      <span className={`field-dot ${enabled ? 'on' : 'off'}`} />
                      <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                  ))}
                  {(!job.formFields || Object.keys(job.formFields).length === 0) && (
                    <p className="text-muted">Standard candidate application form (Resume, Full Name, Email, Phone, Experience, Skills)</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 4: Applicants */}
          {activeTab === 'applicants' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jdp-pane">
              <div className="card jdp-section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="jdp-section-heading" style={{ margin: 0 }}><Users size={18} /> Applied Candidates ({jobApplications.length})</h3>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/candidates')}>
                    View All Candidates <ArrowUpRight size={14} />
                  </button>
                </div>

                {jobApplications.length === 0 ? (
                  <div className="text-center" style={{ padding: '30px 10px' }}>
                    <Users size={32} className="text-tertiary" style={{ margin: '0 auto 12px' }} />
                    <p className="text-muted">No candidates have applied specifically for this posting yet.</p>
                    <button className="btn btn-secondary btn-sm" onClick={handleCopyLink} style={{ marginTop: 8 }}>
                      <Copy size={14} /> Share Apply Link to Attract Candidates
                    </button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Candidate Name</th>
                          <th>Stage</th>
                          <th>Rating / Score</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobApplications.map((app) => (
                          <tr key={app.id}>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.name}</span>
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{app.applicationId || app.id}</span>
                            </td>
                            <td><span className="badge badge-primary">{app.stage || 'Applied'}</span></td>
                            <td><strong>{app.rating ? `${app.rating} ★` : 'In-Review'}</strong></td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/candidates')}>
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 5: Internal Notes */}
          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jdp-pane">
              <div className="card jdp-section-card">
                <h3 className="jdp-section-heading"><MessageSquare size={18} /> Internal Recruiter & Team Notes ({(job.notes || []).length})</h3>
                
                {(job.notes && job.notes.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {job.notes.map((n, idx) => {
                      const noteId = n.id || idx
                      const isEditing = editingNoteId === noteId
                      const dateStr = n.date || n.createdAt
                      const formatted = dateStr ? new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'
                      return (
                        <div key={noteId} className="jdp-q-card" style={{ borderLeft: '3px solid var(--brand-primary)' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea
                                rows={3}
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                style={{ width: '100%', padding: 10, background: 'var(--surface-bg)', border: '1px solid var(--brand-primary)', color: 'var(--text-primary)', borderRadius: 8 }}
                              />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingNoteId(null)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={() => handleEditJobNote(noteId)}>Save Changes</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{n.text}</p>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    onClick={() => { setEditingNoteId(noteId); setEditingNoteText(n.text) }}
                                    title="Edit Note"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-icon btn-sm text-danger"
                                    onClick={() => handleDeleteJobNote(noteId)}
                                    title="Delete Note"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                ✍️ {n.author || 'Sarah Chen'} • {formatted}
                                {n.editedAt && <span style={{ fontStyle: 'italic', marginLeft: 6 }}>(edited {new Date(n.editedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})</span>}
                              </span>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontStyle: 'italic', marginBottom: 20 }}>
                    No internal notes logged for this job opening yet. Add notes regarding budget, hiring requirements, client feedback, or interview decisions.
                  </p>
                )}

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="jdp-sub-lbl" style={{ marginBottom: 8 }}>Add New Internal Note:</span>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write a note regarding this job opening..."
                    style={{ width: '100%', marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddJobNote} disabled={!noteText.trim()}>
                    <Plus size={14} /> Add Internal Note
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar: 30% Width Metadata & Quick Actions */}
        <div className="jdp-sidebar-column">
          {/* Metadata Card */}
          <div className="card jdp-sidebar-card">
            <h4 className="jdp-sidebar-title">Job Specification</h4>
            
            <div className="jdp-side-item">
              <span className="lbl">Job Opening ID</span>
              <span className="val code">{job.jobId || job.id?.toUpperCase()}</span>
            </div>

            <div className="jdp-side-item">
              <span className="lbl">Department</span>
              <span className="val">{job.department || 'General'}</span>
            </div>

            {job.subDepartment && (
              <div className="jdp-side-item">
                <span className="lbl">Sub-Department</span>
                <span className="val">{job.subDepartment}</span>
              </div>
            )}

            <div className="jdp-side-item">
              <span className="lbl">Location & Work Mode</span>
              <span className="val">{job.location || 'Remote'} ({job.workMode || 'On-site'})</span>
            </div>

            <div className="jdp-side-item">
              <span className="lbl">Employment Type</span>
              <span className="val">{job.type || job.jobType || 'Full-time'}</span>
            </div>

            <div className="jdp-side-item">
              <span className="lbl">Number of Openings</span>
              <span className="val">{job.openings || 1} Position{(Number(job.openings) !== 1) ? 's' : ''}</span>
            </div>

            <div className="jdp-side-item">
              <span className="lbl">Target Date / Deadline</span>
              <span className="val">{job.deadline || job.targetDate || 'Not set'}</span>
            </div>

            <div className="jdp-side-item">
              <span className="lbl">Posted On</span>
              <span className="val">{job.postedOn || 'Recently'}</span>
            </div>

            {job.jobCode && (
              <div className="jdp-side-item">
                <span className="lbl">Internal Job Code</span>
                <span className="val code">{job.jobCode}</span>
              </div>
            )}
          </div>

          {/* Hiring Team Card */}
          <div className="card jdp-sidebar-card">
            <h4 className="jdp-sidebar-title">Hiring Team</h4>
            
            <div className="jdp-team-member">
              <div className="avatar">HM</div>
              <div>
                <span className="name">{job.hiringManager || 'Sarah Chen'}</span>
                <span className="role">Hiring Manager</span>
              </div>
            </div>

            <div className="jdp-team-member">
              <div className="avatar recruiter">REC</div>
              <div>
                <span className="name">{Array.isArray(job.recruiters) ? job.recruiters.join(', ') : (job.recruiter || 'Sarah Chen')}</span>
                <span className="role">Assigned Recruiter</span>
              </div>
            </div>
          </div>

          {/* Candidate Portal QR & Share */}
          <div className="card jdp-sidebar-card jdp-share-banner">
            <h4 className="jdp-sidebar-title"><Share2 size={16} /> Candidate Portal</h4>
            <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>
              Share this link on LinkedIn, WhatsApp, or job boards to receive direct applications into HireOS.
            </p>
            <button className="btn btn-primary btn-block" onClick={handleCopyLink}>
              {copiedLink ? <Check size={16} /> : <Copy size={16} />} {copiedLink ? 'Copied URL!' : 'Copy Shareable Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
