import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Lock, Eye, EyeOff, Shield, CheckCircle2, LogOut, KeyRound } from 'lucide-react'

export default function ChangePassword() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!currentPassword) {
      setFieldErrors((prev) => ({ ...prev, current_password: 'Current password is required.' }))
      return
    }
    if (password.length < 6) {
      setFieldErrors((prev) => ({ ...prev, password: 'New password must be at least 6 characters.' }))
      return
    }
    if (password !== passwordConfirmation) {
      setFieldErrors((prev) => ({ ...prev, password_confirmation: 'Passwords do not match.' }))
      return
    }

    setIsLoading(true)
    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      if (user) {
        setUser({ ...user, must_change_password: false })
      }
      toast.success('Password changed successfully!')
      navigate('/')
    } catch (error: any) {
      const data = error.response?.data?.errors
      if (data) {
        setFieldErrors(
          Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
        )
      } else {
        toast.error(error.response?.data?.message || 'Password change failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const inputClass =
    'w-full pl-10 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400'

  const labelClass =
    'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 p-6 sm:p-10">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-700 px-7 pt-8 pb-9 relative overflow-hidden text-white">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-[52px] h-[52px] p-2.5 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Change Your Password</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  You must set a new password before continuing.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-7">
            <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/30">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Account: {user?.accnt_no || user?.email}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-snug">
                  For your security, choose a password you have not used before.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="current_password" className={labelClass}>Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="current_password"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={inputClass}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.current_password && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {fieldErrors.current_password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className={labelClass}>New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password_confirmation" className={labelClass}>Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password_confirmation"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="Re-enter new password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password_confirmation && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {fieldErrors.password_confirmation}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Set New Password</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-5">
          © {new Date().getFullYear()} Document Tracking &amp; Management System
        </p>
      </div>
    </div>
  )
}
