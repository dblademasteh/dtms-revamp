import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import api from '@/services/api'
import toast from 'react-hot-toast'
import {
  Eye,
  EyeOff,
  FileText,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
  KeyRound,
  X,
  User,
  Lock,
  Search,
  CheckCircle2,
  Shield,
  ArrowRight,
  ScanLine,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  MapPin,
  Clock
} from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'
import QrScannerModal from '@/components/QrScannerModal'

interface LoginForm {
  accnt_no: string
  password: string
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPincodeModal, setShowPincodeModal] = useState(false)
  const [shaking, setShaking] = useState(false)
  const login = useAuthStore((state) => state.login)
  const verify2fa = useAuthStore((state) => state.verify2fa)
  const twoFaToken = useAuthStore((state) => state.twoFaToken)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const [trackingNumber, setTrackingNumber] = useState('')
  const [search, setSearch] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const urlTrack = searchParams.get('track')?.trim()
    if (urlTrack) {
      setTrackingNumber(urlTrack)
      setSearch(urlTrack)
    }
  }, [searchParams])

  const { data: trackingData, isLoading: isTracking, error: trackingError } = useQuery({
    queryKey: ['track-login', search],
    queryFn: () => api.get(`/track/${search}`).then((res) => res.data),
    enabled: !!search,
    retry: false,
  })

  const handleTrackSubmit = (e: React.FormEvent) => {
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
    if (!trackingData?.tracking_number) return
    navigator.clipboard.writeText(trackingData.tracking_number)
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

  const trackSteps = [
    { key: 'created', label: 'Created' },
    { key: 'received', label: 'Received' },
    { key: 'in_review', label: 'Review' },
    { key: 'released', label: 'Released' },
  ]

  const getCurrentStepIndex = (status: string) => {
    const s = status?.toLowerCase() || ''
    if (s === 'created') return 0
    if (s === 'received') return 1
    if (s === 'in_review') return 2
    if (s === 'approved' || s === 'released' || s === 'filed') return 3
    return 1
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.accnt_no || '', data.password)
      if (useAuthStore.getState().twoFaToken) {
        toast('Enter your authenticator code', { icon: '🔐' })
        return
      }
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
      setShaking(true)
      window.setTimeout(() => setShaking(false), 500)
    } finally {
      setIsLoading(false)
    }
  }

  const onVerify = async (code: string) => {
    setIsLoading(true)
    try {
      await verify2fa(code)
      toast.success('Verified — welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left panel - Public Tracking */}
      <div className="hidden lg:flex lg:w-[48%] bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden text-slate-900 dark:text-white p-10 xl:p-14 flex-col justify-between shadow-2xl">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Header Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">DTMS</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Document Tracking &amp; Management</div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 backdrop-blur-md border border-slate-200 dark:border-white/15 text-xs font-semibold text-slate-700 dark:text-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>v2.5 System Online</span>
          </div>
        </div>

        {/* Main Content - Public Tracking */}
        <div className="relative z-10 my-auto mx-auto w-full max-w-lg space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
              Track Any Document
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter a DTMS tracking number or scan a QR code to view live routing status — no login required.
            </p>
          </div>

          {/* Search Bar & QR Scanner Trigger */}
          <form onSubmit={handleTrackSubmit} className="relative">
            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-md">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 2026-07-0001"
                  className="w-full pl-9 pr-8 py-2.5 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-mono focus:outline-none"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                {trackingNumber && (
                  <button
                    type="button"
                    onClick={() => setTrackingNumber('')}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Scan QR Code"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/15 font-semibold text-xs transition-colors"
              >
                <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden xl:inline">Scan QR</span>
              </button>

              <button
                type="submit"
                disabled={!trackingNumber.trim() || isTracking}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
              >
                {isTracking ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error State */}
          {trackingError && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-center space-y-2 animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-200 dark:border-red-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-red-700 dark:text-red-200">Tracking Number Not Found</h3>
              <p className="text-xs text-red-600/90 dark:text-red-300/80 leading-relaxed">
                No document registered with code{' '}
                <span className="font-mono font-bold text-red-900 dark:text-white">"{search}"</span>. Please verify the code and try again.
              </p>
            </div>
          )}

          {/* Search Results */}
          {trackingData && (
            <div className="rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <button
                    onClick={copyTrackingNumber}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 border border-slate-300 dark:border-white/15 font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 transition-colors"
                    title="Click to copy tracking number"
                  >
                    <span className="truncate max-w-[180px]">{trackingData.tracking_number}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />}
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
                    {trackingData.document_type ? trackingData.document_type.replace('_', ' ').toUpperCase() : 'DOCUMENT'}
                  </p>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border w-fit ${getStatusBadge(trackingData.status)}`}>
                  <ShieldCheck className="w-3 h-3" />
                  {statusLabels[trackingData.status] || trackingData.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{trackingData.subject}</h3>

              {/* Compact Workflow Stepper */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="grid grid-cols-4 gap-1.5">
                  {trackSteps.map((st, idx) => {
                    const activeIdx = getCurrentStepIndex(trackingData.status)
                    const isCompleted = idx <= activeIdx
                    return (
                      <div key={st.key} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-blue-600 dark:bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-200 dark:bg-white/10'
                          }`}
                        />
                        <p className={`text-[10px] font-medium text-center ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                          {st.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Location & Last Updated */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Current Location</p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{trackingData.current_location || 'Office Station'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">Last Updated</p>
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {trackingData.last_updated ? new Date(trackingData.last_updated).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Initial Empty State Guide */}
          {!trackingData && !trackingError && !isTracking && (
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200 dark:border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200">How to Track a Document</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Enter the tracking number printed on the document (e.g.{' '}
                <code className="text-blue-700 dark:text-blue-300 bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded font-mono">2026-07-0001</code>) or scan its QR code.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 dark:border-white/10 pt-6">
          <span className="min-w-0">
            © {new Date().getFullYear()} Document Tracking &amp; Management System
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>SSL Encrypted</span>
          </span>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 p-3 shadow-md border border-slate-200/80 dark:border-slate-800 flex items-center justify-center">
              <img
                src="/logo.png?v=2"
                alt="DTMS logo"
                className="w-full h-full object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sign in with your credentials to access your workspace
              </p>
            </div>
          </div>

          {twoFaToken ? (
            <TwoFactorStep
              isLoading={isLoading}
              onVerify={onVerify}
              onBack={() => {
                useAuthStore.setState({ twoFaToken: null })
                navigate('/login')
              }}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className={shaking ? 'space-y-4 animate-shake' : 'space-y-4'}>
              {/* Account Number Field */}
              <div className="space-y-1.5">
                <label htmlFor="accnt_no" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Account Number
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="accnt_no"
                    type="text"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono placeholder:text-slate-400"
                    placeholder="e.g. P12345"
                    {...register('accnt_no', {
                      required: 'Account Number is required',
                    })}
                  />
                </div>
                {errors.accnt_no && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {errors.accnt_no.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Enter your password"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign in to System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Auxiliary Links */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPincodeModal(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Sign in with 4-Digit PIN Code</span>
            </button>

            <div className="text-center">
              <Link
                to="/track"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Track a Document Without Login →</span>
              </Link>
            </div>
          </div>

          {/* System Status Footer */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* PIN Code Modal */}
      {showPincodeModal && (
        <PincodeModal onClose={() => setShowPincodeModal(false)} />
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleQrResult} />
    </div>
  )
}

function PincodeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [accntNo, setAccntNo] = useState('')
  const [pincode, setPincode] = useState<string[]>(Array(4).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newPincode = [...pincode]
    newPincode[index] = value
    setPincode(newPincode)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pincode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    e.preventDefault()
    const next = [...pincode]
    pasted.split('').forEach((d, i) => {
      if (i < 4) next[i] = d
    })
    setPincode(next)
    inputRefs.current[Math.min(pasted.length, 3)]?.focus()
  }

  const submitPincode = async () => {
    if (!accntNo.trim()) {
      toast.error('Enter your account number')
      return
    }
    const code = pincode.join('')
    if (code.length !== 4) {
      toast.error('Enter your 4-digit PIN')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/auth/login-pincode', { accnt_no: accntNo, pincode: code })
      const { token, user } = res.data
      useAuthStore.getState().setAuth(user, token)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid PIN or account number')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 pt-6 pb-8 relative overflow-hidden text-white">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Sign in with PIN</h3>
                <p className="text-xs text-slate-300 mt-0.5">Enter account # and 4-digit code</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                placeholder="e.g. P12345"
                value={accntNo}
                onChange={(e) => setAccntNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 text-center">
                4-Digit PIN Code
              </label>
              <div className="flex gap-2.5 justify-center pt-1" onPaste={handlePaste}>
                {pincode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`PIN digit ${idx + 1}`}
                    className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white outline-none transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitPincode}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <><KeyRound className="w-3.5 h-3.5" /> Sign in with PIN</>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

function TwoFactorStep({
  isLoading,
  onVerify,
  onBack,
}: {
  isLoading: boolean
  onVerify: (code: string) => void
  onBack: () => void
}) {
  const [code, setCode] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length === 6) {
      onVerify(code.trim())
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
          <Smartphone className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </span>
          ) : (
            'Verify & Sign in'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to standard login
        </button>
      </form>
    </div>
  )
}
