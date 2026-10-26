import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, Clock,
  ExternalLink, Trash2, Edit2, Plus, MessageSquare, ShieldCheck,
  Brain, FileText, CheckCircle2, ChevronRight, Sparkles, Star,
  Award, Globe, GraduationCap, User, Play, ArrowRight, DollarSign,
  AlertCircle, Share2, Check, Download, Video, CheckSquare, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  useCandidate, useDeleteCandidate, useUpdateCandidate,
  useInterviews, useApplications
} from '../hooks/useSupabase'
import Skeleton from '../components/ui/Skeleton'
import PipelineTimeline from '../components/pipeline/PipelineTimeline'
import { avatarColor } from '../utils/avatar'
import './CandidateDetailsPage.css'

export default function CandidateDetailsPage() {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [emailDraft, setEmailDraft] = useState(null)

  const { data: candidate, isLoading, error } = useCandidate(candidateId)
  const deleteCandidate = useDeleteCandidate()
  const updateCandidate = useUpdateCandidate()
  const { data: allInterviews = [] } = useInterviews()
  const { data: allApplications = [] } = useApplications()

  const [noteText, setNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  if (isLoading) {
    return (
      <div className="candidate-details-page">
        <Skeleton.Page type="detail" />
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="candidate-details-page">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <AlertCircle size={48} color="var(--brand-danger)" style={{ margin: '0 auto 16px' }} />
          <h2>Candidate Profile Not Found</h2>
          <p className="text-muted" style={{ marginBottom: 24 }}>The candidate record you are looking for does not exist or has been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/candidates')}>
            <ArrowLeft size={16} /> Back to Candidates
          </button>
        </div>
      </div>
    )
  }

  const aiScore = Number(candidate.aiScore) || 88
  const scoreColor = aiScore >= 80 ? 'var(--brand-success)' : aiScore >= 60 ? 'var(--brand-warning)' : 'var(--brand-danger)'
  const recommendation = aiScore >= 85 ? { label: 'Strong Hire', color: 'var(--brand-success)' }
    : aiScore >= 70 ? { label: 'Hire', color: '#6366f1' }
    : aiScore >= 55 ? { label: 'Consider', color: 'var(--brand-warning)' }
    : { label: 'No Hire', color: 'var(--brand-danger)' }

  // Associated interviews for this candidate
  const candidateInterviews = allInterviews.filter(
    (iv) => String(iv.candidate_id) === String(candidate.id) ||
      iv.candidate?.toLowerCase() === candidate.name?.toLowerCase() ||
      iv.email?.toLowerCase() === candidate.email?.toLowerCase()
  )

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Candidate profile link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete candidate "${candidate.name}"? This action cannot be undone.`)) {
      try {
        await deleteCandidate.mutateAsync(candidate.id)
        toast.success('Candidate deleted successfully')
        navigate('/candidates')
      } catch (err) {
        toast.error('Failed to delete candidate')
      }
    }
  }

  const handleStageChange = async (newStage) => {
    const activityNote = {
      id: Date.now(),
      text: `🔄 Stage updated to "${newStage}" by Sarah Chen`,
      author: 'Sarah Chen',
      date: new Date().toISOString(),
    }
    const notes = [activityNote, ...(candidate.notes || [])]
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, updates: { stage: newStage, notes } })
      toast.success(`Candidate stage updated to ${newStage}`)
    } catch (err) {
      toast.error('Failed to update stage')
    }
  }

  const handleRatingChange = async (rating) => {
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, updates: { rating } })
      toast.success(`Rating updated to ${rating} stars`)
    } catch (err) {
      toast.error('Failed to update rating')
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    const newNote = {
      id: Date.now(),
      text: noteText.trim(),
      author: 'Sarah Chen',
      date: new Date().toISOString(),
    }
    const notes = [newNote, ...(candidate.notes || [])]
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, updates: { notes } })
      setNoteText('')
      toast.success('Note added')
    } catch (err) {
      toast.error('Failed to add note')
    }
  }

  const handleEditNote = async (noteId) => {
    if (!editingNoteText.trim()) return
    const notes = (candidate.notes || []).map((n, idx) => {
      const id = typeof n === 'object' ? (n.id || idx) : idx
      if (id === noteId) {
        return typeof n === 'string'
          ? { id: noteId, text: editingNoteText.trim(), author: 'Sarah Chen', date: new Date().toISOString(), editedAt: new Date().toISOString() }
          : { ...n, text: editingNoteText.trim(), editedAt: new Date().toISOString() }
      }
      return n
    })
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, updates: { notes } })
      setEditingNoteId(null)
      setEditingNoteText('')
      toast.success('Note updated')
    } catch (err) {
      toast.error('Failed to update note')
    }
  }

  const handleDeleteNote = async (noteId) => {
    const notes = (candidate.notes || []).filter((n, idx) => {
      const id = typeof n === 'object' ? (n.id || idx) : idx
      return id !== noteId
    })
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, updates: { notes } })
      toast.success('Note removed')
    } catch (err) {
      toast.error('Failed to remove note')
    }
  }

  const STAGES = [
    'Applied', 'Screening', 'Shortlisted', 'AI Interview Scheduled',
    'AI Interview Complete', 'HR Review', 'Offer Sent', 'Hired',
    'Manual Review', 'Rejected'
  ]

  return (
    <div className="candidate-details-page">
      {/* Top Action & Breadcrumb Bar */}
      <div className="cdp-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/candidates')}>
            <ArrowLeft size={16} /> Back to Candidates
          </button>
        </div>

        <div className="cdp-top-actions">
          {/* Status / Stage Changer */}
          <select
            className="cdp-status-select"
            value={candidate.stage || 'Applied'}
            onChange={(e) => handleStageChange(e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>● Stage: {s}</option>
            ))}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={handleCopyProfile} title="Share profile link">
            {copied ? <Check size={14} color="var(--brand-success)" /> : <Share2 size={14} />}
            {copied ? 'Copied' : 'Share Profile'}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setEmailDraft({
              subject: `Update regarding your application for ${candidate.appliedFor || 'Open Role'} at TechCorp`,
              body: `Hi ${candidate.name?.split(' ')[0] || 'there'},\n\nThank you for taking the time to interview with TechCorp Industries. We would like to discuss next steps...`
            })}
          >
            <Mail size={14} /> Send Email
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/interviews/${candidate.interviewId || candidate.id || 'demo'}/report`)}
          >
            <FileText size={14} /> View AI Dossier Report
          </button>

          <button className="btn btn-ghost btn-sm btn-danger-ghost" onClick={handleDelete} title="Delete Candidate">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Header Banner Card (Matching JobDetailsPage) */}
      <div className="cdp-header-card">
        <div className="cdp-header-tags">
          <span className="cdp-code">{candidate.id || 'CAND-001'}</span>
          <span className={`badge ${candidate.stage?.toLowerCase().includes('complete') || candidate.stage?.toLowerCase().includes('shortlist') ? 'badge-live' : 'badge-primary'}`}>
            ● {candidate.stage?.toUpperCase() || 'APPLIED'}
          </span>
          {(candidate.tags || ['Top Candidate']).map((tag) => (
            <span key={tag} className="badge badge-paused" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tag}
            </span>
          ))}
          {candidate.source && (
            <span className="badge badge-draft">
              <Globe size={11} style={{ marginRight: 4 }} /> {candidate.source}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, marginBottom: 12 }}>
          <div className="cdp-avatar" style={{ background: avatarColor(candidate.name) }}>
            {candidate.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h1 className="cdp-title" style={{ margin: 0 }}>{candidate.name}</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {candidate.currentTitle} at <strong>{candidate.currentCompany}</strong> • Target Role: <strong style={{ color: 'var(--brand-primary)' }}>{candidate.appliedFor}</strong>
            </p>
          </div>
        </div>

        <div className="cdp-meta-grid">
          <div className="cdp-meta-item">
            <Mail size={15} /> <span>{candidate.email}</span>
          </div>
          <div className="cdp-meta-item">
            <Phone size={15} /> <span>{candidate.phone || '+91-98765-43210'}</span>
          </div>
          <div className="cdp-meta-item">
            <MapPin size={15} /> <span>{candidate.location || 'Bangalore, India'}</span>
          </div>
          <div className="cdp-meta-item">
            <Clock size={15} /> <span>{candidate.experience || 5} Years Experience</span>
          </div>
        </div>
      </div>

      {/* 5 High-Impact Stat Cards (Matching JobDetailsPage & InterviewReportPage) */}
      <div className="cdp-stats-grid">
        <div className="cdp-stat-card">
          <div className="cdp-stat-val" style={{ color: scoreColor }}>
            {aiScore}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>/100</span>
          </div>
          <div className="cdp-stat-label">OVERALL AI SCORE</div>
        </div>

        <div className="cdp-stat-card">
          <div className="cdp-stat-val" style={{ color: recommendation.color, fontSize: '1.35rem' }}>
            {recommendation.label}
          </div>
          <div className="cdp-stat-label">FINAL RECOMMENDATION</div>
        </div>

        <div className="cdp-stat-card">
          <div className="cdp-stat-val" style={{ color: 'var(--brand-success)' }}>
            {candidate.scores?.code || Math.min(100, Math.round(aiScore * 0.95))}%
          </div>
          <div className="cdp-stat-label">LOGIC & SANDBOX</div>
        </div>

        <div className="cdp-stat-card">
          <div className="cdp-stat-val" style={{ color: '#a855f7' }}>
            {candidate.scores?.comm || Math.min(100, Math.round(aiScore * 1.02))}%
          </div>
          <div className="cdp-stat-label">COMMUNICATION</div>
        </div>

        <div className="cdp-stat-card">
          <div className="cdp-stat-val" style={{ color: '#10b981' }}>
            100%
          </div>
          <div className="cdp-stat-label">PROCTORING TRUST</div>
        </div>
      </div>

      {/* 5 Segmented Navigation Tabs */}
      <div className="cdp-tabs">
        <button className={`cdp-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <User size={15} /> Candidate Overview &amp; Profile
        </button>
        <button className={`cdp-tab ${activeTab === 'ai-eval' ? 'active' : ''}`} onClick={() => setActiveTab('ai-eval')}>
          <Brain size={15} /> AI Technical Evaluation &amp; Sandbox
        </button>
        <button className={`cdp-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          <Sparkles size={15} /> Pipeline Journey &amp; Autopilot
        </button>
        <button className={`cdp-tab ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>
          <Video size={15} /> Interviews &amp; Meetings ({candidateInterviews.length || 1})
        </button>
        <button className={`cdp-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
          <MessageSquare size={15} /> Internal Notes &amp; Feedback ({(candidate.notes || []).length})
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="cdp-main-layout">
        {/* Left Primary Content Column */}
        <div className="cdp-content-col">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Contact & Location Details */}
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <h3 className="section-title"><User size={18} /> Contact &amp; Personal Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Full Name</span>
                    <span className="cdp-info-value">{candidate.name}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Email Address</span>
                    <span className="cdp-info-value">{candidate.email}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Phone Number</span>
                    <span className="cdp-info-value">{candidate.phone || '+91-98765-43210'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Current Location</span>
                    <span className="cdp-info-value">{candidate.location || 'Bangalore, India'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Candidate Owner / Recruiter</span>
                    <span className="cdp-info-value">{candidate.candidateOwner || 'Sarah Chen'}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Application Date</span>
                    <span className="cdp-info-value">{candidate.appliedDate || 'May 25, 2026'}</span>
                  </div>
                </div>
              </div>

              {/* Professional Experience & Compensation */}
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <h3 className="section-title"><Briefcase size={18} /> Professional Experience &amp; Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Current Role</span>
                    <span className="cdp-info-value">{candidate.currentTitle}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Current Employer</span>
                    <span className="cdp-info-value">{candidate.currentCompany}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Total Experience</span>
                    <span className="cdp-info-value">{candidate.experience} Years</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Highest Education</span>
                    <span className="cdp-info-value">{candidate.qualification || "Bachelor's Degree"}</span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Expected CTC</span>
                    <span className="cdp-info-value" style={{ color: 'var(--brand-success)', fontWeight: 700 }}>
                      {candidate.expectedSalary || '₹32.0L / yr'}
                    </span>
                  </div>
                  <div className="cdp-info-item">
                    <span className="cdp-info-label">Notice Period</span>
                    <span className="cdp-info-value">{candidate.noticePeriod || '30 Days (Negotiable)'}</span>
                  </div>
                </div>
              </div>

              {/* Skills & External Portfolios */}
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title" style={{ margin: 0 }}><Award size={18} /> Skills &amp; Rating</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Recruiter Rating:</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={16}
                          style={{
                            cursor: 'pointer',
                            color: s <= (candidate.rating || 4) ? '#FDCB6E' : 'var(--text-disabled)',
                            fill: s <= (candidate.rating || 4) ? '#FDCB6E' : 'none'
                          }}
                          onClick={() => handleRatingChange(s)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {(candidate.skills || ['React', 'TypeScript', 'Node.js', 'Redux', 'GraphQL', 'System Design']).map((skill) => (
                    <span key={skill} className="job-card-skill" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                      {skill}
                    </span>
                  ))}
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                    Verified External Profiles &amp; Portfolios
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      <ExternalLink size={13} /> LinkedIn Profile
                    </a>
                    <a href="https://github.com" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      <ExternalLink size={13} /> GitHub Repository
                    </a>
                    <a href="https://portfolio.dev" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                      <ExternalLink size={13} /> Interactive Portfolio
                    </a>
                    <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Downloading candidate resume...')}>
                      <Download size={13} /> Download Resume PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: AI TECHNICAL EVALUATION */}
          {activeTab === 'ai-eval' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Executive Evaluation Card */}
              <div className="card" style={{ padding: 24, borderRadius: 14, background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Brain size={20} color="#818cf8" /> Lead Technical Architect Assessment
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Evaluated by AI Lead Architect (Sarah) with multi-criteria rubric
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/interviews/${candidate.interviewId || candidate.id || 'demo'}/report`)}
                  >
                    <FileText size={14} /> Open Full AI Dossier &amp; Sandbox Report <ArrowRight size={14} />
                  </button>
                </div>

                <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: '0 0 16px' }}>
                  {candidate.name} demonstrated outstanding domain depth in {candidate.appliedFor || 'the target role'}.
                  Spoken explanations were structured, concise, and backed by real-world system architecture principles.
                  The candidate completed all coding sandbox requirements with clean, modular syntax and zero proctoring infractions.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Logic &amp; Sandbox</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--brand-success)', marginTop: 2 }}>
                      {candidate.scores?.code || 92}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Optimal O(1) space complexity</div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Communication</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7', marginTop: 2 }}>
                      {candidate.scores?.comm || 88}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Clear articulation &amp; rationale</div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Problem Solving</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1', marginTop: 2 }}>
                      {candidate.scores?.problem || 90}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Fast edge case handling</div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Proctoring Integrity</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
                      100% Clean
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>0 tab switches, clean camera</div>
                  </div>
                </div>
              </div>

              {/* Code Sandbox Preview */}
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 className="section-title" style={{ margin: 0 }}><CheckCircle2 size={18} /> Algorithmic Challenge &amp; Sandbox Code</h3>
                  <span className="badge badge-live">3 / 3 TEST CASES PASSED</span>
                </div>
                <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: '0.85rem', color: '#c9d1d9', overflowX: 'auto' }}>
                  <pre style={{ margin: 0 }}>
{`// Custom Debounce Utility with Immediate Leading Edge & Cancellation
function debounce(fn, wait = 100, options = {}) {
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
}`}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PIPELINE JOURNEY */}
          {activeTab === 'timeline' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <h3 className="section-title"><Sparkles size={18} /> Hiring Autopilot Journey &amp; Audit Trail</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Chronological lifecycle progression from initial application to final offer dispatch.
                </p>
                <PipelineTimeline
                  timeline={candidate.pipelineTimeline || [
                    { stage: 'applied', label: 'Application Received', date: '2026-05-25 10:00 AM', detail: 'Submitted via LinkedIn Jobs' },
                    { stage: 'screening', label: 'AI Screening Passed', date: '2026-05-25 10:02 AM', detail: 'Scored 92/100 (Top 5% candidate match)' },
                    { stage: 'shortlisted', label: 'Shortlisted by Recruiter', date: '2026-05-25 11:30 AM', detail: 'Fast-tracked for technical evaluation' },
                    { stage: 'interview_live', label: 'AI Voice & Sandbox Interview', date: '2026-05-26 02:30 PM', detail: 'Completed 24-minute session with Lead Architect' },
                    { stage: 'hr_analysis', label: 'Technical Dossier Generated', date: '2026-05-26 02:55 PM', detail: 'Final recommendation: Strong Hire (92/100)' },
                  ]}
                />
              </div>
            </motion.div>
          )}

          {/* TAB 4: INTERVIEWS & MEETINGS */}
          {activeTab === 'interviews' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 className="section-title" style={{ margin: 0 }}><Video size={18} /> Recorded AI &amp; Human Interviews</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/interview/${candidate.id || 'demo'}`)}>
                    <Play size={13} /> Launch Live AI Interview Room
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-live">● COMPLETED</span>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Technical Architecture &amp; Sandbox Round</h4>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Interviewer: <strong>Sarah (AI Lead Architect)</strong> • Duration: <strong>24 mins</strong> • Date: <strong>May 26, 2026</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/interviews/${candidate.interviewId || candidate.id || 'demo'}/report`)}
                      >
                        <FileText size={13} /> View Transcript &amp; Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: INTERNAL NOTES */}
          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card" style={{ padding: 24, borderRadius: 14 }}>
                <h3 className="section-title"><MessageSquare size={18} /> Internal Recruiter &amp; Team Feedback</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0 20px' }}>
                  {(candidate.notes && candidate.notes.length > 0) ? (
                    candidate.notes.map((note, idx) => {
                      const noteObj = typeof note === 'string' ? { id: idx, text: note, author: 'Recruiter', date: new Date().toISOString() } : note
                      const isEditing = editingNoteId === (noteObj.id || idx)
                      return (
                        <div key={noteObj.id || idx} className="card" style={{ padding: 14, background: 'var(--surface-bg)', borderLeft: '3px solid var(--brand-primary)', borderRadius: 8 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea
                                rows={2}
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                style={{ width: '100%', padding: 8, borderRadius: 6, background: 'var(--surface-card)', border: '1px solid var(--brand-primary)', color: 'var(--text-primary)' }}
                              />
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingNoteId(null)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={() => handleEditNote(noteObj.id || idx)}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                  {noteObj.text}
                                </p>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingNoteId(noteObj.id || idx); setEditingNoteText(noteObj.text) }}>
                                    <Edit2 size={13} />
                                  </button>
                                  <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDeleteNote(noteObj.id || idx)}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                ✍️ {noteObj.author || 'Sarah Chen'} • {new Date(noteObj.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                      No internal notes recorded yet. Add interview impressions, compensation negotiations, or team feedback below.
                    </p>
                  )}
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Add Internal Note:</span>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter confidential notes, salary expectations, or interview debrief..."
                    style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--surface-bg)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', marginBottom: 10 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                    <Plus size={14} /> Post Note
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Candidate Specification Sidebar (Matching JobDetailsPage) */}
        <div className="cdp-sidebar-col">
          <div className="cdp-spec-card">
            <h3 className="cdp-spec-heading">Candidate Specification</h3>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">CANDIDATE ID</span>
              <span className="cdp-spec-val cdp-code">{candidate.id || 'CAND-001'}</span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">TARGET OPENING</span>
              <span className="cdp-spec-val" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                {candidate.appliedFor || 'Senior React Developer'}
              </span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">CURRENT COMPANY</span>
              <span className="cdp-spec-val">{candidate.currentCompany || 'Flipkart'}</span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">EXPERIENCE</span>
              <span className="cdp-spec-val">{candidate.experience || 6} Years</span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">EDUCATION</span>
              <span className="cdp-spec-val">{candidate.qualification || "Bachelor's Degree"}</span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">EXPECTED SALARY</span>
              <span className="cdp-spec-val" style={{ color: 'var(--brand-success)', fontWeight: 700 }}>
                {candidate.expectedSalary || '₹32.0L / yr'}
              </span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">NOTICE PERIOD</span>
              <span className="cdp-spec-val">{candidate.noticePeriod || '30 Days'}</span>
            </div>

            <div className="cdp-spec-item">
              <span className="cdp-spec-label">TALENT LEAD</span>
              <span className="cdp-spec-val">{candidate.candidateOwner || 'Sarah Chen'}</span>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate(`/interviews/${candidate.interviewId || candidate.id || 'demo'}/report`)}
              >
                <FileText size={14} /> Full AI Technical Dossier →
              </button>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate(`/interview/${candidate.id || 'demo'}`)}
              >
                <Play size={14} /> Launch Live AI Room
              </button>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  handleStageChange('Offer Sent')
                  toast.success('Offer drafted and sent to candidate!')
                }}
              >
                <Award size={14} /> Approve &amp; Draft Offer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Composer Modal */}
      <AnimatePresence>
        {emailDraft && (
          <div className="modal-overlay" onClick={() => setEmailDraft(null)}>
            <motion.div
              className="modal-container"
              style={{ maxWidth: 540 }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h2><Mail size={18} /> Compose Email to {candidate.name}</h2>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEmailDraft(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input type="email" value={candidate.email} readOnly style={{ background: 'var(--surface-bg)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    value={emailDraft.subject}
                    onChange={(e) => setEmailDraft((d) => ({ ...d, subject: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    rows={6}
                    value={emailDraft.body}
                    onChange={(e) => setEmailDraft((d) => ({ ...d, body: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEmailDraft(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    const note = {
                      id: Date.now(),
                      text: `📧 Email sent — "${emailDraft.subject}": ${emailDraft.body}`,
                      author: 'Sarah Chen',
                      date: new Date().toISOString(),
                    }
                    const notes = [note, ...(candidate.notes || [])]
                    try {
                      await updateCandidate.mutateAsync({ id: candidate.id, updates: { notes } })
                    } catch { /* non-blocking */ }
                    setEmailDraft(null)
                    toast.success(`Email sent to ${candidate.name}`)
                  }}
                  disabled={!emailDraft.subject.trim() || !emailDraft.body.trim()}
                >
                  <Mail size={14} /> Send Email
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
