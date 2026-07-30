import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, FileText, GitBranch, ShieldCheck, Smartphone, ArrowLeft, KeyRound, X } from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'

interface LoginForm {
  accnt_no: string
  password: string
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPincodeModal, setShowPincodeModal] = useState(false)
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
      title: 'Full visibility',
      desc: 'See where every document is and who holds it.',
    },
    {
      icon: GitBranch,
      title: 'Guided routing',
      desc: 'Move documents along approved office workflows.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure by design',
      desc: 'Role-based access with a complete activity log.',
    },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[46%] bg-gradient-to-br from-navy-900 via-navy-800 to-primary-900 relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '38px 38px',
        }} />

        {/* Top accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-primary-400/70" />

        {/* Floating emblem */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-white/5 bg-white/[0.03]" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full border border-white/5 bg-white/[0.03]" />

        <div className="relative flex flex-col justify-between px-10 xl:px-14 py-10 w-full">
          {/* Center - Main content */}
          <div className="flex-1 flex flex-col justify-center max-w-md py-10">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-[1.15] tracking-tight">
              Track, route, and account for every document.
            </h1>
            <p className="mt-4 text-base text-slate-400 leading-relaxed">
              A secure system for routing memoranda, orders, and referrals across government
              offices — with a clear, auditable trail from sender to receiver.
            </p>

            <div className="mt-10 space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-primary-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom - Footer */}
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Document Tracking and Management System
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-[380px]">
          {/* Brand + Form header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10 inline-flex">
              <img src="/logo.png" alt="DTMS logo" className="w-28 h-28 object-contain" />
            </div>
            <h2 className="text-[28px] font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to your account to continue
            </p>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="accnt_no" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Account Number
                </label>
                <input
                  id="accnt_no"
                  type="text"
                  autoComplete="username"
                  className="input h-11"
                  placeholder="P12345"
                  {...register('accnt_no', {
                    required: 'Account Number is required',
                  })}
                />
                {errors.accnt_no && (
                  <p className="mt-1.5 text-xs text-danger-600 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-danger-500" />
                    {errors.accnt_no.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input h-11 pr-10"
                    placeholder="Enter your password"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-danger-600 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-danger-500" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 btn btn-primary mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in now...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* PIN code button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowPincodeModal(true)}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 font-medium transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Sign in with PIN code
            </button>
          </div>

          {/* PIN code modal */}
          {showPincodeModal && (
            <PincodeModal onClose={() => setShowPincodeModal(false)} />
          )}

          <div className="mt-4 text-center flex items-center justify-center gap-4">
            <Link to="/track" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Track a Document →
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              Forgot password?
            </Link>
          </div>

          {/* Status */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 w-fit rounded-full bg-success-50 border border-success-100">
              <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs font-medium text-success-700">System Online</span>
            </div>
          </div>
        </div>
      </div>
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
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 pt-6 pb-8 relative overflow-hidden">
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
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Sign in with PIN</h3>
                <p className="text-sm text-white/75 mt-0.5">Enter your account number and 4-digit PIN</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Account Number
              </label>
              <input
                type="text"
                className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm h-11"
                placeholder="P12345"
                value={accntNo}
                onChange={(e) => setAccntNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                PIN Code
              </label>
              <div className="flex gap-2 justify-center">
                {pincode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitPincode}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <><KeyRound className="w-4 h-4" /> Sign in</>
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
        <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-4">
          <Smartphone className="w-6 h-6 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Two-Factor Authentication</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter the 6-digit code from your Google Authenticator app.
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
          className="input h-14 text-center text-2xl tracking-[0.5em] font-semibold"
        />

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full h-11 btn btn-primary"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Verifying...
            </span>
          ) : (
            'Verify & Sign in'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>
      </form>
    </div>
  )
}
