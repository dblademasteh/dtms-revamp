import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { publicApi } from '@/services/api'
import {
  FileText,
  CheckCircle2,
  Copy,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  FilePlus2,
  Upload,
  X,
  MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'
import MultiSelect, { type Option } from '@/components/MultiSelect'
import SearchableSelect from '@/components/SearchableSelect'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import { BFP_OFFICES_FALLBACK } from '@/constants/documentOptions'

const AGENCY_OPTIONS: Option[] = [
  { value: 'rcs', label: 'RCS - Civil Security' },
  { value: 'fcos', label: 'FCOS - Fire Code Operations' },
  { value: 'dnd', label: 'DND - National Defense' },
  { value: 'doj', label: 'DOJ - Justice' },
  { value: 'dotr', label: 'DOTr - Transportation' },
  { value: 'other', label: 'Other Agency' },
]

function getPriorityBadge(priority: string) {
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

function getPriorityBtn(priority: string, isSelected: boolean) {
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

export default function CreateDocumentPublic() {
  const queryClient = useQueryClient()

  const documentTypes = useDropdownGroup('document_types')
  const modes = useDropdownGroup('modes_of_transmittal')
  const actionOptions = useDropdownGroup('action_requested')
  const priorities = useDropdownGroup('priorities')

  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [modeOfTransmittal, setModeOfTransmittal] = useState('internal')
  const [actionRequested, setActionRequested] = useState<Option[]>([])
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [ccSelection, setCcSelection] = useState<Option[]>([])
  const [bccSelection, setBccSelection] = useState<Option[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [recipientMode, setRecipientMode] = useState<'office' | 'personnel'>('office')
  const [recipientSelection, setRecipientSelection] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [agency, setAgency] = useState('')
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      publicApi.post('/agency/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
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

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const duplicates: string[] = []
      const merged = [...prev]
      for (const file of incoming) {
        const key = `${file.name}:${file.size}`
        if (seen.has(key)) { duplicates.push(file.name); continue }
        seen.add(key)
        merged.push(file)
      }
      if (duplicates.length > 0) {
        toast.error(`Duplicate file skipped: ${duplicates.join(', ')}`)
      }
      return merged
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files))
  }

  const handleSubmit = (e: React.FormEvent) => {
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
    if (actionRequested[0]) formData.append('action_requested', actionRequested[0].value)
    formData.append('priority', priority || 'normal')
    formData.append('recipient_type', recipientMode)
    formData.append('recipient_id', recipientSelection)
    ccSelection.forEach((o) => formData.append('cc_list[]', `${recipientMode}:${o.value}`))
    bccSelection.forEach((o) => formData.append('bcc_list[]', `${recipientMode}:${o.value}`))
    if (description) formData.append('description', description)
    files.forEach((file) => formData.append('attachments[]', file))
    createMutation.mutate(formData)
  }

  const resetForm = () => {
    setCreateSuccess(null)
    setAgency('')
    setSubject('')
    setDocumentType('')
    setModeOfTransmittal('internal')
    setActionRequested([])
    setPriority('normal')
    setDescription('')
    setShowCc(false)
    setShowBcc(false)
    setCcSelection([])
    setBccSelection([])
    setRecipientSelection('')
    setFiles([])
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 lg:p-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/gateway"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Gateway</span>
          </Link>
          <Link
            to="/track"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>Public Tracking</span>
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Public Document Creation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Create Document for Agency
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Submit a new document on behalf of your agency — no login required.
          </p>
        </div>

        {/* Form / Success */}
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
              onClick={resetForm}
              className="btn btn-secondary btn-sm"
            >
              Create Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sending Agency Selector */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Sending Agency <span className="text-red-500">*</span>
              </label>
              <SearchableSelect options={AGENCY_OPTIONS} value={agency} onChange={setAgency} placeholder="Select your agency..." />
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
                options={recipientMode === 'office' ? officeOptions : personnelOptions}
                value={recipientSelection}
                onChange={setRecipientSelection}
                placeholder={recipientMode === 'office' ? 'Select recipient office...' : 'Select recipient...'}
              />
            </div>

            {/* CC / BCC */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCc}
                  onChange={(e) => setShowCc(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span>CC</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBcc}
                  onChange={(e) => setShowBcc(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span>BCC</span>
              </label>
            </div>

            {showCc && (
              <div>
                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  CC {recipientMode === 'office' ? 'Office' : 'Personnel'}
                </label>
                <MultiSelect
                  options={recipientMode === 'office' ? officeOptions : personnelOptions}
                  value={ccSelection}
                  onChange={setCcSelection}
                  placeholder={recipientMode === 'office' ? 'Select CC offices...' : 'Select CC personnel...'}
                />
              </div>
            )}

            {showBcc && (
              <div>
                <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  BCC {recipientMode === 'office' ? 'Office' : 'Personnel'}
                </label>
                <MultiSelect
                  options={recipientMode === 'office' ? officeOptions : personnelOptions}
                  value={bccSelection}
                  onChange={setBccSelection}
                  placeholder={recipientMode === 'office' ? 'Select BCC offices...' : 'Select BCC personnel...'}
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description / Action Requested
              </label>
              <div className="space-y-1.5">
                <SearchableSelect
                  options={actionOptions}
                  value={actionRequested[0]?.value || ''}
                  onChange={(val) => val ? setActionRequested([{ value: val, label: actionOptions.find((o) => String(o.value) === String(val))?.label || val }]) : setActionRequested([])}
                  placeholder="Select action..."
                  isClearable
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details or special instructions..."
                  className="w-full px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Attachments
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                />
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                  {files.length > 0 && `${files.length} file(s) selected`}
                </p>
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="ml-auto p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700"
              >
                Reset Form
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
    </div>
  )
}
