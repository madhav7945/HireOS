import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Globe, Wifi, WifiOff, Eye, MousePointerClick, Users, ExternalLink,
  Pause, Play, BarChart3, Calendar, Share2, Copy, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { JOB_BOARDS, MOCK_JOB_BOARD_POSTINGS, BOARD_POST_STATUSES } from '../data/jobBoardsData'
import { DEMO_JOBS } from '../data/mockData'
import { useJobs } from '../hooks/useSupabase'
import { getBoardById } from '../utils/jobShare'
import BoardPublisher from '../components/BoardPublisher'
import './JobBoardsPage.css'

// Build posting rows for a job that has no mock analytics: reflect the boards the
// user actually selected when creating it (wizard → job.selectedBoards).
function derivePostings(job) {
  const ids = job?.selectedBoards || job?.publishTargets || []
  return ids
    .map((id) => (getBoardById(id) || JOB_BOARDS.find((b) => b.id === id)) && id)
    .filter(Boolean)
    .map((id) => ({
      boardId: id,
      status: job?.status === 'live' ? 'live' : 'draft',
      postedAt: job?.postedOn || job?.created_at?.slice(0, 10) || null,
      views: 0, clicks: 0, applications: 0, expiresAt: null,
      derived: true,
    }))
}

export default function JobBoardsPage() {
  const { data: liveJobs = [] } = useJobs()

  // Prefer real jobs; fall back to demo data so the page is never empty.
  const jobs = useMemo(() => {
    const real = liveJobs.filter((j) => j.status === 'live' || j.status === 'open')
    return real.length ? real : DEMO_JOBS.filter((j) => j.status === 'live')
  }, [liveJobs])

  const [selectedJob, setSelectedJob] = useState(null)
  const [paused, setPaused] = useState(() => new Set())
  const [distributeJob, setDistributeJob] = useState(null)

  const activeJobId = selectedJob || jobs[0]?.id
  const job = jobs.find((j) => j.id === activeJobId) || jobs[0]

  // Mock analytics for the seeded demo jobs; otherwise reflect selected boards.
  const postings = useMemo(() => {
    if (!job) return []
    return MOCK_JOB_BOARD_POSTINGS[job.id] || derivePostings(job)
  }, [job])

  const totalViews = postings.reduce((s, p) => s + p.views, 0)
  const totalClicks = postings.reduce((s, p) => s + p.clicks, 0)
  const totalApps = postings.reduce((s, p) => s + p.applications, 0)

  const togglePause = (boardId) => {
    setPaused((prev) => {
      const next = new Set(prev)
      next.has(boardId) ? next.delete(boardId) : next.add(boardId)
      toast.success(next.has(boardId) ? 'Posting paused' : 'Posting resumed')
      return next
    })
  }

  const openDistribute = () => {
    if (!job) return toast.error('Create a live job first')
    setDistributeJob(job)
  }

  const availableCount = JOB_BOARDS.filter((b) => !postings.find((p) => p.boardId === b.id)).length

  return (
    <div className="job-boards-page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Globe size={28} style={{ color: 'var(--brand-accent)' }} /> Job Boards</h1>
          <p className="page-subtitle">Publish to LinkedIn, India & UK boards — no API keys, no cost</p>
        </div>
        <div className="dashboard-toolbar">
          <select className="dashboard-date-select" value={activeJobId || ''} onChange={(e) => setSelectedJob(e.target.value)}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openDistribute}><Share2 size={14} /> Distribute This Job</button>
        </div>
      </div>

      {/* Performance KPIs */}
      <div className="boards-kpi-strip">
        {[
          { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'var(--brand-primary-light)' },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'var(--brand-accent)' },
          { label: 'Applications', value: totalApps, icon: Users, color: 'var(--brand-success)' },
          { label: 'Active Boards', value: postings.filter((p) => p.status === 'live' && !paused.has(p.boardId)).length, icon: Globe, color: '#FDCB6E' },
          { label: 'Click Rate', value: totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : '0%', icon: BarChart3, color: '#A29BFE' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} className="boards-kpi" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <kpi.icon size={18} style={{ color: kpi.color }} />
            <span className="boards-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
            <span className="boards-kpi-label">{kpi.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Board Postings */}
      <div className="boards-list">
        <div className="boards-list-header">
          <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>Postings for: {job?.title || '—'}</h3>
        </div>
        <div className="boards-cards">
          {postings.map((posting, i) => {
            const board = JOB_BOARDS.find((b) => b.id === posting.boardId)
            if (!board) return null
            const isPaused = paused.has(posting.boardId)
            const status = BOARD_POST_STATUSES[isPaused ? 'paused' : posting.status]
            const ctr = posting.views > 0 ? ((posting.clicks / posting.views) * 100).toFixed(1) : 0

            return (
              <motion.div
                key={posting.boardId}
                className="board-posting-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="board-posting-top">
                  <div className="board-posting-logo" style={{ background: `${board.color}15`, color: board.color, fontWeight: 700, fontSize: '1.1rem' }}>
                    {board.logo || board.name.charAt(0)}
                  </div>
                  <div className="board-posting-info">
                    <span className="board-posting-name">{board.name}</span>
                    <span className="badge" style={{ background: `${status.color}20`, color: status.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.color, display: 'inline-block' }} />
                      {status.label}{posting.derived && board.method ? ` · ${board.method}` : ''}
                    </span>
                  </div>
                  <div className="board-posting-actions">
                    {posting.status === 'live' && (
                      <button className="btn btn-ghost btn-sm" title={isPaused ? 'Resume' : 'Pause'} onClick={() => togglePause(posting.boardId)}>
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" title="Re-share" onClick={openDistribute}><ExternalLink size={14} /></button>
                  </div>
                </div>

                <div className="board-posting-metrics">
                  <div className="bpm"><Eye size={13} /><span className="bpm-value">{posting.views.toLocaleString()}</span><span className="bpm-label">Views</span></div>
                  <div className="bpm"><MousePointerClick size={13} /><span className="bpm-value">{posting.clicks.toLocaleString()}</span><span className="bpm-label">Clicks</span></div>
                  <div className="bpm"><Users size={13} /><span className="bpm-value">{posting.applications}</span><span className="bpm-label">Applied</span></div>
                  <div className="bpm"><BarChart3 size={13} /><span className="bpm-value">{ctr}%</span><span className="bpm-label">CTR</span></div>
                </div>

                <div className="board-posting-dates">
                  <span><Calendar size={12} /> Posted: {posting.postedAt || '—'}</span>
                  {posting.expiresAt && <span>Expires: {posting.expiresAt}</span>}
                </div>
              </motion.div>
            )
          })}

          {postings.length === 0 && (
            <div className="board-posting-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-6)' }}>
              <Globe size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.5, margin: '0 auto var(--space-2)' }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>This job hasn't been distributed yet.</p>
              <button className="btn btn-primary btn-sm" onClick={openDistribute}><Share2 size={14} /> Distribute Now</button>
            </div>
          )}

          {/* Add More Board Card */}
          <motion.div className="board-posting-card board-add-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Globe size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Publish to More Boards</span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{availableCount} boards available</span>
            <button className="btn btn-secondary btn-sm" onClick={openDistribute}>+ Add Board</button>
          </motion.div>
        </div>
      </div>

      {/* All Connected Boards */}
      <div className="boards-overview">
        <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-4)' }}>All Job Boards ({JOB_BOARDS.length})</h3>
        <div className="boards-overview-grid">
          {JOB_BOARDS.map((board, i) => (
            <motion.div key={board.id} className="board-overview-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.03 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: `${board.color}1f`, color: board.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{board.logo || board.name.charAt(0)}</span>
              <span className="board-overview-name">{board.name}</span>
              <span className="board-conn-badge connected">
                <Wifi size={10} />
                {board.status === 'auto' ? 'Auto' : 'Ready'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {distributeJob && (
        <BoardPublisher
          job={distributeJob}
          selectedBoardIds={distributeJob.selectedBoards || distributeJob.publishTargets || []}
          onClose={() => setDistributeJob(null)}
        />
      )}
    </div>
  )
}
