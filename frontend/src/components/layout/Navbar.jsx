import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useUIStore, useNotificationStore, useAuthStore } from '../../store'
import {
  Search, Bell, Plus, ChevronDown, User, ListTodo, Keyboard,
  LogOut, Briefcase, Users, Calendar, Mail, FileText, UserPlus,
  Settings, Building2, ClipboardList, Phone, Star, Award, FileCheck,
  Send, CalendarDays, HelpCircle, RefreshCw, MoreHorizontal,
  LayoutDashboard, GitBranch, Zap, Brain, Globe, Video,
  BarChart3, Megaphone, BookOpen, Inbox, FileSignature, ShoppingBag, PlusCircle,
  Menu, X, Sun, Moon, Sparkles
} from 'lucide-react'
import { useAssistantStore } from '../../store/assistantStore'
import './Navbar.css'
import Logo from '../ui/Logo'
import toast from 'react-hot-toast'

// Primary tabs visible in the navbar
const PRIMARY_TABS = [
  { path: '/', label: 'Home', exact: true },
  { path: '/my-actions', label: 'My Actions' },
  { path: '/jobs', label: 'Job Openings' },
  { path: '/candidates', label: 'Candidates' },
  { path: '/applications', label: 'Applications' },
  { path: '/interviews', label: 'Interviews' },
  { path: '/referrals', label: 'Referrals' },
]

// Overflow tabs accessible via (...) menu
const OVERFLOW_TABS = [
  { path: '/departments', label: 'Departments', icon: Building2 },
  { path: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { path: '/ai-shortlist', label: 'AI Shortlisting', icon: Brain },
  { path: '/job-boards', label: 'Job Boards', icon: Globe },
  { path: '/offers', label: 'Offers', icon: FileCheck },
  { path: '/reports', label: 'Analytics', icon: BarChart3 },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/settings', label: 'Setup', icon: Settings },
]

// All tabs combined for mobile menu
const ALL_TABS = [
  { path: '/', label: 'Home', icon: LayoutDashboard, exact: true },
  { path: '/my-actions', label: 'My Actions', icon: ListTodo },
  { path: '/jobs', label: 'Job Openings', icon: Briefcase },
  { path: '/candidates', label: 'Candidates', icon: Users },
  { path: '/applications', label: 'Applications', icon: FileText },
  { path: '/interviews', label: 'Interviews', icon: Video },
  { path: '/departments', label: 'Departments', icon: Building2 },
  { path: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { path: '/ai-shortlist', label: 'AI Shortlisting', icon: Brain },
  { path: '/job-boards', label: 'Job Boards', icon: Globe },
  { path: '/offers', label: 'Offers', icon: FileCheck },
  { path: '/reports', label: 'Analytics', icon: BarChart3 },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/settings', label: 'Setup', icon: Settings },
]

const QUICK_ADD_ITEMS = [
  { icon: Briefcase, label: 'Job Opening', path: '/jobs/create' },
  { icon: UserPlus, label: 'Candidate', action: 'add-candidate' },
  { icon: Calendar, label: 'Interview', action: 'add-interview' },
  { icon: Building2, label: 'Department', path: '/departments' },
  { icon: Send, label: 'Campaign', action: 'add-campaign' },
  { icon: ClipboardList, label: 'Assessment', action: 'add-assessment' },
  { icon: ListTodo, label: 'Task', action: 'add-task' },
  { icon: CalendarDays, label: 'Event', action: 'add-event' },
  { icon: Phone, label: 'Call', action: 'add-call' },
  { icon: Star, label: 'Review', action: 'add-review' },
  { icon: FileCheck, label: 'Offer', action: 'add-offer' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleCommandPalette, theme, toggleTheme } = useUIStore()
  const { user, logout } = useAuthStore()
  const toggleZoe = useAssistantStore(s => s.toggle)
  const notifications = useNotificationStore((s) => s.notifications)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const unreadCount = notifications.filter(n => !n.read).length

  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showOverflow, setShowOverflow] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const notifRef = useRef(null)
  const quickAddRef = useRef(null)
  const userMenuRef = useRef(null)
  const overflowRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) setShowQuickAdd(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false)
      if (overflowRef.current && !overflowRef.current.contains(e.target)) setShowOverflow(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: Ctrl+K for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setShowMobileMenu(false)
  }, [location.pathname])

  const handleQuickAdd = (item) => {
    setShowQuickAdd(false)
    if (item.path) {
      navigate(item.path)
      return
    }
    // Route action items to their relevant pages
    const actionRoutes = {
      'add-candidate': '/candidates',
      'add-interview': '/interviews',
      'add-campaign': '/job-boards',
      'add-assessment': '/ai-shortlist',
      'add-task': '/my-actions',
      'add-event': '/calendar',
      'add-call': '/calendar',
      'add-review': '/my-actions',
      'add-offer': '/offers',
    }
    if (actionRoutes[item.action]) {
      navigate(actionRoutes[item.action])
      toast.success(`${item.label} — navigating to module`)
    }
  }

  const isTabActive = (tab) => {
    if (tab.exact) return location.pathname === tab.path
    return location.pathname.startsWith(tab.path)
  }

  return (
    <header className="navbar">
      {/* Mobile Hamburger */}
      <button
        className="navbar-mobile-toggle"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Logo + Brand */}
      <div className="navbar-brand">
        <Logo size={26} withWordmark wordmarkSize={16} />
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="navbar-tabs">
        {PRIMARY_TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.exact}
            className={({ isActive }) => `navbar-tab ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}

        {/* Overflow Menu (...) */}
        <div className="dropdown" ref={overflowRef}>
          <button
            className={`navbar-tab navbar-tab-overflow ${
              OVERFLOW_TABS.some(t => location.pathname.startsWith(t.path)) ? 'active' : ''
            }`}
            onClick={() => setShowOverflow(!showOverflow)}
          >
            <MoreHorizontal size={16} />
          </button>
          {showOverflow && (
            <div className="dropdown-menu navbar-overflow-menu">
              {OVERFLOW_TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.path}
                    className={`dropdown-item ${location.pathname.startsWith(tab.path) ? 'active' : ''}`}
                    onClick={() => {
                      navigate(tab.path)
                      setShowOverflow(false)
                    }}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Right-side Actions */}
      <div className="navbar-actions">
        {/* Ask Zoe */}
        <button className="btn btn-secondary btn-sm" onClick={toggleZoe} style={{ gap: '6px', marginRight: '8px' }} title="Ask Zoe (Ctrl/Cmd+J)">
          <Sparkles size={14} /> Ask Zoe
        </button>

        {/* Global Search */}
        <button className="navbar-action-btn" onClick={toggleCommandPalette} title="Search (Ctrl+K)">
          <Search size={18} />
        </button>

        {/* Quick Add */}
        <div className="dropdown" ref={quickAddRef}>
          <button
            className="navbar-action-btn navbar-quick-add"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            title="Quick Create"
          >
            <Plus size={18} />
          </button>
          {showQuickAdd && (
            <div className="dropdown-menu navbar-quick-add-menu">
              <div className="navbar-quick-add-header">
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Quick Create</span>
              </div>
              <div className="navbar-quick-add-grid">
                {QUICK_ADD_ITEMS.map(item => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      className="navbar-quick-add-item"
                      onClick={() => handleQuickAdd(item)}
                    >
                      <div className="navbar-quick-add-icon">
                        <Icon size={16} />
                      </div>
                      <span className="navbar-quick-add-label">{item.label}</span>
                      {item.shortcut && (
                        <kbd className="navbar-quick-add-kbd">{item.shortcut}</kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Calendar */}
        <button className="navbar-action-btn" title="Calendar" onClick={() => navigate('/calendar')}>
          <CalendarDays size={18} />
        </button>

        {/* Notifications */}
        <div className="dropdown" ref={notifRef}>
          <button
            className="navbar-action-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="navbar-notification-badge">{unreadCount}</span>
            )}
          </button>
          {showNotifications && (
            <div className="dropdown-menu navbar-notifications-panel">
              <div className="navbar-notifications-header">
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Notifications</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={markAllAsRead}
                  style={{ fontSize: '0.7rem' }}
                >
                  Mark all read
                </button>
              </div>
              <div className="navbar-notifications-list">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    className={`navbar-notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="navbar-notification-dot" />
                    <div className="navbar-notification-content">
                      <span className="navbar-notification-title">{n.title}</span>
                      <span className="navbar-notification-msg">{n.message}</span>
                      <span className="navbar-notification-time">{n.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <button className="navbar-action-btn" title="Setup" onClick={() => navigate('/settings')}>
          <Settings size={17} />
        </button>

        {/* Theme Toggle */}
        <button className="navbar-action-btn" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Font Zoom Controls */}
        <div className="navbar-zoom-controls" title="Zoom Level">
          <button className="navbar-zoom-btn" onClick={() => {
            const root = document.documentElement
            const current = parseFloat(getComputedStyle(root).fontSize)
            if (current > 11) { root.style.fontSize = (current - 1) + 'px'; toast.success(`Zoom: ${Math.round(((current-1)/14)*100)}%`) }
          }}>−</button>
          <button className="navbar-zoom-btn" onClick={() => {
            const root = document.documentElement
            const current = parseFloat(getComputedStyle(root).fontSize)
            if (current < 18) { root.style.fontSize = (current + 1) + 'px'; toast.success(`Zoom: ${Math.round(((current+1)/14)*100)}%`) }
          }}>+</button>
        </div>

        {/* Help */}
        <button className="navbar-action-btn" title="Need Support?" onClick={() => setShowHelp(true)}>
          <HelpCircle size={17} />
        </button>

        {/* User Menu */}
        <div className="dropdown" ref={userMenuRef}>
          <button
            className="navbar-user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="navbar-user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>
          {showUserMenu && (
            <div className="dropdown-menu" style={{ width: '220px' }}>
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{user?.name}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{user?.email}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--brand-primary-light)', marginTop: 2 }}>{user?.role?.replace('_', ' ')?.toUpperCase()}</div>
              </div>
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/settings') }}><User size={16} /> My Profile</button>
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); navigate('/my-actions') }}><ListTodo size={16} /> My Tasks</button>
              <button className="dropdown-item" onClick={() => { setShowUserMenu(false); setShowShortcuts(true) }}><Keyboard size={16} /> Keyboard Shortcuts</button>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={logout} style={{ color: 'var(--brand-danger)' }}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="navbar-modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="navbar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="navbar-modal-header">
              <span><Keyboard size={16} /> Keyboard Shortcuts</span>
              <button className="navbar-modal-close" onClick={() => setShowShortcuts(false)}><X size={16} /></button>
            </div>
            <div className="navbar-modal-body">
              {[
                ['Open command palette', 'Ctrl / ⌘ + K'],
                ['Toggle theme', 'Click sun/moon icon in navbar'],
              ].map(([label, keys]) => (
                <div key={label} className="navbar-shortcut-row">
                  <span>{label}</span>
                  <kbd className="navbar-quick-add-kbd">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help Center Modal */}
      {showHelp && (
        <div className="navbar-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="navbar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="navbar-modal-header">
              <span><HelpCircle size={16} /> Help & Support</span>
              <button className="navbar-modal-close" onClick={() => setShowHelp(false)}><X size={16} /></button>
            </div>
            <div className="navbar-modal-body">
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                Welcome to HireOS — your AI-powered hiring platform. Here's how to get going:
              </p>
              {[
                ['📋 Post a job', 'Job Openings → New Job Opening (6-step wizard)'],
                ['👤 Add candidates', 'Candidates → Add Candidate, or share your public apply link'],
                ['🤖 Run AI screening', 'AI Shortlisting → scores & ranks applicants automatically'],
                ['🎥 AI interviews', 'Interviews → Schedule → candidate joins a live AI room'],
                ['📊 Track everything', 'Pipeline (kanban) and Analytics dashboards'],
              ].map(([title, desc]) => (
                <div key={title} className="navbar-help-row">
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
              ))}
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'var(--space-3)' }}
                onClick={() => { setShowHelp(false); toggleCommandPalette() }}
              >
                <Search size={14} /> Open Command Palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="navbar-mobile-menu">
          <nav className="navbar-mobile-nav">
            {ALL_TABS.map(tab => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.exact}
                  className={({ isActive }) => `navbar-mobile-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
