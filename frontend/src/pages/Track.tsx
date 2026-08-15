import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import api from '@/services/api'
import {
  Search,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Copy,
  Check,
  Building2,
  ArrowRight,
  ArrowLeft,
  Shield,
  ShieldCheck,
  XCircle,
  CornerDownRight,
  FileCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import QrScannerModal from '@/components/QrScannerModal'
import { useBranding } from '@/hooks/useBranding'

export default function Track() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [search, setSearch] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchParams] = useSearchParams()
  const [logoFailed, setLogoFailed] = useState(false)
  const branding = useBranding()

  useEffect(() => {
    const urlTrack = searchParams.get('track')?.trim()
    if (urlTrack) {
      setTrackingNumber(urlTrack)
      setSearch(urlTrack)
    }
  }, [searchParams])

  const { data, isLoading, error } = useQuery({
    queryKey: ['track', search],
    queryFn: () => api.get(`/track/${search}`).then(res => res.data),
    enabled: !!search,
    retry: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackingNumber.trim()) {
      setSearch(trackingNumber.trim())
    }
  }

  const handleQrResult = useCallback((tracking: string) => {
    if (!tracking) return
    setScannerOpen(false)
    setTrackingNumber(tracking)
    setSearch(tracking)
    toast.success('QR Code scanned!')
  }, [])

  const copyTrackingNumber = () => {
    if (!data?.tracking_number) return
    navigator.clipboard.writeText(data.tracking_number)
    setCopied(true)
    toast.success('Tracking number copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'released':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 font-bold'
      case 'in_review':
      case 'received':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 font-bold'
      case 'rejected':
        return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/30 font-bold'
      case 'returned':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 font-bold'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold'
    }
  }

  const statusLabels: Record<string, string> = {
    created: 'Created',
    received: 'Received',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Declined',
    returned: 'Returned',
    released: 'Released',
    filed: 'Filed / Archived',
  }

  // Stepper progress indicator logic
  const steps = [
    { key: 'created', label: 'Document Created' },
    { key: 'received', label: 'Received' },
    { key: 'in_review', label: 'Under Review' },
    { key: 'released', label: 'Released / Actioned' },
  ]

  const getCurrentStepIndex = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'created') return 0
    if (s === 'received' || s === 'returned') return 1
    if (s === 'in_review' || s === 'rejected') return 2
    if (s === 'approved' || s === 'released' || s === 'filed') return 3
    return 1
  }

  const isTerminal = (status: string) => ['rejected', 'returned'].includes(status?.toLowerCase() || '')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-16">
      {/* Top Navbar */}
      <div className="relative z-20 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-600 overflow-hidden flex-shrink-0 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              {!logoFailed ? (
                <img
                  src={branding.sidebar_logo || '/logo.png?v=2'}
                  alt="DTMS logo"
                  className="w-7 h-7 object-contain relative z-10"
                  draggable={false}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Shield className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white leading-none">{branding.system_title}</div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{branding.system_description}</div>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Return to Web App</span>
          </Link>
        </div>
      </div>

      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 sm:pt-12 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <span>Real-time Document Tracker</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Track Any Document
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-md mx-auto">
            Enter a valid DTMS tracking number or scan a QR code to view live routing status and history.
          </p>
        </div>

        {/* Search Bar & QR Scanner Trigger */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl backdrop-blur-xl">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Enter tracking number (e.g. 2026-07-0001)..."
                className="w-full pl-12 pr-10 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-mono focus:outline-none"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              {trackingNumber && (
                <button
                  type="button"
                  onClick={() => setTrackingNumber('')}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Scan QR Code"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs transition-colors"
              >
                <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Scan QR</span>
              </button>

              <button
                type="submit"
                disabled={!trackingNumber.trim() || isLoading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-center space-y-3 shadow-lg backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-700/50">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-red-900 dark:text-red-200">Tracking Number Not Found</h3>
            <p className="text-xs text-red-700 dark:text-red-300/80 max-w-sm mx-auto">
              We couldn't locate any document registered with tracking code <span className="font-mono font-bold text-red-950 dark:text-white">"{search}"</span>. Please verify the code and try again.
            </p>
          </div>
        )}

        {/* Search Results Display */}
        {data && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Main Document Summary Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl space-y-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Title & Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={copyTrackingNumber}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 font-mono text-xs font-bold text-blue-700 dark:text-blue-400 transition-colors"
                      title="Click to copy tracking number"
                    >
                      <span>{data.tracking_number}</span>
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    <span className="text-slate-300 dark:text-slate-600">•</span>

                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {data.document_type ? data.document_type.replace('_', ' ').toUpperCase() : 'DOCUMENT'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                    {data.subject}
                  </h2>
                </div>

                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border ${getStatusBadge(data.status)}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {statusLabels[data.status] || data.status}
                  </span>
                </div>
              </div>

              {/* Workflow Stepper */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                  <span>Routing Workflow Progress</span>
                  {isTerminal(data.status) ? (
                    <span className={`font-mono ${data.status?.toLowerCase() === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {statusLabels[data.status] || data.status}
                    </span>
                  ) : (
                    <span className="text-blue-600 dark:text-blue-400 font-mono">Stage {getCurrentStepIndex(data.status) + 1} of 4</span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {steps.map((st, idx) => {
                    const activeIdx = getCurrentStepIndex(data.status)
                    const terminal = isTerminal(data.status) && idx === activeIdx
                    const isCompleted = terminal || idx < activeIdx
                    return (
                      <div key={st.key} className="space-y-1.5">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            terminal
                              ? data.status?.toLowerCase() === 'rejected'
                                ? 'bg-red-500 shadow-sm shadow-red-500/50'
                                : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                              : isCompleted
                                ? 'bg-blue-600 dark:bg-gradient-to-r dark:from-blue-500 dark:to-indigo-500 shadow-sm shadow-blue-500/50'
                                : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                        <p className={`text-[11px] font-medium hidden sm:block truncate ${terminal ? 'text-red-600 dark:text-red-400' : isCompleted ? 'text-slate-900 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>
                          {st.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Location & Metadata Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Current Location</p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{data.current_location || 'Office Station'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">Last Updated</p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {data.last_updated ? new Date(data.last_updated).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Link to Full Details */}
              {data.id && (
                <div className="pt-2 text-right">
                  <Link
                    to={`/documents/${data.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <span>View Full Document Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Routing History Timeline */}
            <div className="rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Audit &amp; Routing History ({data.history?.length || 0})</span>
              </h3>

              {data.history?.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {data.history.map((entry: any, index: number) => (
                    <div key={entry.id || index} className="relative flex items-start gap-4 pl-1 group">
                      {/* Timeline Dot Icon */}
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 z-10 group-hover:border-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-slate-800 transition-colors flex-shrink-0">
                        {index === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <CornerDownRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      {/* Timeline Content */}
                      <div className="flex-1 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                            {entry.action}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {new Date(entry.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>

                        {entry.remarks && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                            "{entry.remarks}"
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <span className="truncate">
                            {entry.fromOffice?.name || 'Originating Office'} → {entry.toOffice?.name || 'Destination Office'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">No routing log steps recorded yet for this document.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial Empty State Guide */}
        {!data && !error && !isLoading && (
          <div className="max-w-2xl mx-auto text-center p-8 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-slate-700/60">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">How to Track a Document</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Enter your document tracking number (e.g. <code className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">2026-07-0001</code>) or click the Scan QR button to automatically capture codes from paper documents.
            </p>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQrResult} />
    </div>
  )
}
