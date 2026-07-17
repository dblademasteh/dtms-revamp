import { useState } from 'react'
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
  AlertOctagon,
} from 'lucide-react'

type ReportTab = 'turnaround' | 'bottlenecks' | 'volume' | 'overdue'

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('turnaround')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [volumePeriod, setVolumePeriod] = useState<'day' | 'week' | 'month'>('day')

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

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['report-overdue'],
    queryFn: () => api.get('/reports/overdue').then(res => res.data),
    enabled: activeTab === 'overdue',
  })

  const handleExport = (type: string) => {
    const params = new URLSearchParams({ type, from_date: fromDate, to_date: toDate })
    window.open(`/api/reports/export?${params}`, '_blank')
  }

  const tabs = [
    { key: 'turnaround' as ReportTab, label: 'Turnaround Time', icon: Clock },
    { key: 'bottlenecks' as ReportTab, label: 'Bottlenecks', icon: AlertTriangle },
    { key: 'volume' as ReportTab, label: 'Document Volume', icon: BarChart3 },
    { key: 'overdue' as ReportTab, label: 'Overdue', icon: AlertOctagon },
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

  const overdueDocs = overdueData?.data || []
  const overdueSummary = overdueData?.summary || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analytics and performance insights
          </p>
        </div>
        <button
          onClick={() => handleExport(activeTab)}
          className="btn btn-secondary btn-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'overdue' && overdueSummary.total_overdue > 0 && (
                <span className="badge badge-danger text-[10px]">{overdueSummary.total_overdue}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      {activeTab !== 'overdue' && (
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />
                  From
                </label>
                <input
                  type="date"
                  className="input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />
                  To
                </label>
                <input
                  type="date"
                  className="input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              {activeTab === 'volume' && (
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Period
                  </label>
                  <select
                    className="input"
                    value={volumePeriod}
                    onChange={(e) => setVolumePeriod(e.target.value as any)}
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="card">
        <div className="card-body">
          {/* Turnaround Time */}
          {activeTab === 'turnaround' && (
            <div className="space-y-6">
              {turnaround?.summary && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">Avg. Turnaround</p>
                    <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                      {Math.round(turnaround.summary.average_turnaround_hours || 0)}h
                    </p>
                  </div>
                  <div className="p-4 bg-success-50 rounded-lg">
                    <p className="text-sm text-success-600 font-medium">Total Documents</p>
                    <p className="text-2xl font-bold text-success-700">
                      {turnaround.summary.total_documents || 0}
                    </p>
                  </div>
                </div>
              )}
              {turnaroundLoading ? (
                <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
              ) : turnaroundData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={turnaroundData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="avgHours" name="Avg Hours" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  No data for selected period
                </div>
              )}
            </div>
          )}

          {/* Bottlenecks */}
          {activeTab === 'bottlenecks' && (
            <div className="space-y-6">
              {bottlenecksLoading ? (
                <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
              ) : bottlenecksData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={bottlenecksData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="pending" name="Pending Docs" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Office</th>
                          <th>Pending</th>
                          <th>Avg Wait (hrs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bottlenecksData.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="font-medium">{item.name}</td>
                            <td>
                              <span className="badge badge-danger">{item.pending}</span>
                            </td>
                            <td>{item.avgWait}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  No bottlenecks for selected period
                </div>
              )}
            </div>
          )}

          {/* Volume */}
          {activeTab === 'volume' && (
            <div className="space-y-6">
              {volumeLoading ? (
                <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
              ) : volumeData.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg text-center">
                      <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">Total</p>
                      <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                        {volumeData.reduce((s: number, d: any) => s + d.total, 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-success-50 rounded-lg text-center">
                      <p className="text-sm text-success-600 font-medium">Released</p>
                      <p className="text-2xl font-bold text-success-700">
                        {volumeData.reduce((s: number, d: any) => s + d.released, 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-warning-50 rounded-lg text-center">
                      <p className="text-sm text-warning-600 font-medium">Pending</p>
                      <p className="text-2xl font-bold text-warning-700">
                        {volumeData.reduce((s: number, d: any) => s + d.pending, 0)}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="released" name="Released" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                  No volume data for selected period
                </div>
              )}
            </div>
          )}

          {/* Overdue */}
          {activeTab === 'overdue' && (
            <div className="space-y-6">
              {overdueLoading ? (
                <div className="h-80 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-danger-50 rounded-lg text-center">
                      <p className="text-sm text-danger-600 font-medium">Total Overdue</p>
                      <p className="text-2xl font-bold text-danger-700">
                        {overdueSummary.total_overdue || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-danger-50 rounded-lg text-center">
                      <p className="text-sm text-danger-600 font-medium">Urgent Priority</p>
                      <p className="text-2xl font-bold text-danger-700">
                        {overdueSummary.urgent || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-warning-50 rounded-lg text-center">
                      <p className="text-sm text-warning-600 font-medium">High Priority</p>
                      <p className="text-2xl font-bold text-warning-700">
                        {overdueSummary.high || 0}
                      </p>
                    </div>
                  </div>
                  {overdueDocs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Tracking #</th>
                            <th>Subject</th>
                            <th>Priority</th>
                            <th>Office</th>
                            <th>SLA Deadline</th>
                            <th>Days Overdue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overdueDocs.map((doc: any) => {
                            const daysOverdue = Math.ceil(
                              (Date.now() - new Date(doc.sla_deadline).getTime()) / (1000 * 60 * 60 * 24)
                            )
                            return (
                              <tr key={doc.id}>
                                <td className="font-medium text-primary-600">{doc.tracking_number}</td>
                                <td className="max-w-xs truncate">{doc.subject}</td>
                                <td>
                                  <span className={`badge ${
                                    doc.priority === 'urgent' ? 'badge-danger' :
                                    doc.priority === 'high' ? 'badge-warning' : 'badge-neutral'
                                  }`}>{doc.priority}</span>
                                </td>
                                <td className="text-slate-500">{doc.current_office?.name}</td>
                                <td className="text-slate-500">
                                  {new Date(doc.sla_deadline).toLocaleDateString()}
                                </td>
                                <td>
                                  <span className="badge badge-danger">{daysOverdue}d</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                      No overdue documents - all on track!
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
