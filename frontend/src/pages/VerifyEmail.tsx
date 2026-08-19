import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useBranding } from '@/hooks/useBranding'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const branding = useBranding()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const email = searchParams.get('email') || ''
    const token = searchParams.get('token') || ''

    if (!email || !token) {
      setState('error')
      setMessage('Invalid verification link. Please check the link from your email.')
      return
    }

    api
      .post('/auth/email/verify', { email, token })
      .then((res) => {
        setState('success')
        setMessage(res.data.message || 'Email verified successfully.')
        if (user) {
          setUser({ ...user, email_verified_at: new Date().toISOString() })
        }
        sessionStorage.removeItem('email-verification-modal-dismissed')
      })
      .catch((err: any) => {
        setState('error')
        setMessage(err.response?.data?.message || 'Verification failed.')
      })
  }, [searchParams])

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
          <h1 className="text-2xl font-bold text-white">Email Verification</h1>
        </div>

        <div className="card">
          <div className="card-body text-center py-8">
            {state === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto" />
                <p className="mt-4 text-sm text-slate-500">Verifying your email address...</p>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto" />
                <p className="mt-4 text-sm font-semibold text-slate-900">{message}</p>
                <Link to="/login" className="btn btn-primary btn-sm w-full mt-6">
                  Go to Login
                </Link>
              </>
            )}

            {state === 'error' && (
              <>
                <XCircle className="w-12 h-12 text-danger-500 mx-auto" />
                <p className="mt-4 text-sm font-semibold text-slate-900">{message}</p>
                <Link to="/forgot-password" className="btn btn-secondary btn-sm w-full mt-6">
                  Go to Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
