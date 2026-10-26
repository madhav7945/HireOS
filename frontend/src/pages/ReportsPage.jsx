import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, Users, Clock, Download, Calendar,
  PieChart as PieChartIcon, Activity, Target, Zap, ArrowUpRight,
  ArrowDownRight, FileText, Share2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import Skeleton from '../components/ui/Skeleton'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import toast from 'react-hot-toast'
import './ReportsPage.css'

const MONTHLY_HIRES = [
  { month: 'Jan', hires: 8, offers: 12, applications: 145 },
  { month: 'Feb', hires: 11, offers: 15, applications: 178 },
  { month: 'Mar', hires: 14, offers: 18, applications: 210 },
  { month: 'Apr', hires: 9, offers: 14, applications: 165 },
  { month: 'May', hires: 16, offers: 20, applications: 235 },
  { month: 'Jun', hires: 12, offers: 18, applications: 198 },
]

const SOURCE_PIE_DATA = [
  { name: 'LinkedIn', value: 38, color: '#0077B5' },
  { name: 'Referrals', value: 25, color: '#00B894' },
  { name: 'Job Boards', value: 18, color: '#6C5CE7' },
  { name: 'Career Site', value: 12, color: '#FDCB6E' },
  { name: 'Agency', value: 7, color: '#FF6B6B' },
]

const REPORT_CATEGORIES = [
  {
    title: 'Time Metrics',
    icon: Clock,
    color: '#6C5CE7',
    reports: ['Time to Fill', 'Time to Hire', 'Time in Stage Analysis', 'Bottleneck Detection'],
  },
  {
    title: 'Pipeline Analytics',
    icon: Activity,
    color: '#00D2FF',
    reports: ['Hiring Funnel', 'Conversion Rates', 'Drop-off Analysis', 'Stage Duration'],
  },
  {
    title: 'Source Metrics',
    icon: Target,
    color: '#00B894',
    reports: ['Source of Hire', 'Source Quality Score', 'Job Board ROI', 'Cost per Source'],
  },
  {
    title: 'AI Interview Analytics',
    icon: Zap,
    color: '#FDCB6E',
    reports: ['AI Score Distribution', 'AI vs Human Correlation', 'Proctoring Alerts', 'Skill Gap Analysis'],
  },
  {
    title: 'Team Performance',
    icon: Users,
    color: '#FD79A8',
    reports: ['Recruiter Workload', 'Diversity & Inclusion', 'Cost per Hire', 'Hiring Manager Rating'],
  },
  {
    title: 'Offer Analytics',
    icon: TrendingUp,
    color: '#74B9FF',
    reports: ['Offer Acceptance Rate', 'Salary Benchmarking', 'Negotiation Trends', 'Decline Reasons'],
  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '0.8rem' }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

function exportReportsCsv() {
  const headers = ['Month', 'Hires', 'Offers', 'Applications']
  const rows = MONTHLY_HIRES.map(m => [m.month, m.hires, m.offers, m.applications])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hireos_reports_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Reports exported to CSV!')
}

export default function ReportsPage() {
  const { isLoading } = useSimulatedLoading(1100)
  const [chartView, setChartView] = useState('hires')
  const [openCategory, setOpenCategory] = useState(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleFreq, setScheduleFreq] = useState('Weekly')
  const [scheduleEmail, setScheduleEmail] = useState('sarah@techcorp.io')

  const shareReport = async () => {
    const link = `${window.location.origin}/reports?shared=${Math.random().toString(36).slice(2, 10)}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Shareable report link copied to clipboard!')
    } catch {
      toast.success('Report link: ' + link)
    }
  }

  const confirmSchedule = () => {
    if (!scheduleEmail.trim()) { toast.error('Email is required'); return }
    setShowSchedule(false)
    toast.success(`${scheduleFreq} report scheduled to ${scheduleEmail}`)
  }

  if (isLoading) {
    return <Skeleton.Page type="table" />
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">20 standard reports + custom builder — powered by AI insights</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={() => setShowSchedule(true)}>
            <Calendar size={16} /> Schedule
          </button>
          <button className="btn btn-secondary" onClick={shareReport}>
            <Share2 size={16} /> Share
          </button>
          <button className="btn btn-primary" onClick={exportReportsCsv}>
            <Download size={16} /> Export All
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="reports-quick-stats">
        {[
          { label: 'Avg. Time to Hire', value: '18d', change: '-3d', positive: true, icon: Clock, color: '#6C5CE7' },
          { label: 'Total Hires (YTD)', value: '70', change: '+12%', positive: true, icon: Users, color: '#00B894' },
          { label: 'Cost per Hire', value: '₹42K', change: '+8%', positive: false, icon: TrendingUp, color: '#FDCB6E' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              className="report-quick-stat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="report-quick-stat-row">
                <div>
                  <div className="report-quick-stat-value" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="report-quick-stat-label">{stat.label}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Icon size={20} style={{ color: stat.color, opacity: 0.6 }} />
                  <span className={`report-quick-stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                    {stat.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.change}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Main Chart */}
      <motion.div
        className="reports-chart-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="reports-chart-header">
          <h3 className="reports-chart-title">Hiring Trend — Last 6 Months</h3>
          <div className="reports-chart-tabs">
            {['hires', 'offers', 'applications'].map(tab => (
              <button
                key={tab}
                className={`reports-chart-tab ${chartView === tab ? 'active' : ''}`}
                onClick={() => setChartView(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MONTHLY_HIRES}>
              <defs>
                <linearGradient id="gradHires" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B894" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00B894" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOffers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D2FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(108, 92, 231, 0.06)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {(chartView === 'hires' || chartView === 'offers') && (
                <Area type="monotone" dataKey="offers" stroke="#6C5CE7" fill="url(#gradOffers)" strokeWidth={2} name="Offers" />
              )}
              {(chartView === 'hires' || chartView === 'offers') && (
                <Area type="monotone" dataKey="hires" stroke="#00B894" fill="url(#gradHires)" strokeWidth={2} name="Hires" />
              )}
              {chartView === 'applications' && (
                <Area type="monotone" dataKey="applications" stroke="#00D2FF" fill="url(#gradApps)" strokeWidth={2} name="Applications" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-legend-row">
          {chartView !== 'applications' ? (
            <>
              <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#6C5CE7' }} /> Offers Sent</span>
              <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#00B894' }} /> Hires Made</span>
            </>
          ) : (
            <span className="chart-legend-item"><span className="chart-legend-dot" style={{ background: '#00D2FF' }} /> Applications Received</span>
          )}
        </div>
      </motion.div>

      {/* Report Categories */}
      <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-md)' }}>
        Report Library
      </h3>
      <div className="reports-grid">
        {REPORT_CATEGORIES.map((cat, i) => {
          const Icon = cat.icon
          return (
            <motion.div
              key={cat.title}
              className="report-category-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              onClick={() => setOpenCategory(cat)}
            >
              <div className="report-category-icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                <Icon size={22} />
              </div>
              <h3 className="report-category-title">{cat.title}</h3>
              <ul className="report-list">
                {cat.reports.map(r => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>

      {/* Category drill-down modal */}
      {openCategory && (
        <div className="reports-modal-overlay" onClick={() => setOpenCategory(null)}>
          <div className="reports-modal" onClick={e => e.stopPropagation()}>
            <div className="reports-modal-header">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="report-category-icon" style={{ color: openCategory.color, background: `${openCategory.color}15`, width: 32, height: 32 }}>
                  <openCategory.icon size={16} />
                </span>
                {openCategory.title}
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpenCategory(null)}>✕</button>
            </div>
            <div className="reports-modal-body">
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                {openCategory.reports.length} reports available in this category.
              </p>
              {openCategory.reports.map(r => (
                <div key={r} className="reports-modal-row">
                  <span><FileText size={14} /> {r}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { exportReportsCsv(); }}>
                    <Download size={13} /> Export
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {showSchedule && (
        <div className="reports-modal-overlay" onClick={() => setShowSchedule(false)}>
          <div className="reports-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="reports-modal-header">
              <span><Calendar size={16} /> Schedule Report</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSchedule(false)}>✕</button>
            </div>
            <div className="reports-modal-body">
              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select value={scheduleFreq} onChange={e => setScheduleFreq(e.target.value)}>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Send to (email)</label>
                <input type="email" value={scheduleEmail} onChange={e => setScheduleEmail(e.target.value)} />
              </div>
            </div>
            <div className="reports-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSchedule(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSchedule}><Calendar size={14} /> Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
