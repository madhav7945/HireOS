import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Download, Star, Eye, X,
  LayoutGrid, List, UserPlus, Briefcase, Mail, Phone, Building2
} from 'lucide-react'
import ColumnChooser from '../components/ui/ColumnChooser'
import StatCards from '../components/ui/StatCards'
import Skeleton from '../components/ui/Skeleton'
import { useColumnChooser } from '../hooks/useColumnChooser'
import { useApplications, useCreateApplication, useJobs, useCandidates, useCreateCandidate } from '../hooks/useSupabase'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './ApplicationsPage.css'

function StarRating({ rating = 0, size = 14, interactive = false, onSelect }) {
  return (
    <div className="star-rating" style={{ display: 'flex', gap: 2, cursor: interactive ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          className={`star-icon ${star <= rating ? 'star-filled' : 'star-empty'}`}
          style={{
            cursor: interactive ? 'pointer' : 'default',
            color: star <= rating ? '#FDCB6E' : 'var(--text-disabled)',
            fill: star <= rating ? '#FDCB6E' : 'none',
            transition: 'transform 0.1s',
          }}
          onClick={() => interactive && onSelect && onSelect(star)}
        />
      ))}
    </div>
  )
}

function getStatusBadge(status) {
  const map = {
    'New': { className: 'badge-scheduled', label: 'New' },
    'Applied': { className: 'badge-scheduled', label: 'New' },
    'Under Review': { className: 'badge-paused', label: 'Under Review' },
    'In-Review': { className: 'badge-paused', label: 'Under Review' },
    'Screening': { className: 'badge-paused', label: 'Under Review' },
    'Shortlisted': { className: 'badge-primary', label: 'Shortlisted' },
    'Rejected': { className: 'badge-closed', label: 'Rejected' },
  }
  const match = map[status] || { className: 'badge-scheduled', label: status || 'New' }
  return <span className={`badge ${match.className}`}>{match.label}</span>
}

function normalizeStatus(status) {
  if (!status) return 'New'
  if (['New', 'Applied'].includes(status)) return 'New'
  if (['Under Review', 'In-Review', 'Screening'].includes(status)) return 'Under Review'
  if (status === 'Shortlisted') return 'Shortlisted'
  if (status === 'Rejected') return 'Rejected'
  return 'New'
}

function exportApplicationsCSV(applications, columns) {
  const headers = columns.map(c => c.label)
  const rows = applications.map(app => columns.map(col => {
    return col.get ? col.get(app) : (app[col.key] ?? '')
  }))
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hireos_applications_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Applications exported to CSV!')
}

const OPTIONAL_COLUMNS = [
  { key: 'source', label: 'Source', get: a => a.source || 'Direct / Sourced' },
  { key: 'created_at', label: 'Applied Date', get: a => a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recent' },
  { key: 'notes', label: 'Notes', get: a => a.notes ? a.notes.slice(0, 40) + '...' : '—' },
]

export default function ApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('table')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)

  // Candidate mode toggle in modal
  const [candidateMode, setCandidateMode] = useState('new') // 'new' | 'existing'
  const [selectedCandidateId, setSelectedCandidateId] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    jobId: '',
    postingTitle: '',
    status: 'New',
    rating: 4,
    source: 'Recruiter Sourced',
    experience: '3',
    currentCompany: '',
    notes: '',
  })

  // Data Hooks
  const { data: rawApplications = [], isLoading } = useApplications()
  const { data: jobs = [] } = useJobs()
  const { data: candidates = [] } = useCandidates()
  const createApplication = useCreateApplication()
  const createCandidate = useCreateCandidate()

  const { visible: visibleColumns, toggle: toggleColumn, activeColumns: activeOptionalCols } =
    useColumnChooser('hireos_application_columns', OPTIONAL_COLUMNS.map(c => ({ ...c, default: true })))

  // Normalize application list
  const applications = rawApplications.map(app => ({
    ...app,
    displayStatus: normalizeStatus(app.status || app.stage)
  }))

  const filtered = applications.filter((app) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = (app.name || '').toLowerCase().includes(q) ||
      (app.postingTitle || '').toLowerCase().includes(q) ||
      (app.applicationId || '').toLowerCase().includes(q) ||
      (app.displayStatus || '').toLowerCase().includes(q) ||
      (app.source || '').toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || app.displayStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSelectExistingCandidate = (cId) => {
    setSelectedCandidateId(cId)
    const c = candidates.find(cand => String(cand.id) === String(cId))
    if (c) {
      setFormData(prev => ({
        ...prev,
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        experience: String(c.experience || '3'),
        currentCompany: c.currentCompany || '',
      }))
    }
  }

  const handleSelectJob = (jId) => {
    const job = jobs.find(j => String(j.id) === String(jId) || String(j.jobId) === String(jId))
    setFormData(prev => ({
      ...prev,
      jobId: jId,
      postingTitle: job ? job.title : ''
    }))
  }

  const handleCreateApplication = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Candidate name is required')
      return
    }

    try {
      let candidateId = selectedCandidateId

      if (candidateMode === 'new' || !candidateId) {
        const newCand = await createCandidate.mutateAsync({
          name: formData.name.trim(),
          email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: formData.phone.trim(),
          experience: Number(formData.experience) || 0,
          currentCompany: formData.currentCompany.trim(),
          appliedFor: formData.postingTitle || 'General',
          jobId: formData.jobId || null,
          jobTitle: formData.postingTitle || 'General',
          stage: 'Applied',
          source: formData.source,
          coverLetter: formData.notes,
        })
        candidateId = newCand?.id || `cand-${Date.now()}`
      }

      const appSeqId = `ZR_APP_${applications.length + 1}`

      await createApplication.mutateAsync({
        name: formData.name.trim(),
        postingTitle: formData.postingTitle || 'General Application',
        jobId: formData.jobId || null,
        candidateId: candidateId,
        stage: 'Applied',
        status: formData.status,
        rating: Number(formData.rating) || 3,
        applicationId: appSeqId,
        source: formData.source,
        notes: formData.notes,
        created_at: new Date().toISOString(),
      })

      toast.success('Application added successfully!')
      setShowAddModal(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        jobId: '',
        postingTitle: '',
        status: 'New',
        rating: 4,
        source: 'Recruiter Sourced',
        experience: '3',
        currentCompany: '',
        notes: '',
      })
      setSelectedCandidateId('')
    } catch (err) {
      console.error('Failed to create application:', err)
      toast.error('Failed to create application')
    }
  }

  if (isLoading) {
    return <Skeleton.Page type="list" />
  }

  return (
    <div className="applications-page">
      {/* Header Bar — matching Candidates Page style */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">{filtered.length} total applications in directory</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => exportApplicationsCSV(filtered, [
              { key: 'name', label: 'Candidate Name' },
              { key: 'postingTitle', label: 'Posting Title' },
              { key: 'displayStatus', label: 'Status' },
              { key: 'rating', label: 'Rating' },
              { key: 'applicationId', label: 'Application ID' },
              { key: 'source', label: 'Source' },
            ])}
          >
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Application
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
            placeholder="Search applications by candidate, role, ID, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="jobs-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Application Statuses</option>
          <option value="New">New</option>
          <option value="Under Review">Under Review</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Rejected">Rejected</option>
        </select>

        <div className="app-view-toggle" style={{ marginLeft: 4 }}>
          <button
            className={`app-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <List size={14} />
          </button>
          <button
            className={`app-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ColumnChooser allColumns={OPTIONAL_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Application Statuses — clickable compact stat pills focused purely on applications */}
      <StatCards
        compact
        items={[
          {
            label: 'All Applications',
            value: applications.length,
            active: statusFilter === 'all',
            onClick: () => setStatusFilter('all'),
          },
          {
            label: 'New',
            value: applications.filter(a => a.displayStatus === 'New').length,
            active: statusFilter === 'New',
            onClick: () => setStatusFilter(statusFilter === 'New' ? 'all' : 'New'),
          },
          {
            label: 'Under Review',
            value: applications.filter(a => a.displayStatus === 'Under Review').length,
            active: statusFilter === 'Under Review',
            onClick: () => setStatusFilter(statusFilter === 'Under Review' ? 'all' : 'Under Review'),
          },
          {
            label: 'Shortlisted',
            value: applications.filter(a => a.displayStatus === 'Shortlisted').length,
            active: statusFilter === 'Shortlisted',
            onClick: () => setStatusFilter(statusFilter === 'Shortlisted' ? 'all' : 'Shortlisted'),
          },
          {
            label: 'Rejected',
            value: applications.filter(a => a.displayStatus === 'Rejected').length,
            active: statusFilter === 'Rejected',
            onClick: () => setStatusFilter(statusFilter === 'Rejected' ? 'all' : 'Rejected'),
          },
        ]}
      />

      {/* Full-Width Applications Content */}
      {viewMode === 'table' ? (
        <div className="table-container candidates-table" style={{ width: '100%' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 90 }}>Rating</th>
                <th>Applicant Name</th>
                <th>Posting Title</th>
                <th style={{ width: 140 }}>Status</th>
                <th style={{ width: 130 }}>Application ID</th>
                {activeOptionalCols.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6 + activeOptionalCols.length} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-tertiary)' }}>
                    No applications found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((app, i) => (
                  <motion.tr
                    key={app.id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="app-row"
                    onClick={() => setSelectedApplication(app)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <StarRating rating={app.rating || 0} />
                    </td>
                    <td>
                      <div className="candidate-cell">
                        <div
                          className="candidate-avatar"
                          style={{
                            background: avatarColor(app.name || 'A'),
                            width: 34,
                            height: 34,
                            fontSize: '0.8rem'
                          }}
                        >
                          {(app.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="candidate-cell-info">
                          <span className="candidate-name" style={{ color: 'var(--brand-primary-light)' }}>
                            {app.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{app.postingTitle || 'General Application'}</span>
                    </td>
                    <td>
                      {getStatusBadge(app.displayStatus)}
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>{app.applicationId || app.id}</span>
                    </td>
                    {activeOptionalCols.map(col => (
                      <td key={col.key} className="candidate-td-optional">
                        {col.get ? col.get(app) : app[col.key]}
                      </td>
                    ))}
                    <td className="app-row-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Preview Application"
                        onClick={() => setSelectedApplication(app)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map(app => (
            <div
              key={app.id}
              className="card"
              style={{ padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
              onClick={() => setSelectedApplication(app)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="candidate-avatar"
                    style={{ background: avatarColor(app.name || 'A'), width: 36, height: 36 }}
                  >
                    {(app.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px', fontSize: '0.98rem', color: 'var(--text-primary)' }}>{app.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{app.applicationId}</span>
                  </div>
                </div>
                {getStatusBadge(app.displayStatus)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                💼 {app.postingTitle || 'General Application'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <StarRating rating={app.rating || 0} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{app.source || 'Recruiter Sourced'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD APPLICATION MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAddModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="modal-container"
              style={{
                background: 'var(--surface-card, #121226)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#fff' }}>Add Application</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
                    Manually create a candidate job application record.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowAddModal(false)}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateApplication} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Candidate Mode Toggle */}
                <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: candidateMode === 'new' ? 'var(--brand-primary, #6C5CE7)' : 'transparent',
                      color: '#fff'
                    }}
                    onClick={() => { setCandidateMode('new'); setSelectedCandidateId('') }}
                  >
                    + New Applicant
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: candidateMode === 'existing' ? 'var(--brand-primary, #6C5CE7)' : 'transparent',
                      color: '#fff'
                    }}
                    onClick={() => setCandidateMode('existing')}
                  >
                    Choose Existing Candidate ({candidates.length})
                  </button>
                </div>

                {/* Existing Candidate Dropdown */}
                {candidateMode === 'existing' && (
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Select Candidate *
                    </label>
                    <select
                      value={selectedCandidateId}
                      onChange={e => handleSelectExistingCandidate(e.target.value)}
                      required={candidateMode === 'existing'}
                      className="jobs-filter-select"
                      style={{ width: '100%', padding: '10px 12px' }}
                    >
                      <option value="">Select a candidate...</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email || c.appliedFor || 'Applicant'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Candidate Personal Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Applicant Name *
                    </label>
                    <input
                      required
                      placeholder="e.g. Siddharth Joshi"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sid@example.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Job Position Dropdown */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Job Opening Position *
                  </label>
                  <select
                    value={formData.jobId}
                    onChange={e => handleSelectJob(e.target.value)}
                    className="jobs-filter-select"
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="">General Application / Unassigned</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Application Status & Rating */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Application Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="jobs-filter-select"
                      style={{ width: '100%', padding: '10px 12px' }}
                    >
                      <option value="New">New</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Candidate Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={e => setFormData({ ...formData, source: e.target.value })}
                      className="jobs-filter-select"
                      style={{ width: '100%', padding: '10px 12px' }}
                    >
                      <option>Recruiter Sourced</option>
                      <option>Website Direct</option>
                      <option>LinkedIn</option>
                      <option>Employee Referral</option>
                      <option>Indeed</option>
                    </select>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Initial Application Rating (1-5 Stars)
                  </label>
                  <div style={{ padding: '8px 0' }}>
                    <StarRating
                      rating={formData.rating}
                      size={20}
                      interactive={true}
                      onSelect={r => setFormData({ ...formData, rating: r })}
                    />
                  </div>
                </div>

                {/* Recruiter Notes */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    Application Notes &amp; Highlights
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add background notes, key qualifications, or application highlights..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createApplication.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> {createApplication.isPending ? 'Saving...' : 'Add Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* APPLICATION PREVIEW MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedApplication && (
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedApplication(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="modal-container"
              style={{
                background: 'var(--surface-card, #121226)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                padding: '28px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                color: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className="candidate-avatar"
                    style={{
                      background: avatarColor(selectedApplication.name || 'A'),
                      width: 44,
                      height: 44,
                      fontSize: '1.1rem'
                    }}
                  >
                    {(selectedApplication.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', margin: 0 }}>{selectedApplication.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.88rem' }}>
                      {selectedApplication.postingTitle} · {selectedApplication.applicationId}
                    </p>
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedApplication(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Status</span>
                  <div style={{ marginTop: 4 }}>{getStatusBadge(selectedApplication.displayStatus)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Rating</span>
                  <div style={{ marginTop: 4 }}><StarRating rating={selectedApplication.rating || 0} /></div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Source</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedApplication.source || 'Recruiter Sourced'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>Applied Date</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {selectedApplication.created_at ? new Date(selectedApplication.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              {selectedApplication.notes && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notes</span>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, margin: 0 }}>
                    {selectedApplication.notes}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setSelectedApplication(null)}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
