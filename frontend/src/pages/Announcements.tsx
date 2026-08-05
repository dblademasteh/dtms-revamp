import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import {
  Megaphone,
  Calendar,
  Building2,
  ChevronRight,
  Search,
  Plus,
  X,
  Paperclip,
  Upload,
  LayoutGrid,
  List,
  AlertCircle,
  Clock,
  Filter,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'
import { documentTypeLabel } from '@/constants/documentOptions'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'

const getDocTypeBadgeStyle = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'memorandum':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/50'
    case 'circular':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50'
    case 'office_order':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50'
    case 'executive_order':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

export default function Announcements() {
  const queryClient = useQueryClient()
  const documentTypes = useDropdownGroup('document_types')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'urgent' | 'compliance'>('all')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)

  // Form State
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [docType, setDocType] = useState('memorandum')
  const [files, setFiles] = useState<File[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['announcements-all'],
    queryFn: () => api.get('/documents', { params: { is_public: 1, per_page: 50 } }).then(res => res.data?.data || res.data || []),
  })

  const postMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/announcements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Announcement published successfully!')
      setShowModal(false)
      // reset form
      setSubject('')
      setDescription('')
      setDocType('memorandum')
      setFiles([])
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to post announcement')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast.error('Subject title is required')
      return
    }

    const formData = new FormData()
    formData.append('subject', subject)
    formData.append('description', description)
    formData.append('document_type', docType)
    
    files.forEach((file) => {
      formData.append('attachments[]', file)
    })

    postMutation.mutate(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Calculate Metrics
  const metrics = useMemo(() => {
    const list = data || []
    const todayStr = new Date().toDateString()
    
    const todayCount = list.filter((doc: any) => {
      const created = doc.created_at ? new Date(doc.created_at).toDateString() : ''
      return created === todayStr
    }).length

    const urgentCount = list.filter((doc: any) => doc.priority === 'urgent' || doc.subject?.toLowerCase().includes('urgent')).length
    const complianceCount = list.filter((doc: any) => doc.subject?.toLowerCase().includes('compliance')).length

    return {
      total: list.length,
      today: todayCount,
      urgent: urgentCount,
      compliance: complianceCount
    }
  }, [data])

  const filteredAnnouncements = useMemo(() => {
    return (data || []).filter((doc: any) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        !searchTerm ||
        doc.subject?.toLowerCase().includes(searchLower) ||
        doc.tracking_number?.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false

      if (filter === 'today') {
        const created = new Date(doc.created_at)
        const today = new Date()
        if (created.getFullYear() !== today.getFullYear() ||
            created.getMonth() !== today.getMonth() ||
            created.getDate() !== today.getDate()) return false
      }
      if (filter === 'urgent' && doc.priority !== 'urgent' && !doc.subject?.toLowerCase().includes('urgent')) return false
      if (filter === 'compliance' && !doc.subject?.toLowerCase().includes('compliance')) return false

      if (docTypeFilter && doc.document_type !== docTypeFilter) return false

      return true
    })
  }, [data, searchTerm, filter, docTypeFilter])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50/40 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 p-6 sm:p-8 text-slate-900 dark:text-white border border-blue-100/60 dark:border-none shadow-sm dark:shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-white/10 backdrop-blur-md border border-blue-200/50 dark:border-white/15 text-xs font-semibold text-blue-800 dark:text-blue-200 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-white/40 animate-pulse" />
            <span>Agency Broadcast Center</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Post New Announcement</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-blue-100/60 dark:border-white/10">
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-blue-100/50 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Total Broadcasts</span>
              <Megaphone className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{metrics.total}</div>
          </div>

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-blue-100/50 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Posted Today</span>
              <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{metrics.today}</div>
          </div>

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-blue-100/50 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Urgent Advisories</span>
              <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{metrics.urgent}</div>
          </div>

          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-blue-100/50 dark:border-white/10 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Compliance Memos</span>
              <ShieldAlert className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{metrics.compliance}</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, View Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {[
            { key: 'all' as const, label: 'All Notices', icon: Megaphone },
            { key: 'today' as const, label: 'Posted Today', icon: Clock },
            { key: 'urgent' as const, label: 'Urgent Memos', icon: AlertCircle },
            { key: 'compliance' as const, label: 'Compliance', icon: ShieldAlert },
          ].map(f => {
            const Icon = f.icon
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Right Controls: Type Filter, Search, View Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Document Type Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              className="input cursor-pointer"
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
            >
              <option value="">All Document Types</option>
              {documentTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by subject or tracking #..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Announcements Content Container */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              </div>
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900">
            <Filter className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Announcements Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            No public bulletins match your selected filters or search terms. Try clearing search filters or checking back later.
          </p>
          {(searchTerm || filter !== 'all' || docTypeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilter('all')
                setDocTypeFilter('')
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAnnouncements.map((doc: any) => {
            const isUrgent = doc.priority === 'urgent' || doc.subject?.toLowerCase().includes('urgent')
            const attachmentsCount = doc.attachments?.length || 0
            const typeBadgeStyle = getDocTypeBadgeStyle(doc.document_type)

            return (
              <div
                key={doc.id}
                className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 overflow-hidden"
              >
                {/* Priority Indicator Top Accent */}
                {isUrgent && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500" />
                )}

                <div>
                  {/* Top Metadata Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                        {doc.tracking_number}
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeBadgeStyle}`}>
                        {documentTypeLabel(doc.document_type)}
                      </span>
                    </div>

                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Urgent
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {doc.subject}
                  </h3>

                  {/* Description */}
                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[160px]">
                        {doc.current_office?.name || doc.originator?.office?.name || 'HQ Office'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {doc.released_at
                          ? new Date(doc.released_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {attachmentsCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        {attachmentsCount}
                      </span>
                    )}

                    <Link
                      to={`/documents/${doc.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-sm"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List Layout */
        <div className="space-y-3">
          {filteredAnnouncements.map((doc: any) => {
            const isUrgent = doc.priority === 'urgent' || doc.subject?.toLowerCase().includes('urgent')
            const typeBadgeStyle = getDocTypeBadgeStyle(doc.document_type)

            return (
              <div
                key={doc.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUrgent ? 'bg-red-500' : 'bg-blue-500'}`} />

                <div className="pl-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                      {doc.tracking_number}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeBadgeStyle}`}>
                      {documentTypeLabel(doc.document_type)}
                    </span>
                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                        Urgent
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {doc.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {doc.current_office?.name || doc.originator?.office?.name || 'HQ Office'}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {doc.released_at
                        ? new Date(doc.released_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all"
                  >
                    <span>View Document</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Post Announcement Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
            <form
              onSubmit={handleSubmit}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50/40 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 px-6 pt-6 pb-8 relative overflow-hidden text-slate-900 dark:text-white border-b border-blue-100/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-400/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Post Announcement</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">Publish a public bulletin for all staff reference</p>
                  </div>
                </div>
              </div>

              {/* Modal Form Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Subject / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    placeholder="Enter announcement title or subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Document Classification
                  </label>
                  <select
                    className="input cursor-pointer"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {documentTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Description &amp; Details
                  </label>
                  <textarea
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white min-h-[100px] resize-none"
                    placeholder="Provide full description or summary of the announcement..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Attachments Dropzone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Attachments (Optional)
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Click to select files to attach</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <Paperclip className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300 truncate flex-1 font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {postMutation.isPending ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing...</>
                  ) : (
                    <><Megaphone className="w-3.5 h-3.5" /> Publish Announcement</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
