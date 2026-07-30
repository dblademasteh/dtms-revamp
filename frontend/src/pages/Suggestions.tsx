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
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'
import { useAuthStore } from '@/stores/authStore'
import type { Suggestion } from '@/types'

const categoryLabels: Record<string, string> = {
  feature: 'Feature Request',
  improvement: 'Improvement',
  bug: 'Bug Report',
  other: 'Other',
}

const categoryColors: Record<string, string> = {
  feature: 'bg-purple-100 text-purple-700 border-purple-200',
  improvement: 'bg-blue-100 text-blue-700 border-blue-200',
  bug: 'bg-red-100 text-red-700 border-red-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  open: { label: 'Open', icon: CircleDot, color: 'text-green-600 bg-green-50 border-green-200' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  planned: { label: 'Planned', icon: GitPullRequestDraft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  closed: { label: 'Closed', icon: X, color: 'text-slate-600 bg-slate-50 border-slate-200' },
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

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', filterCategory, filterStatus],
    queryFn: () =>
      api
        .get('/suggestions', {
          params: {
            ...(filterCategory && { category: filterCategory }),
            ...(filterStatus && { status: filterStatus }),
            per_page: 50,
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

  const suggestions: Suggestion[] = (data as any)?.data || []
  const filtered = suggestions.filter(
    (s) =>
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm text-amber-600">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suggestions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Share your ideas to help improve the system</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            Submit Suggestion
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            className="input w-full pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
            placeholder="Search suggestions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input bg-slate-50/50 border-slate-200 text-sm w-full sm:w-auto"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          className="input bg-slate-50/50 border-slate-200 text-sm w-full sm:w-auto"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Suggestions Found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchTerm || filterCategory || filterStatus
              ? 'No suggestions match your filters.'
              : 'Be the first to share a suggestion!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((suggestion) => {
            const StatusIcon = statusConfig[suggestion.status]?.icon || CircleDot
            return (
              <div
                key={suggestion.id}
                className="card bg-white hover:shadow-md transition-all duration-200 overflow-hidden border border-slate-200"
              >
                <div className="p-5 sm:p-6">
                  {/* Top Row: Category Badge + Date */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                        categoryColors[suggestion.category] || 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {categoryLabels[suggestion.category] || suggestion.category}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {new Date(suggestion.created_at).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{suggestion.title}</h3>
                  <p className="text-sm text-slate-500 mt-1.5 whitespace-pre-wrap">{suggestion.description}</p>

                  {/* Admin Response */}
                  {suggestion.admin_response && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                      <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Admin Response</p>
                        <p className="text-sm text-blue-800">{suggestion.admin_response}</p>
                      </div>
                    </div>
                  )}

                  {/* Bottom Row: Sender + Status + Admin Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3 flex-wrap">
                      {suggestion.user && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          {suggestion.user.name}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          statusConfig[suggestion.status]?.color || 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[suggestion.status]?.label || suggestion.status}
                      </span>
                    </div>

                    {isSuperadmin && suggestion.status !== 'closed' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateStatus(suggestion.id, 'under_review')}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            suggestion.status === 'under_review'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'text-slate-400 hover:text-yellow-600 hover:bg-yellow-50'
                          }`}
                          title="Mark as Under Review"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(suggestion.id, 'planned')}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            suggestion.status === 'planned'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Mark as Planned"
                        >
                          <GitPullRequestDraft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(suggestion.id, 'implemented')}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            suggestion.status === 'implemented'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title="Mark as Implemented"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(suggestion.id, 'closed')}
                          className="p-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
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
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <form
              onSubmit={handleSubmit}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 px-6 pt-6 pb-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
                  <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                    <Lightbulb className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Submit a Suggestion</h3>
                    <p className="text-sm text-white/75 mt-0.5">Help us improve the system with your ideas</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    placeholder="Brief summary of your suggestion..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="bug">Bug Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input w-full min-h-[120px] bg-slate-50/50 border-slate-200 focus:bg-white text-sm resize-none"
                    placeholder="Describe your suggestion in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
