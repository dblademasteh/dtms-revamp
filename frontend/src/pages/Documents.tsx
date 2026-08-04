import { useState, useMemo } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import ModalPortal from '@/components/ModalPortal'
import {
  Plus,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Building2,
  Clock,
  Send,
  X,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck
} from 'lucide-react'
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
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Selection & Bulk Action
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

  const officeOptions = useMemo(() => [
    { value: '', label: 'All Offices' },
    ...(offices?.map((o: any) => ({ value: String(o.id), label: o.name })) || []),
  ], [offices])

  const personnelOptions = useMemo(() => personnel?.filter(
    (p: any) => !officeFilter || String(p.office_id) === officeFilter
  ) || [], [personnel, officeFilter])

  const personnelSelectOptions = useMemo(() => [
    { value: '', label: 'All Personnel' },
    ...personnelOptions.map((p: any) => ({
      value: String(p.id),
      label: `${p.rank ? p.rank + ' ' : ''}${p.full_name || p.name}`,
    })),
  ], [personnelOptions])

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
      toast.success(`${res.data.success || 'Document'} ${bulkAction}`)
      setSelected(new Set())
      setShowBulkModal(false)
      setBulkRemarks('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Action failed'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: any) => api.post('/documents/bulk-delete', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(res.data.message || 'Document deleted')
      setSelected(new Set())
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const documents = data?.data || []
  const totalPages = data?.last_page || 1
  const totalDocuments = data?.total || documents.length

  const copyTracking = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(doc.tracking_number)
    setCopiedId(doc.id)
    toast.success(`Copied ${doc.tracking_number}`)
    setTimeout(() => setCopiedId(null), 2000)
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
    { value: '', label: 'All Statuses' },
    { value: 'created', label: 'Created' },
    { value: 'received', label: 'Received' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Declined' },
    { value: 'returned', label: 'Returned' },
    { value: 'released', label: 'Released' },
    { value: 'filed', label: 'Filed' },
  ]

  const statusBadgeStyle = (st: string) => {
    switch (st) {
      case 'released':
      case 'approved':
      case 'filed':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      case 'received':
      case 'in_review':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'rejected':
        return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'returned':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
  }

  const priorityBadgeStyle = (pr: string) => {
    switch (pr) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800 font-extrabold animate-pulse'
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold'
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Documents Repository
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalDocuments} Total
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor, route, approve, and track document lifecycles across offices
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/documents/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Document</span>
          </Link>
        </div>
      </div>

      {/* Filter Control Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Row 1: Search & Quick Tab Pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by tracking number or subject title..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => { setMineOnly(false); setForMeOnly(false); setPage(1) }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                !mineOnly && !forMeOnly
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Documents
            </button>

            {user && (
              <>
                <button
                  onClick={() => { setMineOnly(!mineOnly); setForMeOnly(false); setPage(1) }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    mineOnly
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  My Documents
                </button>

                <button
                  onClick={() => { setForMeOnly(!forMeOnly); setMineOnly(false); setPage(1) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    forMeOnly
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Action Required (For Me)</span>
                </button>
              </>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear all active filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
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

          <select
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1) }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent Priority</option>
          </select>

          <select
            className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={docType}
            onChange={(e) => { setDocType(e.target.value); setPage(1) }}
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Documents Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No registered documents match your current filter parameters. Try clearing search filters or create a new document.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 pl-6 px-4">Document Details</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Type &amp; Priority</th>
                  <th className="py-4 px-4">Current Location</th>
                  <th className="py-4 pr-6 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {documents.map((doc: any) => (
                  <tr
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Document Title & Tracking Number */}
                    <td className="py-4 pl-6 px-4 min-w-[280px] max-w-md">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {doc.subject}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => copyTracking(doc, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                            title="Click to copy tracking code"
                          >
                            <span>{doc.tracking_number}</span>
                            {copiedId === doc.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border font-semibold ${statusBadgeStyle(doc.status)}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {statusLabel(doc.status)}
                      </span>
                    </td>

                    {/* Type & Priority */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {documentTypeLabel(doc.document_type)}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityBadgeStyle(doc.priority)}`}>
                          {doc.priority || 'normal'}
                        </span>
                      </div>
                    </td>

                    {/* Current Location */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[180px]">{doc.current_office?.name || 'HQ Station'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(doc.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </td>

                    {/* Quick Action Controls */}
                    <td className="py-4 pr-6 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {doc.status === 'created' && (
                          <button
                            type="button"
                            title="Send Document"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" /> Send
                          </button>
                        )}

                        {['received', 'in_review'].includes(doc.status) && (
                          <>
                            <button
                              type="button"
                              title="Approve Document"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('approved'); setShowBulkModal(true) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>

                            <button
                              type="button"
                              title="Decline Document"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('rejected'); setShowBulkModal(true) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>

                            <button
                              type="button"
                              title="Return Document"
                              onClick={() => { setSelected(new Set([doc.id])); setBulkAction('returned'); setShowBulkModal(true) }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Resubmit
                          </button>
                        )}

                        <button
                          type="button"
                          title="Delete Document"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this document record?')) {
                              bulkDeleteMutation.mutate({ document_ids: [doc.id] })
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Remarks Modal */}
      {showBulkModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowBulkModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 pt-6 pb-6 relative text-white">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">
                      {bulkAction === 'rejected' ? 'Decline' : bulkAction === 'approved' ? 'Approve' : 'Return'} Document
                    </h3>
                    <p className="text-xs text-slate-300">Provide official action remarks for audit logging</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-3">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Remarks &amp; Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-h-[90px] resize-none"
                  value={bulkRemarks}
                  onChange={(e) => setBulkRemarks(e.target.value)}
                  placeholder="Provide details or remarks for this action..."
                  autoFocus
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkRemarks.trim() || bulkMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {bulkMutation.isPending ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>Confirm Action</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
