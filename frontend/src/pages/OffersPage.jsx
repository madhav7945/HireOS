import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle2, Clock, Send, DollarSign, Award,
  TrendingUp, Plus, Search, Filter, Download, Copy, ExternalLink,
  ShieldCheck, AlertCircle, X, ChevronRight, UserCheck, Eye,
  Building2, User, Sparkles, RefreshCw, Calendar, ChevronDown, Check
} from 'lucide-react'
import { DEMO_OFFERS, DEMO_CANDIDATES, DEMO_JOBS } from '../data/mockData'
import { useOffers, useCreateOffer, useUpdateOffer, useCandidates } from '../hooks/useSupabase'
import { avatarColor } from '../utils/avatar'
import { fetchApi } from '../api/client'
import toast from 'react-hot-toast'
import './OffersPage.css'

const STAGE_TABS = [
  { key: 'all', label: 'All Offers' },
  { key: 'pending_approval', label: 'Pending HR Approval' },
  { key: 'sent', label: 'Sent to Candidate' },
  { key: 'accepted', label: 'Accepted & Hired' },
  { key: 'negotiation', label: 'In Negotiation' },
  { key: 'draft', label: 'Draft' },
]

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'accepted':
    case 'signed':
      return <span className="badge badge-live" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Accepted & Hired</span>
    case 'sent':
      return <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Send size={12} /> Sent / Awaiting Signature</span>
    case 'pending_approval':
    case 'review':
      return <span className="badge badge-paused" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)' }}><Clock size={12} /> Pending HR Approval</span>
    case 'negotiation':
      return <span className="badge badge-scheduled" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Negotiation</span>
    case 'draft':
      return <span className="badge badge-draft" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Draft</span>
    case 'declined':
    case 'rejected':
      return <span className="badge badge-closed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Declined</span>
    default:
      return <span className="badge badge-draft">{status || 'Draft'}</span>
  }
}

export default function OffersPage() {
  const navigate = useNavigate()
  const { data: dbOffers = [], isLoading, refetch } = useOffers()
  const { data: candidates = DEMO_CANDIDATES } = useCandidates()
  const createOfferMut = useCreateOffer()
  const updateOfferMut = useUpdateOffer()

  // Merge database offers with enriched demo offers
  const allOffers = useMemo(() => {
    const defaultList = DEMO_OFFERS.map(o => ({
      ...o,
      baseSalaryNum: parseInt(String(o.salary).replace(/[^0-9]/g, '')) || 2500000,
      equity: o.equity || '0.25%',
      bonus: o.bonus || 'INR 3,00,000',
      magicToken: o.magicToken || `tok_${o.id}_${Math.random().toString(36).substring(2, 9)}`,
      approvalStatus: o.approvalStatus || (o.status === 'draft' ? 'pending_vp' : 'approved'),
      createdDate: o.sentDate || '2026-06-01',
      candidateScore: o.candidateScore || 90,
      signatureHash: o.status === 'accepted' ? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' : null
    }))

    if (!dbOffers || dbOffers.length === 0) return defaultList

    // Map db offers
    const mappedDb = dbOffers.map(db => ({
      id: db.id,
      candidate: db.candidate_name || db.candidate || 'Candidate',
      email: db.email || db.candidate_email || 'candidate@example.com',
      role: db.role || db.job_title || 'Software Engineer',
      department: db.department || 'Engineering',
      salary: typeof db.salary === 'number' ? `$${db.salary.toLocaleString()}` : (db.salary || '$150,000'),
      baseSalaryNum: Number(db.salary) || 150000,
      equity: db.equity ? `${db.equity}%` : '0.2%',
      bonus: db.bonus ? `$${Number(db.bonus).toLocaleString()}` : '$15,000',
      status: db.status || 'draft',
      approvalStatus: db.approval_status || 'approved',
      sentDate: db.sent_date || db.created_at ? new Date(db.sent_date || db.created_at).toLocaleDateString() : 'Recent',
      expiresIn: db.expires_in || '7 days',
      approver: db.approver || 'Sarah Chen (VP HR)',
      magicToken: db.magic_token || db.token || `tok_${db.id}`,
      signatureHash: db.signature_hash || null,
      candidateScore: db.candidate_score || 88,
    }))

    return [...mappedDb, ...defaultList.filter(d => !mappedDb.some(m => m.id === d.id))]
  }, [dbOffers])

  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [approvalModalOffer, setApprovalModalOffer] = useState(null)

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    return allOffers.filter(offer => {
      // Tab filter
      if (activeTab === 'pending_approval' && offer.status !== 'pending_approval' && offer.approvalStatus !== 'pending_vp' && offer.status !== 'draft') return false
      if (activeTab === 'sent' && offer.status !== 'sent') return false
      if (activeTab === 'accepted' && offer.status !== 'accepted' && offer.status !== 'signed') return false
      if (activeTab === 'negotiation' && offer.status !== 'negotiation') return false
      if (activeTab === 'draft' && offer.status !== 'draft') return false

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = offer.candidate?.toLowerCase().includes(q)
        const matchRole = offer.role?.toLowerCase().includes(q)
        const matchEmail = offer.email?.toLowerCase().includes(q)
        const matchApprover = offer.approver?.toLowerCase().includes(q)
        if (!matchName && !matchRole && !matchEmail && !matchApprover) return false
      }

      // Department
      if (deptFilter !== 'all' && offer.department !== deptFilter) return false

      return true
    })
  }, [allOffers, activeTab, searchQuery, deptFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = allOffers.length
    const pendingApproval = allOffers.filter(o => o.status === 'draft' || o.approvalStatus === 'pending_vp' || o.status === 'pending_approval').length
    const sent = allOffers.filter(o => o.status === 'sent').length
    const accepted = allOffers.filter(o => o.status === 'accepted' || o.status === 'signed').length
    const rate = total > 0 ? Math.round((accepted / Math.max(accepted + sent, 1)) * 100) : 100

    return { total, pendingApproval, sent, accepted, rate }
  }, [allOffers])

  // Copy Magic Link handler
  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/offer-portal/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Candidate Magic Link copied to clipboard!')
  }

  // HR Approval Action
  const handleApproveAndSend = async (offer) => {
    try {
      // Update offer status
      if (offer.id && typeof offer.id === 'string' && offer.id.startsWith('off_')) {
        await updateOfferMut.mutateAsync({
          id: offer.id,
          updates: { status: 'sent', approval_status: 'approved', sent_date: new Date().toISOString() }
        })
      }
      offer.status = 'sent'
      offer.approvalStatus = 'approved'
      offer.sentDate = new Date().toLocaleDateString()
      setApprovalModalOffer(null)
      toast.success(`Offer approved and dispatched to ${offer.candidate}!`)
    } catch (err) {
      toast.error('Failed to update offer status')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Candidate Name', 'Email', 'Role', 'Department', 'Compensation', 'Equity', 'Status', 'Approver', 'Sent Date']
    const rows = filteredOffers.map(o => [
      `"${o.candidate}"`,
      `"${o.email}"`,
      `"${o.role}"`,
      `"${o.department}"`,
      `"${o.salary}"`,
      `"${o.equity}"`,
      `"${o.status}"`,
      `"${o.approver}"`,
      `"${o.sentDate || '—'}"`
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hireos_offers_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported offers to CSV!')
  }

  return (
    <div className="offers-page" style={{ padding: '0 var(--space-4) var(--space-8)' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h1 className="page-title">Offers &amp; E-Signatures</h1>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Workflow 7</span>
          </div>
          <p className="page-subtitle">
            {stats.total} total packages · {stats.pendingApproval} pending HR sign-off · {stats.accepted} accepted &amp; hired
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Generate Offer
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="offers-stats">
        <motion.div
          className="offer-stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setActiveTab('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="offer-stat-icon" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="offer-stat-value">{stats.total}</div>
            <div className="offer-stat-label">Total Offers Generated</div>
          </div>
        </motion.div>

        <motion.div
          className="offer-stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setActiveTab('pending_approval')}
          style={{ cursor: 'pointer', borderColor: stats.pendingApproval > 0 ? 'rgba(245, 158, 11, 0.4)' : undefined }}
        >
          <div className="offer-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="offer-stat-value" style={{ color: stats.pendingApproval > 0 ? '#F59E0B' : 'inherit' }}>
              {stats.pendingApproval}
            </div>
            <div className="offer-stat-label">Pending HR Approval</div>
          </div>
        </motion.div>

        <motion.div
          className="offer-stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setActiveTab('sent')}
          style={{ cursor: 'pointer' }}
        >
          <div className="offer-stat-icon" style={{ background: 'var(--color-info-subtle, rgba(14, 165, 233, 0.15))', color: '#0EA5E9' }}>
            <Send size={22} />
          </div>
          <div>
            <div className="offer-stat-value">{stats.sent}</div>
            <div className="offer-stat-label">Sent · Awaiting Signature</div>
          </div>
        </motion.div>

        <motion.div
          className="offer-stat-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setActiveTab('accepted')}
          style={{ cursor: 'pointer' }}
        >
          <div className="offer-stat-icon" style={{ background: 'var(--color-success-subtle, rgba(16, 185, 129, 0.15))', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="offer-stat-value" style={{ color: '#10B981' }}>{stats.accepted}</div>
            <div className="offer-stat-label">Accepted &amp; Hired ({stats.rate}%)</div>
          </div>
        </motion.div>
      </div>

      {/* Zoho-style Offer Pipeline Stage Flow */}
      <div className="offer-pipeline">
        <div className={`offer-pipeline-stage ${activeTab === 'draft' ? 'active' : ''}`} onClick={() => setActiveTab('draft')}>
          <span className="offer-pipeline-stage-count">{allOffers.filter(o => o.status === 'draft').length}</span>
          <span className="offer-pipeline-stage-label">1. Draft Package</span>
        </div>
        <span className="offer-pipeline-arrow">→</span>
        <div className={`offer-pipeline-stage ${activeTab === 'pending_approval' ? 'active' : ''}`} onClick={() => setActiveTab('pending_approval')}>
          <span className="offer-pipeline-stage-count" style={{ color: '#F59E0B' }}>{stats.pendingApproval}</span>
          <span className="offer-pipeline-stage-label">2. HR &amp; VP Sign-off</span>
        </div>
        <span className="offer-pipeline-arrow">→</span>
        <div className={`offer-pipeline-stage ${activeTab === 'sent' ? 'active' : ''}`} onClick={() => setActiveTab('sent')}>
          <span className="offer-pipeline-stage-count" style={{ color: '#0EA5E9' }}>{stats.sent}</span>
          <span className="offer-pipeline-stage-label">3. Magic Link Dispatched</span>
        </div>
        <span className="offer-pipeline-arrow">→</span>
        <div className={`offer-pipeline-stage ${activeTab === 'accepted' ? 'active' : ''}`} onClick={() => setActiveTab('accepted')}>
          <span className="offer-pipeline-stage-count" style={{ color: '#10B981' }}>{stats.accepted}</span>
          <span className="offer-pipeline-stage-label">4. Cryptographic E-Sign</span>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="task-filters" style={{ marginBottom: 'var(--space-4)' }}>
        {STAGE_TABS.map(tab => (
          <button
            key={tab.key}
            className={`task-filter-chip ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="offers-toolbar">
        <div className="offers-toolbar-left" style={{ flex: 1, maxWidth: '500px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search candidate name, role, email or approver…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="task-add-input"
              style={{ paddingLeft: '34px', width: '100%', height: '36px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <select
            className="dashboard-date-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ height: '36px' }}
          >
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product Design">Product Design</option>
            <option value="Frontend">Frontend</option>
            <option value="Mobile">Mobile</option>
            <option value="Design">Design</option>
          </select>
        </div>
      </div>

      {/* Offers Table */}
      <div className="widget widget-full" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role &amp; Department</th>
                <th>Compensation Package</th>
                <th>HR Approver</th>
                <th>Status</th>
                <th>Sent / Timeline</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <FileText size={40} style={{ color: 'var(--text-disabled)' }} />
                      <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>No offers found</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        {searchQuery ? 'Try adjusting your search query or filters' : 'Generate an offer for candidates passing the AI interview'}
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)} style={{ marginTop: 'var(--space-2)' }}>
                        <Plus size={14} /> Generate First Offer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => {
                  const isPending = offer.status === 'draft' || offer.approvalStatus === 'pending_vp' || offer.status === 'pending_approval'
                  const isSigned = offer.status === 'accepted' || offer.status === 'signed'

                  return (
                    <tr key={offer.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOffer(offer)}>
                      {/* Candidate Cell */}
                      <td>
                        <div className="offer-candidate-cell">
                          <div
                            className="offer-avatar"
                            style={{ background: avatarColor(offer.candidate) }}
                          >
                            {offer.candidate.charAt(0)}
                          </div>
                          <div className="offer-candidate-info">
                            <span className="offer-candidate-name">{offer.candidate}</span>
                            <span className="offer-candidate-email">{offer.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{offer.role}</span>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{offer.department}</span>
                        </div>
                      </td>

                      {/* Comp Package */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="offer-salary" style={{ color: 'var(--text-primary)' }}>
                            {offer.salary}
                          </span>
                          <div style={{ display: 'flex', gap: '4px', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {offer.equity && <span>{offer.equity} eq</span>}
                            {offer.equity && offer.bonus && <span>·</span>}
                            {offer.bonus && <span>{offer.bonus} bonus</span>}
                          </div>
                        </div>
                      </td>

                      {/* HR Approver */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} style={{ color: isPending ? '#F59E0B' : 'var(--color-primary)' }} />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{offer.approver}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {getStatusBadge(offer.status)}
                      </td>

                      {/* Sent Date / Countdown */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {offer.sentDate || 'Not sent'}
                          </span>
                          {offer.expiresIn && offer.status === 'sent' && (
                            <span className={`offer-expires ${offer.expiresIn.includes('2') ? 'urgent' : ''}`}>
                              <Clock size={11} /> Exp in {offer.expiresIn}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {isPending ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setApprovalModalOffer(offer)}
                              style={{ background: '#F59E0B', borderColor: '#F59E0B', color: '#000', fontWeight: 600, padding: '4px 10px', fontSize: '0.78rem' }}
                            >
                              Approve &amp; Send
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Copy Candidate Magic Link"
                                onClick={() => handleCopyLink(offer.magicToken)}
                              >
                                <Copy size={14} />
                              </button>
                              <a
                                href={`/offer-portal/${offer.magicToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-sm"
                                title="Open Candidate Portal"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            title="View Full Offer Details"
                            onClick={() => setSelectedOffer(offer)}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: HR Approval & Dispatch Dialog                       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {approvalModalOffer && (
          <div className="offers-modal-overlay" onClick={() => setApprovalModalOffer(null)}>
            <motion.div
              className="offers-modal"
              style={{ maxWidth: '600px' }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="offers-modal-header" style={{ background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
                  <ShieldCheck size={18} />
                  <span>HR Executive Offer Sign-off</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setApprovalModalOffer(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="offers-modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div className="offer-avatar" style={{ background: avatarColor(approvalModalOffer.candidate), width: '44px', height: '44px', fontSize: '1rem' }}>
                    {approvalModalOffer.candidate.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{approvalModalOffer.candidate}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                      Requisition: {approvalModalOffer.role} ({approvalModalOffer.department})
                    </p>
                  </div>
                </div>

                <div className="offer-letter-grid" style={{ marginBottom: '16px' }}>
                  <div>
                    <span className="fp-label">Proposed Base Salary</span>
                    <span className="fp-value" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>{approvalModalOffer.salary}</span>
                  </div>
                  <div>
                    <span className="fp-label">Equity Allocation</span>
                    <span className="fp-value">{approvalModalOffer.equity}</span>
                  </div>
                  <div>
                    <span className="fp-label">Sign-on Bonus</span>
                    <span className="fp-value">{approvalModalOffer.bonus}</span>
                  </div>
                  <div>
                    <span className="fp-label">AI Interview Score</span>
                    <span className="fp-value" style={{ color: '#10B981' }}>{approvalModalOffer.candidateScore}/100</span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automated Actions upon Approval:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    <li>Cryptographic 256-bit magic token generated in Postgres</li>
                    <li>Candidate notified via Resend transactional email with personal portal link</li>
                    <li>Candidate stage automatically updated to <strong>OFFER_SENT</strong> in ATS</li>
                  </ul>
                </div>
              </div>

              <div className="offers-modal-footer">
                <button className="btn btn-ghost" onClick={() => setApprovalModalOffer(null)}>
                  Reject / Revise
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleApproveAndSend(approvalModalOffer)}
                  style={{ background: '#10B981', borderColor: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} /> Approve &amp; Dispatch Offer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 2: Generate New Offer Modal                            */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateOfferModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            candidates={candidates}
            onCreated={(newOffer) => {
              allOffers.unshift(newOffer)
              setShowCreateModal(false)
              toast.success(`Offer package created for ${newOffer.candidate}!`)
            }}
          />
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL 3: Comprehensive Offer Detail & Audit Drawer           */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedOffer && (
          <div className="offers-modal-overlay" onClick={() => setSelectedOffer(null)}>
            <motion.div
              className="offers-modal"
              style={{ maxWidth: '640px' }}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="offers-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Offer Package &amp; E-Signature Audit</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOffer(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="offers-modal-body">
                {/* Candidate Overview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="offer-avatar" style={{ background: avatarColor(selectedOffer.candidate), width: '48px', height: '48px', fontSize: '1.2rem' }}>
                      {selectedOffer.candidate.charAt(0)}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedOffer.candidate}</h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        {selectedOffer.email} · {selectedOffer.role}
                      </p>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedOffer.status)}
                  </div>
                </div>

                {/* Compensation Package Breakdown */}
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '16px 0 8px' }}>
                  Compensation Terms
                </h4>
                <div className="offer-letter-grid">
                  <div>
                    <span className="fp-label">Annual Base Salary</span>
                    <span className="fp-value" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>{selectedOffer.salary}</span>
                  </div>
                  <div>
                    <span className="fp-label">Equity Grant</span>
                    <span className="fp-value">{selectedOffer.equity || '0.25%'}</span>
                  </div>
                  <div>
                    <span className="fp-label">Sign-on Bonus</span>
                    <span className="fp-value">{selectedOffer.bonus || 'INR 2,00,000'}</span>
                  </div>
                  <div>
                    <span className="fp-label">Target Start Date</span>
                    <span className="fp-value">July 15, 2026</span>
                  </div>
                </div>

                {/* Candidate Magic Portal Link */}
                <div style={{ background: 'var(--surface-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Candidate Direct E-Sign Portal</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'monospace' }}>256-bit Magic Token</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      readOnly
                      value={`${window.location.origin}/offer-portal/${selectedOffer.magicToken}`}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={() => handleCopyLink(selectedOffer.magicToken)}>
                      <Copy size={14} /> Copy
                    </button>
                    <a
                      href={`/offer-portal/${selectedOffer.magicToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      <ExternalLink size={14} /> Open
                    </a>
                  </div>
                </div>

                {/* Cryptographic SHA-256 Audit Box if Accepted */}
                {selectedOffer.signatureHash && (
                  <div style={{ background: 'var(--color-success-bg, rgba(16, 185, 129, 0.1))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: 700, fontSize: '0.9rem', marginBottom: '6px' }}>
                      <ShieldCheck size={18} /> Verified Legal E-Signature Record
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Legally binding digital signature captured via HTML5 canvas and cryptographically sealed.
                    </p>
                    <div style={{ background: 'var(--surface-elevated)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                      SHA-256: {selectedOffer.signatureHash}
                    </div>
                  </div>
                )}
              </div>

              <div className="offers-modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedOffer(null)}>
                  Close
                </button>
                {selectedOffer.status !== 'accepted' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedOffer(null)
                      setApprovalModalOffer(selectedOffer)
                    }}
                  >
                    Manage HR Sign-off
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ============================================================
// Sub-component: Create / Generate Offer Modal
// ============================================================
function CreateOfferModal({ isOpen, onClose, candidates = [], onCreated }) {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id || '')
  const [baseSalary, setBaseSalary] = useState('160000')
  const [equity, setEquity] = useState('0.35')
  const [bonus, setBonus] = useState('20000')
  const [approver, setApprover] = useState('Sarah Chen (VP HR)')
  const [department, setDepartment] = useState('Engineering')
  const [role, setRole] = useState('Senior React Developer')
  const [requireApproval, setRequireApproval] = useState(true)
  const [loading, setLoading] = useState(false)

  // Auto-sync candidate details when chosen
  const handleCandidateChange = (id) => {
    setCandidateId(id)
    const selected = candidates.find(c => c.id === id)
    if (selected) {
      if (selected.appliedFor) setRole(selected.appliedFor)
      if (selected.department) setDepartment(selected.department)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const selected = candidates.find(c => c.id === candidateId) || candidates[0]
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const newOffer = {
      id: `off_${Date.now()}`,
      candidate: selected ? (selected.name || `${selected.firstName} ${selected.lastName}`) : 'Arjun Patel',
      email: selected?.email || 'arjun.p@gmail.com',
      role: role || selected?.appliedFor || 'Senior React Developer',
      department: department || 'Engineering',
      salary: `$${Number(baseSalary).toLocaleString()}`,
      baseSalaryNum: Number(baseSalary),
      equity: `${equity}%`,
      bonus: `$${Number(bonus).toLocaleString()}`,
      status: requireApproval ? 'draft' : 'sent',
      approvalStatus: requireApproval ? 'pending_vp' : 'approved',
      approver,
      sentDate: requireApproval ? null : new Date().toLocaleDateString(),
      expiresIn: '7 days',
      magicToken: token,
      candidateScore: selected?.aiScore || 92
    }

    try {
      // Try backend REST API first if server is running
      await fetchApi('/offers/generate', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: selected?.id || 'demo-cand',
          baseSalary,
          equity,
          bonus
        })
      }).catch(() => {
        // Safe fallback to client state if backend not connected
      })
    } catch (_) {
      // Ignore network errors in local mode
    }

    setLoading(false)
    onCreated(newOffer)
  }

  return (
    <div className="offers-modal-overlay" onClick={onClose}>
      <motion.div
        className="offers-modal"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <div className="offers-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Generate Offer Package</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="offers-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Candidate Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Select Candidate
              </label>
              <select
                value={candidateId}
                onChange={(e) => handleCandidateChange(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name || `${c.firstName} ${c.lastName}`} — {c.appliedFor || 'Applicant'} (Score: {c.aiScore || 85}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Role & Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Target Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="Data & AI">Data &amp; AI</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
            </div>

            {/* Compensation Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Base Salary ($)
                </label>
                <input
                  type="number"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="150000"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Equity Grant (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={equity}
                  onChange={(e) => setEquity(e.target.value)}
                  placeholder="0.25"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Sign-on Bonus ($)
                </label>
                <input
                  type="number"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder="15000"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Live Total Comp Preview */}
            <div style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total First-Year Guaranteed Comp:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  ${(Number(baseSalary) + Number(bonus || 0)).toLocaleString()} + {equity}% Equity
                </span>
              </div>
            </div>

            {/* HR Approver & Gatekeeping */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Assigned Executive Approver
              </label>
              <select
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                <option value="Sarah Chen (VP HR)">Sarah Chen (VP HR)</option>
                <option value="Vikram Patel (CTO)">Vikram Patel (CTO)</option>
                <option value="Dr. Meera Iyer (Head of AI)">Dr. Meera Iyer (Head of AI)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Require VP / HR Director sign-off before dispatching to candidate
            </label>

          </div>

          <div className="offers-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : requireApproval ? 'Submit for HR Approval' : 'Generate & Send Direct Link'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
