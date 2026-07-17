import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, FileText, GitBranch, ShieldCheck, Smartphone, ArrowLeft } from 'lucide-react'

interface LoginForm {
  accnt_no: string
  password: string
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)
  const verify2fa = useAuthStore((state) => state.verify2fa)
  const twoFaToken = useAuthStore((state) => state.twoFaToken)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login((data.accnt_no || '').toUpperCase(), data.password)
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
                  className="input h-11 uppercase"
                  placeholder="P12345"
                  {...register('accnt_no', {
                    required: 'Account Number is required',
                    setValueAs: (v: string) => (v || '').toUpperCase(),
                  })}
                  onChange={(e) => {
                    e.target.value = (e.target.value || '').toUpperCase()
                  }}
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
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 uppercase tracking-wider font-medium">Sign in with social media</span>
            </div>
          </div>

          {/* Social sign-in */}
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              className="flex items-center justify-center h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              aria-label="Sign in with Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              aria-label="Sign in with Facebook"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              aria-label="Sign in with Twitter"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000">
                <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.29 19.5h2.04L6.48 3.24H4.29L17.61 20.65z" />
              </svg>
            </button>
          </div>

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
