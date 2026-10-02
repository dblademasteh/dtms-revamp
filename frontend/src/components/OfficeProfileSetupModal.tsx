import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import toast from 'react-hot-toast'
import { Building2 } from 'lucide-react'

interface OfficeProfileSetupModalProps {
  onComplete: () => void
}

export default function OfficeProfileSetupModal({ onComplete }: OfficeProfileSetupModalProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const officeTypes = useDropdownGroup('office_types')

  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [officeType, setOfficeType] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/office-profile-setup', data),
    onSuccess: (res) => {
      setUser(res.data.user)
      toast.success(res.data?.message || 'Profile setup completed!')
      onComplete()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete setup')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }
    mutation.mutate({
      email: email.trim(),
      phone: phone.trim() || null,
      office_type: officeType || null,
      description: description.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Complete Your Profile</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Set up your office account details</p>
            </div>
          </div>
        </div>

        {/* Account info (read-only) */}
        <div className="px-6 pt-5">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200 dark:border-cyan-800 flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {user?.full_name || user?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.accnt_no}
                {user?.office?.name ? ` · ${user.office.name}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              placeholder="office@bfp-r2.gov.ph"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">Used to log in and for notifications.</p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="+63 917 000 0000"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Office Type
            </label>
            <select
              value={officeType}
              onChange={(e) => setOfficeType(e.target.value)}
              className="input w-full"
            >
              <option value="">Select office type...</option>
              {officeTypes.map((t: any) => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full"
              rows={3}
              placeholder="Short description of this office or station..."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full btn btn-primary"
            >
              {mutation.isPending ? 'Saving...' : 'Complete Setup'}
            </button>
            <button
              type="button"
              onClick={() => {
                mutation.mutate({ skip: true })
              }}
              disabled={mutation.isPending}
              className="w-full mt-2 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              Skip for now (fill in later)
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
