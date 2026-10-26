import React from 'react'
import './Skeleton.css'

/**
 * Reusable skeleton loading components for HireOS.
 * Usage: <Skeleton.Text />, <Skeleton.Card />, <Skeleton.Table />, etc.
 */

// Base skeleton block
function SkeletonBlock({ width, height, borderRadius, style, className = '' }) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{
        width: width || '100%',
        height: height || '16px',
        borderRadius: borderRadius || 'var(--radius-sm)',
        ...style,
      }}
    />
  )
}

// Text skeleton — multiple lines
function SkeletonText({ lines = 3, widths, gap = 10 }) {
  const defaultWidths = ['100%', '92%', '78%', '85%', '65%']
  return (
    <div className="skeleton-text" style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={widths?.[i] || defaultWidths[i % defaultWidths.length]}
          height="12px"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  )
}

// Avatar skeleton
function SkeletonAvatar({ size = 40 }) {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      borderRadius="50%"
      className="skeleton-avatar"
    />
  )
}

// KPI card skeleton
function SkeletonKPI() {
  return (
    <div className="skeleton-kpi">
      <SkeletonBlock width={40} height={40} borderRadius="var(--radius-md)" />
      <div className="skeleton-kpi-content">
        <SkeletonBlock width="60%" height="12px" />
        <SkeletonBlock width="40%" height="24px" />
        <SkeletonBlock width="50%" height="10px" />
      </div>
    </div>
  )
}

// KPI grid skeleton (8 cards)
function SkeletonKPIGrid({ count = 8 }) {
  return (
    <div className="skeleton-kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKPI key={i} />
      ))}
    </div>
  )
}

// Widget/Card skeleton
function SkeletonWidget({ height = 280, hasHeader = true }) {
  return (
    <div className="skeleton-widget" style={{ minHeight: height }}>
      {hasHeader && (
        <div className="skeleton-widget-header">
          <SkeletonBlock width="35%" height="16px" />
          <SkeletonBlock width="24px" height="24px" borderRadius="var(--radius-sm)" />
        </div>
      )}
      <div className="skeleton-widget-body">
        <SkeletonBlock width="100%" height={height - (hasHeader ? 80 : 20)} borderRadius="var(--radius-md)" />
      </div>
    </div>
  )
}

// Table row skeleton
function SkeletonTableRow({ columns = 6 }) {
  const colWidths = ['30%', '20%', '15%', '12%', '10%', '13%']
  return (
    <div className="skeleton-table-row">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={colWidths[i % colWidths.length]}
          height="14px"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  )
}

// Full table skeleton
function SkeletonTable({ rows = 6, columns = 6 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock
            key={i}
            width={`${60 + Math.random() * 40}px`}
            height="10px"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  )
}

// Profile/Candidate list item skeleton
function SkeletonListItem() {
  return (
    <div className="skeleton-list-item">
      <SkeletonAvatar size={36} />
      <div className="skeleton-list-item-content">
        <SkeletonBlock width="55%" height="14px" />
        <SkeletonBlock width="75%" height="11px" />
      </div>
      <SkeletonBlock width="36px" height="22px" borderRadius="var(--radius-full)" />
    </div>
  )
}

// List skeleton
function SkeletonList({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  )
}

// Chart skeleton
function SkeletonChart({ height = 200 }) {
  return (
    <div className="skeleton-chart" style={{ height }}>
      <div className="skeleton-chart-bars">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-chart-bar"
            style={{
              height: `${30 + Math.random() * 60}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Stat card skeleton
function SkeletonStatCard() {
  return (
    <div className="skeleton-stat-card">
      <SkeletonBlock width={36} height={36} borderRadius="var(--radius-md)" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock width="50%" height="20px" />
        <SkeletonBlock width="70%" height="10px" />
      </div>
    </div>
  )
}

// Stats grid skeleton
function SkeletonStatsGrid({ count = 4 }) {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

// Kanban column skeleton
function SkeletonKanbanColumn() {
  const cardCount = 1 + Math.floor(Math.random() * 3)
  return (
    <div className="skeleton-kanban-column">
      <div className="skeleton-kanban-header">
        <SkeletonBlock width={8} height={8} borderRadius="50%" />
        <SkeletonBlock width="60%" height="12px" />
        <SkeletonBlock width="20px" height="16px" borderRadius="var(--radius-full)" />
      </div>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="skeleton-kanban-card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SkeletonAvatar size={28} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SkeletonBlock width="70%" height="12px" />
              <SkeletonBlock width="50%" height="10px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Kanban board skeleton
function SkeletonKanban({ columns = 6 }) {
  return (
    <div className="skeleton-kanban">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonKanbanColumn key={i} />
      ))}
    </div>
  )
}

// Full page loading skeleton
function SkeletonPage({ type = 'table' }) {
  return (
    <div className="skeleton-page">
      <div className="skeleton-page-header">
        <div>
          <SkeletonBlock width="200px" height="28px" />
          <SkeletonBlock width="300px" height="14px" style={{ marginTop: 8 }} />
        </div>
        <SkeletonBlock width="130px" height="36px" borderRadius="var(--radius-md)" />
      </div>
      {type === 'table' && (
        <>
          <SkeletonStatsGrid />
          <SkeletonTable />
        </>
      )}
      {type === 'list' && <SkeletonList count={8} />}
      {type === 'kanban' && <SkeletonKanban />}
      {type === 'dashboard' && (
        <>
          <SkeletonKPIGrid />
          <div className="skeleton-widget-grid">
            <SkeletonWidget height={260} />
            <SkeletonWidget height={260} />
            <SkeletonWidget height={220} />
            <SkeletonWidget height={220} />
          </div>
        </>
      )}
    </div>
  )
}

// Export all as named + Skeleton namespace
const Skeleton = {
  Block: SkeletonBlock,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  KPI: SkeletonKPI,
  KPIGrid: SkeletonKPIGrid,
  Widget: SkeletonWidget,
  TableRow: SkeletonTableRow,
  Table: SkeletonTable,
  ListItem: SkeletonListItem,
  List: SkeletonList,
  Chart: SkeletonChart,
  StatCard: SkeletonStatCard,
  StatsGrid: SkeletonStatsGrid,
  KanbanColumn: SkeletonKanbanColumn,
  Kanban: SkeletonKanban,
  Page: SkeletonPage,
}

export default Skeleton
