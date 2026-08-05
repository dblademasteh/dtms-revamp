import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Select from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'
import { useRanks } from '@/hooks/useRanks'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
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
  const ranks = useRanks()
  const designations = useDropdownGroup('designations')
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
       doc_created: true,
     }
   )

  // Sound / Alarm State
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('dtms-sound-enabled') !== 'false'
  )
  const [selectedSound, setSelectedSound] = useState(
    () => localStorage.getItem('dtms-sound-tone') || 'chime'
  )
  const [soundVolume, setSoundVolume] = useState(
    () => Number(localStorage.getItem('dtms-sound-volume') ?? 70)
  )

  const SOUND_TONES: { id: string; label: string; desc: string; play: (vol: number) => void }[] = [
    {
      id: 'chime',
      label: 'Chime',
      desc: 'Soft high bell',
      play: (vol) => {
        const ctx = new AudioContext()
        const g = ctx.createGain(); g.gain.value = vol / 100
        g.connect(ctx.destination)
        ;[880, 1108, 1318].forEach((freq, i) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq
          o.connect(g)
          o.start(ctx.currentTime + i * 0.15)
          o.stop(ctx.currentTime + i * 0.15 + 0.3)
        })
      },
    },
    {
      id: 'ding',
      label: 'Ding',
      desc: 'Single clear bell',
      play: (vol) => {
        const ctx = new AudioContext()
        const g = ctx.createGain(); g.gain.setValueAtTime(vol / 100, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1)
        g.connect(ctx.destination)
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 1047
        o.connect(g); o.start(); o.stop(ctx.currentTime + 1)
      },
    },
    {
      id: 'pop',
      label: 'Pop',
      desc: 'Short soft pop',
      play: (vol) => {
        const ctx = new AudioContext()
        const g = ctx.createGain(); g.gain.setValueAtTime(vol / 100, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        g.connect(ctx.destination)
        const o = ctx.createOscillator(); o.type = 'sine'
        o.frequency.setValueAtTime(800, ctx.currentTime)
        o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.2)
      },
    },
    {
      id: 'alert',
      label: 'Alert',
      desc: 'Two-tone urgent',
      play: (vol) => {
        const ctx = new AudioContext()
        const g = ctx.createGain(); g.gain.value = vol / 100
        g.connect(ctx.destination)
        ;[660, 880].forEach((freq, i) => {
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq
          const og = ctx.createGain(); og.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2); og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18)
          o.connect(og); og.connect(g)
          o.start(ctx.currentTime + i * 0.2)
          o.stop(ctx.currentTime + i * 0.2 + 0.2)
        })
      },
    },
    {
      id: 'pulse',
      label: 'Pulse',
      desc: 'Repeating blip',
      play: (vol) => {
        const ctx = new AudioContext()
        for (let i = 0; i < 3; i++) {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 520
          const g = ctx.createGain()
          g.gain.setValueAtTime(vol / 100, ctx.currentTime + i * 0.22)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.22 + 0.15)
          o.connect(g); g.connect(ctx.destination)
          o.start(ctx.currentTime + i * 0.22)
          o.stop(ctx.currentTime + i * 0.22 + 0.16)
        }
      },
    },
    {
      id: 'melody',
      label: 'Melody',
      desc: 'Quick 4-note tune',
      play: (vol) => {
        const ctx = new AudioContext()
        const notes = [523, 659, 784, 1047]
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq
          const g = ctx.createGain()
          g.gain.setValueAtTime(vol / 100 * 0.7, ctx.currentTime + i * 0.12)
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25)
          o.connect(g); g.connect(ctx.destination)
          o.start(ctx.currentTime + i * 0.12)
          o.stop(ctx.currentTime + i * 0.12 + 0.26)
        })
      },
    },
  ]

  const saveSoundPrefs = (enabled: boolean, tone: string, vol: number) => {
    localStorage.setItem('dtms-sound-enabled', String(enabled))
    localStorage.setItem('dtms-sound-tone', tone)
    localStorage.setItem('dtms-sound-volume', String(vol))
    toast.success('Sound preferences saved')
  }
  const [theme, setTheme] = useState(localStorage.getItem('dtms-theme') || 'light')
  const [font, setFont] = useState(localStorage.getItem('dtms-font') || 'inter')
  const [scale, setScale] = useState(localStorage.getItem('dtms-scale') || 'md')

   const [retentionMonths, setRetentionMonths] = useState<number>(12)

   const settingsQuery = useQuery({
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
     if (settingsQuery.data) {
       setRetentionMonths(settingsQuery.data.retention_months ?? 12)
     }
   }, [settingsQuery.data])

   const settingsMutation = useMutation({
     mutationFn: (data: any) => api.put('/admin/settings', data),
     onSuccess: (res) => {
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
      {/* Designation suggestions (pick-or-type datalist) */}
      <datalist id="designation-options">
        {designations.map((d) => (
          <option key={d.value} value={d.label} />
        ))}
      </datalist>

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
        <div className="space-y-3">
          {/* Identity card — compact horizontal strip */}
          <div className="card">
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Avatar + upload — compact */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-200 dark:ring-primary-700 flex items-center justify-center">
                  {avatarPreview || user?.avatar ? (
                    <img
                      src={avatarPreview || user?.avatar || ''}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-700 dark:text-primary-300 text-xl font-bold">
                      {(user?.name?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                {avatarMutation.isPending && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Identity info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                  {[user?.rank, user?.full_name || user?.name].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {user?.designation || user?.role?.replace('_', ' ')} {(user as any)?.office?.name ? `· ${(user as any).office.name}` : ''}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {user?.accnt_no && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Acct: {user.accnt_no}</span>
                  )}
                  {user?.item_no && (
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Item: {user.item_no}</span>
                  )}
                </div>
              </div>

              {/* Upload / Remove actions — right side */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <label className="btn btn-secondary btn-sm cursor-pointer !py-1 !px-2.5 !text-xs">
                  Change Photo
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
                    className="text-[10px] text-danger-500 hover:text-danger-600"
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
            </div>
          </div>

          {/* Editable details */}
          <div className="card">
            <button
              type="button"
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center justify-between w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
            >
              <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Personal Details
              </h2>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${detailsOpen ? '' : '-rotate-90'}`}
              />
            </button>
            {detailsOpen && (
              <div className="px-4 py-3">
                <form onSubmit={handleProfileSubmit} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">First Name</label>
                      <input className="input !py-1.5 !text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Middle Name</label>
                      <input className="input !py-1.5 !text-sm" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Last Name</label>
                      <input className="input !py-1.5 !text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Display Name</label>
                      <input className="input !py-1.5 !text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Rank</label>
                      <select
                        className="input !py-1.5 !text-sm w-full"
                        value={rank}
                        onChange={(e) => setRank(e.target.value)}
                      >
                        <option value="">Select Rank...</option>
                        {ranks.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Phone</label>
                      <input type="tel" className="input !py-1.5 !text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Designation</label>
                      <input className="input !py-1.5 !text-sm" list="designation-options" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. System Administrator" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Office Assignment</label>
                    <Select
                      className="text-sm"
                      styles={buildSelectStyles()}
                      options={officeOptions}
                      isClearable
                      placeholder="Select office..."
                      value={officeId ? officeOptions.find((o: any) => o.value === officeId) : null}
                      onChange={(opt: any) => setOfficeId(opt ? opt.value : '')}
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button type="submit" disabled={profileMutation.isPending} className="btn btn-primary btn-sm !py-1 !px-3 !text-xs">
                      {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
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
              className="flex items-center justify-between w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
            >
              <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Account Information
              </h2>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${accountOpen ? '' : '-rotate-90'}`}
              />
            </button>
            {accountOpen && (
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Role</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs capitalize">{user?.status}</p>
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
                            className="w-12 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
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
        <div className="space-y-4">

          {/* Notification Types */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Notification Preferences
              </h2>
            </div>
            <div className="card-body space-y-4">
               {[
                 { key: 'doc_routed', label: 'Document routed to my office', desc: 'When a document is forwarded to your office' },
                 { key: 'doc_status', label: 'Document status changes', desc: 'When a document you created changes status' },
                 { key: 'doc_created', label: 'New document notifications', desc: 'When a new document is created in your office' },
               ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{pref.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{pref.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notifPrefs[pref.key] || false}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">
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

          {/* Sound & Alarm */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Sound &amp; Alarm
                </h2>
              </div>
              {/* Master enable toggle */}
              <div className="flex items-center gap-2">
                {['On', 'Off'].map((opt) => {
                  const val = opt === 'On'
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-xs font-medium transition-all duration-150 ${
                        soundEnabled === val
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sound-enabled"
                        checked={soundEnabled === val}
                        onChange={() => setSoundEnabled(val)}
                        className="w-3.5 h-3.5 accent-primary-500 cursor-pointer"
                      />
                      {opt}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className={`card-body space-y-5 transition-opacity duration-200 ${soundEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

              {/* Tone selector */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Notification Tone</p>
                <div className="space-y-1.5">
                  {SOUND_TONES.map((tone) => (
                    <label
                      key={tone.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150 ${
                        selectedSound === tone.id
                          ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sound-tone"
                        value={tone.id}
                        checked={selectedSound === tone.id}
                        onChange={() => {
                          setSelectedSound(tone.id)
                          tone.play(soundVolume)
                        }}
                        className="w-4 h-4 accent-primary-500 flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          selectedSound === tone.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'
                        }`}>{tone.label}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{tone.desc}</p>
                      </div>
                      {selectedSound === tone.id && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold flex-shrink-0">✓ Selected</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Volume slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume</p>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300">{soundVolume}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">🔈</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 accent-primary-500 cursor-pointer"
                  />
                  <span className="text-sm">🔊</span>
                </div>
              </div>

              {/* Preview + Save row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    const tone = SOUND_TONES.find((t) => t.id === selectedSound)
                    tone?.play(soundVolume)
                  }}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5"
                >
                  <span>▶</span> Preview Sound
                </button>
                <button
                  type="button"
                  onClick={() => saveSoundPrefs(soundEnabled, selectedSound, soundVolume)}
                  className="btn btn-primary btn-sm"
                >
                  Save Sound Settings
                </button>
              </div>
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


      {/* System (Admin only) */}
      {activeTab === 'system' && isSuperadmin && (
        <div className="space-y-6">
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
                   onClick={() => settingsMutation.mutate({ retention_months: retentionMonths })}
                   disabled={settingsMutation.isPending}
                   className="btn btn-primary btn-sm"
                 >
                   {settingsMutation.isPending ? 'Saving...' : 'Save Retention'}
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
className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-800"
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
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-800">
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
              <div className="w-[180px] h-[180px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: setup.qr_svg }} />
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
          <div className="rounded-xl border border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30 p-4 space-y-3">
            <p className="text-sm font-semibold text-warning-800">Save these recovery codes</p>
            <p className="text-xs text-warning-700">Each code can be used once if you lose access to your authenticator.</p>
            <div className="grid grid-cols-2 gap-2">
              {recovery.map((c) => (
                <code key={c} className="text-xs font-mono bg-white dark:bg-slate-800 border border-warning-200 dark:border-warning-700 rounded px-2 py-1.5 text-center text-slate-700 dark:text-slate-200 select-all">{c}</code>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setRecovery(null); statusQuery.refetch() }}>I've saved them</button>
          </div>
        )}
      </div>
    </div>
  )
}

