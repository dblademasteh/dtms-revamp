import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import ModalPortal from '@/components/ModalPortal'
import { Plus, Search, FileText, ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, X, Trash2, Building2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentTypeLabel, DOCUMENT_TYPES, statusLabel } from '@/constants/documentOptions'

export default function Documents() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [priority, setPriority] = useState('')
  const [docType, setDocType] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [forMeOnly, setForMeOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approved' | 'rejected' | 'returned'>('approved')
  const [bulkRemarks, setBulkRemarks] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, status, priority, docType, page, mineOnly, forMeOnly],
    queryFn: () => api.get('/documents', {
      params: { 
        search: search || undefined, 
        status: status || undefined, 
        priority: priority || undefined, 
        document_type: docType || undefined, 
        page, 
        per_page: 10, 
        mine: mineOnly || undefined, 
        for_me: forMeOnly || undefined 
      }
    }).then(res => res.data),
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: any) => api.post('/documents/bulk-route', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(`${res.data.success} document(s) ${bulkAction}`)
      setSelected(new Set())
      setShowBulkModal(false)
      setBulkRemarks('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Bulk action failed'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: any) => api.post('/documents/bulk-delete', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(res.data.message)
      setSelected(new Set())
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Bulk delete failed'),
  })

  const documents = data?.data || []
  const totalPages = data?.last_page || 1

  // Documents that can still receive routing actions (exlude terminal/approved states)
  const isActionable = (doc: any) => !['approved', 'released'].includes(doc.status)

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleSelectAll = () => {
    const actionable = documents.filter(isActionable).map((d: any) => d.id)
    if (actionable.every((id: number) => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(actionable))
    }
  }

  const handleBulkAction = () => {
    if (!bulkRemarks.trim()) return
    const payload: any = {
      document_ids: Array.from(selected),
      action: bulkAction,
      remarks: bulkRemarks,
    }
    if (bulkAction === 'returned') {
      payload.to_office_id = (user as any)?.office_id || 1
    }
    bulkMutation.mutate(payload)
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'returned', label: 'Returned' },
    { value: 'released', label: 'Released' },
  ]

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'released': return 'badge-success'
      case 'approved': return 'badge-success'
      case 'pending': return 'badge-warning'
      case 'in_review': return 'badge-primary'
      case 'rejected': return 'badge-danger'
      case 'returned': return 'badge-warning'
      default: return 'badge-neutral'
    }
  }

  const priorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'badge-danger'
      case 'high': return 'badge-warning'
      default: return 'badge-neutral'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track all documents in the system</p>
        </div>
        <Link to="/documents/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Document
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tracking # or subject..."
                className="input pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <select className="input w-full sm:w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input w-full sm:w-36" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select className="input w-full sm:w-44" value={docType} onChange={(e) => { setDocType(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => { setMineOnly(!mineOnly); setForMeOnly(false); setPage(1) }}
                  className={`btn ${mineOnly ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {mineOnly ? 'My Documents ✓' : 'My Documents'}
                </button>
                <button
                  type="button"
                  onClick={() => { setForMeOnly(!forMeOnly); setMineOnly(false); setPage(1) }}
                  className={`btn ${forMeOnly ? 'btn-success' : 'btn-secondary'}`}
                >
                  {forMeOnly ? 'For Me (Action Required) ✓' : 'For Me (Action Required)'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="card border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30">
          <div className="card-body py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {selected.size} document(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => { setBulkAction('approved'); setShowBulkModal(true) }} className="btn btn-success btn-sm">
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => { setBulkAction('rejected'); setShowBulkModal(true) }} className="btn btn-danger btn-sm">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button onClick={() => { setBulkAction('returned'); setShowBulkModal(true) }} className="btn btn-secondary btn-sm">
                <RotateCcw className="w-3.5 h-3.5" /> Return
              </button>
              <button onClick={() => setSelected(new Set())} className="btn btn-ghost btn-sm">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
              <button onClick={() => bulkDeleteMutation.mutate({ document_ids: Array.from(selected) })} disabled={bulkDeleteMutation.isPending} className="btn btn-danger-outline btn-sm">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-4 flex-1 bg-slate-200 rounded" />
                  <div className="h-6 w-16 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No documents found</h3>
            <p className="mt-1 text-sm text-slate-500">Get started by creating a new document.</p>
            <div className="mt-4">
              <Link to="/documents/new" className="btn btn-primary btn-sm inline-flex">
                <Plus className="w-4 h-4" /> New Document
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-3 w-10">
                    {documents.some(isActionable) && (
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={
                          documents.filter(isActionable).length > 0 &&
                          documents.filter(isActionable).every((d: any) => selected.has(d.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    )}
                  </th>
                  <th className="py-4 px-4">Document Info</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Details</th>
                  <th className="py-4 px-4">Current Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc: any) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className={`cursor-pointer transition-colors ${selected.has(doc.id) ? 'bg-primary-50/50 dark:bg-primary-900/20 hover:bg-primary-50 dark:hover:bg-primary-900/30' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}
                  >
                    <td className="py-4 pl-6 pr-3" onClick={(e) => e.stopPropagation()}>
                      {isActionable(doc) ? (
                        <input
                          type="checkbox"
                          className="checkbox mt-1"
                          checked={selected.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                        />
                      ) : (
                        <span className="block w-4 h-4" />
                      )}
                    </td>
                    <td className="py-4 px-4 min-w-[280px] max-w-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 truncate mb-1" title={doc.subject}>
                          {doc.subject}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold tracking-wide text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-700/60 shadow-sm">
                            {doc.tracking_number}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`badge shadow-sm ${statusBadgeClass(doc.status)}`}>{statusLabel(doc.status)}</span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-600 uppercase tracking-wide">
                          {documentTypeLabel(doc.document_type)}
                        </span>
                        <span className={`badge text-[10px] shadow-sm ${priorityBadgeClass(doc.priority)}`}>{doc.priority}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {doc.current_office?.name || '—'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Bulk Action Modal */}
      {showBulkModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {bulkAction} {selected.size} document(s)
              </h3>
            </div>
            <div className="px-6 py-4">
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Remarks (required)</label>
              <textarea
                className="input min-h-[80px]"
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Enter remarks..."
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={handleBulkAction}
                disabled={!bulkRemarks.trim() || bulkMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {bulkMutation.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

    </div>
  )
}
