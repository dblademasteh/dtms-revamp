import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import {
  Plus,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Building2,
  X,
  Copy,
  Check,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'
import { documentTypeLabel, statusLabel } from '@/constants/documentOptions'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import SearchableSelect from '@/components/SearchableSelect'

export default function Documents() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const documentTypes = useDropdownGroup('document_types')
  const priorities = useDropdownGroup('priorities')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setPage(1)
  }, [searchParams.get('q')])
  const [priority, setPriority] = useState('')
  const [docType, setDocType] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [forMeOnly, setForMeOnly] = useState(false)
  const [officeFilter, setOfficeFilter] = useState('')
  const [personnelFilter, setPersonnelFilter] = useState('')
  const [page, setPage] = useState(1)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const hasActiveFilters = Boolean(search || officeFilter || personnelFilter || status || priority || docType || mineOnly || forMeOnly)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const advancedFilterCount = [officeFilter, personnelFilter, status, priority, docType].filter(Boolean).length

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
    queryKey: ['documents', debouncedSearch, status, priority, docType, page, mineOnly, forMeOnly, officeFilter, personnelFilter, sortBy, sortDir],
    queryFn: () => api.get('/documents', {
      params: { 
        search: debouncedSearch || undefined, 
        status: status || undefined, 
        priority: priority || undefined, 
        document_type: docType || undefined, 
        office_id: officeFilter || undefined, 
        personnel_id: personnelFilter || undefined, 
        page, 
        per_page: 10, 
        mine: mineOnly || undefined, 
        for_me: forMeOnly || undefined,
        sort_by: sortBy,
        sort_dir: sortDir
      }
    }).then(res => res.data),
  })

  const documents = data?.data || []
  const totalPages = data?.last_page || 1

  const copyTracking = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(doc.tracking_number)
    setCopiedId(doc.id)
    toast.success(`Copied ${doc.tracking_number}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir(key === 'created_at' ? 'desc' : 'asc')
    }
  }

  const initialsOf = (name?: string | null) =>
    (name || 'U')
      .split(' ')
      .map((w) => w.charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()

  const statusDotCls = (st: string) => {
    switch (st) {
      case 'released':
      case 'approved':
      case 'filed':
        return 'bg-emerald-500'
      case 'received':
      case 'in_review':
        return 'bg-blue-500'
      case 'rejected':
        return 'bg-red-500'
      case 'returned':
        return 'bg-amber-500'
      default:
        return 'bg-slate-400'
    }
  }

  const priorityDotCls = (pr: string) => {
    switch (pr) {
      case 'urgent':
        return 'bg-red-500 animate-pulse'
      case 'high':
        return 'bg-amber-500'
      default:
        return 'bg-slate-300 dark:bg-slate-600'
    }
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

  const SortableTh = ({ label, k, className }: { label: string; k: string; className?: string }) => (
    <th className={`py-3.5 px-4 whitespace-nowrap ${className || ''}`}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${
          sortBy === k
            ? 'text-blue-600 dark:text-blue-400'
            : 'hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {label}
        {sortBy === k ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Link
          to="/documents/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Document</span>
        </Link>
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

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-nowrap md:items-center md:gap-1.5 md:overflow-x-auto md:pb-1 md:scrollbar-none">
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
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold md:whitespace-nowrap transition-all ${
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

            <button
              onClick={() => setShowAdvancedFilters(v => !v)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                showAdvancedFilters || advancedFilterCount > 0
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {advancedFilterCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">
                  {advancedFilterCount}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear all active filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Detailed Dropdown Filters (Advanced) */}
        {showAdvancedFilters && (
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
            className="input cursor-pointer"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className="input cursor-pointer"
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1) }}
          >
            <option value="">All Priorities</option>
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            className="input cursor-pointer"
            value={docType}
            onChange={(e) => { setDocType(e.target.value); setPage(1) }}
          >
            <option value="">All Document Types</option>
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          </div>
        )}
      </div>

      {/* Documents Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Results meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">{data?.total ?? 0}</span>{' '}
            document{(data?.total ?? 0) === 1 ? '' : 's'} found
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 font-semibold transition-colors"
              >
                <X className="w-3 h-3" /> Reset filters
              </button>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
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
          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <SortableTh label="Document" k="subject" className="pl-6" />
                  <th className="py-3.5 px-4 whitespace-nowrap">Sender</th>
                  <SortableTh label="Status" k="status" />
                  <SortableTh label="Priority" k="priority" />
                  <SortableTh label="Created" k="created_at" />
                  <th className="py-3.5 pr-6 pl-4 whitespace-nowrap">Location</th>
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
                    <td className="py-4 pl-6 pr-4 min-w-[280px] max-w-md">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {doc.subject}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {documentTypeLabel(doc.document_type)}
                          </span>
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

                    {/* Sender / Originator */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {initialsOf(doc.originator?.name)}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]" title={doc.originator?.name || 'Unknown'}>
                          {doc.originator?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-semibold ${statusBadgeStyle(doc.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotCls(doc.status)}`} />
                        {statusLabel(doc.status)}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                        <span className={`w-2 h-2 rounded-full ${priorityDotCls(doc.priority)}`} />
                        {doc.priority || 'normal'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(doc.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Current Location */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[160px]">{doc.current_office?.name || 'HQ Station'}</span>
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
    </div>
  )
}
