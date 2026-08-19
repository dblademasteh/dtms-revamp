import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'
import PrivacyNotice from '@/components/PrivacyNotice'
import ProfileSetupModal from '@/components/ProfileSetupModal'
import { useRealtime } from '@/hooks/useRealtime'
import { useDropdownOptions } from '@/hooks/useDropdownOptions'

import { lazy, Suspense, useEffect } from 'react'

const Login = lazy(() => import('@/pages/Login'))
const ChangePassword = lazy(() => import('@/pages/ChangePassword'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Documents = lazy(() => import('@/pages/Documents'))
const DocumentDetail = lazy(() => import('@/pages/DocumentDetail'))
const CreateDocument = lazy(() => import('@/pages/CreateDocument'))
const EditDocument = lazy(() => import('@/pages/EditDocument'))
const Reports = lazy(() => import('@/pages/Reports'))
const Users = lazy(() => import('@/pages/Users'))
const Settings = lazy(() => import('@/pages/Settings'))
const Track = lazy(() => import('@/pages/Track'))
const AgencyGateway = lazy(() => import('@/pages/AgencyGateway'))
const CreateDocumentPublic = lazy(() => import('@/pages/CreateDocumentPublic'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const RoutingTemplates = lazy(() => import('@/pages/RoutingTemplates'))
const Offices = lazy(() => import('@/pages/Offices'))
const ActivityLog = lazy(() => import('@/pages/ActivityLog'))
const Personnel = lazy(() => import('@/pages/Personnel'))
const Storage = lazy(() => import('@/pages/Storage'))
const Announcements = lazy(() => import('@/pages/Announcements'))
const AdminSuggestions = lazy(() => import('@/pages/AdminSuggestions'))
const Mailbox = lazy(() => import('@/pages/Mailbox'))
const OfficeProfile = lazy(() => import('@/pages/OfficeProfile'))
const Help = lazy(() => import('@/pages/Help'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Dropdowns = lazy(() => import('@/pages/admin/Dropdowns'))

const queryClient = new QueryClient()

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.must_change_password) {
    return <Navigate to="/change-password" replace />
  }

  return <>{children}</>
}

function MustChangePasswordRoute() {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.must_change_password) {
    return <Navigate to="/" replace />
  }

  return <ChangePassword />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'superadmin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function RealtimeBridge() {
  useRealtime()
  return null
}

function DropdownOptionsLoader() {
  useDropdownOptions()
  return null
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const unlocked = isAuthenticated && !user?.must_change_password
  const needsProfileSetup = unlocked && user && (
    user.profile_setup_complete === false ||
    !user.email_verified_at
  )

  useEffect(() => {
    // 1. Theme
    const theme = localStorage.getItem('dtms-theme') || 'light'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', systemDark)
    }

    // 2. Font family
    const font = localStorage.getItem('dtms-font') || 'inter'
    document.documentElement.className = document.documentElement.className
      .replace(/\bfont-\w+\b/g, '')
    document.documentElement.classList.add(`font-${font}`)

    // 3. UI Scale
    const scale = localStorage.getItem('dtms-scale') || 'md'
    document.documentElement.className = document.documentElement.className
      .replace(/\bscale-\w+\b/g, '')
    document.documentElement.classList.add(`scale-${scale}`)
  }, [])

  return (
      <QueryClientProvider client={queryClient}>
      {unlocked && <RealtimeBridge />}
      {unlocked && <DropdownOptionsLoader />}
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
          <Route path="/login" element={<Login />} />
           <Route path="/track" element={<Track />} />
           <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/reset-password" element={<ResetPassword />} />
           <Route path="/change-password" element={<MustChangePasswordRoute />} />
            <Route path="/gateway" element={<AgencyGateway />} />
            <Route path="/create" element={<CreateDocumentPublic />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
           <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="documents" element={<Documents />} />
              <Route path="documents/new" element={<CreateDocument />} />
              <Route path="documents/:id" element={<DocumentDetail />} />
              <Route path="documents/:id/edit" element={<EditDocument />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="reports" element={<Reports />} />
              <Route path="personnel" element={<AdminRoute><Personnel /></AdminRoute>} />
              <Route path="mailbox" element={<Mailbox />} />
              <Route path="office-profile" element={<OfficeProfile />} />
              <Route path="admin/users" element={<AdminRoute><Users /></AdminRoute>} />
              <Route path="admin/templates" element={<AdminRoute><RoutingTemplates /></AdminRoute>} />
              <Route path="admin/offices" element={<AdminRoute><Offices /></AdminRoute>} />
              <Route path="admin/storage" element={<AdminRoute><Storage /></AdminRoute>} />
              <Route path="admin/activity" element={<AdminRoute><ActivityLog /></AdminRoute>} />
              <Route path="admin/suggestions" element={<AdminRoute><AdminSuggestions /></AdminRoute>} />
              <Route path="admin/dropdowns" element={<AdminRoute><Dropdowns /></AdminRoute>} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" />
      <PrivacyNotice />
      {needsProfileSetup && <ProfileSetupModal onComplete={() => {}} />}
    </QueryClientProvider>
  )
}

export default App
