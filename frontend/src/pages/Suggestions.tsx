import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Lightbulb,
  Plus,
  Search,
  X,
  Clock,
  CheckCircle2,
  GitPullRequestDraft,
  CircleDot,
  MessageSquare,
  Users,
  Wrench,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'
import { useAuthStore } from '@/stores/authStore'
import type { Suggestion } from '@/types'

const categoryConfig: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  feature: {
    label: 'Feature Request',
    icon: Sparkles,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  },
  improvement: {
    label: 'Improvement',
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  },
  bug: {
    label: 'Bug Report',
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
  },
  other: {
    label: 'Other',
    icon: HelpCircle,
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50',
    badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50',
  },
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  open: { label: 'Open', icon: CircleDot, color: 'text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/50' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50' },
  planned: { label: 'Planned', icon: GitPullRequestDraft, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50' },
  closed: { label: 'Closed', icon: X, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50' },
}

export default function Suggestions() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isSuperadmin = user?.role === 'superadmin'
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('feature')
  const [adminResponseText, setAdminResponseText] = useState<Record<number, string>>({})
  const [respondingTo, setRespondingTo] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', filterCategory, filterStatus],
    queryFn: () =>
      api
        .get('/suggestions', {
          params: {
            ...(filterCategory && { category: filterCategory }),
            ...(filterStatus && { status: filterStatus }),
            per_page: 100,
          },
        })
        .then((res) => res.data),
    refetchOnMount: true,
  })

  const submitMutation = useMutation({
    mutationFn: (body: { title: string; description: string; category: string }) =>
      api.post('/suggestions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Suggestion submitted! Thank you for your feedback.')
      setShowModal(false)
      setTitle('')
      setDescription('')
      setCategory('feature')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit suggestion')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/suggestions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Suggestion updated')
      setRespondingTo(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update suggestion')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    submitMutation.mutate({ title: title.trim(), description: description.trim(), category })
  }

  const updateStatus = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } })
  }

  const submitAdminResponse = (id: number) => {
    const response = adminResponseText[id]?.trim()
    if (!response) {
      toast.error('Response text cannot be empty')
      return
    }
    updateMutation.mutate({ id, data: { admin_response: response } })
  }

  const suggestions: Suggestion[] = (data as any)?.data || []
  const filtered = suggestions.filter(
    (s) =>
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const metrics = useMemo(() => {
    return {
      total: suggestions.length,
      implemented: suggestions.filter((s) => s.status === 'implemented').length,
      underReview: suggestions.filter((s) => s.status === 'under_review').length,
      planned: suggestions.filter((s) => s.status === 'planned').length,
    }
  }, [suggestions])

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50/40 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 p-6 sm:p-8 text-slate-900 dark:text-white border border-blue-100/60 dark:border-none shadow-sm dark:shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-85 h-85 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-65 h-65 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 dark:bg-white/10 backdrop-blur-md border border-amber-200/50 dark:border-white/15 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
              <span>Feedback &amp; Ideas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Suggestions Box
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xl leading-relaxed">
              Help shape the future of our document tracking system. Share your feature requests, system improvements, or report bugs.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Submit Suggestion</span>
            </button>
          </div>
        </div>

        {/* Dynamic Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-blue-100/60 dark:border-white/10">
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-blue-100/50 dark:border-white/10">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Total Ideas</p>
            <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total}</p>
          </div>
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-blue-100/50 dark:border-white/10">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Implemented</p>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{metrics.implemented}</p>
          </div>
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-blue-100/50 dark:border-white/10">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Under Review</p>
            <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{metrics.underReview}</p>
          </div>
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-blue-100/50 dark:border-white/10">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Planned</p>
            <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">{metrics.planned}</p>
          </div>
        </div>
      </div>

      {/* Control Bar (Search & Filter) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400"
            placeholder="Search suggestion content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {Object.entries(categoryConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 dark:text-slate-200 cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggestion list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/50">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Suggestions Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {searchTerm || filterCategory || filterStatus
              ? 'No suggestions match your filters.'
              : 'Be the first to share a suggestion! Click Submit Suggestion above to post your idea.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((suggestion) => {
            const StatusIcon = statusConfig[suggestion.status]?.icon || CircleDot
            const categoryCfg = categoryConfig[suggestion.category]
            const CategoryIcon = categoryCfg?.icon || HelpCircle

            return (
              <div
                key={suggestion.id}
                className="group bg-white dark:bg-slate-900 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 transition-all duration-200 overflow-hidden border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6"
              >
                {/* Header Row: Category Badge + Date */}
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                        categoryCfg?.badge || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {categoryCfg?.label || suggestion.category}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(suggestion.created_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
                      statusConfig[suggestion.status]?.color || 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusConfig[suggestion.status]?.label || suggestion.status}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {suggestion.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 whitespace-pre-wrap leading-relaxed">
                  {suggestion.description}
                </p>

                {/* Admin Response section */}
                {suggestion.admin_response ? (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/40 border-l-4 border-amber-500 rounded-r-2xl rounded-l-md flex gap-3">
                    <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Admin Response</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{suggestion.admin_response}</p>
                    </div>
                  </div>
                ) : (
                  isSuperadmin && respondingTo !== suggestion.id && (
                    <button
                      onClick={() => setRespondingTo(suggestion.id)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Write Admin Response</span>
                    </button>
                  )
                )}

                {/* Inline Response Form for Admin */}
                {isSuperadmin && respondingTo === suggestion.id && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Write Admin Response</p>
                    <textarea
                      className="w-full p-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none min-h-[80px]"
                      placeholder="Type your response to this suggestion..."
                      value={adminResponseText[suggestion.id] || ''}
                      onChange={(e) => setAdminResponseText({ ...adminResponseText, [suggestion.id]: e.target.value })}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRespondingTo(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitAdminResponse(suggestion.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                      >
                        Submit Response
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Info: User & Status Controls (Admin) */}
                <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    <span>{suggestion.user?.name || 'Anonymous User'}</span>
                  </div>

                  {isSuperadmin && (
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      <button
                        onClick={() => updateStatus(suggestion.id, 'under_review')}
                        className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                          suggestion.status === 'under_review'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title="Mark Under Review"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'planned')}
                        className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                          suggestion.status === 'planned'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            : 'text-slate-400 hover:text-blue-500'
                        }`}
                        title="Mark Planned"
                      >
                        <GitPullRequestDraft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'implemented')}
                        className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                          suggestion.status === 'implemented'
                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400 hover:text-emerald-500'
                        }`}
                        title="Mark Implemented"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => updateStatus(suggestion.id, 'closed')}
                        className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                          suggestion.status === 'closed'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title="Close Suggestion"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit Suggestion Modal */}
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
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Submit Suggestion</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">Share an idea or system issue with administrators</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Idea Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="e.g. Add quick filters on dashboard..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Interactive Category Selector Cards */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(categoryConfig).map(([key, cfg]) => {
                      const IconComp = cfg.icon
                      const isSelected = category === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCategory(key)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isSelected ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}`}>
                              {cfg.label}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none min-h-[120px]"
                    placeholder="Provide details about your suggestion, what problem it solves, or how to replicate the bug..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Footer */}
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
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><Lightbulb className="w-4 h-4" /> Submit Suggestion</>
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
