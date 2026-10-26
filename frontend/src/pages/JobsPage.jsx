import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, Download, MoreHorizontal, Eye, Edit2,
  Copy, Pause, Play, Trash2, ExternalLink, MapPin, Clock, Users,
  Briefcase, ChevronDown, LayoutGrid, List, X, Settings2, Upload
} from 'lucide-react'
import { DEMO_JOBS, DEPARTMENTS, JOB_STATUSES } from '../data/mockData'
import Skeleton from '../components/ui/Skeleton'
import { useJobs, useCreateJob, useDeleteJob } from '../hooks/useSupabase'
import ColumnChooser from '../components/ui/ColumnChooser'
import JobDetailsModal from '../components/modals/JobDetailsModal'
import toast from 'react-hot-toast'
import './JobsPage.css'

const STATUS_CONFIG = {
  live: { label: 'Live', class: 'badge-live', dot: 'status-dot-active' },
  draft: { label: 'Draft', class: 'badge-draft', dot: 'status-dot-inactive' },
  closed: { label: 'Closed', class: 'badge-closed', dot: 'status-dot-danger' },
  paused: { label: 'Paused', class: 'badge-paused', dot: 'status-dot-warning' },
  scheduled: { label: 'Scheduled', class: 'badge-scheduled', dot: 'status-dot-inactive' },
  expired: { label: 'Expired', class: 'badge-expired', dot: 'status-dot-inactive' },
}

// Zoho-style column definitions — all available fields
const ALL_JOB_COLUMNS = [
  { key: 'id', label: 'Job Opening ID', required: false, default: true },
  { key: 'title', label: 'Posting Title', required: true, default: true },
  { key: 'recruiter', label: 'Assigned Recruiter(s)', required: false, default: true },
  { key: 'targetDate', label: 'Target Date', required: false, default: true },
  { key: 'status', label: 'Job Opening Status', required: false, default: true },
  { key: 'city', label: 'City', required: false, default: true },
  { key: 'department', label: 'Department Name', required: false, default: true },
  { key: 'hiringManager', label: 'Hiring Manager', required: false, default: true },
  { key: 'type', label: 'Job Type', required: false, default: false },
  { key: 'workMode', label: 'Work Mode', required: false, default: false },
  { key: 'openings', label: 'Number of Positions', required: false, default: false },
  { key: 'applied', label: 'Number of Applications', required: false, default: false },
  { key: 'salary', label: 'Salary Range', required: false, default: false },
  { key: 'priority', label: 'Priority', required: false, default: false },
  { key: 'postedOn', label: 'Posted Date', required: false, default: false },
  { key: 'daysOpen', label: 'Days Open', required: false, default: false },
]

function exportJobsCSV(jobs, columns) {
  const headers = columns.map(c => c.label)
  const rows = jobs.map(job => columns.map(col => {
    if (col.key === 'salary') return job.salary ? `${job.salary.min}-${job.salary.max} ${job.salary.currency}` : ''
    if (col.key === 'targetDate') return job.postedOn ? new Date(new Date(job.postedOn).getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : 'TBD'
    if (col.key === 'city') return job.location?.split(',')[0] || ''
    return job[col.key] ?? ''
  }))
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `hireos_jobs_${new Date().toISOString().split('T')[0]}.csv`
  a.click(); URL.revokeObjectURL(url)
  toast.success('Jobs exported to CSV!')
}

export default function JobsPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [selectedJobs, setSelectedJobs] = useState([])
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null)
  const [visibleColumns, setVisibleColumns] = useState(
    ALL_JOB_COLUMNS.filter(c => c.default).map(c => c.key)
  )
  
  const { data: jobs = [], isLoading } = useJobs()
  const createJob = useCreateJob()
  const deleteJob = useDeleteJob()
  const importInputRef = React.useRef(null)

  const handleImportFile = async (file) => {
    if (!file) return
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { toast.error('CSV has no data rows'); return }
      const parseRow = (line) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.slice(0, -1).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || line.split(',')
      const headers = parseRow(lines[0]).map(h => h.toLowerCase())
      const idx = (names) => headers.findIndex(h => names.some(n => h.includes(n)))
      const tI = idx(['posting title', 'title']), dI = idx(['department']), lI = idx(['city', 'location']), sI = idx(['status'])
      if (tI === -1) { toast.error('CSV must include a "Title" column'); return }
      let count = 0
      for (let i = 1; i < lines.length; i++) {
        const cells = parseRow(lines[i])
        const title = cells[tI]?.trim()
        if (!title) continue
        await createJob.mutateAsync({
          title,
          department: dI > -1 ? cells[dI]?.trim() || 'General' : 'General',
          location: lI > -1 ? cells[lI]?.trim() || 'Remote' : 'Remote',
          status: sI > -1 ? (cells[sI]?.trim().toLowerCase() || 'draft') : 'draft',
        })
        count++
      }
      toast.success(`Imported ${count} job${count !== 1 ? 's' : ''} from CSV`)
    } catch (err) {
      toast.error('Failed to import CSV')
    }
  }

  const handleDeleteJob = async (id) => {
    try {
      await deleteJob.mutateAsync(id)
      toast.success('Job opening deleted')
    } catch (err) {
      toast.error('Failed to delete job')
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = (job.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    const matchesDept = departmentFilter === 'all' || job.department === departmentFilter
    return matchesSearch && matchesStatus && matchesDept
  })

  const toggleSelect = (id) => {
    setSelectedJobs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(filteredJobs.map((j) => j.id))
    }
  }

  const toggleColumn = (key) => {
    const col = ALL_JOB_COLUMNS.find(c => c.key === key)
    if (col?.required) return
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const activeColumns = ALL_JOB_COLUMNS.filter(c => visibleColumns.includes(c.key))

  if (isLoading) {
    return <Skeleton.Page type="table" />
  }

  return (
    <div className="jobs-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title">Job Openings</h1>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>{jobs.length}</span>
          </div>
          <p className="page-subtitle">Manage all your job postings and track applications</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => exportJobsCSV(filteredJobs, activeColumns)}>
            <Download size={16} /> Export
          </button>
          <input ref={importInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { handleImportFile(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn btn-secondary" onClick={() => importInputRef.current?.click()} title="Import jobs from a CSV with a Title column">
            <Upload size={16} /> Import
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/jobs/create')}>
            <Plus size={16} /> New Job
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="jobs-filters">
        <div className="jobs-search-wrapper">
          <Search size={16} className="jobs-search-icon" />
          <input
            type="text"
            className="jobs-search"
            placeholder="Search jobs by title, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="jobs-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="jobs-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          className="jobs-filter-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div className="jobs-view-toggle">
          <button
            className={`jobs-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <List size={16} />
          </button>
          <button
            className={`jobs-view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>

        {/* Column Chooser */}
        <ColumnChooser allColumns={ALL_JOB_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedJobs.length > 0 && (
          <motion.div
            className="jobs-bulk-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span>{selectedJobs.length} selected</span>
            <button className="btn btn-ghost btn-sm"><Copy size={14} /> Duplicate</button>
            <button className="btn btn-ghost btn-sm"><Pause size={14} /> Pause</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /> Delete</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table View with Dynamic Columns */}
      {viewMode === 'table' ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedJobs.length === filteredJobs.length && filteredJobs.length > 0}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16 }}
                  />
                </th>
                {activeColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, i) => {
                const statusCfg = STATUS_CONFIG[job.status?.toLowerCase()] || STATUS_CONFIG.live
                const formatSalaryVal = () => {
                  if (job.salary?.min || job.salary?.max) {
                    return `₹${(job.salary.min/100000).toFixed(0)}L - ₹${(job.salary.max/100000).toFixed(0)}L`
                  }
                  if (job.salaryMin || job.salaryMax) {
                    return `₹${(Number(job.salaryMin)/100000).toFixed(0)}L - ₹${(Number(job.salaryMax)/100000).toFixed(0)}L`
                  }
                  return '—'
                }
                return (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={() => toggleSelect(job.id)}
                        style={{ width: 16, height: 16 }}
                      />
                    </td>
                    {activeColumns.map(col => (
                      <td key={col.key}>
                        {col.key === 'id' && <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{(job.jobId || job.id).toUpperCase()}</span>}
                        {col.key === 'title' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.title}</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                              {job.type || job.jobType} • {job.workMode}
                            </span>
                          </div>
                        )}
                        {col.key === 'recruiter' && (job.recruiter || (Array.isArray(job.recruiters) ? job.recruiters.join(', ') : 'Sarah Chen'))}
                        {col.key === 'hiringManager' && (job.hiringManager || 'Sarah Chen')}
                        {col.key === 'targetDate' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
                            {job.deadline || job.targetDate || (job.postedOn ? new Date(new Date(job.postedOn).getTime() + 30*24*60*60*1000).toISOString().split('T')[0] : 'TBD')}
                          </span>
                        )}
                        {col.key === 'status' && (
                          <span className={`badge ${statusCfg.class}`}>
                            <span className={`status-dot ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        )}
                        {col.key === 'city' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} style={{ color: 'var(--text-tertiary)' }} />
                            {(job.location || 'Remote').split(',')[0]}
                          </span>
                        )}
                        {col.key === 'department' && job.department}
                        {col.key === 'type' && (job.type || job.jobType)}
                        {col.key === 'workMode' && job.workMode}
                        {col.key === 'openings' && (job.openings || 1)}
                        {col.key === 'applied' && (job.applied || 0)}
                        {col.key === 'salary' && formatSalaryVal()}
                        {col.key === 'priority' && (
                          <span className={`badge ${job.priority === 'urgent' ? 'badge-danger' : job.priority === 'high' ? 'badge-warning' : 'badge-primary'}`}>
                            {job.priority || 'Normal'}
                          </span>
                        )}
                        {col.key === 'postedOn' && (job.postedOn || 'Recently')}
                        {col.key === 'daysOpen' && `${job.daysOpen || 0}d`}
                      </td>
                    ))}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/jobs/${job.id}`)} title="View Job Details">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card View */
        <div className="jobs-card-grid">
          {filteredJobs.map((job, i) => {
            const statusCfg = STATUS_CONFIG[job.status?.toLowerCase()] || STATUS_CONFIG.live
            return (
              <motion.div
                key={job.id}
                className="job-card card card-interactive"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/jobs/${job.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="job-card-header">
                  <span className={`badge ${statusCfg.class}`}>
                    <span className={`status-dot ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                  {job.priority === 'urgent' && (
                    <span className="badge badge-urgent">Urgent</span>
                  )}
                </div>
                <h3 className="job-card-title">{job.title}</h3>
                <div className="job-card-meta">
                  <span><Briefcase size={13} /> {job.department}</span>
                  <span><MapPin size={13} /> {job.location}</span>
                  <span><Clock size={13} /> {job.daysOpen || 0}d open</span>
                </div>
                <div className="job-card-skills">
                  {(job.skills || ['AI Screening']).slice(0, 3).map((skill) => (
                    <span key={skill} className="job-card-skill">{skill}</span>
                  ))}
                  {job.skills?.length > 3 && (
                    <span className="job-card-skill">+{job.skills.length - 3}</span>
                  )}
                </div>
                <div className="job-card-stats">
                  <div className="job-card-stat">
                    <span className="job-card-stat-value">{job.applied || 0}</span>
                    <span className="job-card-stat-label">Applied</span>
                  </div>
                  <div className="job-card-stat">
                    <span className="job-card-stat-value">{job.shortlisted || 0}</span>
                    <span className="job-card-stat-label">Shortlisted</span>
                  </div>
                  <div className="job-card-stat">
                    <span className="job-card-stat-value">{job.aiInterviews || 0}</span>
                    <span className="job-card-stat-label">AI Interviews</span>
                  </div>
                  <div className="job-card-stat">
                    <span className="job-card-stat-value">{job.offers || 0}</span>
                    <span className="job-card-stat-label">Offers</span>
                  </div>
                </div>
                <div className="job-card-footer" onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                    {job.recruiter || 'Sarah Chen'}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/jobs/${job.id}`)}>
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="jobs-pagination">
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
          Showing {filteredJobs.length} of {jobs.length} jobs
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <button className="btn btn-ghost btn-sm" disabled>Previous</button>
          <button className="btn btn-primary btn-sm">1</button>
          <button className="btn btn-ghost btn-sm">Next</button>
        </div>
      </div>

      {/* Job Details Slide-Over Drawer */}
      {selectedJobForDetails && (
        <JobDetailsModal
          job={selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onDelete={handleDeleteJob}
        />
      )}
    </div>
  )
}
