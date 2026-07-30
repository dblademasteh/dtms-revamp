import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Documents from '@/pages/Documents'
import DocumentDetail from '@/pages/DocumentDetail'
import CreateDocument from '@/pages/CreateDocument'
import EditDocument from '@/pages/EditDocument'
import Reports from '@/pages/Reports'
import Users from '@/pages/Users'
import Settings from '@/pages/Settings'
import Track from '@/pages/Track'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import RoutingTemplates from '@/pages/RoutingTemplates'
import Offices from '@/pages/Offices'
import ActivityLog from '@/pages/ActivityLog'
import Personnel from '@/pages/Personnel'
import Announcements from '@/pages/Announcements'
import Suggestions from '@/pages/Suggestions'
import NotFound from '@/pages/NotFound'
import Layout from '@/components/Layout'
import ErrorBoundary from '@/components/ErrorBoundary'
import PrivacyNotice from '@/components/PrivacyNotice'

import { useEffect } from 'react'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
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

function App() {
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
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/track" element={<Track />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="suggestions" element={<Suggestions />} />
              <Route path="admin/users" element={<Users />} />
              <Route path="admin/templates" element={<RoutingTemplates />} />
              <Route path="admin/offices" element={<Offices />} />
              <Route path="admin/activity" element={<AdminRoute><ActivityLog /></AdminRoute>} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster position="top-right" />
      <PrivacyNotice />
    </QueryClientProvider>
  )
}

export default App
