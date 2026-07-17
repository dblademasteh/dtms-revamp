import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Shield,
  GitBranch,
  Building2,
  History,
  Users,
  Megaphone
} from 'lucide-react'
import { useState } from 'react'
import NotificationBell from '@/components/NotificationBell'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Personnel', href: '/personnel', icon: Users },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-navy-900">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 bg-primary-500 rounded-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base leading-tight tracking-tight">DTMS</div>
          <div className="text-slate-400 text-[11px] font-medium">Document Tracking &amp; Management</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="sidebar-section">
          <div className="sidebar-label">Main Menu</div>
        </div>
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`nav-item ${
              isActive(item.href) ? 'nav-item-active' : 'nav-item-inactive'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.name}
          </Link>
        ))}
        {user?.role === 'superadmin' && (
          <>
            <div className="sidebar-section pt-4 mt-4 border-t border-white/10">
              <div className="sidebar-label">Administration</div>
            </div>
            <Link
              to="/admin/users"
              className={`nav-item ${
                isActive('/admin/users') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              Users
            </Link>
            <Link
              to="/admin/templates"
              className={`nav-item ${
                isActive('/admin/templates') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <GitBranch className="w-5 h-5 flex-shrink-0" />
              Templates
            </Link>
            <Link
              to="/admin/offices"
              className={`nav-item ${
                isActive('/admin/offices') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Building2 className="w-5 h-5 flex-shrink-0" />
              Offices
            </Link>
            <Link
              to="/admin/activity"
              className={`nav-item ${
                isActive('/admin/activity') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <History className="w-5 h-5 flex-shrink-0" />
              Activity Log
            </Link>
          </>
        )}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 transform transition-transform">
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 bg-navy-900">
            <span className="text-xl font-bold text-white">DTMS</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search */}
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-x-2 ml-auto">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile: account number + role, with logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary-100 ring-1 ring-primary-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-700 text-sm font-semibold">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-900 font-mono">
                    {user?.accnt_no || '—'}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
