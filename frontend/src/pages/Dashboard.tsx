import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { statusLabel } from '@/constants/documentOptions'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Megaphone,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(res => res.data),
  })

  const { data: volumeData } = useQuery({
    queryKey: ['reports-volume'],
    queryFn: () => api.get('/reports/volume').then(res => res.data),
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/documents', { params: { is_public: 1, per_page: 5 } }).then(res => res.data?.data || res.data || []),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-200 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-slate-200 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {}
  const recentDocs = dashboardData?.recent_documents || []

  const statCards = [
    { name: 'Total Documents', value: stats.total_documents || 0, icon: FileText, color: 'bg-primary-50 text-primary-600', border: 'border-l-primary-500', link: '/documents' },
    { name: 'Received', value: stats.pending_documents || 0, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-l-amber-500', link: '/documents?status=received' },
    { name: 'Approved', value: stats.approved_documents || 0, icon: BadgeCheck, color: 'bg-violet-50 text-violet-600', border: 'border-l-violet-500', link: '/documents?status=approved' },
    { name: 'Released Today', value: stats.released_today || 0, icon: CheckCircle, color: 'bg-green-50 text-green-600', border: 'border-l-green-500', link: '/documents?status=released' },
    { name: 'Overdue', value: stats.overdue_documents || 0, icon: AlertTriangle, color: 'bg-red-50 text-red-600', border: 'border-l-red-500', link: '/documents' },
  ]

  // Pie chart data from recent docs statuses
  const statusCounts: Record<string, number> = {}
  recentDocs.forEach((doc: any) => {
    const s = doc.status || 'unknown'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  })
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: statusLabel(name),
    value,
  }))

  // Volume chart data
  const barData = (volumeData || []).map((v: any) => ({
    period: v.period?.split('T')[0] || v.period,
    total: Number(v.total) || 0,
    released: Number(v.released) || 0,
    pending: Number(v.pending) || 0,
  }))

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'released': return 'badge-success'
      case 'approved': return 'badge-success'
      case 'filed': return 'badge-success'
      case 'received': return 'badge-warning'
      case 'in_review': return 'badge-primary'
      case 'rejected': return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back! Here's an overview of your documents.</p>
      </div>

      {user?.role === 'office_station' && !user?.office_id && !user?.office && (
        <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Your station has no office profile yet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Claim an existing office or create your station profile to start using the system.
              </p>
            </div>
          </div>
          <Link to="/office-profile" className="btn btn-primary btn-sm">
            Set up station
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.name} to={stat.link} className={`stat-card border-l-4 ${stat.border} hover:shadow-md transition-shadow`}>
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="stat-label">{stat.name}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        {barData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Document Volume</h2>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="released" fill="#10b981" radius={[4, 4, 0, 0]} name="Released" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status Pie Chart */}
        {pieData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Status Distribution</h2>
            </div>
            <div className="card-body flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="px-5 pb-4 flex flex-wrap gap-3">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600">{entry.name}</span>
                  <span className="font-medium text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Link to="/reports" className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Reports</p>
              <p className="text-xs text-slate-500">View analytics & reports</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
          </div>
        </Link>
        <Link to="/documents/new" className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">New Document</p>
              <p className="text-xs text-slate-500">Create a new document</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
          </div>
        </Link>
        <Link to="/track" className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Track Document</p>
              <p className="text-xs text-slate-500">Look up by tracking number</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
          </div>
        </Link>
      </div>

      {/* Announcements Bulletin */}
      {(announcements as any[])?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900/40 dark:to-slate-800/40 text-white dark:text-blue-50 border-b-0 dark:border-b dark:border-slate-700/50 rounded-t-xl py-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 dark:text-blue-400" />
              <h2 className="text-base font-bold tracking-wide">Announcements</h2>
              <span className="text-xs bg-white/20 dark:bg-blue-500/20 text-white dark:text-blue-200 px-2 py-0.5 rounded-full font-semibold">
                {(announcements as any[]).length} posted
              </span>
            </div>
            <Link to="/documents?is_public=1" className="text-xs text-white/80 dark:text-blue-300/80 hover:text-white dark:hover:text-blue-300 flex items-center gap-1 font-medium">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {(announcements as any[]).map((doc: any) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mt-0.5">
                  <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">{doc.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{doc.tracking_number}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      {doc.released_at ? new Date(doc.released_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{doc.current_office?.name || ''}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-2 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent Documents</h2>
          <Link to="/documents" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Office</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map((doc: any) => (
                <tr key={doc.id}>
                  <td>
                    <Link to={`/documents/${doc.id}`} className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                      {doc.tracking_number}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate">{doc.subject}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(doc.status)}`}>{statusLabel(doc.status)}</span>
                  </td>
                  <td className="text-slate-500">{doc.current_office?.name}</td>
                </tr>
              ))}
              {recentDocs.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">No recent documents</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
