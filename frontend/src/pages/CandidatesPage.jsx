import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search, Filter, Download, Plus, Mail, Phone, MapPin,
  ExternalLink, Star, Tag, MoreHorizontal, X, Eye, UserPlus,
  ChevronRight, Briefcase, Clock, FileText, MessageSquare,
  Upload, Calendar, GraduationCap, User, Building2, Globe, Settings2
} from 'lucide-react'
import { DEMO_CANDIDATES } from '../data/mockData'
import Skeleton from '../components/ui/Skeleton'
import { useCandidates, useCreateCandidate } from '../hooks/useSupabase'
import { useCustomFields } from '../hooks/useCustomFields'
import { useColumnChooser } from '../hooks/useColumnChooser'
import ColumnChooser from '../components/ui/ColumnChooser'
import StatCards from '../components/ui/StatCards'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './CandidatesPage.css'

function getScoreColor(score) {
  if (score >= 80) return '#00B894'
  if (score >= 60) return '#FDCB6E'
  return '#FF6B6B'
}

function getScoreLabel(score) {
  if (score >= 80) return 'Strong'
  if (score >= 60) return 'Consider'
  return 'Low'
}

function StarRating({ rating = 0, size = 14 }) {
  return (
    <div className="star-rating" style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          className={`star-icon ${star <= rating ? 'star-filled' : 'star-empty'}`}
          style={{
            cursor: 'default',
            color: star <= rating ? '#FDCB6E' : 'var(--text-disabled)',
            fill: star <= rating ? '#FDCB6E' : 'none',
          }}
        />
      ))}
    </div>
  )
}

function exportCandidatesCSV(candidates, columns) {
  const headers = columns.map(c => c.label)
  const rows = candidates.map(cand => columns.map(col => {
    return col.get ? col.get(cand) : (cand[col.key] ?? '')
  }))
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hireos_candidates_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Candidates exported to CSV!')
}

const OPTIONAL_COLUMNS = [
  { key: 'email', label: 'Email Address', get: c => c.email },
  { key: 'phone', label: 'Phone Number', get: c => c.phone || '—' },
  { key: 'location', label: 'Location', get: c => c.location || '—' },
  { key: 'experience', label: 'Experience (Years)', get: c => c.experience ? `${c.experience} yrs` : '—' },
  { key: 'qualification', label: 'Highest Qualification', get: c => c.qualification || '—' },
  { key: 'source', label: 'Source', get: c => c.source || '—' },
  { key: 'appliedFor', label: 'Applied For (Role)', get: c => c.appliedFor || '—' },
  { key: 'owner', label: 'Candidate Owner', get: c => c.candidateOwner || '—' },
]

function AddCandidateModal({ isOpen, onClose, onSubmit, customFields = [] }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    currentTitle: '',
    currentCompany: '',
    experience: '',
    appliedFor: 'Senior React Developer',
    source: 'LinkedIn',
    stage: 'Applied',
    skills: '',
    expectedSalary: '',
    noticePeriod: '',
    customFields: {},
  })

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      toast.error('Please enter candidate name and email')
      return
    }
    const skillsArray = form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : []
    const newCandidate = {
      ...form,
      experience: Number(form.experience) || 0,
      skills: skillsArray,
      rating: 3,
      aiScore: 85,
      appliedDate: new Date().toISOString().split('T')[0],
    }
    onSubmit(newCandidate)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-container"
        style={{ maxWidth: 640 }}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        <div className="modal-header">
          <h2><UserPlus size={18} /> Add New Candidate</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun Patel"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. arjun@gmail.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91-98765-43210"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Role</label>
                <input
                  type="text"
                  placeholder="e.g. Senior React Developer"
                  value={form.appliedFor}
                  onChange={e => setForm({ ...form, appliedFor: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Current Company</label>
                <input
                  type="text"
                  placeholder="e.g. Flipkart"
                  value={form.currentCompany}
                  onChange={e => setForm({ ...form, currentCompany: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Current Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.currentTitle}
                  onChange={e => setForm({ ...form, currentTitle: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="6"
                  value={form.experience}
                  onChange={e => setForm({ ...form, experience: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Naukri">Naukri</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Referral">Referral</option>
                  <option value="Career Page">Career Page</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="React, TypeScript, Node.js, Redux, GraphQL"
                value={form.skills}
                onChange={e => setForm({ ...form, skills: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"><UserPlus size={14} /> Add Candidate</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const { visible: visibleColumns, toggle: toggleColumn, activeColumns: activeOptionalCols } =
    useColumnChooser('hireos_candidate_columns', OPTIONAL_COLUMNS.map(c => ({ ...c, default: ['source', 'owner'].includes(c.key) })))

  const { data: candidates = [], isLoading } = useCandidates()
  const createCandidate = useCreateCandidate()
  const { fields: customFields } = useCustomFields('candidates')

  const filtered = candidates.filter((c) => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.appliedFor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.currentCompany || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || c.stage === stageFilter
    return matchesSearch && matchesStage
  })

  const stages = [...new Set(candidates.map(c => c.stage))]

  const handleAddCandidate = async (data) => {
    try {
      const created = await createCandidate.mutateAsync(data)
      toast.success(`${data.name} added successfully!`)
      setShowAddModal(false)
      if (created?.id) {
        navigate(`/candidates/${created.id}`)
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to add candidate')
    }
  }

  if (isLoading) {
    return <Skeleton.Page type="list" />
  }

  return (
    <div className="candidates-page">
      {/* Header Bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">{filtered.length} total candidates in directory</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => exportCandidatesCSV(filtered, [
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'currentTitle', label: 'Current Role' },
            { key: 'currentCompany', label: 'Current Company' },
            { key: 'appliedFor', label: 'Applied Role' },
            { key: 'aiScore', label: 'AI Score' },
            { key: 'stage', label: 'Stage' },
            { key: 'source', label: 'Source' },
          ])}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} /> Add Candidate
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="candidates-filters">
        <div className="jobs-search-wrapper">
          <Search size={16} className="jobs-search-icon" />
          <input
            type="text"
            className="jobs-search"
            placeholder="Search candidates by name, email, company, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="jobs-filter-select"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <ColumnChooser allColumns={OPTIONAL_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Candidate Stages — clickable to filter */}
      <StatCards compact items={['New', 'Shortlisted', 'AI Interview Scheduled', 'AI Interview Complete', 'HR Review', 'Offer Sent', 'Hired', 'Manual Review'].map(stage => ({
        value: candidates.filter(c => c.stage === stage).length,
        label: stage,
        active: stageFilter === stage,
        onClick: () => setStageFilter(stageFilter === stage ? 'all' : stage),
      }))} />

      {/* Full-Width Candidates Table */}
      <div className="table-container candidates-table" style={{ width: '100%' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Rating</th>
              <th>Candidate</th>
              <th style={{ width: 70 }}>Score</th>
              <th style={{ width: 160 }}>Stage</th>
              {activeOptionalCols.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((candidate, i) => (
              <motion.tr
                key={candidate.id}
                onClick={() => navigate(`/candidates/${candidate.id}`)}
                style={{ cursor: 'pointer' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
              >
                <td><StarRating rating={candidate.rating || 0} size={12} /></td>
                <td>
                  <div className="candidate-cell">
                    <div className="candidate-avatar" style={{ background: avatarColor(candidate.name || i) }}>
                      {(candidate.name || 'C').charAt(0)}
                    </div>
                    <div className="candidate-cell-info">
                      <div className="candidate-name-row">
                        <span className="candidate-name">{candidate.name}</span>
                        {(candidate.tags || []).slice(0, 1).map(tag => (
                          <span key={tag} className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{tag}</span>
                        ))}
                      </div>
                      <span className="candidate-meta">{candidate.currentTitle} at {candidate.currentCompany}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="candidate-score-inline">
                    <span className="candidate-score-badge" style={{ background: `${getScoreColor(candidate.aiScore)}20`, color: getScoreColor(candidate.aiScore) }}>
                      {candidate.aiScore || 85}
                    </span>
                    <span className="candidate-score-label">{getScoreLabel(candidate.aiScore || 85)}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${candidate.stage?.toLowerCase().includes('complete') || candidate.stage?.toLowerCase().includes('shortlist') ? 'badge-live' : 'badge-primary'}`}>
                    {candidate.stage || 'Applied'}
                  </span>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{candidate.appliedDate || 'May 2026'}</div>
                </td>
                {activeOptionalCols.map(col => (
                  <td key={col.key} className="candidate-td-optional" title={col.get(candidate) || ''}>
                    {col.get(candidate) || '—'}
                  </td>
                ))}
                <td><ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddCandidateModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddCandidate}
            customFields={customFields}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
