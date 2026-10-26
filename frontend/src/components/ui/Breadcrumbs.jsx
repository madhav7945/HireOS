import React from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Breadcrumb navigation component.
 * Automatically generates breadcrumbs from the current URL path.
 */

const ROUTE_LABELS = {
  '': 'Home',
  'jobs': 'Job Openings',
  'create': 'Create New',
  'candidates': 'Candidates',
  'pipeline': 'Pipeline',
  'interviews': 'Interviews',
  'offers': 'Offers',
  'reports': 'Reports & Analytics',
  'settings': 'Settings',
  'my-actions': 'My Actions',
  'applications': 'Applications',
  'departments': 'Departments',
  'calendar': 'Calendar',
  'ai-shortlist': 'AI Shortlisting',
  'job-boards': 'Job Boards',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const navigate = useNavigate()

  const pathSegments = location.pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs on home page
  if (pathSegments.length === 0) return null

  const crumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    let label = ROUTE_LABELS[segment]
    if (!label) {
      if (segment.toLowerCase().startsWith('job-') || segment.toLowerCase().startsWith('job')) {
        label = `Job (${segment.toUpperCase()})`
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      }
    }
    const isLast = index === pathSegments.length - 1
    return { path, label, isLast }
  })

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <button
        className="breadcrumb-item breadcrumb-home"
        onClick={() => navigate('/')}
      >
        <Home size={14} />
      </button>
      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.path}>
          <ChevronRight size={12} className="breadcrumb-separator" />
          {crumb.isLast ? (
            <span className="breadcrumb-item breadcrumb-current">
              {crumb.label}
            </span>
          ) : (
            <button
              className="breadcrumb-item"
              onClick={() => navigate(crumb.path)}
            >
              {crumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
