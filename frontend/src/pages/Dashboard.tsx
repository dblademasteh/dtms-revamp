import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { statusLabel, documentTypeLabel } from '@/constants/documentOptions'
import {
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Megaphone,
  ChevronRight,
  Shield,
  CheckCircle2,
  Inbox,
  LayoutList,
  Building2,
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  created: '#94a3b8',
  received: '#f59e0b',
  in_review: '#3b82f6',
  approved: '#8b5cf6',
  rejected: '#ef4444',
  returned: '#f97316',
  released: '#10b981',
  filed: '#06b6d4',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  )
}

function BarRow({ label, value, max, className }: { label: string; value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 flex-shrink-0 truncate text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${className ?? 'bg-primary-500'}`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="w-8 flex-shrink-0 text-right text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
    </div>
  )
}

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

const shortDate = (d: string) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const clock = useClock()
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-200 rounded mt-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
  const announcements = dashboardData?.announcements || []

  const statusCounts: Record<string, number> = dashboardData?.status_counts || {}
  const pieData = Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      label: statusLabel(status),
      value: Number(count),
      color: STATUS_COLORS[status] || '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0)

  const typeCounts: Record<string, number> = dashboardData?.type_counts || {}
  const typeData = Object.entries(typeCounts)
    .map(([type, count]) => ({ label: documentTypeLabel(type), value: Number(count) }))
    .sort((a, b) => b.value - a.value)
  const maxType = Math.max(...typeData.map(d => d.value), 1)

  const topOffices: Array<{ id: number; name: string; count: number }> = dashboardData?.top_offices || []
  const maxOffice = Math.max(...topOffices.map(o => Number(o.count) || 0), 1)

  const barData = (dashboardData?.volume_series || []).map((v: any) => ({
    period: v.period?.split('T')[0] || v.period,
    total: Number(v.total) || 0,
    released: Number(v.released) || 0,
  }))

  const statCards = [
    { name: 'Total Documents', value: stats.total_documents || 0, icon: FileText, iconCls: 'stat-icon-primary', link: '/documents' },
    { name: 'Released Today', value: stats.released_today || 0, icon: CheckCircle2, iconCls: 'stat-icon-green', link: '/documents?status=released' },
    { name: 'In Transit', value: stats.pending_documents || 0, icon: Clock, iconCls: 'stat-icon-amber', link: '/documents?status=received', subtitle: 'received · in review · returned' },
    { name: 'Overdue', value: stats.overdue_documents || 0, icon: AlertTriangle, iconCls: 'stat-icon-red', link: '/documents', subtitle: 'past SLA deadline' },
  ]

  const deskCards = [
    ...(user?.role === 'office_station' ? [{ name: 'My Office Inbox', value: stats.my_office_pending || 0, icon: Inbox, iconCls: 'stat-icon-amber', link: '/documents' }] : []),
  ]

  const quickActions = [
    ...(user?.role === 'superadmin'
      ? [{ name: 'Agency Gateway', desc: 'Track & create documents', icon: Shield, cls: 'bg-indigo-50 dark:bg-indigo-900/30', iconCls: 'text-indigo-600 dark:text-indigo-400', link: '/gateway' }]
      : []),
    { name: 'Reports', desc: 'View analytics & reports', icon: TrendingUp, cls: 'bg-primary-50 dark:bg-primary-900/30', iconCls: 'text-primary-600 dark:text-primary-400', link: '/reports' },
    ...(user?.email_verified_at ? [
      { name: 'New Document', desc: 'Create a new document', icon: FileText, cls: 'bg-green-50 dark:bg-green-900/30', iconCls: 'text-green-600 dark:text-green-400', link: '/documents/new' },
    ] : []),
    { name: 'Track Document', desc: 'Look up by tracking number', icon: BarChart3, cls: 'bg-amber-50 dark:bg-amber-900/30', iconCls: 'text-amber-600 dark:text-amber-400', link: '/track' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {greeting()}{user ? `, ${[user.rank, user.full_name || user.name].filter(Boolean).join(' ')}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {todayLabel} · {clock}
          </p>
        </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.name} to={stat.link} className="stat-card border-l-4 border-l-slate-200 hover:shadow-md transition-shadow">
            <div className={`stat-icon ${stat.iconCls}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="stat-label">{stat.name}</p>
              <p className="stat-value">{stat.value}</p>
              {stat.subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{stat.subtitle}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            to={action.link}
            className="card p-3 sm:p-5 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-2 sm:gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${action.cls}`}>
              <action.icon className={`w-5 h-5 ${action.iconCls}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight truncate">{action.name}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block truncate">{action.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-auto hidden sm:block flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* My Desk */}
      {deskCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {deskCards.map((card) => (
            <Link key={card.name} to={card.link} className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
              <div className={`stat-icon ${card.iconCls}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="stat-label">{card.name}</p>
                <p className="stat-value">{card.value}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Document Volume</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Last 30 days · created vs released</p>
          </div>
          <div className="card-body">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={shortDate} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    formatter={(value: number, name: string) => [value, name === 'total' ? 'Created' : 'Released']}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="total" />
                  <Bar dataKey="released" fill="#10b981" radius={[4, 4, 0, 0]} name="released" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No document volume data yet" />
            )}
          </div>
        </div>

        {/* Status Donut */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Status Distribution</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All documents you can see</p>
          </div>
          {pieData.length > 0 ? (
            <>
              <div className="card-body flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, _name: string, item: any) => [
                        `${value} (${pieTotal > 0 ? Math.round((value / pieTotal) * 100) : 0}%)`,
                        item.payload?.label,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{pieTotal}</p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Total</p>
                </div>
              </div>
              <div className="px-5 pb-4 grid grid-cols-2 gap-x-3 gap-y-2">
                {pieData.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-2 text-xs min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600 dark:text-slate-400 truncate">{entry.label}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 ml-auto tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card-body">
              <EmptyState label="No status data yet" />
            </div>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Documents by Type</h2>
          </div>
          <div className="card-body space-y-3.5">
            {typeData.length > 0 ? (
              typeData.slice(0, 6).map((t) => (
                <BarRow key={t.label} label={t.label} value={t.value} max={maxType} className="bg-primary-500" />
              ))
            ) : (
              <EmptyState label="No document type data yet" />
            )}
          </div>
        </div>

        {/* Top Offices */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Top Offices</h2>
          </div>
          <div className="card-body space-y-3.5">
            {topOffices.length > 0 ? (
              topOffices.map((office) => (
                <BarRow key={office.id} label={office.name} value={Number(office.count) || 0} max={maxOffice} className="bg-indigo-500" />
              ))
            ) : (
              <EmptyState label="No office data yet" />
            )}
          </div>
        </div>
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
