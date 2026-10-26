import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { avatarColor } from '../utils/avatar'
import {
  Clock, Briefcase, Video, TrendingUp, Phone, Brain, ArrowRight,
  AlertTriangle, Filter, CalendarDays, Download, RefreshCw,
  CheckCircle2, Circle, Plus, ChevronDown, Timer, Target,
  FileCheck, BarChart3, Activity
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import {
  DASHBOARD_KPI, SOURCE_DATA, FUNNEL_DATA, DEMO_JOBS,
  RECENT_APPLICATIONS, ACTIVITY_FEED,
  OFFER_TREND_DATA, JOB_AGE_DATA, UPCOMING_INTERVIEWS_LIST
} from '../data/mockData'
import Skeleton from '../components/ui/Skeleton'
// removed useDashboardMetrics
import { useQueryClient } from '@tanstack/react-query'
import { useTasks, useCreateTask, useToggleTask, useUpdateTask, useDeleteTask } from '../hooks/useSupabase'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import toast from 'react-hot-toast'
import './Dashboard.css'

// ---- KPI Card Definitions ----
const KPI_CARDS = [
  {
    icon: Briefcase,
    label: 'Job Openings',
    value: DASHBOARD_KPI.jobOpenings.value,
    extra: `${DASHBOARD_KPI.jobOpenings.urgent} urgent`,
    link: '/jobs',
  },
  {
    icon: CalendarDays,
    label: 'Upcoming Interviews',
    value: DASHBOARD_KPI.upcomingInterviews.value,
    extra: DASHBOARD_KPI.upcomingInterviews.label,
    link: '/interviews',
  },
  {
    icon: Timer,
    label: 'Time to Hire',
    value: DASHBOARD_KPI.timeToHire.value,
    suffix: 'd',
    change: DASHBOARD_KPI.timeToHire.change,
    changeLabel: DASHBOARD_KPI.timeToHire.changeLabel,
    link: '/reports',
  },
  {
    icon: Clock,
    label: 'Time to Fill',
    value: DASHBOARD_KPI.timeToFill.value,
    suffix: 'd',
    change: DASHBOARD_KPI.timeToFill.change,
    changeLabel: DASHBOARD_KPI.timeToFill.changeLabel,
    link: '/reports',
  },
  {
    icon: TrendingUp,
    label: 'Offer Accept Rate',
    value: DASHBOARD_KPI.offerAcceptRate.value,
    suffix: '%',
    change: DASHBOARD_KPI.offerAcceptRate.change,
    changeLabel: DASHBOARD_KPI.offerAcceptRate.changeLabel,
    link: '/offers',
  },
  {
    icon: Video,
    label: 'Completed Interviews',
    value: DASHBOARD_KPI.completedInterviews.value,
    extra: DASHBOARD_KPI.completedInterviews.label,
    link: '/interviews',
  },
  {
    icon: Target,
    label: 'Age of Job',
    value: DASHBOARD_KPI.ageOfJob.value,
    suffix: 'd',
    extra: DASHBOARD_KPI.ageOfJob.unit,
    link: '/jobs',
  },
  {
    icon: Phone,
    label: 'My Attended Calls',
    value: DASHBOARD_KPI.attendedCalls.value,
    extra: DASHBOARD_KPI.attendedCalls.label,
    link: '/calendar',
  },
]

// ---- Helpers ----
function getScoreColor(score) {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 60) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function getAgeColor(days) {
  if (days > 25) return '#EF4444'
  if (days > 15) return '#F59E0B'
  return '#10B981'
}

function getPriorityClass(priority) {
  const map = { urgent: 'badge-urgent', high: 'badge-closed', normal: 'badge-draft', low: 'badge-expired' }
  return map[priority] || 'badge-draft'
}

function getInterviewTypeBadge(type) {
  if (type.includes('AI')) return 'badge-primary'
  if (type.includes('HR')) return 'badge-info'
  return 'badge-success'
}

const STATUS_COUNTS = [
  { name: 'Active', value: 18, color: '#10B981' },
  { name: 'Draft', value: 5, color: '#94A3B8' },
  { name: 'Paused', value: 3, color: '#F59E0B' },
  { name: 'Closed', value: 4, color: '#EF4444' },
  { name: 'Scheduled', value: 2, color: '#0EA5E9' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--color-primary)', fontSize: '0.75rem' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ---- Widget Header Component ----
function WidgetHeader({ title, badge, badgeClass, link, navigate, children }) {
  return (
    <div className="widget-header">
      <div className="widget-header-left">
        <h3 className="widget-title">{title}</h3>
        {badge && <span className={`badge ${badgeClass || 'badge-primary'}`}>{badge}</span>}
      </div>
      <div className="widget-header-right">
        {children}
        {link && (
          <button className="widget-nav-btn" onClick={() => navigate(link)} title="View details">
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Main Dashboard Component ----
export default function Dashboard() {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState('This Month')
  const [ageFilter, setAgeFilter] = useState('All')
  const { isLoading } = useSimulatedLoading(1000)
  const queryClient = useQueryClient()

  // Live tasks — the SAME collection Zoe writes to and the My Actions page shows.
  const { data: todoItems = [] } = useTasks(true)
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const updateTaskMut = useUpdateTask()
  const deleteTaskMut = useDeleteTask()

  // Filter job age data
  const filteredAgeData = ageFilter === 'All'
    ? JOB_AGE_DATA
    : ageFilter === 'By Department'
      ? JOB_AGE_DATA // show all but group by dept color
      : JOB_AGE_DATA.filter(j => j.status === 'live')

  // Toggle / edit / delete against the shared tasks collection.
  const toggleTodo = (id) => {
    const item = todoItems.find(t => t.id === id)
    toggleTask.mutate({ id, done: !item?.done })
  }

  const updateTodo = (id, field, value) => {
    updateTaskMut.mutate({ id, updates: { [field]: value } })
  }

  const deleteTodo = (id) => {
    deleteTaskMut.mutate(id)
    toast.success('Task removed')
  }

  const addTodo = async () => {
    await createTask.mutateAsync({ title: 'New task — click to edit', type: 'task', priority: 'normal' })
    toast.success('Task added!')
  }

  if (isLoading) {
    return <Skeleton.Page type="dashboard" />
  }

  return (
    <div className="dashboard">
      {/* Zoho-style Demo Mode Banner */}
      <div style={{
        background: 'var(--color-info-bg)',
        border: '1px solid var(--color-info)',
        borderRadius: '10px',
        padding: '12px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{ background: 'var(--color-info)', padding: '2px 10px', borderRadius: '4px', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>DEMO MODE</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', flex: 1 }}>
          You're exploring HireOS with sample data. All features work — create jobs, share on LinkedIn, receive applications.
        </span>
        <button onClick={() => {
          if (confirm('Reset all demo data to defaults?')) {
            import('../services/localData').then(m => { m.localDataService.reset(); window.location.reload() })
          }
        }} style={{ padding: '5px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer' }}>
          ↺ Reset Demo Data
        </button>
        <a href="https://hireos-pi.vercel.app" target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-info)', fontSize: '0.78rem', textDecoration: 'none', cursor: 'pointer' }}>
          🔗 Live URL
        </a>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, Sarah. Here's what's happening today.</p>
        </div>
        <div className="dashboard-toolbar">
          <select
            className="dashboard-date-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
            <option>This Quarter</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => { toast.success(`Showing data for: ${dateRange}`); }}><Filter size={14} /> Filters</button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const csv = 'Metric,Value\n' + KPI_CARDS.map(k => `${k.label},${k.value}${k.suffix || ''}`).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hireos-dashboard-${dateRange.replace(/\s/g, '-').toLowerCase()}.csv`; a.click()
            toast.success('Dashboard report exported!')
          }}><Download size={14} /> Export</button>
          <button className="btn btn-ghost btn-sm" onClick={async () => {
            const promise = queryClient.invalidateQueries()
            toast.promise(promise, {
              loading: 'Refreshing data...',
              success: 'Dashboard updated!',
              error: 'Failed to refresh'
            })
          }}><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* ===== KPI Cards (4x2 grid) ===== */}
      <div className="kpi-grid">
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              className="kpi-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => navigate(kpi.link)}
            >
              <div className="kpi-icon" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-subtle)' }}>
                <Icon size={20} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label">{kpi.label}</span>
                <div className="kpi-value-row">
                  <span className="kpi-value">
                    {kpi.value}{kpi.suffix || ''}
                  </span>
                  {kpi.change !== undefined && (
                    <span className={`kpi-change ${kpi.change < 0 ? 'positive' : kpi.change > 0 ? 'positive' : 'neutral'}`}>
                      {kpi.change > 0 ? '+' : ''}{kpi.change}{kpi.suffix === '%' ? '%' : 'd'}
                    </span>
                  )}
                </div>
                {kpi.extra && <span className="kpi-extra">{kpi.extra}</span>}
                {kpi.changeLabel && <span className="kpi-extra">{kpi.changeLabel}</span>}
              </div>
              <div className="kpi-arrow">
                <ArrowRight size={14} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ===== Widget Grid ===== */}
      <div className="widget-grid">

        {/* ═══════════════════════════════════════════════════════════════
            ROW 1: PIPELINE OVERVIEW — Hiring Funnel + To-Do List
            Big picture pipeline health + actionable items
        ═══════════════════════════════════════════════════════════════ */}

        {/* Hiring Pipeline Funnel */}
        <motion.div
          className="widget widget-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <WidgetHeader title="Hiring Pipeline Funnel" link="/pipeline" navigate={navigate} />
          <div className="funnel-container">
            {FUNNEL_DATA.map((item, i) => (
              <div key={item.stage} className="funnel-row">
                <span className="funnel-label">{item.stage}</span>
                <div className="funnel-bar-wrapper">
                  <motion.div
                    className="funnel-bar"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.rate}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                    style={{
                      background: 'var(--color-primary)',
                      opacity: 1 - (i * 0.15),
                    }}
                  />
                </div>
                <span className="funnel-count">{item.count}</span>
                <span className="funnel-rate">{item.rate}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* To-Do List for HR */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <WidgetHeader title="To-Do List" link="/my-actions" navigate={navigate}>
            <button className="btn btn-ghost btn-sm" style={{ gap: '4px' }} onClick={addTodo}>
              <Plus size={12} /> Add
            </button>
          </WidgetHeader>
          <div className="todo-list">
            {todoItems.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', padding: '8px 4px' }}>
                No tasks yet. Add one, or ask Zoe to set a reminder.
              </p>
            )}
            {todoItems.map((item) => (
              <div key={item.id} className={`todo-item ${item.done ? 'done' : ''}`}>
                <button className="todo-check" onClick={() => toggleTodo(item.id)}>
                  {item.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <div className="todo-content">
                  <span
                    className="todo-text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateTodo(item.id, 'title', e.target.textContent)}
                    style={{ outline: 'none', cursor: 'text', borderBottom: '1px dashed transparent' }}
                    onFocus={(e) => e.target.style.borderBottomColor = 'var(--color-primary)'}
                  >
                    {item.title}
                  </span>
                  <div className="todo-meta">
                    <select
                      className="todo-priority-select"
                      value={item.priority || 'normal'}
                      onChange={(e) => updateTodo(item.id, 'priority', e.target.value)}
                      style={{ background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 600, color: item.priority === 'urgent' ? 'var(--brand-danger)' : item.priority === 'high' ? '#F59E0B' : 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', textTransform: 'uppercase' }}
                    >
                      <option value="urgent">urgent</option>
                      <option value="high">high</option>
                      <option value="normal">normal</option>
                      <option value="low">low</option>
                    </select>
                    <input
                      type="text"
                      className="todo-due-input"
                      value={item.dueDate || ''}
                      placeholder="due…"
                      onChange={(e) => updateTodo(item.id, 'dueDate', e.target.value)}
                      style={{ background: 'none', border: 'none', fontSize: '0.65rem', color: 'var(--text-tertiary)', width: '80px', padding: '2px', cursor: 'text' }}
                    />
                    <button
                      onClick={() => deleteTodo(item.id)}
                      title="Delete task"
                      style={{ background: 'none', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1, opacity: 0.5 }}
                      onMouseEnter={(e) => { e.target.style.opacity = 1; e.target.style.color = 'var(--brand-danger)' }}
                      onMouseLeave={(e) => { e.target.style.opacity = 0.5; e.target.style.color = 'var(--text-disabled)' }}
                    >×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 1.5: TIME METRICS — Zoho Style
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-4)' }}>
          <motion.div className="widget" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
            <WidgetHeader title="Time-to-fill" link="/reports" navigate={navigate}>
              <div className="widget-filter-pills">
                <button className="widget-pill active">Job Opening</button>
                <button className="widget-pill">Department</button>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <select className="dashboard-date-select"><option>All Users</option></select>
                <select className="dashboard-date-select"><option>Any time</option></select>
              </div>
            </WidgetHeader>
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <p>No records found in this view.</p>
            </div>
          </motion.div>

          <motion.div className="widget" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.39 }}>
            <WidgetHeader title="Time-to-hire" link="/reports" navigate={navigate}>
              <div className="widget-filter-pills">
                <button className="widget-pill active">Candidate</button>
                <button className="widget-pill">Department</button>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <select className="dashboard-date-select"><option>All Users</option></select>
                <select className="dashboard-date-select"><option>Any time</option></select>
              </div>
            </WidgetHeader>
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <p>No records found in this view.</p>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 2: OPERATIONAL — Recent Applications + Active Job Postings
            Day-to-day recruitment activity
        ═══════════════════════════════════════════════════════════════ */}

        {/* Recent Applications */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <WidgetHeader title="Recent Applications" badge="Live Feed" badgeClass="badge-live" link="/applications" navigate={navigate} />
          <div className="feed-list">
            {RECENT_APPLICATIONS.map((app) => (
              <div key={app.id} className="feed-item" onClick={() => navigate('/candidates')}>
                <div className="feed-avatar" style={{
                  background: avatarColor(app.name || app.id)
                }}>
                  {app.name.charAt(0)}
                </div>
                <div className="feed-content">
                  <span className="feed-name">{app.name}</span>
                  <span className="feed-role">{app.role}</span>
                </div>
                <div className="feed-meta">
                  <span className="feed-score" style={{ color: getScoreColor(app.score) }}>
                    {app.score}
                  </span>
                  <span className="feed-time">{app.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Active Job Postings Table */}
        <motion.div
          className="widget widget-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <WidgetHeader title="Active Job Postings" link="/jobs" navigate={navigate}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/jobs/create')}>+ New Job</button>
          </WidgetHeader>
          <div className="table-container" style={{ border: 'none', background: 'transparent' }}>
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Applied</th>
                  <th>Shortlisted</th>
                  <th>AI Interviews</th>
                  <th>Days Open</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_JOBS.filter(j => j.status === 'live').slice(0, 5).map((job) => (
                  <tr key={job.id} onClick={() => navigate('/jobs')} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{job.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{job.department}</td>
                    <td>{job.applied}</td>
                    <td>{job.shortlisted}</td>
                    <td>{job.aiInterviews}</td>
                    <td>
                      <span style={{ color: getAgeColor(job.daysOpen), fontWeight: 600 }}>
                        {job.daysOpen}d
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${job.status}`}>
                        <span className="status-dot status-dot-active" />
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 3: ACTIONABLE ITEMS — Upcoming Interviews + Jobs by Status
            What HR needs to act on RIGHT NOW
        ═══════════════════════════════════════════════════════════════ */}

        {/* Upcoming Interviews */}
        <motion.div
          className="widget widget-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <WidgetHeader
            title="Upcoming Interviews"
            badge={`${UPCOMING_INTERVIEWS_LIST.length} Scheduled`}
            badgeClass="badge-scheduled"
            link="/interviews"
            navigate={navigate}
          />
          <div className="interview-list">
            {UPCOMING_INTERVIEWS_LIST.map((item) => (
              <div key={item.id} className="interview-item" onClick={() => navigate('/interviews')}>
                <div className="interview-avatar" style={{
                  background: avatarColor(item.candidate || item.id)
                }}>
                  {item.candidate.charAt(0)}
                </div>
                <div className="interview-info">
                  <span className="interview-candidate">{item.candidate}</span>
                  <span className="interview-role">{item.role}</span>
                </div>
                <div className="interview-meta">
                  <span className={`badge ${getInterviewTypeBadge(item.type)}`}>{item.type}</span>
                  <span className="interview-time">{item.date} · {item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Jobs by Status */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <WidgetHeader title="Jobs by Status" link="/jobs" navigate={navigate} />
          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={STATUS_COUNTS}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {STATUS_COUNTS.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="donut-legend">
            {STATUS_COUNTS.map((s) => (
              <div key={s.name} className="donut-legend-item">
                <span className="status-dot" style={{ background: s.color }} />
                <span>{s.name}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 4: ANALYTICS — Candidate Sources + Age of Job + Offer Trend
            Deeper analytics and trends
        ═══════════════════════════════════════════════════════════════ */}

        {/* Candidate Sources */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <WidgetHeader title="Candidate Sources" link="/candidates" navigate={navigate} />
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SOURCE_DATA} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {SOURCE_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Age of Job (Bar Chart with Filters) */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <WidgetHeader title="Age of Job" link="/jobs" navigate={navigate}>
            <div className="widget-filter-pills">
              {['All', 'By Department', 'Job Openings'].map(f => (
                <button
                  key={f}
                  className={`widget-pill ${ageFilter === f ? 'active' : ''}`}
                  onClick={() => setAgeFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </WidgetHeader>
          <div className="age-chart-container">
            {filteredAgeData.map((job, i) => (
              <div key={job.id} className="age-bar-row">
                <span className="age-bar-label" title={job.title}>{job.title}</span>
                {ageFilter === 'By Department' && (
                  <span className="age-bar-dept">{job.department}</span>
                )}
                <div className="age-bar-track">
                  <motion.div
                    className="age-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((job.daysOpen / 30) * 100, 100)}%` }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                    style={{ background: getAgeColor(job.daysOpen) }}
                  />
                </div>
                <span className="age-bar-value" style={{ color: getAgeColor(job.daysOpen) }}>
                  {job.daysOpen}d
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Offer Acceptance Trend */}
        <motion.div
          className="widget widget-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <WidgetHeader title="Offer Acceptance Trend" link="/offers" navigate={navigate} />
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={OFFER_TREND_DATA}>
                <defs>
                  <linearGradient id="gradAccepted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="accepted" stroke="#10B981" fill="url(#gradAccepted)" strokeWidth={2} name="Accepted" />
                <Area type="monotone" dataKey="rejected" stroke="#EF4444" fill="url(#gradRejected)" strokeWidth={2} name="Rejected" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-inline">
            <span><span className="legend-dot" style={{ background: '#10B981' }} /> Accepted</span>
            <span><span className="legend-dot" style={{ background: '#EF4444' }} /> Rejected</span>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            ROW 5: ACTIVITY LOG — Full width recent activity feed
            Historical record at the bottom
        ═══════════════════════════════════════════════════════════════ */}

        <motion.div
          className="widget widget-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <WidgetHeader title="Recent Activity" badge="Synced" badgeClass="badge-accent" />
          <div className="activity-feed">
            {ACTIVITY_FEED.map((item) => (
              <div
                key={item.id}
                className="activity-item"
                onClick={() => navigate(item.module)}
              >
                <span className="activity-icon" style={{ background: avatarColor(item.user || item.id) }}>{(item.user || '?').charAt(0)}</span>
                <div className="activity-content">
                  <span className="activity-text">
                    <strong>{item.user}</strong> {item.action} <strong>{item.target}</strong>
                  </span>
                  <span className="activity-time">{item.time}</span>
                </div>
                <button className="activity-go" title="Go to module">
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
