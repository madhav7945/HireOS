import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Search, Plus, Gift, CheckCircle, Clock, XCircle,
  Send, Star, ChevronRight, Award, TrendingUp, UserPlus
} from 'lucide-react'
import Skeleton from '../components/ui/Skeleton'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { useColumnChooser } from '../hooks/useColumnChooser'
import ColumnChooser from '../components/ui/ColumnChooser'
import StatCards from '../components/ui/StatCards'
import { avatarColor } from '../utils/avatar'
import toast from 'react-hot-toast'
import './ReferralsPage.css'

const REFERRALS = [
  { id: 1, referrer: 'Vikram Patel', referrerTitle: 'Engineering Manager', candidate: 'Karthik Rao', role: 'QA Automation Lead', department: 'Quality', status: 'hired', date: '2025-05-15', reward: '₹50,000' },
  { id: 2, referrer: 'Ananya Sharma', referrerTitle: 'Senior Designer', candidate: 'Deepak Menon', role: 'UI Designer', department: 'Design', status: 'in-review', date: '2025-06-01', reward: '₹25,000' },
  { id: 3, referrer: 'Sarah Chen', referrerTitle: 'Head of Talent', candidate: 'Riya Kapoor', role: 'Product Manager', department: 'Product', status: 'interview', date: '2025-05-28', reward: '₹30,000' },
  { id: 4, referrer: 'Amit Kumar', referrerTitle: 'Senior Recruiter', candidate: 'Harish Nair', role: 'Backend Developer', department: 'Engineering', status: 'rejected', date: '2025-05-10', reward: '—' },
  { id: 5, referrer: 'Priya Sharma', referrerTitle: 'Lead Product Designer', candidate: 'Sneha Reddy', role: 'UX Researcher', department: 'Design', status: 'new', date: '2025-06-03', reward: '₹25,000' },
  { id: 6, referrer: 'Vikram Patel', referrerTitle: 'Engineering Manager', candidate: 'Arun Kumar', role: 'DevOps Engineer', department: 'Engineering', status: 'in-review', date: '2025-06-02', reward: '₹40,000' },
]

const STATUS_MAP = {
  'new': { label: 'New', color: '#74B9FF', icon: Clock },
  'in-review': { label: 'In Review', color: '#FDCB6E', icon: Clock },
  'interview': { label: 'Interview', color: '#A29BFE', icon: Users },
  'hired': { label: 'Hired', color: '#00B894', icon: CheckCircle },
  'rejected': { label: 'Rejected', color: '#FF6B6B', icon: XCircle },
}

const EMPTY_REFERRAL = { referrer: 'Sarah Chen', referrerTitle: 'Head of Talent', candidate: '', role: '', department: 'Engineering', reward: '₹25,000' }

const REFERRAL_COLUMNS = [
  { key: 'referrer', label: 'Referred By', required: true, render: (ref) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(ref.referrer || ref.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{ref.referrer.charAt(0)}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{ref.referrer}</div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{ref.referrerTitle}</div>
      </div>
    </div>
  ) },
  { key: 'candidate', label: 'Candidate', render: (ref) => <span style={{ fontWeight: 600 }}>{ref.candidate}</span> },
  { key: 'role', label: 'Position', render: (ref) => <span style={{ color: 'var(--text-secondary)' }}>{ref.role}</span> },
  { key: 'department', label: 'Department', render: (ref) => <span className="badge badge-primary">{ref.department}</span> },
  { key: 'status', label: 'Status', render: (ref) => { const cfg = STATUS_MAP[ref.status] || STATUS_MAP.new; const Icon = cfg.icon; return <span className="badge" style={{ background: `${cfg.color}20`, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Icon size={12} /> {cfg.label}</span> } },
  { key: 'date', label: 'Referred On', render: (ref) => <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{ref.date}</span> },
  { key: 'reward', label: 'Reward', render: (ref) => <span style={{ fontWeight: 600, color: ref.reward === '—' ? 'var(--text-disabled)' : 'var(--color-success)' }}>{ref.reward}</span> },
]

export default function ReferralsPage() {
  const { isLoading } = useSimulatedLoading(600)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [referrals, setReferrals] = useState(REFERRALS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_REFERRAL })
  const [viewRef, setViewRef] = useState(null)
  const { visible: visibleColumns, toggle: toggleColumn, activeColumns } = useColumnChooser('hireos_referral_columns', REFERRAL_COLUMNS)

  const submitReferral = () => {
    if (!form.candidate.trim()) { toast.error('Candidate name is required'); return }
    if (!form.role.trim()) { toast.error('Position is required'); return }
    const newRef = {
      id: Date.now(),
      ...form,
      status: 'new',
      date: new Date().toISOString().split('T')[0],
    }
    setReferrals(prev => [newRef, ...prev])
    setShowForm(false)
    setForm({ ...EMPTY_REFERRAL })
    toast.success(`Referral for ${newRef.candidate} submitted!`)
  }

  const filtered = referrals.filter(r => {
    const matchSearch = r.referrer.toLowerCase().includes(search.toLowerCase()) ||
      r.candidate.toLowerCase().includes(search.toLowerCase()) ||
      r.role.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: referrals.length,
    hired: referrals.filter(r => r.status === 'hired').length,
    pending: referrals.filter(r => ['new', 'in-review', 'interview'].includes(r.status)).length,
    rate: Math.round((referrals.filter(r => r.status === 'hired').length / Math.max(referrals.length, 1)) * 100),
  }

  if (isLoading) return <Skeleton.Page type="table" />

  return (
    <div className="referrals-page">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title">Referrals</h1>
            <span className="badge badge-primary">{referrals.length}</span>
          </div>
          <p className="page-subtitle">Track employee referrals and reward programs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <UserPlus size={16} /> Submit Referral
        </button>
      </div>

      {/* Stats */}
      <StatCards items={[
        { icon: Users, value: stats.total, label: 'Total Referrals', color: '#74B9FF', bg: 'rgba(116, 185, 255, 0.12)' },
        { icon: CheckCircle, value: stats.hired, label: 'Hired', color: '#00B894', bg: 'rgba(0, 184, 148, 0.12)' },
        { icon: Clock, value: stats.pending, label: 'In Pipeline', color: '#FDCB6E', bg: 'rgba(253, 203, 110, 0.12)' },
        { icon: TrendingUp, value: `${stats.rate}%`, label: 'Conversion Rate', color: '#6C5CE7', bg: 'rgba(108, 92, 231, 0.12)' },
      ]} />

      {/* Toolbar */}
      <div className="referrals-toolbar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            style={{ width: 280, paddingLeft: 36, padding: 'var(--space-2) var(--space-3)', paddingLeft: 36, background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
            placeholder="Search referrals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="in-review">In Review</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <ColumnChooser allColumns={REFERRAL_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="table-container">
        <table>
          <thead>
            <tr>
              {activeColumns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ref, i) => (
              <motion.tr key={ref.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                {activeColumns.map(col => (
                  <td key={col.key}>{col.render(ref)}</td>
                ))}
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setViewRef(ref)}>
                    <ChevronRight size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Submit Referral modal */}
      {showForm && (
        <div className="referrals-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="referrals-modal" onClick={e => e.stopPropagation()}>
            <div className="referrals-modal-header">
              <span><UserPlus size={16} /> Submit Referral</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowForm(false)}><XCircle size={18} /></button>
            </div>
            <div className="referrals-modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input type="text" value={form.referrer} onChange={e => setForm(f => ({ ...f, referrer: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Title</label>
                  <input type="text" value={form.referrerTitle} onChange={e => setForm(f => ({ ...f, referrerTitle: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label form-label-required">Candidate Name</label>
                <input type="text" value={form.candidate} onChange={e => setForm(f => ({ ...f, candidate: e.target.value }))} placeholder="e.g. Karthik Rao" autoFocus />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label form-label-required">Position</label>
                  <input type="text" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Backend Developer" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option>Engineering</option><option>Design</option><option>Product</option><option>Data</option><option>Quality</option><option>Marketing</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Referral Reward</label>
                <input type="text" value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
              </div>
            </div>
            <div className="referrals-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReferral}><Send size={14} /> Submit Referral</button>
            </div>
          </div>
        </div>
      )}

      {/* Referral detail modal */}
      {viewRef && (
        <div className="referrals-modal-overlay" onClick={() => setViewRef(null)}>
          <div className="referrals-modal" onClick={e => e.stopPropagation()}>
            <div className="referrals-modal-header">
              <span><Award size={16} /> Referral — {viewRef.candidate}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewRef(null)}><XCircle size={18} /></button>
            </div>
            <div className="referrals-modal-body">
              <div className="referral-detail-grid">
                <div><span className="fp-label">Referred By</span><span className="fp-value">{viewRef.referrer} · {viewRef.referrerTitle}</span></div>
                <div><span className="fp-label">Candidate</span><span className="fp-value">{viewRef.candidate}</span></div>
                <div><span className="fp-label">Position</span><span className="fp-value">{viewRef.role}</span></div>
                <div><span className="fp-label">Department</span><span className="fp-value">{viewRef.department}</span></div>
                <div><span className="fp-label">Status</span><span className="fp-value">{(STATUS_MAP[viewRef.status] || STATUS_MAP.new).label}</span></div>
                <div><span className="fp-label">Referred On</span><span className="fp-value">{viewRef.date}</span></div>
                <div><span className="fp-label">Reward</span><span className="fp-value" style={{ color: 'var(--color-success)' }}>{viewRef.reward}</span></div>
              </div>
            </div>
            <div className="referrals-modal-footer">
              {viewRef.status !== 'hired' && viewRef.status !== 'rejected' && (
                <button className="btn btn-primary" onClick={() => { setReferrals(prev => prev.map(r => r.id === viewRef.id ? { ...r, status: 'hired' } : r)); setViewRef(null); toast.success(`${viewRef.candidate} marked as hired 🎉`) }}>
                  <CheckCircle size={14} /> Mark Hired
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setViewRef(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
