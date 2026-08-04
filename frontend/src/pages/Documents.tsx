import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import ModalPortal from '@/components/ModalPortal'
import { Plus, Search, FileText, ChevronLeft, ChevronRight, CheckCircle, XCircle, RotateCcw, Trash2, Building2, Clock, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { documentTypeLabel, DOCUMENT_TYPES, statusLabel } from '@/constants/documentOptions'

import SearchableSelect from '@/components/SearchableSelect'

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
  const [officeFilter, setOfficeFilter] = useState('')
  const [personnelFilter, setPersonnelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approved' | 'rejected' | 'returned'>('approved')
  const [bulkRemarks, setBulkRemarks] = useState('')

  const hasActiveFilters = Boolean(search || officeFilter || personnelFilter || status || priority || docType || mineOnly || forMeOnly)

  const clearAllFilters = () => {
    setSearch('')
    setOfficeFilter('')
    setPersonnelFilter('')
    setStatus('')
    setPriority('')
    setDocType('')
    setMineOnly(false)
    setForMeOnly(false)
    setPage(1)
  }

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get('/offices').then((r) => r.data),
  })

  const { data: personnel } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => api.get('/personnel').then((r) => r.data),
  })

  const officeOptions = [
    { value: '', label: 'All Offices' },
    ...(offices?.map((o: any) => ({ value: String(o.id), label: o.name })) || []),
  ]

  const personnelOptions = personnel?.filter(
    (p: any) => !officeFilter || String(p.office_id) === officeFilter
  ) || []

  const personnelSelectOptions = [
    { value: '', label: 'All Personnel' },
    ...personnelOptions.map((p: any) => ({
      value: String(p.id),
      label: `${p.rank ? p.rank + ' ' : ''}${p.full_name || p.name}`,
    })),
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, status, priority, docType, page, mineOnly, forMeOnly, officeFilter, personnelFilter],
    queryFn: () => api.get('/documents', {
      params: { 
        search: search || undefined, 
        status: status || undefined, 
        priority: priority || undefined, 
        document_type: docType || undefined, 
        office_id: officeFilter || undefined, 
        personnel_id: personnelFilter || undefined, 
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

  // Document query results

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
    { value: 'created', label: 'Created' },
    { value: 'received', label: 'Received' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Declined' },
    { value: 'returned', label: 'Returned' },
    { value: 'released', label: 'Released' },
    { value: 'filed', label: 'Filed' },
  ]

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'released': return 'badge-success'
      case 'approved': return 'badge-success'
      case 'filed': return 'badge-success'
      case 'received': return 'badge-warning'
      case 'in_review': return 'badge-primary'
      case 'rejected': return 'badge-danger'
      case 'returned': return 'badge-warning'
      case 'created': return 'badge-neutral'
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
        <div className="card-body space-y-3">
          {/* Row 1: Search & Quick Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tracking # or subject..."
                className="input pl-9 w-full"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMineOnly(!mineOnly); setForMeOnly(false); setPage(1) }}
                    className={`btn whitespace-nowrap ${mineOnly ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {mineOnly ? 'My Documents ✓' : 'My Documents'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForMeOnly(!forMeOnly); setMineOnly(false); setPage(1) }}
                    className={`btn whitespace-nowrap ${forMeOnly ? 'btn-success' : 'btn-secondary'}`}
                  >
                    {forMeOnly ? 'For Me (Action Required) ✓' : 'For Me (Action Required)'}
                  </button>
                </>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 gap-1 whitespace-nowrap"
                  title="Clear all filters"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Searchable selects & category filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <SearchableSelect
              options={officeOptions}
              value={officeFilter}
              onChange={(val) => { setOfficeFilter(val); setPersonnelFilter(''); setPage(1) }}
              placeholder="All Offices"
              isClearable
            />
            <SearchableSelect
              options={personnelSelectOptions}
              value={personnelFilter}
              onChange={(val) => { setPersonnelFilter(val); setPage(1) }}
              placeholder="All Personnel"
              isClearable
            />
            <select className="input w-full" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input w-full" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}>
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select className="input w-full" value={docType} onChange={(e) => { setDocType(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 px-4">Document Info</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Details</th>
                  <th className="py-4 px-4">Current Location</th>
                  <th className="py-4 pr-6 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc: any) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-4 pl-6 px-4 min-w-[280px] max-w-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate mb-1" title={doc.subject}>
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
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          {doc.current_office?.name || '—'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-6 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.status === 'created' && (
                          <button
                            type="button"
                            title="Send Document"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="btn btn-primary btn-sm gap-1 px-2.5 py-1 text-xs"
                          >
                            <Send className="w-3.5 h-3.5" /> Send
                          </button>
                        )}
                        {['received', 'in_review'].includes(doc.status) && (
                          <>
                            <button
                              type="button"
                              title="Approve"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('approved'); setShowBulkModal(true) }}
                              className="btn btn-success btn-sm gap-1 px-2.5 py-1 text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              title="Decline"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('rejected'); setShowBulkModal(true) }}
                              className="btn btn-danger btn-sm gap-1 px-2.5 py-1 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                            <button
                              type="button"
                              title="Return"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('returned'); setShowBulkModal(true) }}
                              className="btn btn-secondary btn-sm gap-1 px-2.5 py-1 text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Return
                            </button>
                          </>
                        )}
                        {doc.status === 'returned' && (
                          <button
                            type="button"
                            title="Resubmit Document"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="btn btn-warning btn-sm gap-1 px-2.5 py-1 text-xs text-slate-900"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Resubmit
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this document?')) {
                              bulkDeleteMutation.mutate({ document_ids: [doc.id] })
                            }
                          }}
                          className="btn btn-danger-outline btn-sm p-1.5 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* Action Remarks Modal */}
      {showBulkModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {bulkAction === 'rejected' ? 'Decline' : bulkAction === 'approved' ? 'Approve' : 'Return'} Document
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
