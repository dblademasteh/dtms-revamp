import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Mail,
  RefreshCw,
  Settings,
  Send,
  Paperclip,
  Search,
  X,
  Inbox,
  Send as SentIcon,
  Trash2,
  MailOpen,
  MailPlus,
  ChevronLeft,
  ChevronRight,
  Plug,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'

interface MailboxConfig {
  id: number
  email: string
  imap_host: string
  imap_port: number
  imap_encryption: string
  imap_username: string | null
  imap_password: boolean
  smtp_host: string | null
  smtp_port: number | null
  smtp_encryption: string | null
  smtp_username: string | null
  smtp_password: boolean
  sent_folder: string | null
  sync_enabled: boolean
  last_synced_at: string | null
}

interface MailMessageRow {
  id: number
  uid: number
  folder: string
  subject: string
  from_name: string | null
  from_email: string | null
  to: { email: string; name: string | null }[] | null
  cc: { email: string; name: string | null }[] | null
  body_text: string | null
  body_html: string | null
  is_seen: boolean
  has_attachments: boolean
  preview?: string
  received_at: string
  attachments_count?: number
}

interface MailAttachmentRow {
  id: number
  filename: string
  mime_type: string | null
  size: number | null
  content_id: string | null
}

interface FolderInfo {
  name: string
  sent: boolean
  trash: boolean
  drafts: boolean
}

const PROVIDERS: Record<string, { label: string; imap_host: string; imap_port: number; imap_encryption: string; smtp_host: string; smtp_port: number; smtp_encryption: string }> = {
  gmail: {
    label: 'Gmail',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_encryption: 'ssl',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_encryption: 'tls',
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    imap_host: 'imap-mail.outlook.com',
    imap_port: 993,
    imap_encryption: 'ssl',
    smtp_host: 'smtp-mail.outlook.com',
    smtp_port: 587,
    smtp_encryption: 'tls',
  },
  yahoo: {
    label: 'Yahoo Mail',
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    imap_encryption: 'ssl',
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: 465,
    smtp_encryption: 'ssl',
  },
  other: { label: 'Other / Custom', imap_host: '', imap_port: 993, imap_encryption: 'ssl', smtp_host: '', smtp_port: 587, smtp_encryption: 'tls' },
}

function parseRecipients(input: string): { email: string; name: string | null }[] {
  return input
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)\s*<([^>]+)>$/)
      if (match) {
        return { name: match[1].trim() || null, email: match[2].trim() }
      }
      return { name: null, email: part }
    })
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function formatFullDate(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Mailbox() {
  const queryClient = useQueryClient()
  const [showSettings, setShowSettings] = useState(false)

  const configQuery = useQuery({
    queryKey: ['mailbox-config'],
    queryFn: () => api.get('/mailbox/config').then((res) => res.data),
  })

  const config = configQuery.data as { configured: boolean; mailbox: MailboxConfig | null; unread_count?: number } | undefined
  const configured = config?.configured === true && !!config.mailbox

  if (configQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (showSettings && config?.mailbox) {
    return (
      <SetupView
        initial={config.mailbox}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['mailbox-config'] })
          setShowSettings(false)
        }}
        onBack={() => setShowSettings(false)}
      />
    )
  }

  return configured ? (
    <MailboxView
      mailbox={config!.mailbox!}
      initialUnread={config?.unread_count ?? 0}
      onOpenSettings={() => setShowSettings(true)}
    />
  ) : (
    <SetupView onSaved={() => queryClient.invalidateQueries({ queryKey: ['mailbox-config'] })} />
  )
}

function SetupView({
  initial,
  onSaved,
  onBack,
}: {
  initial?: MailboxConfig | null
  onSaved: () => void
  onBack?: () => void
}) {
  const [provider, setProvider] = useState('gmail')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [imapHost, setImapHost] = useState(initial?.imap_host ?? PROVIDERS.gmail.imap_host)
  const [imapPort, setImapPort] = useState(initial?.imap_port ?? PROVIDERS.gmail.imap_port)
  const [imapEncryption, setImapEncryption] = useState(initial?.imap_encryption ?? PROVIDERS.gmail.imap_encryption)
  const [imapUsername, setImapUsername] = useState(initial?.imap_username ?? '')
  const [imapPassword, setImapPassword] = useState('')
  const [smtpHost, setSmtpHost] = useState(initial?.smtp_host ?? PROVIDERS.gmail.smtp_host)
  const [smtpPort, setSmtpPort] = useState(initial?.smtp_port ?? PROVIDERS.gmail.smtp_port)
  const [smtpEncryption, setSmtpEncryption] = useState(initial?.smtp_encryption ?? PROVIDERS.gmail.smtp_encryption)
  const [smtpUsername, setSmtpUsername] = useState(initial?.smtp_username ?? '')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [testResult, setTestResult] = useState<{ imap: string; smtp: string | null; warnings: string[] } | null>(null)

  const applyProvider = (key: string) => {
    const p = PROVIDERS[key]
    setProvider(key)
    setImapHost(p.imap_host)
    setImapPort(p.imap_port)
    setImapEncryption(p.imap_encryption)
    setSmtpHost(p.smtp_host)
    setSmtpPort(p.smtp_port)
    setSmtpEncryption(p.smtp_encryption)
  }

  const payload = () => ({
    email,
    imap_host: imapHost,
    imap_port: imapPort,
    imap_encryption: imapEncryption,
    imap_username: imapUsername,
    imap_password: imapPassword,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_encryption: smtpEncryption,
    smtp_username: smtpUsername,
    smtp_password: smtpPassword,
    sync_enabled: true,
  })

  const testMutation = useMutation({
    mutationFn: () => api.post('/mailbox/test', payload()),
    onSuccess: (res) => {
      setTestResult(res.data.results)
      toast.success(res.data.message || 'IMAP connection successful')
    },
    onError: (err: any) => {
      setTestResult(err.response?.data?.results || { imap: 'error' })
      toast.error(err.response?.data?.message || 'Connection test failed')
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put('/mailbox/config', payload()),
    onSuccess: async () => {
      toast.success('Mailbox connected')
      await api.post('/mailbox/sync').catch(() => {})
      onSaved()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save configuration')
    },
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 pb-5 border-b border-slate-200 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center border border-primary-100 shadow-sm text-primary-600">
          <Mail className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{initial ? 'Mailbox Settings' : 'Connect Your Email'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {initial ? 'Update your IMAP/SMTP connection details' : 'Sync your personal mailbox (read + send) using an app password'}
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="card bg-white border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
              Email Provider
            </label>
            <select
              className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
              value={provider}
              onChange={(e) => applyProvider(e.target.value)}
            >
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">IMAP (incoming)</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Host</label>
              <input className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Port</label>
              <input type="number" className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Encryption</label>
              <select className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={imapEncryption} onChange={(e) => setImapEncryption(e.target.value)}>
                <option value="ssl">SSL/TLS</option>
                <option value="starttls">STARTTLS</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Username <span className="font-normal normal-case text-slate-400">(blank = email)</span>
              </label>
              <input className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={imapUsername} onChange={(e) => setImapUsername(e.target.value)} placeholder={email || 'your email'} />
            </div>
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                App Password <span className="text-red-500">*</span>
              </label>
              <input type="password" className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder={initial ? 'Leave blank to keep current' : '16-character app password'} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">SMTP (outgoing)</div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Host</label>
              <input className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Port</label>
              <input type="number" className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">Encryption</label>
              <select className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={smtpEncryption} onChange={(e) => setSmtpEncryption(e.target.value)}>
                <option value="ssl">SSL/TLS</option>
                <option value="tls">STARTTLS</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Username <span className="font-normal normal-case text-slate-400">(blank = email)</span>
              </label>
              <input className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder={email || 'your email'} />
            </div>
            <div className="col-span-6">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">App Password</label>
              <input type="password" className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={initial ? 'Leave blank to keep current' : 'Same app password usually'} />
            </div>
          </div>
        </div>

        {testResult && (
          <div className="rounded-xl border p-4 text-sm space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <Plug className="w-4 h-4" />
              Test Results
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">IMAP:</span>
              <span className={testResult.imap === 'ok' ? 'text-emerald-600' : 'text-red-600'}>
                {testResult.imap === 'ok' ? 'Connected successfully' : 'Failed'}
              </span>
            </div>
            {testResult.smtp && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">SMTP:</span>
                <span className={testResult.smtp === 'ok' ? 'text-emerald-600' : 'text-red-600'}>
                  {testResult.smtp === 'ok' ? 'Connected successfully' : 'Failed'}
                </span>
              </div>
            )}
            {testResult.warnings?.map((w, i) => (
              <div key={i} className="text-amber-600 text-xs">{w}</div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !imapHost || !imapPassword}
            className="px-4 py-2 rounded-lg text-sm font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            Test Connection
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !email || !imapHost || !imapPassword}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {initial ? 'Save Changes' : 'Save &amp; Start Syncing'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        Tip: for Gmail / Outlook / Yahoo, generate an <b>app password</b> from your provider's security settings instead of using your normal password. Your credentials are encrypted and stored only for syncing your own mailbox.
      </p>
    </div>
  )
}

function MailboxView({ mailbox, initialUnread, onOpenSettings }: { mailbox: MailboxConfig; initialUnread: number; onOpenSettings: () => void }) {
  const queryClient = useQueryClient()
  const [folder, setFolder] = useState('INBOX')
  const [folders, setFolders] = useState<FolderInfo[]>([
    { name: 'INBOX', sent: false, trash: false, drafts: false },
    ...(mailbox.sent_folder ? [{ name: mailbox.sent_folder, sent: true, trash: false, drafts: false }] : []),
  ])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [unread, setUnread] = useState(initialUnread)
  const [page, setPage] = useState(1)

  const messagesPageQuery = useQuery({
    queryKey: ['mailbox-messages', folder, search, page],
    queryFn: () =>
      api
        .get('/mailbox/messages', {
          params: { folder, per_page: 30, page, ...(search ? { search } : {}) },
        })
        .then((res) => res.data),
    enabled: !!mailbox,
  })

  useEffect(() => {
    if (messagesPageQuery.data?.unread_count !== undefined) {
      setUnread(messagesPageQuery.data.unread_count)
    }
  }, [messagesPageQuery.data])

  const messageDetailQuery = useQuery({
    queryKey: ['mailbox-message', selectedId],
    queryFn: () => api.get(`/mailbox/messages/${selectedId}`).then((res) => res.data.message),
    enabled: !!selectedId,
  })

  const message = messageDetailQuery.data as (MailMessageRow & { attachments: MailAttachmentRow[] }) | undefined

  const syncMutation = useMutation({
    mutationFn: () => api.post('/mailbox/sync'),
    onSuccess: (res) => {
      if (res.data?.stats?.folders?.length) {
        setFolders(res.data.stats.folders)
      }
      if (res.data?.unread_count !== undefined) setUnread(res.data.unread_count)
      queryClient.invalidateQueries({ queryKey: ['mailbox-messages'] })
      queryClient.invalidateQueries({ queryKey: ['mailbox-message'] })
      queryClient.invalidateQueries({ queryKey: ['mailbox-config'] })
      toast.success(res.data?.message || 'Mailbox synced')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Sync failed')
    },
  })

  const seenMutation = useMutation({
    mutationFn: ({ id, seen }: { id: number; seen: boolean }) => api.patch(`/mailbox/messages/${id}/seen`, { seen }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mailbox-messages'] }),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/mailbox/messages/${id}`),
    onSuccess: () => {
      setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ['mailbox-messages'] })
      toast.success('Message deleted')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not delete message'),
  })

  const [autoSync, setAutoSync] = useState(mailbox.sync_enabled)
  const toggleSyncMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put('/mailbox/config', {
        email: mailbox.email,
        imap_host: mailbox.imap_host,
        imap_port: mailbox.imap_port,
        imap_encryption: mailbox.imap_encryption,
        imap_username: mailbox.imap_username || '',
        imap_password: '',
        smtp_host: mailbox.smtp_host,
        smtp_port: mailbox.smtp_port,
        smtp_encryption: mailbox.smtp_encryption,
        smtp_username: mailbox.smtp_username || '',
        smtp_password: '',
        sync_enabled: enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailbox-config'] })
      toast.success('Auto-sync updated')
    },
    onError: (err: any) => {
      setAutoSync(mailbox.sync_enabled)
      toast.error(err.response?.data?.message || 'Could not update auto-sync')
    },
  })

  const pagination = messagesPageQuery.data?.messages as { data: MailMessageRow[]; current_page: number; last_page: number; next_page_url: string | null; prev_page_url: string | null } | undefined
  const rows: MailMessageRow[] = pagination?.data || []
  const shownRows = rows
  const shownPagination = messagesPageQuery.data?.messages

  const downloadAttachment = async (att: MailAttachmentRow) => {
    try {
      const res = await api.get(`/mailbox/attachments/${att.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = att.filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not download attachment')
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center border border-primary-100 shadow-sm text-primary-600 flex-shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">My Mailbox</h1>
            <p className="text-xs text-slate-500 truncate">
              {mailbox.email}
              {mailbox.last_synced_at && (
                <span className="text-slate-400"> · Last synced {formatFullDate(mailbox.last_synced_at)}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {unread} unread
          </span>
          <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 cursor-pointer" title="Sync automatically every few minutes">
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={autoSync}
              onChange={(e) => {
                setAutoSync(e.target.checked)
                toggleSyncMutation.mutate(e.target.checked)
              }}
            />
            <span className="text-xs font-semibold">Auto-sync</span>
          </label>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="btn btn-sm btn-ghost border border-slate-200 inline-flex items-center gap-1.5 text-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={onOpenSettings}
            className="btn btn-sm btn-ghost border border-slate-200 inline-flex items-center gap-1.5 text-slate-600"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 font-bold"
          >
            <MailPlus className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input w-full pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
            placeholder="Search subject, sender, body..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        {/* Folders sidebar */}
        <div className="hidden md:flex flex-col w-44 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-2 overflow-y-auto">
          {folders.length === 0 && (
            <button
              onClick={() => syncMutation.mutate()}
              className="text-xs text-primary-600 font-semibold text-center p-3"
            >
              Sync to load folders
            </button>
          )}
          {folders.map((f) => {
            const active = folder === f.name
            const Icon = f.sent ? SentIcon : f.trash ? Trash2 : Inbox
            return (
              <button
                key={f.name}
                onClick={() => {
                  setFolder(f.name)
                  setSelectedId(null)
                  setPage(1)
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{f.name}</span>
              </button>
            )
          })}
        </div>

        {/* Message list */}
        <div className="flex-1 min-w-0 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
          {messagesPageQuery.isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : shownRows.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No messages</p>
              <p className="text-xs text-slate-400 mt-1">Click Sync to fetch the latest mail.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {shownRows.map((row) => (
                <button
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                    selectedId === row.id ? 'bg-primary-50/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!row.is_seen && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                    <span className={`text-sm truncate flex-1 ${row.is_seen ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>
                      {row.from_name || row.from_email || 'Unknown sender'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(row.received_at)}</span>
                  </div>
                  <p className={`text-sm truncate pl-4 mt-0.5 ${row.is_seen ? 'text-slate-500' : 'text-slate-800 font-semibold'}`}>
                    {row.subject}
                  </p>
                  <p className="text-xs text-slate-400 truncate pl-4 mt-0.5">{row.preview}</p>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {shownPagination && shownPagination.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Page {shownPagination.current_page} of {shownPagination.last_page} · {shownPagination.total} messages
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!shownPagination.prev_page_url}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(shownPagination.last_page, p + 1))}
                  disabled={!shownPagination.next_page_url}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
            {messageDetailQuery.isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              </div>
            ) : message ? (
              <>
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-900 leading-snug flex-1">{message.subject}</h2>
                    <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-sm font-bold">
                          {(message.from_name || message.from_email || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {message.from_name || message.from_email}
                          {message.from_name && message.from_email && (
                            <span className="font-normal text-slate-500"> &lt;{message.from_email}&gt;</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{formatFullDate(message.received_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => seenMutation.mutate({ id: message.id, seen: !message.is_seen })}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                        title={message.is_seen ? 'Mark as unread' : 'Mark as read'}
                      >
                        <MailOpen className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this message from the server?')) deleteMutation.mutate(message.id)
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {message.to?.length ? (
                    <p className="text-xs text-slate-400 mt-2">
                      To: {message.to.map((t) => t.name || t.email).join(', ')}
                    </p>
                  ) : null}
                  {message.cc?.length ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cc: {message.cc.map((t) => t.name || t.email).join(', ')}
                    </p>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {message.body_html && !message.body_html.startsWith('<') ? (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{message.body_html}</div>
                  ) : message.body_html ? (
                    <div className="prose-sm" dangerouslySetInnerHTML={{ __html: message.body_html }} />
                  ) : message.body_text ? (
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{message.body_text}</div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No content</p>
                  )}

                  {message.attachments?.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" /> Attachments ({message.attachments.length})
                      </p>
                      <div className="space-y-2">
                        {message.attachments.map((att) => (
                          <button
                            key={att.id}
                            onClick={() => downloadAttachment(att)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-left transition-colors"
                          >
                            <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-slate-700 truncate flex-1">{att.filename}</span>
                            <span className="text-xs text-slate-400 flex-shrink-0">{formatSize(att.size)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Message not found</div>
            )}
          </div>
        </div>
      )}

      <ComposeModal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        mailboxEmail={mailbox.email}
        onSent={() => {
          setShowCompose(false)
          queryClient.invalidateQueries({ queryKey: ['mailbox-messages'] })
          queryClient.invalidateQueries({ queryKey: ['mailbox-config'] })
        }}
      />
    </div>
  )
}

function ComposeModal({
  open,
  onClose,
  mailboxEmail,
  onSent,
}: {
  open: boolean
  onClose: () => void
  mailboxEmail: string
  onSent: () => void
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (!open) {
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setBody('')
      setFiles([])
    }
  }, [open])

  const sendMutation = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('to', JSON.stringify(parseRecipients(to)))
      form.append('cc', JSON.stringify(parseRecipients(cc)))
      form.append('bcc', JSON.stringify(parseRecipients(bcc)))
      form.append('subject', subject)
      form.append('body', body.replace(/\n/g, '<br/>'))
      files.forEach((f) => form.append('attachments[]', f))
      return api.post('/mailbox/send', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success('Email sent')
      onSent()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send email')
    },
  })

  if (!open) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const recipients = parseRecipients(to)
            if (recipients.length === 0) {
              toast.error('Add at least one recipient')
              return
            }
            if (!subject.trim()) {
              toast.error('Subject is required')
              return
            }
            sendMutation.mutate()
          }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 px-6 pt-5 pb-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <MailPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">New Message</h3>
                <p className="text-xs text-white/75 mt-0.5">From: {mailboxEmail}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500 w-8">To</span>
              <input
                className="input flex-1 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                placeholder="recipient@example.com; name &lt;email&gt;"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500 w-8">Cc</span>
              <input
                className="input flex-1 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500 w-8">Bcc</span>
              <input
                className="input flex-1 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500 w-8">Subj</span>
              <input
                className="input flex-1 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <textarea
              className="input w-full min-h-[160px] bg-slate-50/50 border-slate-200 focus:bg-white text-sm resize-none"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
                <Paperclip className="w-4 h-4" />
                Attach files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                      {f.name}
                      <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm disabled:opacity-50"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}
