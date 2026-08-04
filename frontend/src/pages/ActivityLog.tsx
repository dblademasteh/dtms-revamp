import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'
import {
  History,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  FilePlus2,
  CheckCircle2,
  XCircle,
  Undo2,
  Paperclip,
  MessageSquare,
  ArrowLeftRight,
  Trash2,
  Send,
  ListFilter,
  Inbox,
} from 'lucide-react'

const ACTION_META: Record<string, { icon: typeof Send; label: string; dot: string; chip: string }> = {
  created: { icon: FilePlus2, label: 'Created', dot: 'bg-primary-500', chip: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800' },
  approved: { icon: CheckCircle2, label: 'Approved', dot: 'bg-success-500', chip: 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/40 dark:text-success-300 dark:border-success-800' },
  rejected: { icon: XCircle, label: 'Declined', dot: 'bg-danger-500', chip: 'bg-danger-50 text-danger-700 border-danger-200 dark:bg-danger-900/40 dark:text-danger-300 dark:border-danger-800' },
  returned: { icon: Undo2, label: 'Returned', dot: 'bg-warning-500', chip: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/40 dark:text-warning-300 dark:border-warning-800' },
  attachment_uploaded: { icon: Paperclip, label: 'Attachment', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800' },
  commented: { icon: MessageSquare, label: 'Commented', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800' },
  recalled: { icon: ArrowLeftRight, label: 'Recalled', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' },
  deleted: { icon: Trash2, label: 'Deleted', dot: 'bg-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  routed: { icon: Send, label: 'Routed', dot: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800' },
  received: { icon: Inbox, label: 'Received', dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800' },
}

const metaFor = (action: string) =>
  ACTION_META[action] || { icon: History, label: action, dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Activity Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            System-wide audit trail of all document actions
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary btn-sm flex-shrink-0">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by description, tracking # or subject..."
              className="input !pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="relative w-full sm:w-52">
            <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              className="input !pl-9 cursor-pointer"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
            >
              {actionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : trails.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <History className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No activity found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {search || action
                ? 'Try adjusting your search or filters.'
                : 'Activity will appear here as documents are processed.'}
            </p>
          </div>
        ) : (
          <div className="relative px-6 py-6">
            {/* Vertical timeline line */}
            <div className="absolute left-[54px] top-6 bottom-6 w-px bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-6">
              {trails.map((trail: any) => {
                const meta = metaFor(trail.action)
                const Icon = meta.icon
                const isSystem = !trail.user?.id
                return (
                  <div key={trail.id} className="relative flex items-start gap-4">
                    {/* Icon node */}
                    <div className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${meta.dot} text-white shadow-sm`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {isSystem ? 'System' : [trail.user.rank, trail.user.full_name || trail.user.name].filter(Boolean).join(' ')}
                        </p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
                          {meta.label}
                        </span>
                        {trail.document && (
                          <a
                            href={`/documents/${trail.document?.id}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            #{trail.document?.tracking_number}
                          </a>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{trail.description}</p>
                      {(trail.document?.subject || trail.ip_address) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {trail.document?.subject && (
                            <span className="max-w-md truncate italic">{trail.document.subject}</span>
                          )}
                          {trail.document?.subject && trail.ip_address && <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />}
                          {trail.ip_address && <span className="font-mono">{trail.ip_address}</span>}
                        </div>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {new Date(trail.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> of{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
