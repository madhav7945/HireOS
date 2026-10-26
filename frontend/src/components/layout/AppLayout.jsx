import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import CommandPalette from '../ui/CommandPalette'
import Breadcrumbs from '../ui/Breadcrumbs'
import PageTransition from '../ui/PageTransition'
import AssistantWidget from '../assistant/AssistantWidget'
import { useUIStore } from '../../store'

export default function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)

  // Hiring Autopilot: fire any due "interview today" reminders when the app opens.
  useEffect(() => {
    import('../../services/pipeline').then(m => m.pipelineService.checkDueReminders()).catch(() => {})
  }, [])

  return (
    <div className="app-layout">
      <Sidebar />
      <main className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar />
        <div className="page-content">
          <Breadcrumbs />
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </main>
      <CommandPalette />
      <AssistantWidget />
    </div>
  )
}
