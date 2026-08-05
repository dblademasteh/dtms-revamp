import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Bot,
} from 'lucide-react'
import {
  CHATBOT_WELCOME,
  CHATBOT_SUGGESTIONS,
  CHATBOT_FALLBACK,
  findChatbotAnswer,
} from '@/constants/helpContent'

interface ChatMessage {
  role: 'bot' | 'user'
  text: string
  link?: string
  linkLabel?: string
}

export default function HelpChatbot({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: CHATBOT_WELCOME },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open || embedded) {
      inputRef.current?.focus()
    }
  }, [open, embedded])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, open, embedded])

  const ask = (raw: string) => {
    const text = raw.trim()
    if (!text || typing) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setTyping(true)

    const entry = findChatbotAnswer(text)

    window.setTimeout(() => {
      setTyping(false)
      if (entry) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: entry.answer,
            link: entry.link,
            linkLabel: entry.linkLabel,
          },
        ])
      } else {
        setMessages((prev) => [...prev, { role: 'bot', text: CHATBOT_FALLBACK }])
      }
    }, 550 + Math.random() * 350)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  const body = (
    <>
      {/* Messages */}
      <div ref={scrollRef} className="h-72 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    {m.link && (
                      <Link
                        to={m.link}
                        onClick={() => setOpen(false)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {m.linkLabel || 'Open guide'} <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3.5 py-3 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Suggested questions */}
              {messages.length === 1 && !typing && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Suggested questions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CHATBOT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        className="rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
    </>
  )

  if (embedded) {
    return <div className="flex min-h-0 flex-col">{body}</div>
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open help assistant"
        className={`fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 ${
          open
            ? 'bg-slate-800 dark:bg-slate-700'
            : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/30'
        }`}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} />
          <div className="fixed bottom-24 left-6 z-50 flex w-[calc(100vw-3rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3.5 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight">DTMS Assistant</p>
                <p className="text-[11px] text-blue-100/90 leading-tight">
                  Ask me anything about the system
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

            {body}
          </div>
        </>
      )}
    </>
  )
}
