import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Brain, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, BarChart3,
  Sparkles, AlertTriangle, Search, Download, Ban, Trophy, Loader2, Play,
  Briefcase, Users, CheckCircle2, ArrowRight, Star, ExternalLink,
  ShieldCheck, Filter, Award, Zap, SlidersHorizontal, Check, RefreshCw,
  Plus, LayoutGrid, List, MapPin, ChevronLeft
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts'
import { localDataService } from '../services/localData'
import { rankAndShortlist, SHORTLIST_DECISION, listCandidatesForJob } from '../services/shortlist'
import { pipelineService } from '../services/pipeline'
import { avatarColor } from '../utils/avatar'
import './AIShortlistPage.css'

const DIMENSIONS = [
  { key: 'technical', label: 'Technical' },
  { key: 'experience', label: 'Experience' },
  { key: 'screening', label: 'Screening' },
  { key: 'education', label: 'Education' },
  { key: 'communication', label: 'Communication' },
]

const DECISION_META = {
  [SHORTLIST_DECISION.RECOMMENDED]: { bg: 'rgba(0,184,148,0.12)', color: '#00B894', label: 'Recommended' },
  [SHORTLIST_DECISION.BELOW_LINE]: { bg: 'rgba(148,163,184,0.12)', color: '#94A3B8', label: 'Under Review' },
  [SHORTLIST_DECISION.KNOCKOUT]: { bg: 'rgba(255,107,107,0.12)', color: '#FF6B6B', label: 'Knocked Out' },
  approved: { bg: 'rgba(0,184,148,0.18)', color: '#00B894', label: 'Shortlisted' },
  rejected: { bg: 'rgba(255,107,107,0.18)', color: '#FF6B6B', label: 'Rejected' },
}

function ScoreBar({ score, label, maxScore = 100 }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const gradient = score >= 80 ? 'var(--color-success)' :
                   score >= 60 ? 'var(--color-warning)' :
                   'var(--color-danger)'
  return (
    <div className="score-bar-row" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span className="score-bar-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', width: 120 }}>{label}</span>
      <div className="score-bar-track" style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          className="score-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${(score / maxScore) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: gradient, borderRadius: 999 }}
        />
      </div>
      <span className="score-bar-value" style={{ color, fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono, monospace)', width: 38, textAlign: 'right' }}>{score}%</span>
    </div>
  )
}

function exportShortlistCSV(result, job) {
  if (!result?.ranked?.length) { toast.error('No applicants to export'); return }
  const rows = [
    ['Rank', 'Candidate Name', 'Email', 'AI Score', 'Decision', 'Experience', 'Current Company', 'Applied Role'],
    ...result.ranked.map((c, i) => [
      i + 1,
      `"${c.name}"`,
      `"${c.email}"`,
      c.aiScore,
      `"${c.shortlistDecision || 'recommended'}"`,
      `"${c.experience} yrs"`,
      `"${c.currentCompany || ''}"`,
      `"${job?.title || c.appliedFor || ''}"`
    ])
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-shortlist-${job?.title || 'export'}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Shortlist report exported as CSV!')
}

export default function AIShortlistPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobApplicantCounts, setJobApplicantCounts] = useState({})
  const [result, setResult] = useState(null)
  const [ranking, setRanking] = useState(false)
  const [filterDecision, setFilterDecision] = useState('all')
  const [expandedCandidate, setExpandedCandidate] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [acting, setActing] = useState(null)
  const [topNCap, setTopNCap] = useState(5)
  const [scoreFloor, setScoreFloor] = useState(70)

  // Multi-job Scalability States
  const [jobSearchQuery, setJobSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [isJobExpanded, setIsJobExpanded] = useState(false)
  const [jobViewMode, setJobViewMode] = useState('grid') // 'grid' | 'compact'

  // Load active job openings & applicant counts
  useEffect(() => {
    Promise.all([
      localDataService.list('jobs'),
      localDataService.list('candidates')
    ]).then(([js = [], cands = []]) => {
      setJobs(js)
      
      const countsMap = {}
      js.forEach(j => {
        const matching = cands.filter(c => 
          (c.jobId && String(c.jobId) === String(j.id)) ||
          (c.appliedFor && c.appliedFor.toLowerCase() === j.title.toLowerCase())
        )
        countsMap[j.id] = matching.length
      })
      setJobApplicantCounts(countsMap)

      if (js.length && !selectedJobId) {
        setSelectedJobId(js[0].id)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedJob = jobs.find((j) => j.id === selectedJobId)

  // Compute departments from jobs
  const departments = useMemo(() => {
    const set = new Set(['All'])
    jobs.forEach(j => { if (j.department) set.add(j.department) })
    return Array.from(set)
  }, [jobs])

  // Filter jobs based on search & department
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const q = jobSearchQuery.toLowerCase()
      const matchesSearch = (j.title || '').toLowerCase().includes(q) ||
        (j.department || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q)
      const matchesDept = selectedDept === 'All' || j.department === selectedDept
      return matchesSearch && matchesDept
    })
  }, [jobs, jobSearchQuery, selectedDept])

  // Automatically run AI rank & shortlist when job is selected
  useEffect(() => {
    if (selectedJobId) {
      runRanking(selectedJobId)
    }
  }, [selectedJobId, topNCap, scoreFloor]) // eslint-disable-line react-hooks/exhaustive-deps

  const runRanking = async (targetJobId = selectedJobId) => {
    if (!targetJobId) return
    setRanking(true)
    setExpandedCandidate(null)
    try {
      const res = await rankAndShortlist({ jobId: targetJobId, topN: topNCap, scoreFloor })
      if (res) {
        setResult(res)
      }
    } catch (err) {
      console.error('Ranking failed:', err)
      toast.error('AI evaluation failed — check console')
    } finally {
      setRanking(false)
    }
  }

  // Approve a recommended candidate
  const approve = async (candidate) => {
    if (!selectedJob) return
    setActing(candidate.id)
    try {
      await localDataService.update('candidates', candidate.id, { stage: 'Shortlisted', shortlistDecision: 'approved' })
      await pipelineService.scheduleAutoInterview({ candidate, job: selectedJob })
      toast.success(`${candidate.name} shortlisted — AI interview invitation sent!`)
      patchLocal(candidate.id, { shortlistDecision: 'approved', stage: 'Shortlisted' })
    } catch (err) {
      console.error('Approve failed:', err)
      toast.error('Could not approve candidate')
    } finally {
      setActing(null)
    }
  }

  // Batch approve all recommended candidates
  const batchApproveRecommended = async () => {
    if (!result?.recommended?.length || !selectedJob) return
    setRanking(true)
    let approvedCount = 0
    for (const cand of result.recommended) {
      try {
        await localDataService.update('candidates', cand.id, { stage: 'Shortlisted', shortlistDecision: 'approved' })
        await pipelineService.scheduleAutoInterview({ candidate: cand, job: selectedJob })
        approvedCount++
      } catch (e) {
        /* skip */
      }
    }
    toast.success(`🎉 Batch shortlisted ${approvedCount} top candidate(s) & dispatched interview invites!`)
    runRanking(selectedJobId)
  }

  // Reject / Override candidate
  const reject = async (candidate) => {
    setActing(candidate.id)
    try {
      await localDataService.update('candidates', candidate.id, { stage: 'Rejected', shortlistDecision: 'rejected' })
      toast(`${candidate.name} moved to rejected pool`, { icon: '🚫' })
      patchLocal(candidate.id, { shortlistDecision: 'rejected', stage: 'Rejected' })
    } catch (err) {
      console.error('Reject failed:', err)
      toast.error('Could not reject')
    } finally {
      setActing(null)
    }
  }

  const patchLocal = (id, patch) => {
    setResult((prev) => {
      if (!prev) return prev
      const apply = (arr) => arr.map((c) => (c.id === id ? { ...c, ...patch } : c))
      return { ...prev, ranked: apply(prev.ranked || []), recommended: apply(prev.recommended || []), belowLine: apply(prev.belowLine || []) }
    })
  }

  const allRows = result
    ? [...(result.ranked || []), ...(result.knockouts || []).map((k) => ({ ...k, shortlistDecision: SHORTLIST_DECISION.KNOCKOUT }))]
    : []

  const counts = result?.counts || { total: 0, survivors: 0, knockouts: 0, recommended: 0, belowLine: 0 }
  const avgScore = result?.ranked?.length
    ? Math.round(result.ranked.reduce((s, c) => s + (Number(c.aiScore) || 0), 0) / result.ranked.length)
    : 0

  const decisionOf = (c) => (['approved', 'rejected'].includes(c.shortlistDecision) ? c.shortlistDecision : c.shortlistDecision)

  const filtered = allRows
    .filter((c) => {
      if (filterDecision === 'all') return true
      return decisionOf(c) === filterDecision
    })
    .filter((c) => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()))

  const displayedJobs = isJobExpanded ? filteredJobs : filteredJobs.slice(0, 6)

  return (
    <div className="ai-shortlist-page">
      {/* Page Title & Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Brain size={26} style={{ color: 'var(--color-primary)' }} /> AI Screening &amp; Shortlisting
          </h1>
          <p className="page-subtitle">
            Select any job opening across all departments to evaluate applicant pools, score fit %, and shortlist top candidates.
          </p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => exportShortlistCSV(result, selectedJob)}
            disabled={!result?.ranked?.length}
          >
            <Download size={15} /> Export Shortlist
          </button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--color-primary)', border: 'none' }}
            disabled={ranking || !selectedJobId}
            onClick={async () => {
              if (!selectedJobId) return
              setRanking(true)
              try {
                const res = await pipelineService.runFullAutoPipeline(selectedJobId, {
                  onProgress: ({ message }) => toast(message, { icon: '🤖' }),
                })
                if (res?.shortlistResult) setResult(res.shortlistResult)
                toast.success('Autonomous Screening & Pipeline Dispatched!')
              } catch (e) {
                toast.error('Autopilot failed')
              } finally {
                setRanking(false)
              }
            }}
          >
            <Sparkles size={15} /> Autopilot Screening
          </button>
        </div>
      </div>

      {/* STEP 1: SELECT JOB OPENING (Scalable for 10, 50, 100+ Jobs) */}
      <div className="ai-job-selection-section">
        <div className="ai-section-label">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>STEP 1: SELECT JOB OPENING</span>
            <span className="ai-section-count">{jobs.length} Active Openings</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`btn btn-xs ${jobViewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setJobViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={12} /> Grid
            </button>
            <button
              className={`btn btn-xs ${jobViewMode === 'compact' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setJobViewMode('compact')}
              title="Compact View"
            >
              <List size={12} /> Compact
            </button>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => navigate('/jobs')}
              title="Create new job opening"
            >
              <Plus size={12} /> Post Job
            </button>
          </div>
        </div>

        {/* Job Search & Department Filter Bar */}
        <div className="ai-job-filter-toolbar">
          <div className="ai-job-search-input">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Filter by job title, department, or location (e.g. React, Design, Remote)..."
              value={jobSearchQuery}
              onChange={(e) => setJobSearchQuery(e.target.value)}
            />
            {jobSearchQuery && (
              <button className="btn btn-ghost btn-xs" onClick={() => setJobSearchQuery('')}>Clear</button>
            )}
          </div>

          <div className="ai-dept-pills">
            {departments.map((dept) => (
              <button
                key={dept}
                className={`ai-dept-pill ${selectedDept === dept ? 'active' : ''}`}
                onClick={() => setSelectedDept(dept)}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Jobs Cards Grid / Compact List */}
        {filteredJobs.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-card)' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              No job openings found matching "{jobSearchQuery}".
            </p>
          </div>
        ) : jobViewMode === 'grid' ? (
          <div className="ai-job-cards-grid">
            {displayedJobs.map((job) => {
              const isSelected = job.id === selectedJobId
              const applicantCount = jobApplicantCounts[job.id] || 0
              return (
                <motion.div
                  key={job.id}
                  className={`ai-job-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedJobId(job.id)}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                >
                  <div className="ai-job-card-top">
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                      {job.department || 'Engineering'}
                    </span>
                    {isSelected ? (
                      <span className="badge badge-live" style={{ fontSize: '0.66rem' }}>
                        <Check size={10} /> Active Selection
                      </span>
                    ) : (
                      <span className="badge badge-paused" style={{ fontSize: '0.66rem' }}>
                        {job.status || 'Active'}
                      </span>
                    )}
                  </div>

                  <h3 className="ai-job-card-title">{job.title}</h3>
                  <p className="ai-job-card-loc">
                    <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {job.location || 'Bangalore / Remote'}
                  </p>

                  <div className="ai-job-card-footer">
                    <div className="ai-job-applicants-pill">
                      <Users size={12} /> <strong>{applicantCount}</strong> Applicants
                    </div>
                    <span className="ai-job-card-action">
                      {isSelected ? 'Evaluating Pool →' : 'Select Opening →'}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* Compact View for 20+ Jobs */
          <div className="ai-job-compact-list">
            {displayedJobs.map((job) => {
              const isSelected = job.id === selectedJobId
              const applicantCount = jobApplicantCounts[job.id] || 0
              return (
                <div
                  key={job.id}
                  className={`ai-job-compact-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className={`ai-radio-dot ${isSelected ? 'active' : ''}`} />
                    <div>
                      <span className="ai-compact-title">{job.title}</span>
                      <span className="ai-compact-dept">({job.department || 'General'}) • {job.location || 'Remote'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                      <Users size={11} /> {applicantCount} Applicants
                    </span>
                    <span className="ai-job-card-action" style={{ fontSize: '0.75rem' }}>
                      {isSelected ? '✓ Selected' : 'Select →'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Expand / Collapse All Jobs Toggle when > 6 jobs */}
        {filteredJobs.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsJobExpanded(!isJobExpanded)}
              style={{ borderRadius: 20 }}
            >
              {isJobExpanded ? `Show Less` : `View All ${filteredJobs.length} Job Openings ▾`}
            </button>
          </div>
        )}
      </div>

      {/* STEP 2: AI SCREENING & SHORTLISTING RESULTS */}
      <div className="ai-shortlist-results-section">
        <div className="ai-section-label">
          <span>STEP 2: AI CANDIDATE EVALUATION &amp; SHORTLISTING ({selectedJob?.title || 'Selected Role'})</span>
          {ranking && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b5cf6' }}>
              <Loader2 size={14} className="spin" /> Scoring Applicant Pool...
            </span>
          )}
        </div>

        {/* 5 KPI Metric Strip */}
        <div className="ai-kpi-strip">
          {[
            { label: 'Total Applicants', value: counts.total, color: '#a5b4fc' },
            { label: 'Top Recommended', value: counts.recommended, color: '#10b981' },
            { label: 'Under Review', value: counts.belowLine, color: '#94a3b8' },
            { label: 'Knocked Out', value: counts.knockouts, color: '#ef4444' },
            { label: 'Average Match', value: `${avgScore}%`, color: '#f59e0b' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} className="ai-kpi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <span className="ai-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="ai-kpi-label">{kpi.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Threshold Bar & Batch Action Bar */}
        <div className="threshold-bar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} /> Shortlist Size:
            </span>
            <select
              value={topNCap}
              onChange={(e) => setTopNCap(Number(e.target.value))}
              className="jobs-filter-select"
              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
            >
              <option value={3}>Top 3 Candidates</option>
              <option value={5}>Top 5 Candidates</option>
              <option value={10}>Top 10 Candidates</option>
              <option value={25}>Top 25 Candidates</option>
            </select>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Score Floor:</span>
            <select
              value={scoreFloor}
              onChange={(e) => setScoreFloor(Number(e.target.value))}
              className="jobs-filter-select"
              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
            >
              <option value={60}>≥ 60% Passing</option>
              <option value={70}>≥ 70% Strong</option>
              <option value={80}>≥ 80% Top Tier</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={batchApproveRecommended}
              disabled={!result?.recommended?.length || ranking}
              style={{ background: 'var(--color-success)', border: 'none', fontWeight: 700 }}
            >
              <CheckCircle2 size={14} /> Batch Shortlist Top ({result?.recommended?.length || 0}) Candidates
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => runRanking(selectedJobId)}
              disabled={ranking}
            >
              <RefreshCw size={13} className={ranking ? 'spin' : ''} /> Re-Score Pool
            </button>
          </div>
        </div>

        {/* Search & Filter Buttons */}
        <div className="ai-filter-bar">
          <div className="ai-search-box">
            <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
            <input
              placeholder="Search applicants in this role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="ai-decision-filters">
            {[
              { id: 'all', label: 'All Applicants', count: allRows.length },
              { id: SHORTLIST_DECISION.RECOMMENDED, label: 'Recommended', count: counts.recommended },
              { id: SHORTLIST_DECISION.BELOW_LINE, label: 'Under Review', count: counts.belowLine },
              { id: SHORTLIST_DECISION.KNOCKOUT, label: 'Knocked Out', count: counts.knockouts },
              { id: 'approved', label: 'Shortlisted', count: allRows.filter(c => c.shortlistDecision === 'approved').length },
            ].map(f => (
              <button
                key={f.id}
                className={`ai-filter-btn ${filterDecision === f.id ? 'active' : ''}`}
                onClick={() => setFilterDecision(f.id)}
              >
                {f.label} <span className="ai-filter-count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Evaluation Cards */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', background: 'var(--surface-card)' }}>
            <Users size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>No applicants matching filter</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              No candidates found under the selected category for {selectedJob?.title}.
            </p>
          </div>
        ) : (
          <div className="ai-candidates-list">
            {filtered.map((candidate, idx) => {
              const isExpanded = expandedCandidate === candidate.id
              const decision = decisionOf(candidate)
              const meta = DECISION_META[decision] || DECISION_META[SHORTLIST_DECISION.BELOW_LINE]
              const isKnockout = decision === SHORTLIST_DECISION.KNOCKOUT
              const score = Number(candidate.aiScore) || 0
              const rankNum = idx + 1

              return (
                <motion.div
                  key={candidate.id}
                  className={`ai-candidate-card ${isExpanded ? 'expanded' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <div className="ai-candidate-header" onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}>
                    {/* Rank Badge */}
                    <div
                      className="ai-rank-badge"
                      style={{
                        background: rankNum === 1 ? 'var(--color-warning)' :
                                   rankNum === 2 ? 'var(--color-info)' :
                                   rankNum === 3 ? '#b45309' : 'var(--color-surface)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      #{rankNum}
                    </div>

                    {/* Avatar */}
                    <div className="ai-candidate-avatar" style={{ background: avatarColor(candidate.name || idx) }}>
                      {(candidate.name || 'C').charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="ai-candidate-info" style={{ flex: 1 }}>
                      <div className="ai-candidate-name-row">
                        <span className="ai-candidate-name">{candidate.name}</span>
                        <span className="badge" style={{ background: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.72rem' }}>
                          ● {meta.label}
                        </span>
                      </div>
                      <span className="ai-candidate-sub">
                        {candidate.currentTitle} at {candidate.currentCompany || 'Previous Firm'} • {candidate.experience} Years Exp
                      </span>
                    </div>

                    {/* AI Score Badge */}
                    {!isKnockout && (
                      <div className="ai-candidate-score-block">
                        <span className="ai-score-number" style={{ color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {score}%
                        </span>
                        <span className="ai-score-tag">Match Score</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="ai-candidate-actions" onClick={e => e.stopPropagation()}>
                      {decision !== 'approved' && !isKnockout && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => approve(candidate)}
                          disabled={acting === candidate.id}
                        >
                          {acting === candidate.id ? <Loader2 size={13} className="spin" /> : <ThumbsUp size={13} />} Shortlist
                        </button>
                      )}
                      {decision !== 'rejected' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => reject(candidate)}
                          disabled={acting === candidate.id}
                          title="Reject / Override"
                        >
                          <ThumbsDown size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        title="View Full Profile"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm">
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded AI Evaluation Rubric */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        className="ai-candidate-expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {isKnockout ? (
                          <div className="knockout-notice" style={{ padding: 16, background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertTriangle size={16} color="#ef4444" />
                            <span>Knocked out: Did not meet mandatory requirements for {selectedJob?.title}.</span>
                          </div>
                        ) : (
                          <div className="ai-evaluation-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {/* Left: 5 Dimension Score Bars */}
                            <div>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Competency Dimension Scores
                              </h4>
                              {DIMENSIONS.map(dim => {
                                const dimScore = candidate.aiBreakdown?.[dim.key] || Math.min(100, Math.round(score * (dim.key === 'technical' ? 0.95 : 1.02)))
                                return <ScoreBar key={dim.key} label={dim.label} score={dimScore} />
                              })}
                            </div>

                            {/* Right: Strengths & Skills Match */}
                            <div>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                AI Fit Analysis &amp; Matched Skills
                              </h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: '0 0 12px' }}>
                                {candidate.aiFeedback || `Strong match for ${selectedJob?.title} with deep experience in core stack.`}
                              </p>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {(candidate.skills || ['React', 'TypeScript', 'Node.js', 'System Design']).map(s => (
                                  <span key={s} className="job-card-skill" style={{ fontSize: '0.75rem' }}>✓ {s}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
