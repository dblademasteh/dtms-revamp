import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { Search, FileText, MapPin, Clock, CheckCircle, AlertCircle, ScanLine } from 'lucide-react'
import QrScannerModal from '@/components/QrScannerModal'

export default function Track() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [search, setSearch] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [searchParams] = useSearchParams()

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
  }, [])

  const statusColors: Record<string, string> = {
    created: 'bg-slate-200 text-slate-800 border-slate-300',
    received: 'bg-amber-100 text-amber-800 border-amber-200',
    in_review: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    returned: 'bg-slate-100 text-slate-800 border-slate-200',
    released: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    filed: 'bg-slate-200 text-slate-800 border-slate-300',
  }

  const statusLabels: Record<string, string> = {
    created: 'Created',
    received: 'Received',
    in_review: 'In Review',
    approved: 'Approved',
    rejected: 'Declined',
    returned: 'Returned',
    released: 'Released',
    filed: 'Filed',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Document Tracking</h1>
          <p className="text-slate-400">Enter your tracking number to check document status</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. 2026-07-0001"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan QR code"
              className="px-4 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <ScanLine className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={!trackingNumber.trim() || isLoading}
              className="px-6 py-3.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-300 font-medium">Document not found</p>
            <p className="text-red-400/70 text-sm mt-1">Please check your tracking number and try again</p>
          </div>
        )}

        {/* Result */}
        {data && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{data.subject}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Tracking: {data.tracking_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[data.status] || 'bg-slate-100 text-slate-800'}`}>
                  {statusLabels[data.status] || data.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="w-4 h-4 text-primary-400" />
                Current Location: <span className="font-medium text-white">{data.current_location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300 mt-2">
                <Clock className="w-4 h-4 text-primary-400" />
                Last Updated: {new Date(data.last_updated).toLocaleString()}
              </div>
            </div>

            {/* Routing History */}
            {data.history?.length > 0 && (
              <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Routing History
                </h3>
                <div className="space-y-0">
                  {data.history.map((entry: any, index: number) => (
                    <div key={entry.id || index} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Line */}
                      {index < data.history.length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 h-full bg-white/10" />
                      )}
                      {/* Dot */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600/20 border-2 border-primary-500 flex items-center justify-center z-10">
                        <CheckCircle className="w-4 h-4 text-primary-400" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white capitalize">{entry.action}</p>
                        <p className="text-sm text-slate-400 mt-0.5">{entry.remarks}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span>{entry.fromOffice?.name} → {entry.toOffice?.name}</span>
                          <span>•</span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.history?.length === 0 && (
              <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                <Clock className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                <p className="text-sm text-slate-400">No routing history yet</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-500">
          <p>Philippine Government Document Tracking and Management System</p>
        </div>
      </div>

      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQrResult} />
    </div>
  )
}
