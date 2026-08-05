import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import {
  Lightbulb,
  X,
  Sparkles,
  Wrench,
  AlertTriangle,
  HelpCircle,
  CircleDot,
  Clock,
  CheckCircle2,
  GitPullRequestDraft,
  MessageSquare,
  Send,
} from 'lucide-react'
import type { Suggestion } from '@/types'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'

const DEFAULT_CATEGORY_STYLE = {
  icon: HelpCircle,
  active: 'bg-slate-600 text-white border-slate-600',
  idle: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50',
}

const CATEGORY_META: Record<string, { label: string; icon: any; active: string; idle: string }> = {
  feature: {
    label: 'Feature',
    icon: Sparkles,
    active: 'bg-purple-600 text-white border-purple-600',
    idle: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
  },
  improvement: {
    label: 'Improvement',
    icon: Wrench,
    active: 'bg-blue-600 text-white border-blue-600',
    idle: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
  },
  bug: {
    label: 'Bug',
    icon: AlertTriangle,
    active: 'bg-red-600 text-white border-red-600',
    idle: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
  },
  other: {
    label: 'Other',
    icon: HelpCircle,
    active: 'bg-slate-600 text-white border-slate-600',
    idle: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/50',
  },
}

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  open: { label: 'Open', icon: CircleDot, color: 'text-green-600 dark:text-green-400' },
  under_review: { label: 'Under Review', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
  planned: { label: 'Planned', icon: GitPullRequestDraft, color: 'text-blue-600 dark:text-blue-400' },
  implemented: { label: 'Implemented', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  closed: { label: 'Closed', icon: X, color: 'text-slate-500 dark:text-slate-400' },
}

export default function SuggestionsWidget() {
  const queryClient = useQueryClient()
  const categories = useDropdownGroup('suggestion_categories')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'submit' | 'all'>('submit')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('feature')

  const { data } = useQuery({
    queryKey: ['suggestions', 'widget'],
    queryFn: () => api.get('/suggestions', { params: { per_page: 100 } }).then((res) => res.data),
    enabled: open,
  })

  const allSuggestions: Suggestion[] = (data as any)?.data || []

  const submitMutation = useMutation({
    mutationFn: (body: { title: string; description: string; category: string }) =>
      api.post('/suggestions', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Suggestion submitted! Thank you for your feedback.')
      setTitle('')
      setDescription('')
      setCategory('feature')
      setTab('all')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit suggestion')
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

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Suggestions"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-110 hover:shadow-xl active:scale-95"
      >
        <Lightbulb className="h-6 w-6" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3.5 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold leading-tight">Suggestions</p>
                <p className="text-[11px] text-amber-100 leading-tight">Share feedback with administrators</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-amber-100 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-100 px-3 pt-3 dark:border-slate-800">
              {([
                { key: 'submit', label: 'Submit' },
                { key: 'all', label: `All Submissions (${allSuggestions.length})` },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    tab === t.key
                      ? 'border-b-2 border-amber-500 text-amber-700 dark:text-amber-400'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-4">
              {tab === 'submit' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Idea Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="e.g. Add quick filters on dashboard..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => {
                        const cfg = CATEGORY_META[cat.value] ?? DEFAULT_CATEGORY_STYLE
                        const Icon = cfg.icon
                        const selected = category === cat.value
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setCategory(cat.value)}
                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                              selected ? cfg.active : cfg.idle
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="What problem does this solve, or how to replicate the bug?"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                  >
                    {submitMutation.isPending ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit Suggestion</>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {allSuggestions.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
                        <Lightbulb className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No submissions yet</p>
                      <p className="mt-1 text-xs text-slate-400">Suggestions from all users will appear here.</p>
                    </div>
                  ) : (
                    allSuggestions.slice(0, 10).map((s) => {
                      const StatusIcon = STATUS_META[s.status]?.icon || CircleDot
                      const catCfg = CATEGORY_META[s.category]
                      const dynamicCat = categories.find((c) => c.value === s.category)
                      const CatIcon = catCfg?.icon || HelpCircle
                      return (
                        <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              <CatIcon className="h-3 w-3" />
                              {dynamicCat?.label || catCfg?.label || s.category}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${STATUS_META[s.status]?.color || ''}`}>
                              <StatusIcon className="h-3 w-3" />
                              {STATUS_META[s.status]?.label || s.status}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">{s.title}</p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{s.user?.name}</p>
                          {s.admin_response && (
                            <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border-l-2 border-amber-500 bg-white px-2 py-1.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              <MessageSquare className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                              <span><span className="font-bold text-amber-600 dark:text-amber-400">Admin: </span>{s.admin_response}</span>
                            </p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
