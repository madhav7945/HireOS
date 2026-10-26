import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import AppLayout from './components/layout/AppLayout'
import Logo from './components/ui/Logo'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import JobsPage from './pages/JobsPage'
import CandidatesPage from './pages/CandidatesPage'
import PipelinePage from './pages/PipelinePage'
import InterviewsPage from './pages/InterviewsPage'
import OffersPage from './pages/OffersPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AIShortlistPage from './pages/AIShortlistPage'
import JobBoardsPage from './pages/JobBoardsPage'
import CreateJobPage from './pages/CreateJobPage'
import JobDetailsPage from './pages/JobDetailsPage'
import MyActionsPage from './pages/MyActionsPage'
import MeetingsPage from './pages/MeetingsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import DepartmentsPage from './pages/DepartmentsPage'
import CalendarPage from './pages/CalendarPage'
import CandidateInterview from './pages/CandidateInterview'
import HRObserver from './pages/HRObserver'
import ManualMeetingRoom from './pages/ManualMeetingRoom'
import PublicApplyPage from './pages/PublicApplyPage'
import ReferralsPage from './pages/ReferralsPage'
import AuthCallback from './pages/AuthCallback'
import InterviewReportPage from './pages/InterviewReportPage'
import CandidateDetailsPage from './pages/CandidateDetailsPage'
import PublicOfferPortal from './pages/PublicOfferPortal'
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { isAuthenticated, initializeAuth, demoLogin, isLoading, setLoading } = useAuthStore()
  const initTheme = useUIStore((s) => s.initTheme)

  useEffect(() => {
    initTheme()
    // Try to initialize real auth from Supabase
    initializeAuth()
  }, [])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--surface-bg)',
      }}>
        <Logo size={40} withWordmark wordmarkSize={32} />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/create" element={<CreateJobPage />} />
        <Route path="jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="candidates/:candidateId" element={<CandidateDetailsPage />} />
        <Route path="my-actions" element={<MyActionsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="ai-shortlist" element={<AIShortlistPage />} />
        <Route path="job-boards" element={<JobBoardsPage />} />
        <Route path="interviews" element={<InterviewsPage />} />
        <Route path="interviews/:interviewId/report" element={<InterviewReportPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Public apply page (no auth needed - candidates access this) */}
      <Route path="/apply/:jobId" element={<PublicApplyPage />} />
      <Route path="/offer-portal/:token" element={<PublicOfferPortal />} />
      {/* Standalone fullscreen interview pages (no sidebar/navbar) */}
      <Route path="/interview/:sessionId" element={<CandidateInterview />} />
      <Route path="/interview/:sessionId/lobby" element={<CandidateInterview />} />
      <Route path="/hr-observe/:sessionId" element={
        <ProtectedRoute><HRObserver /></ProtectedRoute>
      } />
      {/* Manual (human) multi-party meeting room — no auth so panelists/candidates can join by link */}
      <Route path="/meet/:roomId" element={<ManualMeetingRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
