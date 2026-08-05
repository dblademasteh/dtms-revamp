import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  Clock,
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  FileText,
  CheckCircle2,
  Hourglass,
  Inbox,
} from 'lucide-react'

type ReportTab = 'turnaround' | 'bottlenecks' | 'volume'

const useIsDark = () => {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('turnaround')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [volumePeriod, setVolumePeriod] = useState<'day' | 'week' | 'month'>('day')

  const isDark = useIsDark()
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0'
  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipStyle = {
    borderRadius: '10px',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#e2e8f0' : '#0f172a',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  }

  const { data: turnaround, isLoading: turnaroundLoading } = useQuery({
    queryKey: ['report-turnaround', fromDate, toDate],
    queryFn: () => api.get('/reports/turnaround', { params: { from_date: fromDate, to_date: toDate } }).then(res => res.data),
    enabled: activeTab === 'turnaround',
  })

  const { data: bottlenecks, isLoading: bottlenecksLoading } = useQuery({
    queryKey: ['report-bottlenecks', fromDate, toDate],
    queryFn: () => api.get('/reports/bottlenecks', { params: { from_date: fromDate, to_date: toDate } }).then(res => res.data),
    enabled: activeTab === 'bottlenecks',
  })

  const { data: volume, isLoading: volumeLoading } = useQuery({
    queryKey: ['report-volume', fromDate, toDate, volumePeriod],
    queryFn: () => api.get('/reports/volume', { params: { from_date: fromDate, to_date: toDate, period: volumePeriod } }).then(res => res.data),
    enabled: activeTab === 'volume',
  })

  const handleExport = (type: string) => {
    const params = new URLSearchParams({ type, from_date: fromDate, to_date: toDate })
    window.open(`/api/reports/export?${params}`, '_blank')
  }

  const setRange = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    setToDate(to.toISOString().split('T')[0])
    setFromDate(from.toISOString().split('T')[0])
  }

  const tabs: { key: ReportTab; label: string; icon: typeof Clock }[] = [
    { key: 'turnaround', label: 'Turnaround Time', icon: Clock },
    { key: 'bottlenecks', label: 'Bottlenecks', icon: AlertTriangle },
    { key: 'volume', label: 'Document Volume', icon: BarChart3 },
  ]

  const turnaroundData = turnaround?.data?.map((item: any) => ({
    name: item.current_office?.name || 'Unknown',
    avgHours: Math.round(item.avg_hours || 0),
    documents: item.total_documents,
  })) || []

  const bottlenecksData = bottlenecks?.map((item: any) => ({
    name: item.current_office?.name || 'Unknown',
    pending: item.pending_count,
    avgWait: Math.round(item.avg_wait_hours || 0),
  })) || []

  const volumeData = volume?.map((item: any) => ({
    period: new Date(item.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    total: Number(item.total),
    released: Number(item.released),
    pending: Number(item.pending),
  })) || []

  const summaryStats: Record<ReportTab, { label: string; value: number; icon: typeof FileText; color: string }[] | null> = {
    turnaround: turnaround?.summary
      ? [
          { label: 'Avg. Turnaround', value: Math.round(turnaround.summary.average_turnaround_hours || 0), icon: TrendingUp, color: 'stat-icon-primary' },
          { label: 'Total Documents', value: turnaround.summary.total_documents || 0, icon: FileText, color: 'stat-icon-green' },
        ]
      : null,
    bottlenecks: bottlenecksData.length > 0
      ? [
          { label: 'Offices Tracked', value: bottlenecksData.length, icon: Inbox, color: 'stat-icon-cyan' },
          { label: 'Total Pending', value: bottlenecksData.reduce((s: number, d: any) => s + d.pending, 0), icon: Hourglass, color: 'stat-icon-red' },
        ]
      : null,
    volume: volumeData.length > 0
      ? [
          { label: 'Total Documents', value: volumeData.reduce((s: number, d: any) => s + d.total, 0), icon: FileText, color: 'stat-icon-primary' },
          { label: 'Released', value: volumeData.reduce((s: number, d: any) => s + d.released, 0), icon: CheckCircle2, color: 'stat-icon-green' },
          { label: 'Pending', value: volumeData.reduce((s: number, d: any) => s + d.pending, 0), icon: Hourglass, color: 'stat-icon-amber' },
        ]
      : null,
  }

  const chartLoading = activeTab === 'turnaround' ? turnaroundLoading : activeTab === 'bottlenecks' ? bottlenecksLoading : volumeLoading
  const chartHasData = activeTab === 'turnaround' ? turnaroundData.length > 0 : activeTab === 'bottlenecks' ? bottlenecksData.length > 0 : volumeData.length > 0

  const EmptyState = () => (
    <div className="flex h-80 flex-col items-center justify-center gap-3 text-slate-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <BarChart3 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm">No data for the selected period</p>
      <button onClick={() => setRange(30)} className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
        Try the last 30 days
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => handleExport(activeTab)}
          className="btn btn-primary btn-sm flex-shrink-0 sm:ml-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 w-full sm:w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none justify-center ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                From
              </label>
              <input
                type="date"
                className="input !py-2 !text-xs w-40"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                To
              </label>
              <input
                type="date"
                className="input !py-2 !text-xs w-40"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 pb-0.5">
              {[
                { label: '7D', days: 7, title: 'Last 7 days' },
                { label: '30D', days: 30, title: 'Last 30 days' },
                { label: '90D', days: 90, title: 'Last 90 days' },
              ].map((p) => (
                <button
                  key={p.days}
                  title={p.title}
                  onClick={() => setRange(p.days)}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'volume' && (
            <div className="lg:ml-auto flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setVolumePeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                    volumePeriod === p
                      ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {summaryStats[activeTab] && (
        <div className={`grid grid-cols-2 gap-4 ${activeTab === 'volume' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {summaryStats[activeTab]!.map((stat) => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {stat.value}
                    {stat.label === 'Avg. Turnaround' ? 'h' : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart card */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {tabs.find(t => t.key === activeTab)?.label}
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {new Date(fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="card-body">
          {chartLoading ? (
            <div className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : !chartHasData ? (
            <EmptyState />
          ) : (
            <>
              {/* Turnaround Time */}
              {activeTab === 'turnaround' && (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={turnaroundData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12, fill: tickColor }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? '#1e293b66' : '#f1f5f966' }} />
                    <Bar dataKey="avgHours" name="Avg Hours" fill="#3b5280" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Bottlenecks */}
              {activeTab === 'bottlenecks' && (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={bottlenecksData} layout="vertical" margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: tickColor }} />
                      <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12, fill: tickColor }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? '#1e293b66' : '#f1f5f966' }} />
                      <Bar dataKey="pending" name="Pending Docs" fill="#dc2626" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="px-4 py-3 font-semibold">#</th>
                          <th className="px-4 py-3 font-semibold">Office</th>
                          <th className="px-4 py-3 font-semibold">Pending</th>
                          <th className="px-4 py-3 font-semibold">Avg Wait (hrs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {bottlenecksData.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                i === 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/40 dark:text-danger-300' :
                                i === 1 ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                            <td className="px-4 py-3">
                              <span className="badge badge-danger">{item.pending}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.avgWait}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Volume */}
              {activeTab === 'volume' && (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={volumeData} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 12, fill: tickColor }} />
                    <YAxis tick={{ fontSize: 12, fill: tickColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#3b5280" strokeWidth={2.5} dot={{ r: 3, fill: '#3b5280' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="released" name="Released" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3, fill: '#16a34a' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="pending" name="Pending" stroke="#d97706" strokeWidth={2.5} dot={{ r: 3, fill: '#d97706' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
