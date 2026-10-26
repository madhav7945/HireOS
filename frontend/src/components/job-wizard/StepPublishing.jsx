import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Check, Clock, AlertCircle, ExternalLink, ChevronDown,
  ChevronUp, Calendar, Zap, Eye, BarChart3, Wifi, Settings
} from 'lucide-react'
import { JOB_BOARDS, BOARD_POST_STATUSES } from '../../data/jobBoardsData'

export default function StepPublishing({ formData = {}, onChange }) {
  const [selectedBoards, setSelectedBoards] = useState(formData.selectedBoards || ['linkedin', 'indeed', 'naukri', 'google_jobs'])
  const [scheduleType, setScheduleType] = useState(formData.scheduleType || 'now')
  const [scheduleDate, setScheduleDate] = useState(formData.scheduleDate || '')
  const [autoExpiry, setAutoExpiry] = useState(formData.autoExpiry || '30')
  const [expandedBoard, setExpandedBoard] = useState(null)
  const [filter, setFilter] = useState('all')

  // Sync local state when parent formData changes (e.g. when navigating back)
  React.useEffect(() => {
    if (formData.selectedBoards) {
      setSelectedBoards(formData.selectedBoards)
    }
  }, [formData.selectedBoards])

  const toggleBoard = (boardId) => {
    const updated = selectedBoards.includes(boardId)
      ? selectedBoards.filter(id => id !== boardId)
      : [...selectedBoards, boardId]
    setSelectedBoards(updated)
    onChange?.({ ...formData, selectedBoards: updated })
  }

  const categories = [
    { key: 'all', label: 'All Boards' },
    { key: 'global', label: 'Global' },
    { key: 'india', label: 'India' },
  ]

  const filteredBoards = filter === 'all' ? JOB_BOARDS : JOB_BOARDS.filter(b => b.region === filter)

  // Total reach across every board (each entry carries a real, single-source
  // avgReach now — no fake "connected" gating).
  const totalReach = JOB_BOARDS.reduce((sum, b) => sum + parseInt((b.avgReach || '').replace(/[^0-9]/g, '') || 0), 0)

  return (
    <div className="step-publishing">
      {/* Publishing Options */}
      <div className="publishing-header">
        <div className="publishing-stats">
          <div className="pub-stat">
            <span className="pub-stat-value gradient-text">{selectedBoards.length}</span>
            <span className="pub-stat-label">Boards Selected</span>
          </div>
          <div className="pub-stat">
            <span className="pub-stat-value" style={{ color: 'var(--brand-success)' }}>
              {JOB_BOARDS.length}
            </span>
            <span className="pub-stat-label">Ready · No API</span>
          </div>
          <div className="pub-stat">
            <span className="pub-stat-value" style={{ color: 'var(--brand-accent)' }}>
              {totalReach.toLocaleString()}+
            </span>
            <span className="pub-stat-label">Est. Total Reach</span>
          </div>
        </div>
      </div>

      {/* Schedule Options */}
      <div className="schedule-section">
        <h4 className="section-label">Publishing Schedule</h4>
        <div className="schedule-options">
          {[
            { value: 'now', label: 'Post Immediately', icon: Zap, desc: 'Goes live right away' },
            { value: 'schedule', label: 'Schedule for Later', icon: Calendar, desc: 'Pick date & time' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`schedule-option ${scheduleType === opt.value ? 'active' : ''}`}
              onClick={() => { setScheduleType(opt.value); onChange?.({ ...formData, scheduleType: opt.value }) }}
            >
              <div className="schedule-radio">
                <div className={`radio-dot ${scheduleType === opt.value ? 'checked' : ''}`} />
              </div>
              <opt.icon size={18} />
              <div>
                <span className="schedule-label">{opt.label}</span>
                <span className="schedule-desc">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>

        {scheduleType === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="schedule-datetime"
          >
            <div className="form-group">
              <label className="form-label">Schedule Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => { setScheduleDate(e.target.value); onChange?.({ ...formData, scheduleDate: e.target.value }) }}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </motion.div>
        )}

        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Auto-expiry (days)</label>
          <select
            value={autoExpiry}
            onChange={(e) => { setAutoExpiry(e.target.value); onChange?.({ ...formData, autoExpiry: e.target.value }) }}
          >
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="45">45 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>

      {/* Category Filter */}
      <div className="board-filter-bar">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`board-filter-btn ${filter === cat.key ? 'active' : ''}`}
            onClick={() => setFilter(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Board Grid — every board is reachable for free, so all are selectable. */}
      <div className="boards-grid">
        {filteredBoards.map((board, i) => {
          const isSelected = selectedBoards.includes(board.id)
          const isExpanded = expandedBoard === board.id
          const isAuto = board.status === 'auto'

          return (
            <motion.div
              key={board.id}
              className={`board-card ${isSelected ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="board-card-header" onClick={() => toggleBoard(board.id)}>
                <div className="board-card-check">
                  <div className={`board-checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <Check size={14} />}
                  </div>
                </div>
                <div className="board-logo" style={{ background: `${board.color}20`, color: board.color }}>
                  <span style={{ fontSize: '1.3rem' }}>{board.logo}</span>
                </div>
                <div className="board-info">
                  <div className="board-name-row">
                    <span className="board-name">{board.name}</span>
                    {isAuto && (
                      <span className="badge badge-accent" style={{ fontSize: '0.6rem' }}>Auto</span>
                    )}
                  </div>
                  <span className="board-reach">{board.avgReach} reach • {board.costPerPost}</span>
                  {board.method && <span className="board-reach" style={{ color: 'var(--brand-accent)', opacity: 0.85 }}>⚡ {board.method}</span>}
                </div>
                <div className="board-actions">
                  <span className="board-status-indicator connected">
                    <Wifi size={12} />
                    {isAuto ? 'Auto' : 'Ready'}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); setExpandedBoard(isExpanded ? null : board.id) }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="board-details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="board-features">
                      {board.features.map(f => (
                        <span key={f} className="board-feature-tag">{f}</span>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={12} /> {isAuto
                        ? 'Auto-indexed from your feed / JSON-LD — nothing to click.'
                        : 'On publish, we copy a ready-to-paste post and open this board (or its share box). No account connection needed.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Selection Summary */}
      <div className="publishing-summary">
        <div className="summary-icon">
          <Globe size={20} />
        </div>
        <div>
          <strong>{selectedBoards.length} board{selectedBoards.length !== 1 ? 's' : ''} selected</strong>
          <span style={{ color: 'var(--text-tertiary)', marginLeft: 'var(--space-2)' }}>
            — {scheduleType === 'now' ? 'Publishing immediately' : `Scheduled for ${scheduleDate || 'TBD'}`}
            {autoExpiry !== 'never' && ` • Auto-expires in ${autoExpiry} days`}
          </span>
        </div>
      </div>
    </div>
  )
}
