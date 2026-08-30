import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ConfirmModal'
import { useState } from 'react'
import Select from 'react-select'
import CreatableSelect from 'react-select/creatable'
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
  KeyRound,
  Building2,
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Trash2,
  Globe,
  MailCheck,
  MailWarning,
} from 'lucide-react'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatPhoneIntl(value: string): string {
  const digits = value.replace(/\D/g, '')
  let body = ''
  if (digits.startsWith('63')) body = digits.slice(2)
  else if (digits.startsWith('0')) body = digits.slice(1)
  else body = digits
  if (body.length > 10) body = body.slice(0, 10)
  if (!body) return ''
  const parts = [body.slice(0, 3), body.slice(3, 6), body.slice(6, 10)].filter(Boolean)
  return `+63 ${parts.join(' ')}`
}

export default function Settings() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
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
  const [phone, setPhone] = useState(user?.phone ? formatPhoneIntl(user.phone) : '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPincodeForm, setShowPincodeForm] = useState(false)
  const [pincodeDigits, setPincodeDigits] = useState(['', '', '', ''])
  const [confirmPincodeDigits, setConfirmPincodeDigits] = useState(['', '', '', ''])
  const [pincodePassword, setPincodePassword] = useState('')
  const [pincodeErrors, setPincodeErrors] = useState<Record<string, string>>({})
  const [showPincodePassword, setShowPincodePassword] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
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
   const [systemTitle, setSystemTitle] = useState('DTMS')
   const [systemDescription, setSystemDescription] = useState('Document Tracking & Management')
   const [loginLogo, setLoginLogo] = useState<string | null>(null)
   const [sidebarLogo, setSidebarLogo] = useState<string | null>(null)

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
       setSystemTitle(settingsQuery.data.system_title ?? 'DTMS')
       setSystemDescription(settingsQuery.data.system_description ?? 'Document Tracking & Management')
       setLoginLogo(settingsQuery.data.login_logo ?? null)
       setSidebarLogo(settingsQuery.data.sidebar_logo ?? null)
     }
   }, [settingsQuery.data])

   useEffect(() => {
     const force = new URLSearchParams(window.location.search).get('force')
     if (force === 'password') {
       toast('You must change your password before continuing.', { icon: '🔒' })
       setTimeout(() => {
         document.getElementById('change-password')?.scrollIntoView({ behavior: 'smooth' })
       }, 300)
       window.history.replaceState({}, '', window.location.pathname)
     }
   }, [])

    const settingsMutation = useMutation({
      mutationFn: (data: any) => api.put('/admin/settings', data),
      onSuccess: (res) => {
        setRetentionMonths(res.data.settings.retention_months)
        setSystemTitle(res.data.settings.system_title)
        setSystemDescription(res.data.settings.system_description)
        setLoginLogo(res.data.settings.login_logo)
        setSidebarLogo(res.data.settings.sidebar_logo)
        queryClient.invalidateQueries({ queryKey: ['branding'] })
        queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
        toast.success('Settings updated')
      },
     onError: (error: any) => {
       toast.error(error.response?.data?.message || 'Save failed')
     },
   })

   const saveBranding = () => {
     settingsMutation.mutate({
       system_title: systemTitle,
       system_description: systemDescription,
     })
   }

   const logoMutation = useMutation({
     mutationFn: ({ type, file }: { type: 'login' | 'sidebar'; file: File }) => {
       const fd = new FormData()
       fd.append('type', type)
       fd.append('logo', file)
       return api.post('/admin/branding/logo', fd, {
         headers: { 'Content-Type': 'multipart/form-data' },
       })
     },
      onSuccess: (res, vars) => {
        const url = res.data?.logo_url ?? null
        if (vars.type === 'login') setLoginLogo(url)
        else setSidebarLogo(url)
        queryClient.invalidateQueries({ queryKey: ['branding'] })
        queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
        toast.success(res.data?.message || 'Logo updated')
      },
     onError: (error: any) => {
       toast.error(error.response?.data?.message || 'Logo upload failed')
     },
   })

   const deleteLogoMutation = useMutation({
     mutationFn: (type: 'login' | 'sidebar') =>
       api.delete('/admin/branding/logo', { data: { type } }),
      onSuccess: (res, type) => {
        if (type === 'login') setLoginLogo(null)
        else setSidebarLogo(null)
        queryClient.invalidateQueries({ queryKey: ['branding'] })
        queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
        toast.success(res.data?.message || 'Logo removed')
      },
     onError: (error: any) => {
       toast.error(error.response?.data?.message || 'Remove failed')
     },
   })

  const profileMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      setUser(res.data.user)
      setTouched({})
      setProfileErrors({})
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
      setPasswordErrors({})
    },
    onError: (error: any) => {
      const msg = error.response?.data?.errors?.current_password?.[0] || error.response?.data?.message || 'Password change failed'
      setPasswordErrors({ current_password: msg })
      toast.error(msg)
    },
  })

  const pincodeMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/pincode', data),
    onSuccess: () => {
      toast.success('PIN code updated')
      setShowPincodeForm(false)
      setPincodeDigits(['', '', '', ''])
      setConfirmPincodeDigits(['', '', '', ''])
      setPincodePassword('')
      setPincodeErrors({})
      if (user) {
        setUser({ ...user, has_pincode: true })
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.errors?.current_password?.[0] || error.response?.data?.message || 'Failed to update PIN'
      setPincodeErrors({ current_password: msg })
      toast.error(msg)
    },
  })

  const isProfileDirty = useMemo(
    () =>
      firstName !== (user?.first_name || '') ||
      lastName !== (user?.last_name || '') ||
      middleName !== (user?.middle_name || '') ||
      name !== (user?.name || '') ||
      rank !== (user?.rank || '') ||
      designation !== (user?.designation || '') ||
      officeId !== (user?.office_id ? String(user.office_id) : '') ||
      phone !== (user?.phone || '') ||
      (!user?.email_verified_at && email !== (user?.email || '')),
    [firstName, lastName, middleName, name, rank, designation, officeId, phone, email, user]
  )
  const canSaveProfile = isProfileDirty && Object.keys(profileErrors).length === 0

  const requiredFields: Record<string, string> = {
    firstName: 'First name',
    lastName: 'Last name',
    name: 'Display name',
  }

  const validatePhone = (value: string) => {
    if (!value.trim()) return ''
    return /^\+63 \d{3} \d{3} \d{4}$/.test(value)
      ? ''
      : 'Enter a valid mobile number in international format (e.g. +63 912 345 6789)'
  }

  const validateField = (field: string, value: string) =>
    requiredFields[field] && !value.trim() ? `${requiredFields[field]} is required` : ''

  const onFieldBlur = (field: string, value: string) => {
    setTouched((t) => ({ ...t, [field]: true }))
    const err = field === 'phone' ? validatePhone(value) : validateField(field, value)
    setProfileErrors((prev) => {
      const next = { ...prev }
      if (err) next[field] = err
      else delete next[field]
      return next
    })
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    Object.keys(requiredFields).forEach((field) => {
      const value = field === 'firstName' ? firstName : field === 'lastName' ? lastName : name
      const err = validateField(field, value)
      if (err) errs[field] = err
    })
    const phoneErr = validatePhone(phone)
    if (phoneErr) errs.phone = phoneErr
    setProfileErrors(errs)
    setTouched({ firstName: true, lastName: true, name: true, phone: true })
    if (Object.keys(errs).length > 0) return
    profileMutation.mutate({
      name,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      rank,
      designation,
      office_id: officeId ? Number(officeId) : null,
      phone,
      ...(!user?.email_verified_at && { email: email.trim() || null }),
    })
  }

  const handleProfileReset = () => {
    setName(user?.name || '')
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setMiddleName(user?.middle_name || '')
    setRank(user?.rank || '')
    setDesignation(user?.designation || '')
    setOfficeId(user?.office_id ? String(user.office_id) : '')
    setPhone(user?.phone ? formatPhoneIntl(user.phone) : '')
    setEmail(user?.email || '')
    setTouched({})
    setProfileErrors({})
  }

  const handleAvatarSelect = (file: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }
    setAvatarPreview(URL.createObjectURL(file))
    avatarMutation.mutate(file)
  }

  const handleAvatarRemove = () => {
    if (!window.confirm('Remove your profile photo?')) return
    setAvatarPreview(null)
    if (user) setUser({ ...user, avatar: null })
    api.delete('/auth/avatar').catch(() => {})
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
       setAvatarPreview(null)
     },
  })

  const sendVerificationMutation = useMutation({
    mutationFn: () => api.post('/auth/email/verification/send'),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Verification email sent')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Could not send verification email')
    },
  })

  const [showEmailSaveConfirm, setShowEmailSaveConfirm] = useState(false)

  const emailChanged =
    !user?.email_verified_at && !!email.trim() && email.trim() !== (user?.email || '')

  const handleSendVerification = () => {
    if (emailChanged) {
      setShowEmailSaveConfirm(true)
      return
    }
    sendVerificationMutation.mutate()
  }

  const handleSaveEmailThenSend = async () => {
    setShowEmailSaveConfirm(false)
    const newEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('Enter a valid email address')
      return
    }
    try {
      await profileMutation.mutateAsync({
        name,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        rank,
        designation,
        office_id: officeId ? Number(officeId) : null,
        phone,
        email: newEmail,
      })
      sendVerificationMutation.mutate()
    } catch {
      // Error toast is shown by profileMutation's onError handler.
    }
  }


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.current_password = 'Enter your current password'
    if (!newPassword) errs.password = 'Enter a new password'
    else if (newPassword.length < 6) errs.password = 'Password must be at least 6 characters'
    if (!confirmPassword) errs.password_confirmation = 'Confirm your new password'
    else if (confirmPassword !== newPassword) errs.password_confirmation = 'Passwords do not match'
    setPasswordErrors(errs)
    if (Object.keys(errs).length > 0) return
    passwordMutation.mutate({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    })
  }

  const resetPincodeForm = () => {
    setShowPincodeForm(false)
    setPincodeDigits(['', '', '', ''])
    setConfirmPincodeDigits(['', '', '', ''])
    setPincodePassword('')
    setPincodeErrors({})
  }

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!pincodePassword) errs.current_password = 'Enter your current password'
    const pincode = pincodeDigits.join('')
    if (pincode.length !== 4) errs.pincode = 'Enter a 4-digit PIN'
    if (confirmPincodeDigits.join('') !== pincode) errs.confirm = 'PINs do not match'
    setPincodeErrors(errs)
    if (Object.keys(errs).length > 0) return
    pincodeMutation.mutate({
      current_password: pincodePassword,
      pincode,
    })
  }

  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0
    let score = 0
    if (newPassword.length >= 6) score++
    if (newPassword.length >= 10) score++
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++
    if (/\d/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++
    return Math.min(score, 5)
  }, [newPassword])

  const STRENGTH = [
    { label: '', color: '', text: '' },
    { label: 'Weak', color: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400' },
    { label: 'Weak', color: 'bg-danger-500', text: 'text-danger-600 dark:text-danger-400' },
    { label: 'Fair', color: 'bg-warning-500', text: 'text-warning-600 dark:text-warning-400' },
    { label: 'Good', color: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-400' },
    { label: 'Strong', color: 'bg-success-500', text: 'text-success-600 dark:text-success-400' },
  ]

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, admin: false },
    { id: 'security', label: 'Security', icon: Lock, admin: false },
    { id: 'notifications', label: 'Notifications', icon: Bell, admin: false },
    { id: 'appearance', label: 'Appearance', icon: Palette, admin: false },
    ...(isSuperadmin
      ? [
          { id: 'system', label: 'System', icon: SettingsIcon, admin: true },
          { id: 'database', label: 'Database', icon: Database, admin: true },
          { id: 'account', label: 'Admin Account', icon: ShieldCheck, admin: true },
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
          <div className="card overflow-hidden">
            {/* Identity header */}
            <div className="flex items-center gap-4 px-6 py-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0 group">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-200 dark:ring-primary-700 flex items-center justify-center">
                  {avatarPreview || user?.avatar ? (
                    <img
                      src={avatarPreview || user?.avatar || ''}
                      alt="Profile photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary-700 dark:text-primary-300 text-2xl font-bold">
                      {(user?.name?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                <label
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  title="Change photo"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarSelect(e.target.files?.[0] as File)}
                  />
                </label>
                {avatarMutation.isPending && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {user?.accnt_no && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Acct: {user.accnt_no}</span>
                  )}
                  {user?.item_no && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Item: {user.item_no}</span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${user?.status === 'active' ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {user?.status || 'inactive'}
                  </span>
                </div>
              </div>

              {/* Photo actions */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <label className="btn btn-secondary btn-sm cursor-pointer !py-1 !px-2.5 !text-xs">
                  Change Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarSelect(e.target.files?.[0] as File)}
                  />
                </label>
                {(user?.avatar || avatarPreview) && (
                  <button type="button" className="text-[10px] text-danger-500 hover:text-danger-600" onClick={handleAvatarRemove}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Personal details */}
            <form onSubmit={handleProfileSubmit}>
              <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="profile-first-name" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                      First Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="profile-first-name"
                      className={`input !py-1.5 !text-sm ${profileErrors.firstName && touched.firstName ? '!border-danger-400 focus:!ring-danger-500' : ''}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={(e) => onFieldBlur('firstName', e.target.value)}
                    />
                    {touched.firstName && profileErrors.firstName && (
                      <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{profileErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="profile-middle-name" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Middle Name</label>
                    <input id="profile-middle-name" className="input !py-1.5 !text-sm" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="profile-last-name" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                      Last Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="profile-last-name"
                      className={`input !py-1.5 !text-sm ${profileErrors.lastName && touched.lastName ? '!border-danger-400 focus:!ring-danger-500' : ''}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={(e) => onFieldBlur('lastName', e.target.value)}
                    />
                    {touched.lastName && profileErrors.lastName && (
                      <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{profileErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="profile-display-name" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">
                      Display Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      id="profile-display-name"
                      className={`input !py-1.5 !text-sm ${profileErrors.name && touched.name ? '!border-danger-400 focus:!ring-danger-500' : ''}`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={(e) => onFieldBlur('name', e.target.value)}
                    />
                    {touched.name && profileErrors.name && (
                      <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{profileErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="profile-rank" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Rank</label>
                    <select id="profile-rank" className="input !py-1.5 !text-sm w-full" value={rank} onChange={(e) => setRank(e.target.value)}>
                      <option value="">Select Rank...</option>
                      {ranks.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Phone</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      inputMode="tel"
                      className={`input !py-1.5 !text-sm ${profileErrors.phone && touched.phone ? '!border-danger-400 focus:!ring-danger-500' : ''}`}
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneIntl(e.target.value))}
                      onBlur={(e) => onFieldBlur('phone', e.target.value)}
                      placeholder="+63 912 345 6789"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">International format (e.g. +63 912 345 6789)</p>
                    {touched.phone && profileErrors.phone && (
                      <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{profileErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="profile-designation" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Designation</label>
                    <CreatableSelect
                      id="profile-designation"
                      className="text-sm"
                      styles={buildSelectStyles()}
                      options={designations.map((d: any) => ({ value: d.label, label: d.label }))}
                      isClearable
                      placeholder="Type or pick..."
                      value={designation ? { value: designation, label: designation } : null}
                      onChange={(opt: any) => setDesignation(opt ? (opt.label ?? '') : '')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-office" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Office Assignment</label>
                  {isSuperadmin ? (
                    <Select
                      id="profile-office"
                      className="text-sm"
                      styles={buildSelectStyles()}
                      options={officeOptions}
                      isClearable
                      placeholder="Select office..."
                      value={officeId ? officeOptions.find((o: any) => o.value === officeId) : null}
                      onChange={(opt: any) => setOfficeId(opt ? opt.value : '')}
                    />
                  ) : (
                    <div>
                      <div className="input !py-1.5 !text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate">
                        {(user as any)?.office?.name || 'No office assigned'}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Office assignment is managed by your administrator.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Email Address</label>
                  {user?.email_verified_at ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="input !py-1.5 !text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 truncate flex-1 min-w-[200px]">
                          {user?.email}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 px-2 py-1 rounded-md">
                          <MailCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                        Your email is verified and cannot be changed.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="email"
                          className={`input !py-1.5 !text-sm flex-1 min-w-[200px] ${profileErrors.email && touched.email ? '!border-danger-400 focus:!ring-danger-500' : ''}`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={(e) => {
                            setTouched((t) => ({ ...t, email: true }))
                            const val = e.target.value.trim()
                            if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                              setProfileErrors((prev) => ({ ...prev, email: 'Enter a valid email address' }))
                            } else {
                              setProfileErrors((prev) => { const n = { ...prev }; delete n.email; return n })
                            }
                          }}
                          placeholder="your.email@example.com"
                        />
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                          <MailWarning className="w-3.5 h-3.5" />
                          Not verified
                        </span>
                      </div>
                      {touched.email && profileErrors.email && (
                        <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{profileErrors.email}</p>
                      )}
                      <div className="mt-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm !py-1.5 !px-3 !text-xs"
                          onClick={handleSendVerification}
                          disabled={sendVerificationMutation.isPending || !email.trim()}
                        >
                          {sendVerificationMutation.isPending ? 'Sending...' : 'Send verification email'}
                        </button>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                          Verify your email by clicking the link sent to your inbox. Some actions may require a verified email.
                        </p>
                      </div>
                      <ConfirmModal
                        open={showEmailSaveConfirm}
                        title="Save your email first"
                        message={`Your email address isn't saved yet. Save it now and send the verification link to ${email.trim()}?`}
                        confirmLabel="Save & Send"
                        danger={false}
                        onConfirm={handleSaveEmailThenSend}
                        onCancel={() => setShowEmailSaveConfirm(false)}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
                <p role="status" className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {profileMutation.isPending ? (
                    'Saving your changes…'
                  ) : isProfileDirty ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      You have unsaved changes.
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-success-500" />
                      All changes saved.
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {isProfileDirty && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleProfileReset}>Discard</button>
                  )}
                  <button type="submit" disabled={profileMutation.isPending || !canSaveProfile} className="btn btn-primary btn-sm !py-1.5 !px-3 !text-xs">
                    {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
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
                    <PasswordField
                      id="pin-current-password"
                      label="Current Password"
                      value={pincodePassword}
                      onChange={(e) => {
                        setPincodePassword(e.target.value)
                        if (pincodeErrors.current_password) setPincodeErrors((p) => ({ ...p, current_password: '' }))
                      }}
                      show={showPincodePassword}
                      onToggleShow={() => setShowPincodePassword(!showPincodePassword)}
                      error={pincodeErrors.current_password}
                    />
                    <div>
                      <label htmlFor="pin-digits" className="block text-[13px] font-medium text-slate-700 mb-1.5">New 4-Digit PIN</label>
                      <PinInputs digits={pincodeDigits} onChange={(d) => { setPincodeDigits(d); if (pincodeErrors.pincode) setPincodeErrors((p) => ({ ...p, pincode: '' })) }} prefix="pin" autoFocusOnFirst />
                      {pincodeErrors.pincode && <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{pincodeErrors.pincode}</p>}
                    </div>
                    <div>
                      <label htmlFor="pin-confirm-digits" className="block text-[13px] font-medium text-slate-700 mb-1.5">Confirm PIN</label>
                      <PinInputs digits={confirmPincodeDigits} onChange={(d) => { setConfirmPincodeDigits(d); if (pincodeErrors.confirm) setPincodeErrors((p) => ({ ...p, confirm: '' })) }} prefix="pin-confirm" />
                      {pincodeErrors.confirm && <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{pincodeErrors.confirm}</p>}
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={resetPincodeForm}>Cancel</button>
                      <button type="submit" disabled={pincodeMutation.isPending} className="btn btn-primary btn-sm">
                        {pincodeMutation.isPending ? 'Saving...' : 'Save PIN'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="card" id="change-password">
              <div className="card-header flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Change Password</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <PasswordField
                    id="pw-current"
                    label="Current Password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      if (passwordErrors.current_password) setPasswordErrors((p) => ({ ...p, current_password: '' }))
                    }}
                    show={showCurrentPw}
                    onToggleShow={() => setShowCurrentPw(!showCurrentPw)}
                    error={passwordErrors.current_password}
                  />
                  <div>
                    <PasswordField
                      id="pw-new"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (passwordErrors.password) setPasswordErrors((p) => ({ ...p, password: '' }))
                      }}
                      show={showNewPw}
                      onToggleShow={() => setShowNewPw(!showNewPw)}
                      error={passwordErrors.password}
                    />
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? STRENGTH[passwordStrength].color : 'bg-slate-200 dark:bg-slate-700'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-medium mt-1 ${STRENGTH[passwordStrength].text}`}>{STRENGTH[passwordStrength].label}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1">At least 6 characters.</p>
                  </div>
                  <div>
                    <PasswordField
                      id="pw-confirm"
                      label="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (passwordErrors.password_confirmation) setPasswordErrors((p) => ({ ...p, password_confirmation: '' }))
                      }}
                      show={showConfirmPw}
                      onToggleShow={() => setShowConfirmPw(!showConfirmPw)}
                      error={passwordErrors.password_confirmation}
                    />
                    {confirmPassword && (
                      <p className={`text-xs mt-1 ${confirmPassword === newPassword ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                        {confirmPassword === newPassword ? 'Passwords match' : 'Passwords do not match'}
                      </p>
                    )}
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
              <Globe className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Branding
              </h2>
            </div>
            <div className="card-body space-y-6">
              <p className="text-xs text-slate-500">
                Customize the system title, description, and logos shown on the login page and the sidebar.
              </p>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    System title
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    className="input"
                    value={systemTitle}
                    onChange={(e) => setSystemTitle(e.target.value)}
                    placeholder="e.g. DTMS"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    System description
                  </label>
                  <input
                    type="text"
                    maxLength={255}
                    className="input"
                    value={systemDescription}
                    onChange={(e) => setSystemDescription(e.target.value)}
                    placeholder="e.g. Document Tracking & Management"
                  />
                </div>
              </div>
              <button
                onClick={saveBranding}
                disabled={settingsMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {settingsMutation.isPending ? 'Saving...' : 'Save Title & Description'}
              </button>

              {/* Login Logo */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Login Page Logo</p>
                <p className="text-xs text-slate-500 mb-3">Shown above the sign-in form. PNG with transparency recommended.</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {loginLogo ? (
                      <img src={loginLogo} alt="Login logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <label className="btn btn-secondary btn-sm cursor-pointer">
                      {logoMutation.isPending && logoMutation.variables?.type === 'login' ? 'Uploading...' : 'Upload Logo'}
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
                          logoMutation.mutate({ type: 'login', file })
                        }}
                      />
                    </label>
                    {loginLogo && (
                      <button
                        type="button"
                        onClick={() => deleteLogoMutation.mutate('login')}
                        disabled={deleteLogoMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Logo */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">Sidebar Logo</p>
                <p className="text-xs text-slate-500 mb-3">Shown in the sidebar and public page headers.</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {sidebarLogo ? (
                      <img src={sidebarLogo} alt="Sidebar logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <label className="btn btn-secondary btn-sm cursor-pointer">
                      {logoMutation.isPending && logoMutation.variables?.type === 'sidebar' ? 'Uploading...' : 'Upload Logo'}
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
                          logoMutation.mutate({ type: 'sidebar', file })
                        }}
                      />
                    </label>
                    {sidebarLogo && (
                      <button
                        type="button"
                        onClick={() => deleteLogoMutation.mutate('sidebar')}
                        disabled={deleteLogoMutation.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
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
                  <p className="font-medium text-slate-900">{systemTitle} - {systemDescription}</p>
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
      {activeTab === 'account' && isSuperadmin && <AdminAccountForm />}
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

  const restoreMutation = useMutation({
    mutationFn: (file: string) => api.post(`/admin/database/restore/${encodeURIComponent(file)}`),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Database restored')
      infoQuery.refetch()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Restore failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (file: string) => api.delete(`/admin/database/delete/${encodeURIComponent(file)}`),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Backup deleted')
      infoQuery.refetch()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const downloadBackup = (file: string) => {
    window.open(`${api.defaults.baseURL}/admin/database/download/${encodeURIComponent(file)}`, '_blank')
  }

  const run = (id: string, fn: () => void) => {
    setBusy(id)
    fn()
    setTimeout(() => setBusy(null), 1500)
  }

  const confirmRestore = (file: string) => {
    if (window.confirm(`Restore the database from "${file}"?\n\nThis overwrites the current data and may take a while.`)) {
      setBusy('restore')
      restoreMutation.mutate(file)
      setTimeout(() => setBusy(null), 1500)
    }
  }

  const confirmDelete = (file: string) => {
    if (window.confirm(`Delete backup "${file}"?`)) {
      deleteMutation.mutate(file)
    }
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
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
                  <p className="text-slate-500">Total Size</p>
                  <p className="font-medium text-slate-900">{formatBytes(info.size_bytes ?? 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Backups Kept</p>
                  <p className="font-medium text-slate-900">{info.retention ?? 14}</p>
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
                  Tables &amp; Row Counts (approximate)
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
                Create a compressed point-in-time dump (pg_dump) to the NAS backup folder.
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
                Available Backups ({info?.backups?.length ?? 0})
              </p>
            </div>
            {info?.backups?.length ? (
              <div className="space-y-2">
                {info?.backups.map((b: any) => (
                  <div
                    key={b.file}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-800"
                  >
                    <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{b.file}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(b.size)} · {b.format} ·{' '}
                        {new Date(b.modified_at * 1000).toLocaleString()}
                      </p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => downloadBackup(b.file)}
                      title="Download backup"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-slate-500 hover:text-blue-600"
                      onClick={() => confirmRestore(b.file)}
                      disabled={busy === 'restore'}
                      title="Restore from this backup"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-slate-400 hover:text-danger-600"
                      onClick={() => confirmDelete(b.file)}
                      title="Delete backup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-1">
                  Automatic daily backups run at 03:00 (Asia/Manila) and only the newest{' '}
                  {info?.retention ?? 14} backups are kept.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No backups created yet. Use "Create Backup" or wait for the nightly schedule.
              </p>
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
  const [confirmError, setConfirmError] = useState('')
  const [recovery, setRecovery] = useState<string[] | null>(null)
  const [disablePw, setDisablePw] = useState('')
  const [disableError, setDisableError] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

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
      setConfirmError('')
      toast.success('Two-factor authentication enabled')
      statusQuery.refetch()
    },
    onError: (e: any) => {
      setConfirmError(e.response?.data?.errors?.code?.[0] || e.response?.data?.message || 'Invalid code')
    },
  })

  const disableMutation = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable', { password: disablePw }),
    onSuccess: () => {
      toast.success('Two-factor authentication disabled')
      setShowDisable(false)
      setDisablePw('')
      setDisableError('')
      statusQuery.refetch()
    },
    onError: (e: any) => {
      setDisableError(e.response?.data?.errors?.password?.[0] || e.response?.data?.message || 'Failed')
    },
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
          <span className={`w-1.5 h-1.5 rounded-full ${statusQuery.isLoading ? 'animate-pulse bg-slate-400' : enabled ? 'bg-success-500' : 'bg-slate-400'}`} />
          {statusQuery.isLoading ? 'Checking...' : enabled ? 'Enabled' : 'Disabled'}
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
                  <label htmlFor="2fa-disable-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">Confirm Password to Disable</label>
                  <input id="2fa-disable-password" type="password" className={`input ${disableError ? 'input-error' : ''}`} value={disablePw} onChange={(e) => { setDisablePw(e.target.value); if (disableError) setDisableError('') }} placeholder="Your password" aria-invalid={!!disableError} />
                  {disableError && <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{disableError}</p>}
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
              <div className="w-[180px] h-[180px] p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden" role="img" aria-label="QR code to scan with your authenticator app" dangerouslySetInnerHTML={{ __html: setup.qr_svg }} />
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Manual Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 break-all text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all">{setup.secret}</code>
                    <button type="button" className="btn btn-ghost btn-sm flex-shrink-0" aria-label="Copy manual key" onClick={() => copyText(setup.secret, 'key', setCopied)}>
                      {copied === 'key' ? <Check className="w-3.5 h-3.5 text-success-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="2fa-confirm-code" className="block text-[13px] font-medium text-slate-700 mb-1.5">Verification Code</label>
                  <input id="2fa-confirm-code" type="text" inputMode="numeric" maxLength={6} className={`input text-center text-xl tracking-[0.4em] font-semibold ${confirmError ? 'input-error' : ''}`} value={confirmCode} onChange={(e) => { setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6)); if (confirmError) setConfirmError('') }} placeholder="••••••" aria-invalid={!!confirmError} />
                  {confirmError && <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{confirmError}</p>}
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
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyText(recovery.join('\n'), 'codes', setCopied)}>
                {copied === 'codes' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === 'codes' ? 'Copied' : 'Copy All'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setRecovery(null); statusQuery.refetch() }}>I've saved them</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminAccountForm() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [accntNo, setAccntNo] = useState(user?.accnt_no || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setErrors({})
    if (!name.trim() || !email.trim() || !accntNo.trim()) {
      setErrors({ _form: 'Name, email, and account number are required.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Enter a valid email address' })
      return
    }
    if (newPassword && newPassword.length < 6) {
      setErrors({ newPassword: 'At least 6 characters' })
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }
    try {
      setSaving(true)
      const payload: Record<string, any> = { name: name.trim(), email: email.trim(), accnt_no: accntNo.trim() }
      if (newPassword) {
        payload.current_password = currentPassword
        payload.password = newPassword
        payload.password_confirmation = confirmPassword
      }
      const res = await api.put('/auth/admin-account', payload)
      toast.success(res.data?.message || 'Admin account updated')
      setUser(res.data.user)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    } catch (e: any) {
      if (e.response?.data?.errors) {
        setErrors(e.response.data.errors)
      } else {
        toast.error(e.response?.data?.message || 'Failed to update admin account')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Admin Account</h2>
        </div>
        <div className="card-body space-y-5">
          {errors._form && <p role="alert" className="text-xs text-danger-600">{errors._form}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="admin-name" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Full Name</label>
              <input id="admin-name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              {errors.name && <p role="alert" className="text-xs text-danger-600 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="admin-email" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Email</label>
              <input id="admin-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
              {errors.email && <p role="alert" className="text-xs text-danger-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="admin-accnt" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Account Number</label>
              <input id="admin-accnt" type="text" className="input" value={accntNo} onChange={(e) => setAccntNo(e.target.value)} placeholder="e.g. ADMIN" />
              {errors.accnt_no && <p role="alert" className="text-xs text-danger-600 mt-1">{errors.accnt_no}</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-3">Change Password</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="admin-curpw" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Current Password</label>
                <input id="admin-curpw" type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="current" />
              </div>
              <div>
                <label htmlFor="admin-newpw" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">New Password</label>
                <input id="admin-newpw" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="new (min 6)" />
                {errors.newPassword && <p role="alert" className="text-xs text-danger-600 mt-1">{errors.newPassword}</p>}
              </div>
              <div>
                <label htmlFor="admin-confpw" className="block text-[11px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Confirm Password</label>
                <input id="admin-confpw" type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="confirm" />
                {errors.confirmPassword && <p role="alert" className="text-xs text-danger-600 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Leave blank to keep the current password.</p>
          </div>

          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save Admin Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function copyText(text: string, id: string, setCopied: (id: string | null) => void) {
  navigator.clipboard.writeText(text).then(
    () => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1500)
    },
    () => toast.error('Could not copy to clipboard')
  )
}

type FieldError = string | undefined

function fieldClass(error?: FieldError, extra?: string) {
  return `input ${extra || ''} ${error ? 'input-error' : ''}`.trim()
}

function PasswordField(props: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  onToggleShow: () => void
  error?: FieldError
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-[13px] font-medium text-slate-700 mb-1.5">{props.label}</label>
      <div className="relative">
        <input
          id={props.id}
          type={props.show ? 'text' : 'password'}
          autoComplete={props.autoComplete}
          className={fieldClass(props.error, 'pr-10')}
          value={props.value}
          onChange={props.onChange}
          aria-invalid={!!props.error}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          onClick={props.onToggleShow}
          aria-label={props.show ? `Hide ${props.label.toLowerCase()}` : `Show ${props.label.toLowerCase()}`}
          tabIndex={-1}
        >
          {props.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {props.error && <p role="alert" className="text-xs text-danger-600 dark:text-danger-400 mt-1">{props.error}</p>}
    </div>
  )
}

function PinInputs(props: {
  digits: string[]
  onChange: (digits: string[]) => void
  prefix: string
  autoFocusOnFirst?: boolean
}) {
  const setDigit = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return
    const next = [...props.digits]
    next[idx] = val
    props.onChange(next)
    if (val && idx < 3) document.getElementById(`${props.prefix}-${idx + 1}`)?.focus()
  }
  return (
    <div className="flex gap-2">
      {props.digits.map((digit, idx) => (
        <input
          key={idx}
          id={`${props.prefix}-${idx}`}
          type="password"
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${idx + 1} of 4`}
          className="w-12 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          value={digit}
          autoFocus={props.autoFocusOnFirst && idx === 0}
          onChange={(e) => setDigit(idx, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !props.digits[idx] && idx > 0) document.getElementById(`${props.prefix}-${idx - 1}`)?.focus()
          }}
        />
      ))}
    </div>
  )
}

