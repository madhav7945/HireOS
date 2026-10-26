import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Briefcase, MapPin, Clock, Users, Building, Calendar, DollarSign,
  Share2, Copy, Check, ShieldCheck, Award, FileText, SlidersHorizontal,
  Bot, Globe, CheckCircle2, ChevronRight, Edit3, Trash2, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import './JobDetailsModal.css'

export default function JobDetailsModal({ job, onClose, onDelete }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedLink, setCopiedLink] = useState(false)

  if (!job) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicApplyUrl = `${origin}/apply/${job.id || job.jobId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicApplyUrl)
    setCopiedLink(true)
    toast.success('Public apply link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Helper to format salary cleanly
  const formatSalary = () => {
    if (job.salary && (job.salary.min || job.salary.max)) {
      const min = job.salary.min ? `₹${(job.salary.min / 100000).toFixed(1)}L` : ''
      const max = job.salary.max ? `₹${(job.salary.max / 100000).toFixed(1)}L` : ''
      return `${min} ${min && max ? '-' : ''} ${max} / ${job.salary.period || 'year'}`
    }
    if (job.salaryMin || job.salaryMax) {
      const min = job.salaryMin ? `₹${(Number(job.salaryMin) / 100000).toFixed(1)}L` : ''
      const max = job.salaryMax ? `₹${(Number(job.salaryMax) / 100000).toFixed(1)}L` : ''
      return `${min} ${min && max ? '-' : ''} ${max} / ${job.currency || 'INR'}`
    }
    return 'Not specified'
  }

  // Strip HTML tags for safe rendering if needed
  const renderTextContent = (text) => {
    if (!text) return <p className="text-muted">No content provided.</p>
    // Simple check if HTML string
    if (text.includes('<p>') || text.includes('<ul>') || text.includes('<br>')) {
      return <div dangerouslySetInnerHTML={{ __html: text }} className="rich-rendered-text" />
    }
    return <p style={{ whiteSpace: 'pre-line' }}>{text}</p>
  }

  const statusClass = {
    live: 'badge-live',
    draft: 'badge-draft',
    closed: 'badge-closed',
    paused: 'badge-paused',
  }[job.status?.toLowerCase()] || 'badge-live'

  return (
    <AnimatePresence>
      <div className="job-details-backdrop" onClick={onClose}>
        <motion.div
          className="job-details-modal"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="jdm-header">
            <div className="jdm-header-main">
              <div className="jdm-header-top">
                <span className="jdm-job-id">{job.jobId || job.id?.toUpperCase()}</span>
                <span className={`badge ${statusClass}`}>
                  <span className="status-dot status-dot-active" />
                  {job.status ? job.status.toUpperCase() : 'LIVE'}
                </span>
                {job.priority && (
                  <span className={`badge ${job.priority === 'urgent' ? 'badge-danger' : 'badge-primary'}`}>
                    {job.priority.toUpperCase()}
                  </span>
                )}
              </div>
              <h2 className="jdm-title">{job.title}</h2>
              <div className="jdm-meta-row">
                <span><Building size={14} /> {job.department || 'General'}</span>
                <span><MapPin size={14} /> {job.location || 'Remote'}</span>
                <span><Briefcase size={14} /> {job.type || job.jobType || 'Full-time'} ({job.workMode || 'On-site'})</span>
                <span><Users size={14} /> {job.openings || 1} {Number(job.openings) === 1 ? 'Opening' : 'Openings'}</span>
              </div>
            </div>

            <div className="jdm-header-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleCopyLink} title="Copy Apply Link">
                {copiedLink ? <Check size={14} color="var(--brand-success)" /> : <Copy size={14} />}
                {copiedLink ? 'Copied' : 'Share Link'}
              </button>
              <a href={publicApplyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="View Public Apply Page">
                <ExternalLink size={14} /> Public Page
              </a>
              {onDelete && (
                <button
                  className="btn btn-secondary btn-sm btn-danger-ghost"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
                      onDelete(job.id)
                      onClose()
                    }
                  }}
                  title="Delete Job"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button className="btn btn-ghost btn-icon" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="jdm-stats-bar">
            <div className="jdm-stat">
              <span className="jdm-stat-num">{job.applied || 0}</span>
              <span className="jdm-stat-label">Applications</span>
            </div>
            <div className="jdm-stat">
              <span className="jdm-stat-num">{job.shortlisted || 0}</span>
              <span className="jdm-stat-label">Shortlisted</span>
            </div>
            <div className="jdm-stat">
              <span className="jdm-stat-num">{job.aiInterviews || 0}</span>
              <span className="jdm-stat-label">AI Interviews</span>
            </div>
            <div className="jdm-stat">
              <span className="jdm-stat-num">{job.offers || 0}</span>
              <span className="jdm-stat-label">Offers</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="jdm-tabs">
            <button
              className={`jdm-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FileText size={15} /> Overview & Details
            </button>
            <button
              className={`jdm-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={15} /> AI Screening Rules
            </button>
            <button
              className={`jdm-tab ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <Globe size={15} /> Form & Channels
            </button>
          </div>

          {/* Tab Contents */}
          <div className="jdm-body">
            {activeTab === 'overview' && (
              <div className="jdm-tab-pane">
                {/* Key Attributes */}
                <div className="jdm-grid-cards">
                  <div className="jdm-card">
                    <span className="jdm-card-title"><DollarSign size={15} /> Salary & Perks</span>
                    <p className="jdm-card-value">{formatSalary()}</p>
                    {job.equity && <span className="jdm-pill">Equity: {job.equityPercent || 'Yes'}</span>}
                    {job.negotiable && <span className="jdm-pill">Negotiable</span>}
                  </div>

                  <div className="jdm-card">
                    <span className="jdm-card-title"><Users size={15} /> Hiring Team</span>
                    <p className="jdm-card-value">Hiring Manager: {job.hiringManager || 'Sarah Chen'}</p>
                    <p className="jdm-card-sub">Recruiter: {Array.isArray(job.recruiters) ? job.recruiters.join(', ') : (job.recruiter || 'Sarah Chen')}</p>
                  </div>

                  <div className="jdm-card">
                    <span className="jdm-card-title"><Calendar size={15} /> Timeline</span>
                    <p className="jdm-card-value">Posted: {job.postedOn || 'Recently'}</p>
                    <p className="jdm-card-sub">Target Date: {job.deadline || job.targetDate || 'TBD'}</p>
                  </div>
                </div>

                {/* Job Description */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Job Description</h3>
                  <div className="jdm-text-box">
                    {renderTextContent(job.description)}
                  </div>
                </div>

                {/* Requirements / Responsibilities */}
                {job.responsibilities && (
                  <div className="jdm-section">
                    <h3 className="jdm-section-title">Requirements & Responsibilities</h3>
                    <div className="jdm-text-box">
                      {renderTextContent(job.responsibilities)}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Skills & Experience</h3>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Required Experience:</span>
                    <span className="jdm-pill lg">{job.experienceMin || 0} - {job.experienceMax || 5} Years</span>
                    <span className="jdm-pill lg" style={{ marginLeft: 8 }}>Education: {job.education || 'Any'}</span>
                  </div>

                  {job.mustHave?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--brand-danger)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Must Have Skills:</span>
                      <div className="jdm-skills-row">
                        {job.mustHave.map(s => <span key={s} className="jdm-skill-tag must">{s}</span>)}
                      </div>
                    </div>
                  )}

                  {job.skills?.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Technical & Core Skills:</span>
                      <div className="jdm-skills-row">
                        {job.skills.map(s => <span key={s} className="jdm-skill-tag">{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Perks */}
                {job.perks?.length > 0 && (
                  <div className="jdm-section">
                    <h3 className="jdm-section-title">Perks & Benefits</h3>
                    <div className="jdm-skills-row">
                      {job.perks.map(p => <span key={p} className="jdm-pill">{p}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="jdm-tab-pane">
                {/* AI Score Weights */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">AI Candidate Score Weights (Total 100%)</h3>
                  <div className="jdm-weights-grid">
                    <div className="jdm-weight-item">
                      <span className="jdm-weight-label">Technical Skills</span>
                      <span className="jdm-weight-val">{job.weightTechnical ?? 35}%</span>
                    </div>
                    <div className="jdm-weight-item">
                      <span className="jdm-weight-label">Experience Match</span>
                      <span className="jdm-weight-val">{job.weightExperience ?? 25}%</span>
                    </div>
                    <div className="jdm-weight-item">
                      <span className="jdm-weight-label">Screening Questions</span>
                      <span className="jdm-weight-val">{job.weightScreening ?? 20}%</span>
                    </div>
                    <div className="jdm-weight-item">
                      <span className="jdm-weight-label">Education</span>
                      <span className="jdm-weight-val">{job.weightEducation ?? 10}%</span>
                    </div>
                    <div className="jdm-weight-item">
                      <span className="jdm-weight-label">Communication</span>
                      <span className="jdm-weight-val">{job.weightCommunication ?? 10}%</span>
                    </div>
                  </div>
                </div>

                {/* AI Persona & Interview Config */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">AI Voice Interview Settings</h3>
                  <div className="jdm-grid-cards">
                    <div className="jdm-card">
                      <span className="jdm-card-title">Interviewer Persona</span>
                      <p className="jdm-card-value">{job.aiPersona || 'Aria (Empathetic & Professional)'}</p>
                    </div>
                    <div className="jdm-card">
                      <span className="jdm-card-title">Language & Duration</span>
                      <p className="jdm-card-value">{job.interviewLanguage || 'English'} • {job.interviewDuration || '30'} mins</p>
                    </div>
                    <div className="jdm-card">
                      <span className="jdm-card-title">Interview Style</span>
                      <p className="jdm-card-value">{job.interviewStyle || 'Balanced'} ({job.interviewDifficulty || 'Adaptive'})</p>
                    </div>
                  </div>
                </div>

                {/* Automated Thresholds */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Automated Pipeline Rules</h3>
                  <div className="jdm-rules-list">
                    <div className="jdm-rule-row">
                      <span>Auto-Shortlist Score Floor</span>
                      <span className="jdm-rule-badge">{job.shortlistScoreFloor || 60}%</span>
                    </div>
                    <div className="jdm-rule-row">
                      <span>Auto-Reject Enabled</span>
                      <span className="jdm-rule-badge">{job.autoRejectEnabled ? `Yes (below ${job.autoRejectBelow || 50}%)` : 'No'}</span>
                    </div>
                    <div className="jdm-rule-row">
                      <span>Require Work Authorization</span>
                      <span className="jdm-rule-badge">{job.requireWorkAuth ? 'Required' : 'Optional'}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Screening Questions */}
                {job.screeningQuestions?.length > 0 && (
                  <div className="jdm-section">
                    <h3 className="jdm-section-title">Screening Questions ({job.screeningQuestions.length})</h3>
                    <ul className="jdm-questions-list">
                      {job.screeningQuestions.map((q, idx) => (
                        <li key={idx} className="jdm-question-item">
                          <span className="q-num">Q{idx + 1}:</span> {typeof q === 'string' ? q : q.question || q.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'form' && (
              <div className="jdm-tab-pane">
                {/* Shareable apply link */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Candidate Application URL</h3>
                  <div className="jdm-link-box">
                    <input type="text" readOnly value={publicApplyUrl} className="jdm-link-input" />
                    <button className="btn btn-primary btn-sm" onClick={handleCopyLink}>
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />} {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Selected Job Boards */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Selected Distribution Channels</h3>
                  <div className="jdm-boards-grid">
                    {(job.selectedBoards?.length ? job.selectedBoards : job.publishTargets?.length ? job.publishTargets : ['linkedin', 'indeed', 'glassdoor']).map(b => (
                      <div key={b} className="jdm-board-tag">
                        <CheckCircle2 size={14} className="text-success" />
                        <span style={{ textTransform: 'capitalize' }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Application Form Fields */}
                <div className="jdm-section">
                  <h3 className="jdm-section-title">Candidate Form Configuration</h3>
                  <div className="jdm-form-fields-grid">
                    {Object.entries(job.formFields || {}).map(([key, enabled]) => (
                      <div key={key} className={`jdm-ff-item ${enabled ? 'enabled' : 'disabled'}`}>
                        <span className={`ff-dot ${enabled ? 'on' : 'off'}`} />
                        <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                    ))}
                    {(!job.formFields || Object.keys(job.formFields).length === 0) && (
                      <p className="text-muted">Default application form (Resume, Email, Phone, Skills)</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
