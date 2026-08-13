import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, X, Sparkles, Lightbulb, ExternalLink, MessageCircle } from 'lucide-react'
import HelpChatbot from '@/components/HelpChatbot'
import SuggestionsWidget from '@/components/SuggestionsWidget'

interface HelpWidgetProps {
  allowSuggestions?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function HelpWidget({ allowSuggestions = true, open, onOpenChange }: HelpWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [tab, setTab] = useState<'assistant' | 'suggestions'>('assistant')

  return (
    <>
      {/* Floating toggle button (desktop only; mobile uses the header trigger) */}
      <button
        onClick={() => setOpen(!isOpen)}
        aria-label="Open help and feedback"
        className={`hidden lg:flex fixed bottom-6 right-6 z-50 h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 ${
          isOpen
            ? 'bg-slate-800 dark:bg-slate-700'
            : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/30'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3.5 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">Help & Feedback</p>
                <p className="text-[11px] text-blue-100/90 leading-tight">
                  Ask a question or share a suggestion
                </p>
              </div>
              <Link
                to="/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold hover:bg-white/25 transition-colors"
                title="Open Help Center"
              >
                Guides <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Tabs */}
            {allowSuggestions && (
              <div className="flex items-center gap-1 border-b border-slate-100 px-3 pt-2 dark:border-slate-800">
                {([
                  { key: 'assistant', label: 'Assistant', icon: Sparkles },
                  { key: 'suggestions', label: 'Suggestions', icon: Lightbulb },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      tab === t.key
                        ? 'border-b-2 border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="min-h-0">
              {tab === 'assistant' || !allowSuggestions ? (
                <HelpChatbot embedded />
              ) : (
                <SuggestionsWidget embedded active={isOpen} />
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
