import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'
import { History, Download, ChevronLeft, ChevronRight } from 'lucide-react'

export default function ActivityLog() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['activity', page, action, search],
    queryFn: () => api.get('/admin/activity', {
      params: {
        page,
        per_page: 50,
        action: action || undefined,
        search: search || undefined,
      },
    }).then(res => res.data),
  })

  const trails = data?.data || []
  const totalPages = data?.last_page || 1

  const handleExport = () => {
    const params = new URLSearchParams({ type: 'activity' })
    if (action) params.set('action', action)
    if (search) params.set('search', search)
    window.open(`/api/reports/export?${params}`, '_blank')
  }

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'created', label: 'Created' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Declined' },
    { value: 'returned', label: 'Returned' },
    { value: 'attachment_uploaded', label: 'Attachment' },
    { value: 'commented', label: 'Commented' },
    { value: 'recalled', label: 'Recalled' },
    { value: 'deleted', label: 'Deleted' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">System-wide audit trail of all document actions</p>
        </div>
        <button onClick={handleExport} className="btn btn-secondary btn-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by description, tracking # or subject..."
              className="input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <select
            className="input w-full sm:w-48"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1) }}
          >
            {actionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : trails.length === 0 ? (
          <div className="text-center py-16">
            <History className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No activity yet</h3>
            <p className="mt-1 text-sm text-slate-500">Activity will appear here as documents are processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trails.map((trail: any) => (
              <div key={trail.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                    <span className="text-slate-600 text-xs font-semibold">
                      {trail.user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-900">{trail.user?.id ? [trail.user.rank, trail.user.full_name || trail.user.name].filter(Boolean).join(' ') : 'System'}</p>
                      <span className="badge badge-neutral text-xs">{trail.action}</span>
                      {trail.document && (
                        <>
                          <span className="text-sm text-slate-500">on</span>
                          <a href={`/documents/${trail.document?.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                            {trail.document?.tracking_number}
                          </a>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{trail.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {trail.document?.subject && <span>{trail.document.subject}</span>}
                      {trail.document?.subject && trail.ip_address && <span>â€¢</span>}
                      {trail.ip_address && <span>{trail.ip_address}</span>}
                      <span>â€¢</span>
                      <span>{new Date(trail.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page <span className="font-medium text-slate-700">{page}</span> of{' '}
              <span className="font-medium text-slate-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm disabled:opacity-40">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


