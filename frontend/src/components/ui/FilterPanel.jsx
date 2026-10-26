import React, { useState } from 'react'
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import './FilterPanel.css'

/**
 * Zoho-style left filter panel with checkbox filters, search, and collapsible groups.
 * 
 * @param {string} title - e.g. "FILTER JOB OPENINGS BY"
 * @param {Array} filters - Array of { id, label, group?, checked }
 * @param {Object} activeFilters - { filterId: boolean }
 * @param {Function} onFilterChange - (filterId, checked) => void
 * @param {Function} onClose - close panel callback
 * @param {boolean} isOpen - whether panel is visible
 */
export default function FilterPanel({ title, filters = [], activeFilters = {}, onFilterChange, onClose, isOpen }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState({})

  if (!isOpen) return null

  const filteredItems = filters.filter(f =>
    f.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group filters
  const groups = {}
  filteredItems.forEach(f => {
    const group = f.group || 'Default'
    if (!groups[group]) groups[group] = []
    groups[group].push(f)
  })

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const activeCount = Object.values(activeFilters).filter(Boolean).length

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <span className="filter-panel-title">{title}</span>
        <div className="filter-panel-header-actions">
          {activeCount > 0 && (
            <span className="filter-panel-count">{activeCount}</span>
          )}
          <button className="filter-panel-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="filter-panel-search">
        <Search size={14} className="filter-panel-search-icon" />
        <input
          type="text"
          placeholder="Search filters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-panel-search-input"
        />
        {searchQuery && (
          <button className="filter-panel-search-clear" onClick={() => setSearchQuery('')}>
            <X size={12} />
          </button>
        )}
      </div>

      <div className="filter-panel-body">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName} className="filter-group">
            {groupName !== 'Default' && (
              <button className="filter-group-header" onClick={() => toggleGroup(groupName)}>
                {collapsedGroups[groupName] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>{groupName}</span>
              </button>
            )}
            {!collapsedGroups[groupName] && (
              <div className="filter-group-items">
                {items.map(filter => (
                  <label key={filter.id} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={activeFilters[filter.id] || false}
                      onChange={(e) => onFilterChange(filter.id, e.target.checked)}
                    />
                    <span className="filter-checkbox-custom" />
                    <span className="filter-checkbox-label">{filter.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
