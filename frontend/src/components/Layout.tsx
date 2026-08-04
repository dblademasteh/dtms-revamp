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
  Users,
  Shield,
  GitBranch,
  Building2,
  History,
  Megaphone,
  Lightbulb,
  HardDrive,
  Mail,
  MapPin
} from 'lucide-react'
import { useState } from 'react'
import NotificationBell from '@/components/NotificationBell'
import ConfirmModal from '@/components/ConfirmModal'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Track', href: '/track', icon: MapPin },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Suggestions', href: '/suggestions', icon: Lightbulb },
  { name: 'Mailbox', href: '/mailbox', icon: Mail },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    await logout()
    navigate('/login')
  }

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200/80 dark:border-slate-800">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-600 overflow-hidden flex-shrink-0 text-white shadow-md shadow-blue-500/20">
          <img
            src="/logo.png"
            alt="DTMS logo"
            className="w-7 h-7 object-contain"
            draggable={false}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <Shield className="absolute w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-slate-900 dark:text-white font-extrabold text-base leading-tight tracking-tight">DTMS</div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Document Tracking &amp; Management</div>
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
        {user?.role === 'office_station' && (
          <Link
            to="/office-profile"
            className={`nav-item ${
              isActive('/office-profile') ? 'nav-item-active' : 'nav-item-inactive'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <Building2 className="w-5 h-5 flex-shrink-0" />
            Office Profile
          </Link>
        )}
        {user?.role === 'superadmin' && (
          <>
            <div className="sidebar-section pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800">
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
              to="/personnel"
              className={`nav-item ${
                isActive('/personnel') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              Personnel
            </Link>
            <Link
              to="/admin/storage"
              className={`nav-item ${
                isActive('/admin/storage') ? 'nav-item-active' : 'nav-item-inactive'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <HardDrive className="w-5 h-5 flex-shrink-0" />
              Storage
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Mobile & Tablet sidebar drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 transform transition-transform bg-white dark:bg-slate-900 shadow-2xl">
          <div className="absolute top-3.5 right-3.5 z-20">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close menu"
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
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">DTMS</span>
            </div>
          </div>

          {/* Search */}
          <div className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-x-2 ml-auto">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile: account number + role, with logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-200 dark:ring-blue-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-700 dark:text-blue-300 text-sm font-semibold">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                    {user?.accnt_no || '—'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
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

      <ConfirmModal
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        danger={true}
      />
    </div>
  )
}
