import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Select from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'
import {
  User,
  Lock,
  Settings as SettingsIcon,
  Bell,
  Palette,
  Database,
  HardDrive,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  KeyRound,
  Building2,
} from 'lucide-react'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export default function Settings() {
  const { user, setUser } = useAuthStore()
  const isSuperadmin = user?.role === 'superadmin'
  const [activeTab, setActiveTab] = useState('profile')

  const [name, setName] = useState(user?.name || '')
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [middleName, setMiddleName] = useState(user?.middle_name || '')
  const [rank, setRank] = useState(user?.rank || '')
  const [designation, setDesignation] = useState(user?.designation || '')
  const [officeId, setOfficeId] = useState<string>(user?.office_id ? String(user.office_id) : '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [accountOpen, setAccountOpen] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPincodeForm, setShowPincodeForm] = useState(false)
  const [pincodeDigits, setPincodeDigits] = useState(['', '', '', ''])
  const [pincodePassword, setPincodePassword] = useState('')
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(
    (user as any)?.notification_preferences || {
      doc_routed: true,
      doc_status: true,
      doc_overdue: true,
      doc_created: true,
    }
  )

  // Appearance State
  const [theme, setTheme] = useState(localStorage.getItem('dtms-theme') || 'light')
  const [font, setFont] = useState(localStorage.getItem('dtms-font') || 'inter')
  const [scale, setScale] = useState(localStorage.getItem('dtms-scale') || 'md')

  const [slaHours, setSlaHours] = useState<number>(24)
  const [retentionMonths, setRetentionMonths] = useState<number>(12)

  const slaQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.settings),
    enabled: isSuperadmin,
  })

  const officesQuery = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get('/offices').then((r) => r.data),
  })

  const officeOptions = useMemo(
    () => (officesQuery.data ?? []).map((o: any) => ({ value: String(o.id), label: o.name.replace(/^[\d\.]+\s*/, '') })),
    [officesQuery.data]
  )

  useEffect(() => {
    if (slaQuery.data) {
      setSlaHours(slaQuery.data.default_sla_hours)
      setRetentionMonths(slaQuery.data.retention_months ?? 12)
    }
  }, [slaQuery.data])

  const slaMutation = useMutation({
    mutationFn: (data: any) => api.put('/admin/settings', data),
    onSuccess: (res) => {
      setSlaHours(res.data.settings.default_sla_hours)
      setRetentionMonths(res.data.settings.retention_months)
      toast.success('Settings updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Save failed')
    },
  })

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      setUser(res.data.user)
      toast.success('Profile updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Update failed')
    },
  })

  const notifMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/notification-preferences', data),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, notification_preferences: res.data.notification_preferences })
      }
      toast.success('Notification preferences saved')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Save failed')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/password', data),
    onSuccess: () => {
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Password change failed')
    },
  })

  const pincodeMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/pincode', data),
    onSuccess: () => {
      toast.success('PIN code updated')
      setShowPincodeForm(false)
      setPincodeDigits(['', '', '', ''])
      setPincodePassword('')
      if (user) {
        setUser({ ...user, has_pincode: true })
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update PIN')
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    profileMutation.mutate({
      name,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      rank,
      designation,
      office_id: officeId ? Number(officeId) : null,
      phone,
    })
  }

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return api.post('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res) => {
      // Prefer the full user object (has raw relative avatar path that normalizeUser handles correctly)
      if (res.data.user) {
        setUser(res.data.user)
      } else if (user) {
        setUser({ ...user, avatar: res.data.avatar_url })
      }
      toast.success('Avatar updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Avatar upload failed')
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    passwordMutation.mutate({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    })
  }

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const pincode = pincodeDigits.join('')
    if (pincode.length !== 4) {
      toast.error('Enter a 4-digit PIN')
      return
    }
    pincodeMutation.mutate({
      current_password: pincodePassword,
      pincode,
    })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, admin: false },
    { id: 'security', label: 'Security', icon: Lock, admin: false },
    { id: 'notifications', label: 'Notifications', icon: Bell, admin: false },
    { id: 'appearance', label: 'Appearance', icon: Palette, admin: false },
    ...(user?.office_id
      ? [{ id: 'office', label: 'Office', icon: Building2, admin: false }]
      : []),
    ...(isSuperadmin
      ? [
          { id: 'system', label: 'System', icon: SettingsIcon, admin: true },
          { id: 'database', label: 'Database', icon: Database, admin: true },
        ]
      : []),
  ]

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('dtms-theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', systemDark)
    }
    toast.success('Theme updated')
  }

  const changeFont = (newFont: string) => {
    setFont(newFont)
    localStorage.setItem('dtms-font', newFont)
    document.documentElement.className = document.documentElement.className
      .replace(/\bfont-\w+\b/g, '')
    document.documentElement.classList.add(`font-${newFont}`)
    toast.success('Font updated')
  }

  const changeScale = (newScale: string) => {
    setScale(newScale)
    localStorage.setItem('dtms-scale', newScale)
    document.documentElement.className = document.documentElement.className
      .replace(/\bscale-\w+\b/g, '')
    document.documentElement.classList.add(`scale-${newScale}`)
    toast.success('UI scale updated')
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        activeTab === id
          ? 'border-primary-500 dark:border-primary-400 text-primary-700 dark:text-primary-300'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and system preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <TabButton key={t.id} id={t.id} label={t.label} icon={t.icon} />
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        user?.role === 'office_station' ? (
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Office Account
              </h2>
            </div>
            <div className="card-body">
              <p className="text-sm text-slate-500">
                This account belongs to an office. Manage your office's logo, name, unit code,
                description, and members from the dedicated office profile page.
              </p>
              <Link to="/office-profile" className="btn btn-primary btn-sm mt-4">
                View Office Profile
              </Link>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Identity card with avatar upload */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Profile
              </h2>
            </div>
            <div className="card-body">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Avatar + upload */}
                <div className="flex flex-col items-center gap-3 sm:border-r sm:border-slate-200 sm:pr-6 sm:flex-shrink-0">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-200 dark:ring-primary-700 flex items-center justify-center">
                      {avatarPreview || user?.avatar ? (
                        <img
                          src={avatarPreview || user?.avatar || ''}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary-700 dark:text-primary-300 text-2xl font-bold">
                          {(user?.name?.charAt(0) || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    {avatarMutation.isPending && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="btn btn-secondary btn-sm cursor-pointer">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image must be under 5 MB')
                          return
                        }
                        setAvatarPreview(URL.createObjectURL(file))
                        avatarMutation.mutate(file)
                      }}
                    />
                  </label>
                  {(user?.avatar || avatarPreview) && (
                    <button
                      type="button"
                      className="text-xs text-danger-600 hover:text-danger-700"
                      onClick={() => {
                        setAvatarPreview(null)
                        if (user) setUser({ ...user, avatar: null })
                        api.delete('/auth/avatar').catch(() => {})
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Key identity summary */}
                <div className="flex-1 w-full min-w-0 space-y-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider">Full Name</p>
                    <p className="font-semibold text-slate-900 text-lg leading-tight">{user?.full_name || user?.name}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Rank</p>
                      <p className="font-medium text-slate-900 truncate">{user?.rank || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Designation</p>
                      <p className="font-medium text-slate-900 truncate">{user?.designation || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Account No.</p>
                      <p className="font-medium text-slate-900 font-mono truncate">{user?.accnt_no || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Item No.</p>
                      <p className="font-medium text-slate-900 font-mono truncate">{user?.item_no || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Office</p>
                      <p className="font-medium text-slate-900 truncate">{(user as any)?.office?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs uppercase tracking-wider">Unit Assignment</p>
                      <p className="font-medium text-slate-900 truncate">{user?.unit_assignment || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editable details */}
          <div className="card">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="card-header flex items-center justify-between w-full text-left hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Personal Details
              </h2>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${detailsOpen ? '' : '-rotate-90'}`}
              />
            </button>
            {detailsOpen && (
              <div className="card-body">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">First Name</label>
                      <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Middle Name</label>
                      <input className="input" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Last Name</label>
                      <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Display Name</label>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                    <p className="text-xs text-slate-400 mt-1">Shown across the app (defaults to full name).</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Rank</label>
                      <input className="input" value={rank} onChange={(e) => setRank(e.target.value)} placeholder="e.g. FO3" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Phone</label>
                      <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Designation</label>
                      <input className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. System Administrator" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Assignment</label>
                      <Select
                        className="text-sm"
                        styles={buildSelectStyles()}
                        options={officeOptions}
                        isClearable
                        placeholder="Select office..."
                        value={officeId ? officeOptions.find((o: any) => o.value === officeId) : null}
                        onChange={(opt: any) => setOfficeId(opt ? opt.value : '')}
                      />
                      <p className="text-xs text-slate-400 mt-1">The office you belong to. Incoming routed documents are directed here.</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={profileMutation.isPending} className="btn btn-primary btn-sm">
                      {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Account Info (read-only) */}
          <div className="card">
            <button
              type="button"
              onClick={() => setAccountOpen(!accountOpen)}
              className="card-header flex items-center justify-between w-full text-left hover:bg-slate-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Account Information
              </h2>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${accountOpen ? '' : '-rotate-90'}`}
              />
            </button>
            {accountOpen && (
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider">Email</p>
                    <p className="font-medium text-slate-900 truncate">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider">Role</p>
                    <p className="font-medium text-slate-900 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider">Status</p>
                    <p className="font-medium text-slate-900 capitalize">{user?.status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <TwoFactorCard />

          {/* PIN Code + Change Password side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* PIN Code */}
            <div className="card">
              <div className="card-header flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <KeyRound className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider truncate">PIN Code</h2>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${user?.has_pincode ? 'bg-success-50 border-success-100 text-success-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user?.has_pincode ? 'bg-success-500' : 'bg-slate-400'}`} />
                  {user?.has_pincode ? 'Set' : 'Not Set'}
                </span>
              </div>
              <div className="card-body">
                {!showPincodeForm ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500">
                      {user?.has_pincode ? 'Use your 4-digit PIN for quick sign-in.' : 'Set a 4-digit PIN for quick sign-in without a password.'}
                    </p>
                    <button className="btn btn-primary btn-sm self-start" onClick={() => setShowPincodeForm(true)}>
                      {user?.has_pincode ? 'Change PIN' : 'Set PIN'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePincodeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Current Password</label>
                      <input type="password" className="input" value={pincodePassword} onChange={(e) => setPincodePassword(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">New 4-Digit PIN</label>
                      <div className="flex gap-2">
                        {pincodeDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            type="text" inputMode="numeric" maxLength={1}
                            className="w-12 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={digit}
                            onChange={(e) => {
                              if (e.target.value && !/^\d$/.test(e.target.value)) return
                              const next = [...pincodeDigits]
                              next[idx] = e.target.value
                              setPincodeDigits(next)
                              if (e.target.value && idx < 3) document.getElementById(`pin-${idx + 1}`)?.focus()
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !pincodeDigits[idx] && idx > 0) document.getElementById(`pin-${idx - 1}`)?.focus()
                            }}
                            id={`pin-${idx}`} autoFocus={idx === 0}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowPincodeForm(false); setPincodeDigits(['', '', '', '']); setPincodePassword('') }}>Cancel</button>
                      <button type="submit" disabled={pincodeMutation.isPending} className="btn btn-primary btn-sm">
                        {pincodeMutation.isPending ? 'Saving...' : 'Save PIN'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Change Password</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Current Password</label>
                    <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">New Password</label>
                    <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                    <p className="text-xs text-slate-400 mt-1">Must be at least 6 characters.</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                    <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={passwordMutation.isPending} className="btn btn-primary btn-sm">
                      {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Notification Preferences
            </h2>
          </div>
          <div className="card-body space-y-4">
            {[
              { key: 'doc_routed', label: 'Document routed to my office', desc: 'When a document is forwarded to your office' },
              { key: 'doc_status', label: 'Document status changes', desc: 'When a document you created changes status' },
              { key: 'doc_overdue', label: 'Overdue document alerts', desc: 'When a document in your office passes SLA deadline' },
              { key: 'doc_created', label: 'New document notifications', desc: 'When a new document is created in your office' },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-900">{pref.label}</p>
                  <p className="text-xs text-slate-500">{pref.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifPrefs[pref.key] || false}
                    onChange={(e) => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                Email notifications are sent in addition to in-app notifications.
              </p>
              <button
                onClick={() => notifMutation.mutate({ preferences: notifPrefs })}
                disabled={notifMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {notifMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appearance */}
      {activeTab === 'appearance' && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Appearance Settings
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
                Color Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light Mode' },
                  { value: 'dark', label: 'Dark Mode' },
                  { value: 'system', label: 'System Default' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => changeTheme(t.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                      theme === t.value
                        ? 'border-primary-500 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
                Font Family
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { value: 'inter', label: 'Inter', preview: 'System standard, clean', css: "'Inter', sans-serif" },
                  { value: 'outfit', label: 'Outfit', preview: 'Geometric, modern', css: "'Outfit', sans-serif" },
                  { value: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', preview: 'Premium, friendly', css: "'Plus Jakarta Sans', sans-serif" },
                  { value: 'manrope', label: 'Manrope', preview: 'Sleek, readable', css: "'Manrope', sans-serif" },
                  { value: 'poppins', label: 'Poppins', preview: 'Rounded, geometric', css: "'Poppins', sans-serif" },
                  { value: 'sora', label: 'Sora', preview: 'Tech, minimal', css: "'Sora', sans-serif" },
                  { value: 'space-grotesk', label: 'Space Grotesk', preview: 'Distinctive, modern', css: "'Space Grotesk', sans-serif" },
                  { value: 'dm-sans', label: 'DM Sans', preview: 'Google-premium sans', css: "'DM Sans', sans-serif" },
                  { value: 'playfair', label: 'Playfair Display', preview: 'Classic serif letterhead', css: "'Playfair Display', serif" },
                  { value: 'lora', label: 'Lora', preview: 'Elegant serif body', css: "'Lora', serif" },
                  { value: 'firacode', label: 'Fira Code', preview: 'Developer monospace', css: "'Fira Code', monospace" },
                  { value: 'jetbrains-mono', label: 'JetBrains Mono', preview: 'Premium monospace', css: "'JetBrains Mono', monospace" },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => changeFont(f.value)}
                    className={`px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                      font === f.value
                        ? 'border-primary-500 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="text-sm font-bold" style={{ fontFamily: f.css }}>{f.label}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{f.preview}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* UI Scale */}
            <div>
              <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-400 mb-2.5 uppercase tracking-wider">
                UI Scale / Sizing
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'sm', label: 'Small', desc: '90%' },
                  { value: 'md', label: 'Normal', desc: '100%' },
                  { value: 'lg', label: 'Large', desc: '110%' },
                  { value: 'xl', label: 'X-Large', desc: '120%' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => changeScale(s.value)}
                    className={`px-3 py-3 rounded-xl border text-center transition-all duration-150 ${
                      scale === s.value
                        ? 'border-primary-500 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Office (own office management for office accounts) */}
      {activeTab === 'office' && user?.office_id && <MyOfficeSection />}

      {/* System (Admin only) */}
      {activeTab === 'system' && isSuperadmin && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                SLA Configuration
              </h2>
            </div>
            <div className="card-body space-y-4">
              <p className="text-xs text-slate-500">
                Default processing time (in hours) applied to a routing step when its template does not specify an SLA.
                Changes apply to newly created or routed documents.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Default SLA (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={slaHours}
                    onChange={(e) => setSlaHours(Number(e.target.value))}
                  />
                </div>
                <button
                  onClick={() => slaMutation.mutate({ default_sla_hours: slaHours })}
                  disabled={slaMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {slaMutation.isPending ? 'Saving...' : 'Save SLA'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Document Retention
              </h2>
            </div>
            <div className="card-body space-y-4">
              <p className="text-xs text-slate-500">
                Attachments of completed (approved/released) documents are moved to the archive once they exceed this retention
                window. Archived files can be restored from the Storage admin page and are purged permanently after a 30-day grace period.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Retention period (months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    className="input"
                    value={retentionMonths}
                    onChange={(e) => setRetentionMonths(Number(e.target.value))}
                  />
                </div>
                <button
                  onClick={() => slaMutation.mutate({ default_sla_hours: slaHours, retention_months: retentionMonths })}
                  disabled={slaMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {slaMutation.isPending ? 'Saving...' : 'Save Retention'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                System Information
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Application</p>
                  <p className="font-medium text-slate-900">DTMS - Document Tracking and Management System</p>
                </div>
                <div>
                  <p className="text-slate-500">Environment</p>
                  <p className="font-medium text-slate-900">Local Development</p>
                </div>
                <div>
                  <p className="text-slate-500">Framework</p>
                  <p className="font-medium text-slate-900">Laravel 11 + React</p>
                </div>
                <div>
                  <p className="text-slate-500">Database</p>
                  <p className="font-medium text-slate-900">PostgreSQL</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">Philippine Government Document Tracking and Management System v1.0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Management (Superadmin only) */}
      {activeTab === 'database' && isSuperadmin && <DatabaseManagement />}
    </div>
  )
}

const OFFICE_TYPES = [
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'provincial_office', label: 'Provincial Office' },
  { value: 'fire_station', label: 'Fire Station' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
  { value: 'others', label: 'Others' },
]

function MyOfficeSection() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [unitCode, setUnitCode] = useState('')
  const [description, setDescription] = useState('')
  const [officeType, setOfficeType] = useState('')
  const [headUserId, setHeadUserId] = useState<number | ''>('')
  const selectStyles = useMemo(() => buildSelectStyles(), [])

  const officeQuery = useQuery({
    queryKey: ['my-office'],
    queryFn: () => api.get('/my-office').then((r) => r.data.office),
  })

  const personnelQuery = useQuery({
    queryKey: ['my-office-personnel'],
    queryFn: () => api.get('/personnel').then((r) => r.data),
  })

  const office = officeQuery.data
  const personnel = personnelQuery.data || []

  useEffect(() => {
    if (office) {
      setName(office.name || '')
      setUnitCode(office.unit_code || '')
      setDescription(office.description || '')
      setOfficeType(office.office_type || '')
      setHeadUserId(office.head_user_id || '')
    }
  }, [office])

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put('/my-office', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-office'] })
      queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['offices'] })
      toast.success(res.data.message || 'Office updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Save failed')
    },
  })

  const canManageChief =
    user?.role === 'superadmin' ||
    user?.role === 'office_station' ||
    (office?.head_user_id && office.head_user_id === user?.id) ||
    !office?.head_user_id

  const chiefOptions = personnel.map((p: any) => ({
    value: p.id,
    label: [p.rank, p.full_name || p.name].filter(Boolean).join(' '),
    designation: p.designation || '',
    rank: p.rank || '',
    isMember: p.office_id ? String(p.office_id) === String(office?.id) : false,
  }))

  const handleSave = () => {
    const data: any = { name, unit_code: unitCode, description, office_type: officeType }
    if (canManageChief && headUserId) data.head_user_id = headUserId
    saveMutation.mutate(data)
  }

  if (officeQuery.isLoading) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">Loading office information...</div>
      </div>
    )
  }

  if (officeQuery.isError || !office) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">
          No office is assigned to your account.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Office Information
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Code</label>
              <input className="input" value={office.code || ''} disabled />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Unit Code</label>
              <input className="input" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="e.g. 5.1a" maxLength={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Type</label>
              <select className="input" value={officeType} onChange={(e) => setOfficeType(e.target.value)}>
                <option value="">Select type...</option>
                {OFFICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Assigned Chief</label>
              {canManageChief ? (
                <Select
                  styles={selectStyles}
                  placeholder="Search and select a chief..."
                  isClearable
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  options={chiefOptions}
                  value={chiefOptions.find((o: any) => o.value === headUserId) || null}
                  onChange={(opt: any) => setHeadUserId(opt ? opt.value : '')}
                  formatOptionLabel={(option: any) => (
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {option.label}
                        {!option.isMember && (
                          <span className="ml-2 text-[10px] font-semibold text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-700/60">
                            Not a member
                          </span>
                        )}
                      </span>
                      {option.designation && (
                        <span className="text-[11px] text-slate-400">{option.designation}</span>
                      )}
                    </div>
                  )}
                />
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
                  {office.head ? [office.head.rank, office.head.full_name || office.head.name].filter(Boolean).join(' ') : '—'}
                  <span className="text-[11px] text-slate-400 ml-auto">Only the current chief can change this</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end pt-1">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn btn-primary btn-sm">
              {saveMutation.isPending ? 'Saving...' : 'Save Office'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DatabaseManagement() {
  const [busy, setBusy] = useState<string | null>(null)

  const infoQuery = useQuery({
    queryKey: ['db-info'],
    queryFn: () => api.get('/admin/database/info').then((r) => r.data),
  })

  const backupMutation = useMutation({
    mutationFn: () => api.post('/admin/database/backup'),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Backup created')
      infoQuery.refetch()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Backup failed'),
  })

  const optimizeMutation = useMutation({
    mutationFn: () => api.post('/admin/database/optimize'),
    onSuccess: (res) => toast.success(res.data.message || 'Optimized'),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Optimize failed'),
  })

  const downloadBackup = (file: string) => {
    window.open(`${api.defaults.baseURL}/admin/database/download/${encodeURIComponent(file)}`, '_blank')
  }

  const run = (id: string, fn: () => void) => {
    setBusy(id)
    fn()
    setTimeout(() => setBusy(null), 1500)
  }

  const info = infoQuery.data

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Database Management
          </h2>
        </div>
        <div className="card-body space-y-5">
          {infoQuery.isLoading && <p className="text-sm text-slate-500">Loading database info...</p>}
          {infoQuery.isError && (
            <p className="text-sm text-slate-500">Unable to load database information.</p>
          )}

          {info && (
            <>
              {/* Connection summary */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Database</p>
                  <p className="font-medium text-slate-900">{info.database}</p>
                </div>
                <div>
                  <p className="text-slate-500">Driver</p>
                  <p className="font-medium text-slate-900 uppercase">{info.driver}</p>
                </div>
                <div>
                  <p className="text-slate-500">Tables</p>
                  <p className="font-medium text-slate-900">{info.tables?.length ?? 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Last Backup</p>
                  <p className="font-medium text-slate-900">{info.last_backup || 'None'}</p>
                </div>
              </div>

              {/* Storage usage */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <HardDrive className="w-5 h-5 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Document Storage — {formatBytes(info.storage?.bytes ?? 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {info.storage?.files ?? 0} files · {info.storage?.path}
                  </p>
                </div>
              </div>

              {/* Table list */}
              <div>
                <p className="text-[13px] font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Tables &amp; Row Counts
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {(info.tables || []).map((t: any) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <span className="text-sm font-medium text-slate-900">{t.name}</span>
                      <span className="text-xs text-slate-500">{t.rows.toLocaleString()} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Backup Database</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Create a point-in-time SQL dump (pg_dump) to storage/app/backups.
              </p>
              <button
                className="btn btn-primary btn-sm w-full"
                disabled={busy === 'backup'}
                onClick={() => run('backup', () => backupMutation.mutate())}
              >
                {busy === 'backup' ? 'Backing up...' : 'Create Backup'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Optimize Database</p>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Run VACUUM ANALYZE to reclaim space and refresh query statistics.
              </p>
              <button
                className="btn btn-secondary btn-sm w-full"
                disabled={busy === 'optimize'}
                onClick={() => run('optimize', () => optimizeMutation.mutate())}
              >
                {busy === 'optimize' ? 'Optimizing...' : 'Run Optimize'}
              </button>
            </div>
          </div>

          {/* Existing backups */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <p className="text-[13px] font-bold text-slate-600 uppercase tracking-wider">
                Available Backups
              </p>
            </div>
            {info?.last_backup ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white">
                <span className="text-sm font-medium text-slate-900">{info.last_backup}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => downloadBackup(info.last_backup)}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No backups created yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TwoFactorCard() {
  const [setup, setSetup] = useState<{ secret: string; qr_svg: string } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [recovery, setRecovery] = useState<string[] | null>(null)
  const [disablePw, setDisablePw] = useState('')
  const [showDisable, setShowDisable] = useState(false)

  const statusQuery = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => api.get('/auth/2fa/status').then((r) => r.data),
  })

  const enableMutation = useMutation({
    mutationFn: () => api.post('/auth/2fa/enable'),
    onSuccess: (res) => {
      setSetup({ secret: res.data.secret, qr_svg: res.data.qr_svg })
      setConfirmCode('')
      setRecovery(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to start 2FA'),
  })

  const confirmMutation = useMutation({
    mutationFn: () => api.post('/auth/2fa/confirm', { code: confirmCode }),
    onSuccess: (res) => {
      setRecovery(res.data.recovery_codes)
      setSetup(null)
      toast.success('Two-factor authentication enabled')
      statusQuery.refetch()
    },
    onError: (e: any) => toast.error(e.response?.data?.errors?.code?.[0] || e.response?.data?.message || 'Invalid code'),
  })

  const disableMutation = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable', { password: disablePw }),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled')
      setShowDisable(false)
      setDisablePw('')
      statusQuery.refetch()
    },
    onError: (e: any) => toast.error(e.response?.data?.errors?.password?.[0] || e.response?.data?.message || 'Failed'),
  })

  const enabled = statusQuery.data?.enabled

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider truncate">Two-Factor Authentication</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${enabled ? 'bg-success-50 border-success-100 text-success-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-success-500' : 'bg-slate-400'}`} />
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="card-body space-y-4">
        {!setup && !recovery && (
          <>
            <p className="text-sm text-slate-500">
              Add extra security with an authenticator app like <span className="font-medium text-slate-700">Google Authenticator</span> or <span className="font-medium text-slate-700">Authy</span>.
            </p>
            {!enabled ? (
              <button className="btn btn-primary btn-sm" disabled={enableMutation.isPending || statusQuery.isLoading} onClick={() => enableMutation.mutate()}>
                {enableMutation.isPending ? 'Generating...' : 'Enable 2FA'}
              </button>
            ) : !showDisable ? (
              <button className="btn btn-danger btn-sm" onClick={() => setShowDisable(true)}>Disable 2FA</button>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Confirm Password to Disable</label>
                  <input type="password" className="input" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} placeholder="Your password" />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowDisable(false); setDisablePw('') }}>Cancel</button>
                  <button className="btn btn-danger btn-sm" disabled={disableMutation.isPending || !disablePw} onClick={() => disableMutation.mutate()}>
                    {disableMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {setup && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-[180px] h-[180px] p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: setup.qr_svg }} />
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Manual Key</p>
                  <code className="block break-all text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all">{setup.secret}</code>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Verification Code</label>
                  <input type="text" inputMode="numeric" maxLength={6} className="input text-center text-xl tracking-[0.4em] font-semibold" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setSetup(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" disabled={confirmMutation.isPending || confirmCode.length !== 6} onClick={() => confirmMutation.mutate()}>
                    {confirmMutation.isPending ? 'Verifying...' : 'Confirm & Enable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {recovery && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-warning-800">Save these recovery codes</p>
            <p className="text-xs text-warning-700">Each code can be used once if you lose access to your authenticator.</p>
            <div className="grid grid-cols-2 gap-2">
              {recovery.map((c) => (
                <code key={c} className="text-xs font-mono bg-white border border-warning-200 rounded px-2 py-1.5 text-center text-slate-700 select-all">{c}</code>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setRecovery(null); statusQuery.refetch() }}>I've saved them</button>
          </div>
        )}
      </div>
    </div>
  )
}
