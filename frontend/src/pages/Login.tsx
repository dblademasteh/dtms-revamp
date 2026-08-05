import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import api from '@/services/api'
import toast from 'react-hot-toast'
import {
  Eye,
  EyeOff,
  FileText,
  GitBranch,
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
  ArrowRight
} from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'

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

  const features = [
    {
      icon: FileText,
      title: 'Full Audit Trail Visibility',
      desc: 'Track document movements and current office custodians in real time.',
    },
    {
      icon: GitBranch,
      title: 'Guided Office Workflows',
      desc: 'Seamlessly route memoranda and referrals along verified channels.',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise Security & Logs',
      desc: 'Role-based authorization backed by immutable audit history.',
    },
  ]

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Left panel - Branding Hero */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 relative overflow-hidden text-white p-10 xl:p-14 flex-col justify-between shadow-2xl">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
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
              <div className="text-lg font-extrabold tracking-tight">DTMS</div>
              <div className="text-[10px] text-slate-400 font-medium">Document Tracking &amp; Management</div>
            </div>
          </div>
        </div>

        {/* Main Content Hero */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white text-balance">
              Track, route, and account for every document.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              An official enterprise platform for routing memoranda, executive orders, circulars, and referrals across government offices with a verified audit trail.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="space-y-3.5">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-6">
          <span>© {new Date().getFullYear()} Document Tracking &amp; Management System</span>
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
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
