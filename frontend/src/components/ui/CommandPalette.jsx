import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store'
import {
  Search, LayoutDashboard, Briefcase, Users, GitBranch, Video,
  FileText, BarChart3, Settings, Plus, UserPlus, Calendar, Mail
} from 'lucide-react'
import './CommandPalette.css'

const COMMANDS = [
  { id: 'dash', icon: LayoutDashboard, label: 'Go to Dashboard', action: 'navigate', path: '/' },
  { id: 'jobs', icon: Briefcase, label: 'Go to Jobs', action: 'navigate', path: '/jobs' },
  { id: 'candidates', icon: Users, label: 'Go to Candidates', action: 'navigate', path: '/candidates' },
  { id: 'pipeline', icon: GitBranch, label: 'Go to Pipeline', action: 'navigate', path: '/pipeline' },
  { id: 'interviews', icon: Video, label: 'Go to Interviews', action: 'navigate', path: '/interviews' },
  { id: 'offers', icon: FileText, label: 'Go to Offers', action: 'navigate', path: '/offers' },
  { id: 'reports', icon: BarChart3, label: 'Go to Reports', action: 'navigate', path: '/reports' },
  { id: 'settings', icon: Settings, label: 'Go to Settings', action: 'navigate', path: '/settings' },
  { id: 'new-job', icon: Plus, label: 'Create New Job', action: 'modal', modal: 'create-job' },
  { id: 'add-cand', icon: UserPlus, label: 'Add Candidate', action: 'modal', modal: 'add-candidate' },
  { id: 'schedule', icon: Calendar, label: 'Schedule Interview', action: 'modal', modal: 'schedule-interview' },
  { id: 'bulk-email', icon: Mail, label: 'Send Bulk Email', action: 'modal', modal: 'bulk-email' },
]

export default function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeCommand = (cmd) => {
    if (cmd.action === 'navigate') {
      navigate(cmd.path)
    }
    toggleCommandPalette()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeCommand(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      toggleCommandPalette()
    }
  }

  if (!commandPaletteOpen) return null

  return (
    <div className="command-overlay" onClick={toggleCommandPalette}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrapper">
          <Search size={18} className="command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Search commands, pages, candidates..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="command-esc">ESC</kbd>
        </div>
        <div className="command-results">
          {filtered.length === 0 ? (
            <div className="command-empty">No results found</div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.id}
                  className={`command-item ${i === selectedIndex ? 'selected' : ''}`}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon size={16} />
                  <span>{cmd.label}</span>
                </button>
              )
            })
          )}
        </div>
        <div className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  )
}
