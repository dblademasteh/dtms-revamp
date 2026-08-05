import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Lightbulb,
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
  Shield,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import type { Suggestion } from '@/types'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'

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

export default function AdminSuggestions() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isSuperadmin = user?.role === 'superadmin'
  const categories = useDropdownGroup('suggestion_categories')
  const statuses = useDropdownGroup('suggestion_statuses')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [adminResponseText, setAdminResponseText] = useState<Record<number, string>>({})
  const [respondingTo, setRespondingTo] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', 'admin', filterCategory, filterStatus],
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 dark:bg-white/10 backdrop-blur-md border border-amber-200/50 dark:border-white/15 text-xs font-semibold text-amber-800 dark:text-amber-200 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
            <span>Admin Management</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              Superadmin only
            </span>
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
            className="input cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{categoryConfig[c.value]?.label || c.label}</option>
            ))}
          </select>

          <select
            className="input cursor-pointer"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{statusConfig[s.value]?.label || s.label}</option>
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
              : 'No feedback has been submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((suggestion) => {
            const StatusIcon = statusConfig[suggestion.status]?.icon || CircleDot
            const categoryCfg = categoryConfig[suggestion.category]
            const dynamicCategory = categories.find((c) => c.value === suggestion.category)
            const dynamicStatus = statuses.find((s) => s.value === suggestion.status)
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
                      {categoryCfg?.label || dynamicCategory?.label || suggestion.category}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">â€¢</span>
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
                    {statusConfig[suggestion.status]?.label || dynamicStatus?.label || suggestion.status}
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
                    <span>{[suggestion.user?.rank, suggestion.user?.full_name || suggestion.user?.name].filter(Boolean).join(' ') || 'Anonymous User'}</span>
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

    </div>
  )
}
