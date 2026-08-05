import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ChevronDown,
  ExternalLink,
  LifeBuoy,
  MessagesSquare,
  Lightbulb,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { HELP_SECTIONS, FAQ_ITEMS } from '@/constants/helpContent'

export default function Help() {
  const [query, setQuery] = useState('')
  const [openSection, setOpenSection] = useState<string | null>('getting-started')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const q = query.trim().toLowerCase()

  const filteredSections = useMemo(() => {
    if (!q) return HELP_SECTIONS
    return HELP_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        (s.steps ?? []).some(
          (st) => st.title.toLowerCase().includes(q) || st.body.toLowerCase().includes(q)
        )
    )
  }, [q])

  const filteredFaq = useMemo(() => {
    if (!q) return FAQ_ITEMS
    return FAQ_ITEMS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    )
  }, [q])

  const hasResults = filteredSections.length > 0 || filteredFaq.length > 0

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 shadow-lg shadow-blue-500/20">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <LifeBuoy className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            How can we help you?
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-blue-100/90 max-w-2xl">
            Step-by-step guides, an FAQ, and a friendly assistant to help you get the most
            out of DTMS — the Document Tracking &amp; Management System.
          </p>

          {/* Search */}
          <div className="mt-5 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides, questions, or topics..."
                className="w-full pl-10 pr-4 py-3 text-sm bg-white text-slate-900 placeholder:text-slate-400 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['create document', 'track', 'statuses', 'roles', 'password'].map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-medium text-white transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!hasResults && (
        <div className="card p-10 text-center">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No results for “{query}”</p>
          <p className="text-xs text-slate-500 mt-1">
            Try a different keyword, or clear your search to browse all topics.
          </p>
          <button
            onClick={() => setQuery('')}
            className="mt-4 btn btn-primary btn-sm"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Guides */}
      {filteredSections.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessagesSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Guides
            </h2>
          </div>
          <div className="space-y-2.5">
            {filteredSections.map((section) => {
              const Icon = section.icon
              const isOpen = openSection === section.id
              return (
                <div
                  key={section.id}
                  id={section.id}
                  className={`card overflow-hidden transition-all ${
                    isOpen ? 'ring-1 ring-blue-500/30 shadow-md' : 'hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-4 text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {section.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {section.tagline}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <ol className="mt-3 space-y-3.5">
                        {(section.steps ?? []).map((step, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {step.title}
                              </p>
                              <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {step.body}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>

                      {(section.notes ?? []).length > 0 && (
                        <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-3.5 py-3">
                          <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <ul className="space-y-1">
                            {(section.notes ?? []).map((note, i) => (
                              <li
                                key={i}
                                className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed"
                              >
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {section.link && (
                        <Link
                          to={section.link}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          {section.linkLabel || 'Open page'}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FAQ */}
      {filteredFaq.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-2.5">
            {filteredFaq.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div
                  key={i}
                  className={`card overflow-hidden transition-all ${
                    isOpen ? 'ring-1 ring-blue-500/30' : 'hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left"
                  >
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mt-2.5">
                        {faq.a}
                      </p>
                      {faq.link && (
                        <Link
                          to={faq.link}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          {faq.linkLabel || 'Open page'}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Still need help */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800/40">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Still stuck?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit a suggestion or question and your administrator can respond directly.
          </p>
        </div>
        <Link to="/settings" className="btn btn-primary btn-sm">
          Contact Administrator
        </Link>
      </div>
    </div>
  )
}
