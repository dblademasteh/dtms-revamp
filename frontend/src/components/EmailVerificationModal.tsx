import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { MailCheck, MailWarning, Send, CheckCircle2, ArrowRight, X } from 'lucide-react'

interface EmailVerificationModalProps {
  onComplete: () => void
}

export default function EmailVerificationModal({ onComplete }: EmailVerificationModalProps) {
  const user = useAuthStore((s) => s.user)
  const [emailSent, setEmailSent] = useState(false)

  const sendVerificationMutation = useMutation({
    mutationFn: () => api.post('/auth/email/verification/send'),
    onSuccess: (res) => {
      setEmailSent(true)
      toast.success(res.data?.message || 'Verification email sent')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Could not send verification email')
    },
  })

  const steps = [
    { label: 'Email provided', done: !!user?.email },
    { label: 'Verification sent', done: emailSent },
    { label: 'Email verified', done: !!user?.email_verified_at },
  ]

  const currentStep = !user?.email ? 0 : !emailSent ? 1 : user?.email_verified_at ? 2 : 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <MailWarning className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verify Your Email</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Complete email verification to continue</p>
              </div>
            </div>
            <button
              onClick={onComplete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Skip for now"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-5">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  step.done
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400'
                    : i === currentStep
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    step.done
                      ? 'text-success-700 dark:text-success-300'
                      : i === currentStep
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {step.done && (
                  <span className="text-[10px] font-medium text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 px-2 py-0.5 rounded-md">
                    Done
                  </span>
                )}
                {!step.done && i === currentStep && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Email info */}
          <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{user?.email}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-3">
            {!emailSent ? (
              <button
                onClick={() => sendVerificationMutation.mutate()}
                disabled={sendVerificationMutation.isPending || !user?.email}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                {sendVerificationMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Verification Email
                  </>
                )}
              </button>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-success-600 dark:text-success-400 mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Verification email sent!
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Check your inbox and click the verification link. You can close this dialog and continue using the app.
                </p>
              </div>
            )}

            <button
              onClick={onComplete}
              className="w-full btn btn-ghost text-sm flex items-center justify-center gap-2"
            >
              {emailSent ? 'Close' : 'Skip for now'}
              {!emailSent && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
