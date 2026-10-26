import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUIStore, useAuthStore } from '../../store'
import {
  LayoutDashboard, Briefcase, Users, GitBranch, Video, FileText,
  BarChart3, Settings, ChevronLeft, ChevronRight, Zap, LogOut,
  Building2, HelpCircle, Brain, Globe, FileCheck, CalendarDays,
  ListTodo, ClipboardList, Monitor, ShieldCheck, Cpu, Mic, MonitorPlay
} from 'lucide-react'
import './Sidebar.css'
import Logo from '../ui/Logo'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { path: '/my-actions', icon: ListTodo, label: 'My Actions' },
      { path: '/jobs', icon: Briefcase, label: 'Job Openings' },
      { path: '/candidates', icon: Users, label: 'Candidates' },
      { path: '/applications', icon: ClipboardList, label: 'Applications' },
    ],
  },
  {
    label: 'AI Engine',
    items: [
      { path: '/ai-shortlist', icon: Brain, label: 'AI Screening' },
      { path: '/interviews', icon: Video, label: 'AI Interviews' },
      { path: '/meetings', icon: MonitorPlay, label: 'Meetings' },
      { path: '/pipeline', icon: GitBranch, label: 'Pipeline' },
    ],
  },
  {
    label: 'Recruitment',
    items: [
      { path: '/offers', icon: FileCheck, label: 'Offers' },
      { path: '/referrals', icon: Users, label: 'Referrals' },
      { path: '/departments', icon: Building2, label: 'Departments' },
      { path: '/job-boards', icon: Globe, label: 'Job Boards' },
      { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', icon: BarChart3, label: 'Reports' },
    ],
  },
]

const BOTTOM_ITEMS = [
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { company, user, logout } = useAuthStore()

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        {sidebarCollapsed ? (
          <Logo size={28} />
        ) : (
          <div className="sidebar-logo-text" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Logo size={26} withWordmark wordmarkSize={17} />
            <span className="sidebar-logo-badge">AI Platform</span>
          </div>
        )}
        <button className="sidebar-collapse-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Company Switcher */}
      {!sidebarCollapsed && (
        <div className="sidebar-company">
          <div className="sidebar-company-avatar">
            <Building2 size={16} />
          </div>
          <div className="sidebar-company-info">
            <span className="sidebar-company-name">{company?.name || 'Company'}</span>
            <span className="sidebar-company-plan">{company?.plan || 'Free'} Plan</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.label} className="sidebar-nav-section">
            {!sidebarCollapsed && <span className="sidebar-nav-label">{section.label}</span>}
            {sIdx > 0 && <div className="sidebar-nav-divider" style={{ margin: '0 var(--space-3)', marginBottom: 'var(--space-2)' }} />}
            {section.items.map(({ path, icon: Icon, label, exact, badge }) => (
              <NavLink
                key={path}
                to={path}
                end={exact}
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="sidebar-nav-icon">
                  <Icon size={16} />
                </div>
                {!sidebarCollapsed && <span className="sidebar-nav-text">{label}</span>}
                {!sidebarCollapsed && label === 'Job Openings' && (
                  <span className="sidebar-nav-badge">32</span>
                )}
                {!sidebarCollapsed && label === 'Candidates' && (
                  <span className="sidebar-nav-badge">540</span>
                )}
                {!sidebarCollapsed && label === 'AI Interviews' && (
                  <span className="sidebar-nav-badge sidebar-nav-badge-ai">Live</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-nav-divider" />

        <div className="sidebar-nav-section">
          {!sidebarCollapsed && <span className="sidebar-nav-label">System</span>}
          {BOTTOM_ITEMS.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="sidebar-nav-icon">
                <Icon size={16} />
              </div>
              {!sidebarCollapsed && <span className="sidebar-nav-text">{label}</span>}
            </NavLink>
          ))}
          <button className="sidebar-nav-item" onClick={() => {}}>
            <div className="sidebar-nav-icon">
              <HelpCircle size={16} />
            </div>
            {!sidebarCollapsed && <span className="sidebar-nav-text">Help & Support</span>}
          </button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.name?.charAt(0) || 'U'}
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-role">{user?.title || 'Recruiter'}</span>
          </div>
        )}
        {!sidebarCollapsed && (
          <button className="sidebar-logout-btn" onClick={logout} title="Log out">
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  )
}
