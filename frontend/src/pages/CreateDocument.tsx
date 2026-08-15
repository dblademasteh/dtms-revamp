import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  FileText,
  FilePlus2,
  Upload,
  X,
  UserCheck,
  Paperclip,
  Plus,
  Building2,
  Users,
  FileSpreadsheet,
  FileImage,
  File,
  Trash2,
  Shield,
} from 'lucide-react'
import MultiSelect, { type Option } from '@/components/MultiSelect'
import SearchableSelect from '@/components/SearchableSelect'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'
import { CLASSIFICATIONS } from '@/constants/documentOptions'
import {
  prioritySelectionClass,
  priorityIcon,
  classificationSelectionClass,
  classificationTextClass,
  classificationDescClass,
  classificationDesc,
  classificationWarning,
} from '@/utils/documentStyles'

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
  return { icon: <File className="w-5 h-5" />, cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300', label: 'File' }
}

export default function CreateDocument() {
  const navigate = useNavigate()
  const documentTypes = useDropdownGroup('document_types')
  const modes = useDropdownGroup('modes_of_transmittal')
  const actionOptions = useDropdownGroup('action_requested')
  const priorities = useDropdownGroup('priorities')
  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [classification, setClassification] = useState('official')
  const [modeOfTransmittal, setModeOfTransmittal] = useState('internal')
  const [actionRequested, setActionRequested] = useState<Option[]>([])
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [ccSelection, setCcSelection] = useState<Option[]>([])
  const [bccSelection, setBccSelection] = useState<Option[]>([])
  const [ccMode, setCcMode] = useState<'office' | 'personnel'>('office')
  const [bccMode, setBccMode] = useState<'office' | 'personnel'>('office')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [recipientMode, setRecipientMode] = useState<'office' | 'personnel'>('office')
  const [recipientSelection, setRecipientSelection] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: officesRaw } = useQuery({
    queryKey: ['offices-min'],
    queryFn: () => api.get('/offices').then(res => res.data),
  })
  const { data: personnelRaw } = useQuery({
    queryKey: ['personnel-min'],
    queryFn: () => api.get('/personnel').then(res => res.data),
  })
  const offices = Array.isArray(officesRaw) ? officesRaw : (officesRaw?.data ?? [])
  const personnel = Array.isArray(personnelRaw) ? personnelRaw : (personnelRaw?.data ?? [])
  const officeOptions: Option[] = offices.map((o: any) => {
    const name = (o.name || '')
      .replace(/^\s*\d+(?:\.\d+)?[a-z]?\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
    const chief = (o.head?.full_name || o.head?.name || '').trim()
    const showChief = chief && chief.toLowerCase() !== name.toLowerCase()
    return {
      value: String(o.id),
      label: showChief ? `${name} - ${chief}` : name,
    }
  })
  const personnelOptions: Option[] = personnel
    .filter((p: any) => p.role !== 'superadmin' && p.role !== 'office_station' && p.role !== 'office')
    .map((p: any) => {
      const head = [p.rank, p.full_name || p.name].filter(Boolean).join(' ')
      const tail = (p.unit_assignment || p.designation || '').trim()
      const nameOnly = (p.full_name || p.name || '').trim()
      const showTail = tail && tail.toLowerCase() !== nameOnly.toLowerCase() && tail.toLowerCase() !== head.toLowerCase()
      return {
        value: String(p.id),
        label: showTail ? `${head} - ${tail}` : head,
        meta: { desc: tail },
      }
    })

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      const tracking = res.data?.document?.tracking_number
      toast.success(tracking ? `Document created: ${tracking}` : 'Document created successfully')
      navigate(`/documents/${res.data.document.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create document')
    },
  })

  const setError = (field: string, message = '') => {
    setErrors((prev) => {
      if (!message) {
        const { [field]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [field]: message }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: Record<string, string> = {}
    if (!subject.trim()) nextErrors.subject = 'Subject is required'
    if (!documentType) nextErrors.documentType = 'Document type is required'
    if (!recipientSelection) nextErrors.recipient = 'Please select a recipient'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fill in all required fields')
      return
    }

    const formData = new FormData()
    formData.append('document_type', documentType)
    formData.append('subject', subject.trim())
    formData.append('classification', classification)
    if (modeOfTransmittal) formData.append('mode_of_transmittal', modeOfTransmittal)
    if (actionRequested.length > 0) {
      formData.append('action_requested', actionRequested[0].value)
    }
    formData.append('priority', priority || 'normal')
    formData.append('recipient_type', recipientMode)
    formData.append('recipient_id', recipientSelection)
    ccSelection.forEach(o => formData.append('cc_list[]', `${ccMode}:${o.value}`))
    bccSelection.forEach(o => formData.append('bcc_list[]', `${bccMode}:${o.value}`))
    if (description) formData.append('description', description)
    files.forEach(file => formData.append('attachments[]', file))

    createMutation.mutate(formData)
  }

  const addFiles = (incoming: File[]) => {
    setFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}:${f.size}`))
      const duplicates: string[] = []
      const merged = [...prev]
      for (const file of incoming) {
        const key = `${file.name}:${file.size}`
        if (seen.has(key)) {
          duplicates.push(file.name)
          continue
        }
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

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Documents</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1 — Document Classification */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Document Classification
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Document Type <span className="text-danger-500">*</span>
                </label>
                <SearchableSelect
                  options={documentTypes}
                  value={documentType}
                  onChange={(v) => { setDocumentType(v); if (errors.documentType) setError('documentType') }}
                  placeholder="Select type..."
                />
                {errors.documentType && <p className="text-xs text-danger-600 mt-1">{errors.documentType}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={`BFP-${new Date().getFullYear()}-XXXXXX`}
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Format sample — auto-assigned on creation</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">
                  Classification <span className="text-danger-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CLASSIFICATIONS.map((opt) => {
                    const isSelected = classification === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setClassification(opt.value); setError('classification') }}
                        className={`p-2.5 rounded-lg border-2 text-left transition-all ${classificationSelectionClass(opt.value, isSelected)}`}
                      >
                        <p className={`text-sm font-semibold ${classificationTextClass(opt.value)}`}>{opt.label}</p>
                        <p className={`text-xs leading-tight ${classificationDescClass(opt.value)}`}>
                          {classificationDesc(opt.value)}
                        </p>
                      </button>
                    )
                  })}
                </div>
                {classificationWarning(classification) ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    {classificationWarning(classification)}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Priority <span className="text-danger-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {priorities.map(opt => {
                    const isSelected = priority === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`p-2.5 rounded-lg border-2 text-left transition-all flex items-center gap-1.5 ${prioritySelectionClass(opt.value, isSelected)}`}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0">
                          {priorityIcon(opt.value)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold truncate">{opt.label}</p>
                          <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                            {String(opt.meta?.desc ?? '')}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Subject <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                maxLength={255}
                className={`input ${errors.subject ? 'border-danger-300' : ''}`}
                placeholder="Brief description of the document..."
                value={subject}
                onChange={(e) => { setSubject(e.target.value); if (errors.subject) setError('subject') }}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-danger-600">{errors.subject}</p>
                <p className="text-xs text-slate-400 ml-auto">{subject.length}/255</p>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Detailed description or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Action Requested
                </label>
                <MultiSelect
                  options={actionOptions}
                  value={actionRequested}
                  onChange={setActionRequested}
                  placeholder="Select action..."
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Mode of Transmittal
                </label>
                <SearchableSelect
                  options={modes}
                  value={modeOfTransmittal}
                  onChange={setModeOfTransmittal}
                  placeholder="Select mode..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 — Recipient Details */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Recipient Details
            </h2>
          </div>
          <div className="card-body space-y-6">
            {/* To Field */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 mb-2">
                <label className="text-[13px] font-semibold text-slate-700">To</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setRecipientMode('office'); setRecipientSelection(''); setError('recipient') }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      recipientMode === 'office'
                        ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Office
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientMode('personnel'); setRecipientSelection(''); setError('recipient') }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      recipientMode === 'personnel'
                        ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Personnel
                  </button>
                  <span className="mx-1.5 text-slate-200">|</span>
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                    >
                      <Plus className="w-3 h-3" /> Bcc
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  {recipientMode === 'office' ? (
                    <Building2 className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Users className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="pl-10">
                  <SearchableSelect
                    options={(recipientMode === 'personnel' ? personnelOptions : officeOptions).filter(
                      (o) =>
                        !ccSelection.some((c) => c.value === o.value) &&
                        !bccSelection.some((b) => b.value === o.value)
                    )}
                    value={recipientSelection}
                    onChange={(v) => { setRecipientSelection(v); if (errors.recipient) setError('recipient') }}
                    placeholder={recipientMode === 'personnel' ? 'Search personnel by name, rank, unit...' : 'Search offices...'}
                  />
                </div>
                {errors.recipient && <p className="text-xs text-danger-600 mt-1">{errors.recipient}</p>}
              </div>
            </div>

            {showCc && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">Cc</span>
                    Carbon Copy
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setCcMode('office'); setCcSelection([]) }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        ccMode === 'office'
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Building2 className="w-3 h-3" /> Office
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCcMode('personnel'); setCcSelection([]) }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        ccMode === 'personnel'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'text-slate-400 hover:text-slate-600'
                    }`}
                    >
                      <Users className="w-3 h-3" /> Personnel
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCc(false); setCcSelection([]) }}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <MultiSelect
                  options={(ccMode === 'personnel' ? personnelOptions : officeOptions).filter(
                    (o) =>
                      String(o.value) !== recipientSelection &&
                      !bccSelection.some((b) => b.value === o.value)
                  )}
                  value={ccSelection}
                  onChange={setCcSelection}
                  placeholder={ccMode === 'personnel' ? 'Search personnel...' : 'Search offices...'}
                />
              </div>
            )}

            {showBcc && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">Bcc</span>
                    Blind Carbon Copy
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setBccMode('office'); setBccSelection([]) }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        bccMode === 'office'
                          ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                          : 'text-slate-400 hover:text-slate-600'
                    }`}
                    >
                      <Building2 className="w-3 h-3" /> Office
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBccMode('personnel'); setBccSelection([]) }}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        bccMode === 'personnel'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'text-slate-400 hover:text-slate-600'
                    }`}
                    >
                      <Users className="w-3 h-3" /> Personnel
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowBcc(false); setBccSelection([]) }}
                      className="p-1 text-slate-400 hover:text-danger-600 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <MultiSelect
                  options={(bccMode === 'personnel' ? personnelOptions : officeOptions).filter(
                    (o) =>
                      String(o.value) !== recipientSelection &&
                      !ccSelection.some((c) => c.value === o.value)
                  )}
                  value={bccSelection}
                  onChange={setBccSelection}
                  placeholder={bccMode === 'personnel' ? 'Search personnel...' : 'Search offices...'}
                />
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Attachments */}
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary"
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
    </div>
  )
}
