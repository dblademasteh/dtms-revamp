import { useState, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useRanks } from '@/hooks/useRanks'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import SearchableSelect from '@/components/SearchableSelect'
import toast from 'react-hot-toast'
import { UserCheck } from 'lucide-react'

interface ProfileSetupModalProps {
  onComplete: () => void
}

export default function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const ranks = useRanks()
  const designations = useDropdownGroup('designations')

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get('/offices').then((r) => r.data),
  })

  const designationOptions = useMemo(
    () => designations.map((d) => ({ value: d.label, label: d.label })),
    [designations]
  )

  const officeOptions = useMemo(
    () => (offices ?? []).map((o: any) => ({ value: o.name, label: o.name })),
    [offices]
  )

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [middleName, setMiddleName] = useState(user?.middle_name || '')
  const [suffix, setSuffix] = useState(user?.suffix || '')
  const [rank, setRank] = useState(user?.rank || '')
  const [designation, setDesignation] = useState(user?.designation || '')
  const [unitAssignment, setUnitAssignment] = useState(user?.unit_assignment || '')

  const mutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/profile-setup', data),
    onSuccess: (res) => {
      setUser(res.data.user)
      toast.success('Profile setup completed!')
      onComplete()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete setup')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required')
      return
    }
    mutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_name: middleName.trim() || null,
      suffix: suffix.trim() || null,
      rank: rank || null,
      designation: designation.trim() || null,
      unit_assignment: unitAssignment.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Complete Your Profile</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Please verify and complete your account details</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Middle Name
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                Suffix
              </label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className="input w-full"
                placeholder="e.g., Jr., Sr."
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Rank
            </label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="input w-full"
            >
              <option value="">Select rank...</option>
              {ranks.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Designation
            </label>
            <SearchableSelect
              options={designationOptions}
              value={designation}
              onChange={setDesignation}
              placeholder="Select or type designation..."
              allowCreate
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
              Unit Assignment
            </label>
            <SearchableSelect
              options={officeOptions}
              value={unitAssignment}
              onChange={setUnitAssignment}
              placeholder="Select or type unit assignment..."
              allowCreate
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
          </div>
        </form>
      </div>
    </div>
  )
}
