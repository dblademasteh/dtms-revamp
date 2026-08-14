import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Mail, ArrowLeft, Shield } from 'lucide-react'
import { useBranding } from '@/hooks/useBranding'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const branding = useBranding()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('If the email exists, a reset link has been sent')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-primary-500 rounded-xl mx-auto mb-4 overflow-hidden">
            {branding.login_logo || branding.sidebar_logo ? (
              <img
                src={branding.login_logo || branding.sidebar_logo || ''}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <Shield className="w-7 h-7 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-slate-400 text-sm mt-2">Enter your email to receive a reset link</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    className="input pl-9"
                    placeholder="you@dts.gov.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
