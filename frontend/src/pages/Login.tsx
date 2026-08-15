import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import api, { publicApi } from '@/services/api'
import toast from 'react-hot-toast'
import {
  Eye,
  EyeOff,
  FileText,
  Smartphone,
  ArrowLeft,
  KeyRound,
  X,
  User,
  Lock,
  CheckCircle2,
  ArrowRight,
   AlertCircle,
   AlertTriangle,
   Copy,
   MapPin,
   FilePlus2,
   Bell,
   Upload,
   Paperclip,
   Trash2,
   FileSpreadsheet,
   FileImage,
   File as FileIcon,
} from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'
import MultiSelect, { type Option } from '@/components/MultiSelect'
import SearchableSelect from '@/components/SearchableSelect'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import { useBranding } from '@/hooks/useBranding'
import { BFP_OFFICES_FALLBACK, gatewayTargetOffices } from '@/constants/documentOptions'

interface LoginForm {
  accnt_no: string
  password: string
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function fileTypeMeta(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') {
    return { icon: <FileText className="w-5 h-5" />, cls: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300', label: 'PDF' }
  }
  if (['doc', 'docx'].includes(ext)) {
    return { icon: <FileText className="w-5 h-5" />, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300', label: 'Word' }
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { icon: <FileSpreadsheet className="w-5 h-5" />, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300', label: 'Excel' }
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return { icon: <FileImage className="w-5 h-5" />, cls: 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300', label: 'Image' }
  }
  return { icon: <FileIcon className="w-5 h-5" />, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300', label: 'File' }
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPincodeModal, setShowPincodeModal] = useState(false)
  const [shaking, setShaking] = useState(false)
  const login = useAuthStore((state) => state.login)
  const verify2fa = useAuthStore((state) => state.verify2fa)
  const twoFaToken = useAuthStore((state) => state.twoFaToken)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const [searchParams] = useSearchParams()
  const [fromGateway, setFromGateway] = useState(false)
  const branding = useBranding()

  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab === 'create') {
      setFromGateway(true)
    }
  }, [searchParams])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      case 'normal':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30'
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
      case 'urgent':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/30'
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    }
  }

  const getPriorityBtn = (priority: string, isSelected: boolean) => {
    const badge = getPriorityBadge(priority)
    const ringMap: Record<string, string> = {
      low: 'ring-slate-400',
      normal: 'ring-blue-400',
      high: 'ring-amber-400',
      urgent: 'ring-red-400',
    }
    const ring = ringMap[priority] || 'ring-slate-400'
    return isSelected
      ? `${badge} ring-2 ring-offset-1 ${ring} dark:ring-offset-slate-900`
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-900 dark:text-white'
  }

  const priorityIcons: Record<string, JSX.Element> = {
    low: <FileText className="w-3.5 h-3.5" />,
    normal: <FileText className="w-3.5 h-3.5" />,
    high: <AlertTriangle className="w-3.5 h-3.5" />,
    urgent: <AlertCircle className="w-3.5 h-3.5" />,
  }

  // ============================================================
  // Create Document for Agency
  // ============================================================
  const queryClient = useQueryClient()

  const documentTypes = useDropdownGroup('document_types')
  const modes = useDropdownGroup('modes_of_transmittal')
  const priorities = useDropdownGroup('priorities')
  const agencies = useDropdownGroup('agencies')

  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [modeOfTransmittal, setModeOfTransmittal] = useState('internal')
  const [priority, setPriority] = useState('normal')
  const [ccSelection, setCcSelection] = useState<Option[]>([])
  const [bccSelection, setBccSelection] = useState<Option[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [recipientMode, setRecipientMode] = useState<'office' | 'personnel'>('office')
  const [recipientSelection, setRecipientSelection] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [agency, setAgency] = useState('')
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const [postedAt] = useState(() => new Date())
  const postedDate = postedAt.toLocaleDateString('en-CA')
  const postedTime = postedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

  const { data: officesRaw } = useQuery({
    queryKey: ['offices-min'],
    queryFn: () => publicApi.get('/offices').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const { data: personnelRaw } = useQuery({
    queryKey: ['personnel-min'],
    queryFn: () => publicApi.get('/personnel').then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const offices = Array.isArray(officesRaw) ? officesRaw : (officesRaw?.data ?? [])
  const personnel = Array.isArray(personnelRaw) ? personnelRaw : (personnelRaw?.data ?? [])
  const officeOptions: Option[] = offices.length
    ? offices.map((o: any) => {
        const name = (o.name || '')
          .replace(/^\s*\d+(?:\.\d+)?[a-z]?\s+/i, '')
          .replace(/\s+/g, ' ')
          .trim()
        const chief = (o.head?.full_name || o.head?.name || '').trim()
        const showChief = chief && chief.toLowerCase() !== name.toLowerCase()
        return { value: String(o.id), label: showChief ? `${name} - ${chief}` : name }
      })
    : BFP_OFFICES_FALLBACK
  const personnelOptions: Option[] = personnel
    .filter((p: any) => p.role !== 'superadmin' && p.role !== 'office_station' && p.role !== 'office')
    .map((p: any) => {
      const head = [p.rank, p.full_name || p.name].filter(Boolean).join(' ')
      const tail = (p.unit_assignment || p.designation || '').trim()
      const nameOnly = (p.full_name || p.name || '').trim()
      const showTail =
        tail && tail.toLowerCase() !== nameOnly.toLowerCase() && tail.toLowerCase() !== head.toLowerCase()
      return { value: String(p.id), label: showTail ? `${head} - ${tail}` : head }
    })

  const createMutation = useMutation({
    mutationFn: (formData: FormData) =>
      publicApi.post('/agency/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: (res) => {
      const trackingNumber = res.data?.tracking_number || res.data?.document?.tracking_number || 'N/A'
      setCreateSuccess(trackingNumber)
      toast.success('Document submitted! Tracking number generated.')
      queryClient.invalidateQueries({ queryKey: ['offices-min'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create document')
    },
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agency) {
      toast.error('Please select your agency')
      return
    }
    if (!subject || !documentType || !recipientSelection) {
      toast.error('Please fill in all required fields')
      return
    }
    const formData = new FormData()
    formData.append('agency', agency)
    formData.append('document_type', documentType)
    formData.append('subject', subject)
    if (modeOfTransmittal) formData.append('mode_of_transmittal', modeOfTransmittal)
    formData.append('priority', priority || 'normal')
    formData.append('recipient_type', recipientMode)
    formData.append('recipient_id', recipientSelection)
    ccSelection.forEach((o) => formData.append('cc_list[]', `${recipientMode}:${o.value}`))
    bccSelection.forEach((o) => formData.append('bcc_list[]', `${recipientMode}:${o.value}`))
    files.forEach((file) => formData.append('attachments[]', file))
    createMutation.mutate(formData)
  }

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`))
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}-${f.size}`))]
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files))
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await login(data.accnt_no || '', data.password)
      if (useAuthStore.getState().twoFaToken) {
        toast('Enter your authenticator code', { icon: '🔐' })
        return
      }
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
      setShaking(true)
      window.setTimeout(() => setShaking(false), 500)
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
{/* Left panel - Public hub (desktop only) */}
       <div className="relative hidden lg:flex w-full lg:w-[48%] bg-gradient-to-r from-white via-slate-50/90 to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/50 border-b lg:border-b-0 lg:border-r border-slate-200/70 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white p-6 lg:p-10 xl:p-14 flex-col justify-between shadow-2xl lg:shadow-none">
        {/* Color wash overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/15 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/10 pointer-events-none" />
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-0 w-72 h-72 sm:w-96 sm:h-96 bg-blue-500/15 dark:bg-blue-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 sm:w-96 sm:h-96 bg-indigo-500/15 dark:bg-indigo-400/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            mixBlendMode: 'multiply',
          }}
        />

        {/* Main Content - Routing Hub */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-lg mx-auto my-auto mt-8 mb-8 px-4">
          {fromGateway ? (
            /* ===== Create Document Form (shown when arriving via ?tab=create) ===== */
            <div className="space-y-4">
              {createSuccess ? (
                <div className="space-y-6 items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/40">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Document Submitted</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Your document has been routed to BFP internal office(s). RCS and FCOS will receive a copy.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    <span>Tracking:</span>
                    <span className="text-blue-700 dark:text-blue-300">{createSuccess}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createSuccess || '')
                        toast.success('Tracking number copied to clipboard!')
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Copy tracking number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateSuccess(null)
                      setAgency('')
                      setSubject('')
                      setDocumentType('')
                      setModeOfTransmittal('internal')
                      setPriority('normal')
                      setShowCc(false); setShowBcc(false)
                      setCcSelection([]); setBccSelection([])
                      setRecipientSelection(''); setFiles([])
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {/* Sending Agency Selector */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Sending Agency <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect options={agencies} value={agency} onChange={setAgency} placeholder="Select or type your agency..." allowCreate />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Pick from the list or type a custom agency name.</p>
                  </div>

                  {/* Post Date & Time (auto) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Date <span className="font-normal normal-case text-slate-400 dark:text-slate-500">(auto)</span>
                      </label>
                      <input
                        type="date"
                        value={postedDate}
                        disabled
                        title="Set automatically"
                        className="w-full px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Time <span className="font-normal normal-case text-slate-400 dark:text-slate-500">(auto)</span>
                      </label>
                      <input
                        type="time"
                        value={postedTime}
                        disabled
                        title="Set automatically"
                        className="w-full px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {/* Subject Field */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter document subject"
                      className="w-full px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Document Type & Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect options={documentTypes} value={documentType} onChange={setDocumentType} placeholder="Select type..." />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Mode
                      </label>
                      <SearchableSelect options={modes} value={modeOfTransmittal} onChange={setModeOfTransmittal} placeholder="Select mode..." />
                    </div>
                  </div>

                  {/* Priority Buttons */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Priority <span className="text-danger-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {priorities.map((opt) => {
                        const isSelected = priority === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPriority(opt.value)}
                            className={`p-2.5 rounded-lg border-2 text-left transition-all flex flex-col gap-0.5 ${getPriorityBtn(opt.value, isSelected)}`}
                          >
                            <div className="flex items-center gap-1.5">
                              {priorityIcons[opt.value] || <FileText className="w-3.5 h-3.5" />}
                              <p className="text-sm font-semibold">{opt.label}</p>
                            </div>
                            <p className="text-[10px] text-slate-500/70 dark:text-slate-400/70 mt-0.5 leading-tight">
                              {String(opt.meta?.desc ?? '')}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recipient Mode Toggle */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Recipient
                    </label>
                    <div className="inline-flex items-center gap-1.5 px-1 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setRecipientMode('office')}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          recipientMode === 'office'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Office
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientMode('personnel')}
                        className={`px-3 py-1.5 rounded-md transition-all ${
                          recipientMode === 'personnel'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Personnel
                      </button>
                    </div>
                  </div>

                  {/* Recipient Selection */}
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      To {recipientMode === 'office' ? 'Office' : 'Personnel'} <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={recipientMode === 'office' ? gatewayTargetOffices(officeOptions) : personnelOptions}
                      value={recipientSelection}
                      onChange={setRecipientSelection}
                      placeholder={recipientMode === 'office' ? 'Select recipient office (RCS / FCOS)...' : 'Select recipient...'}
                    />
                  </div>

                  {/* Cc/Bcc Mode Toggles */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCc((v) => !v)}
                      aria-pressed={showCc}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                        showCc
                          ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-500/50 text-sky-700 dark:text-sky-300 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-300'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      CC
                      {ccSelection.length > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {ccSelection.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBcc((v) => !v)}
                      aria-pressed={showBcc}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                        showBcc
                          ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-500/50 text-violet-700 dark:text-violet-300 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-300'
                      }`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      BCC
                      {bccSelection.length > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {bccSelection.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* CC Selection */}
                  {showCc && (
                    <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                          <Copy className="w-3.5 h-3.5" />
                          CC {recipientMode === 'office' ? 'Offices' : 'Personnel'}
                        </span>
                        {ccSelection.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCcSelection([])}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Clear
                          </button>
                        )}
                      </div>
                      <MultiSelect
                        options={recipientMode === 'office' ? officeOptions : personnelOptions}
                        value={ccSelection}
                        onChange={setCcSelection}
                        placeholder={recipientMode === 'office' ? 'Select CC offices...' : 'Select CC personnel...'}
                      />
                    </div>
                  )}

                  {/* BCC Selection */}
                  {showBcc && (
                    <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                          <EyeOff className="w-3.5 h-3.5" />
                          BCC {recipientMode === 'office' ? 'Offices' : 'Personnel'}
                        </span>
                        {bccSelection.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBccSelection([])}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Clear
                          </button>
                        )}
                      </div>
                      <MultiSelect
                        options={recipientMode === 'office' ? officeOptions : personnelOptions}
                        value={bccSelection}
                        onChange={setBccSelection}
                        placeholder={recipientMode === 'office' ? 'Select BCC offices...' : 'Select BCC personnel...'}
                      />
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="card">
                    <div className="card-header flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                          Attachments
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        {files.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFiles([])}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-danger-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear all
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        />
                      </div>
                    </div>
                    <div className="card-body">
                      <div
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`rounded-xl border-2 border-dashed px-5 py-4 flex items-center justify-center text-center transition-all ${
                          isDragging
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Drag &amp; drop files here, or use the <span className="font-medium text-primary-600 dark:text-primary-400">Upload</span> button
                        </p>
                      </div>

                      {files.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {files.map((file, index) => {
                            const ftype = fileTypeMeta(file)
                            return (
                              <div
                                key={index}
                                className="group flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                              >
                                <span className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${ftype.cls}`}>
                                  {ftype.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    {formatFileSize(file.size)} · {ftype.label}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  aria-label={`Remove ${file.name}`}
                                  className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )
                          })}
                          <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
                            {files.length} file{files.length > 1 ? 's' : ''} · Total{' '}
                            {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                          No files attached. PDF, Word, Excel, or images up to 10MB each.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateSuccess(null)
                        setAgency('')
                        setSubject('')
                        setDocumentType('')
                        setModeOfTransmittal('internal')
                        setPriority('normal')
                        setShowCc(false); setShowBcc(false)
                        setCcSelection([]); setBccSelection([])
                        setRecipientSelection(''); setFiles([])
                        setFromGateway(false)
                      }}
                      className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700"
                    >
                      Back to Hub
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="btn btn-primary btn-sm"
                    >
                      {createMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        <>
                          <FilePlus2 className="w-4 h-4" />
                          Create Document
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ===== Landing Hub ===== */
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <h1 className="text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
                  Track Any Document or Create One for Your Agency
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter a tracking number to view live status, or submit a new document on behalf of your agency — no login required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/gateway"
                  className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      Track a Document
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      No login required
                    </p>
                  </div>
                </Link>

                <Link
                  to="/create"
                  className="group flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FilePlus2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">
                      Create Document
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      For your agency
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="relative z-10 w-full max-w-lg mx-auto px-4 pb-4">
          <RecentAnnouncements />
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-200 dark:border-white/10 pt-8 mt-6 mx-auto w-full max-w-lg px-4">
          <span className="min-w-0">
            © {new Date().getFullYear()} Document Tracking System
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>SSL Encrypted</span>
          </span>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              <img
                src={branding.login_logo || '/logo.png?v=4'}
                alt="Logo"
                className="w-full h-full object-contain p-1.5"
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in with your credentials to access your workspace
              </p>
            </div>
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
            <form onSubmit={handleSubmit(onSubmit)} className={shaking ? 'space-y-4 animate-shake' : 'space-y-4'}>
              {/* Account Number Field */}
              <div className="space-y-1.5">
                <label htmlFor="accnt_no" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Account Number
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="accnt_no"
                    type="text"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono shadow-sm"
                    placeholder="e.g. P12345"
                    {...register('accnt_no', {
                      required: 'Account Number is required',
                    })}
                  />
                </div>
                {errors.accnt_no && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {errors.accnt_no.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono shadow-sm"
                    placeholder="Enter your password"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    <span>Sign in to System</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Auxiliary Links */}
          <div className="space-y-4 mt-4">
            <button
              type="button"
              onClick={() => setShowPincodeModal(true)}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition-all"
            >
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Sign in with 4-Digit PIN Code</span>
            </button>

            <div className="text-center lg:hidden">
              <Link
                to="/gateway"
                className="inline-flex items-center justify-center gap-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:scale-[1.005] transition-all"
              >
                <span>Agency Gateway</span>
              </Link>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Track documents or create new ones — no login required
              </p>
            </div>
          </div>
        </div>

      {/* PIN Code Modal */}
        {showPincodeModal && (
          <PincodeModal onClose={() => setShowPincodeModal(false)} />
        )}
      </div>
    </div>
  )
}

function PincodeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [accntNo, setAccntNo] = useState('')
  const [pincode, setPincode] = useState<string[]>(Array(4).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleDigit = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newPincode = [...pincode]
    newPincode[index] = value
    setPincode(newPincode)
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pincode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    e.preventDefault()
    const next = [...pincode]
    pasted.split('').forEach((d, i) => {
      if (i < 4) next[i] = d
    })
    setPincode(next)
    inputRefs.current[Math.min(pasted.length, 3)]?.focus()
  }

  const submitPincode = async () => {
    if (!accntNo.trim()) {
      toast.error('Enter your account number')
      return
    }
    const code = pincode.join('')
    if (code.length !== 4) {
      toast.error('Enter your 4-digit PIN')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/auth/login-pincode', { accnt_no: accntNo, pincode: code })
      const { token, user } = res.data
      useAuthStore.getState().setAuth(user, token)
      toast.success('Welcome back!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid PIN or account number')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 pt-6 pb-8 relative overflow-hidden text-white">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Sign in with PIN</h3>
                <p className="text-xs text-slate-300 mt-0.5">Enter account # and 4-digit code</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                placeholder="e.g. P12345"
                value={accntNo}
                onChange={(e) => setAccntNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 text-center">
                4-Digit PIN Code
              </label>
              <div className="flex gap-2.5 justify-center pt-1" onPaste={handlePaste}>
                {pincode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`PIN digit ${idx + 1}`}
                    className="w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white outline-none transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitPincode}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <><KeyRound className="w-3.5 h-3.5" /> Sign in with PIN</>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
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
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
          <Smartphone className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Enter the 6-digit code from your authenticator app.
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
          className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        />

        <button
          type="submit"
          disabled={isLoading || code.length !== 6}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </span>
          ) : (
            'Verify & Sign in'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to standard login
        </button>
      </form>
    </div>
  )
}

interface Announcement {
  id: number
  subject: string
  description?: string
  created_at: string
  priority?: string
}

function RecentAnnouncements() {
  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['recent-announcements-login'],
    queryFn: () => publicApi.get('/documents', {
      params: { is_public: 1, per_page: 3 }
    }).then(res => res.data?.data || res.data || []),
    staleTime: 60000,
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncate = (s: string, n: number) =>
    s.length > n ? s.slice(0, n - 3) + '…' : s

  if (!announcements?.length && !isLoading) return null

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Announcements</h3>
      </div>
      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {announcements?.slice(0, 3).map((a: Announcement) => (
              <Link
                key={a.id}
                to={`/documents/${a.id}`}
                className="block p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Bell className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {truncate(a.subject || 'Untitled', 40)}
                      </p>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {truncate(a.description, 60)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
