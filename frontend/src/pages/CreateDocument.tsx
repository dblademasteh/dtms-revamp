import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  FileText,
  FilePlus2,
  Upload,
  X,
  UserCheck,
  Paperclip,
  Plus,
  Building2,
  Users,
} from 'lucide-react'
import MultiSelect, { type Option } from '@/components/MultiSelect'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'



export default function CreateDocument() {
  const navigate = useNavigate()
  const documentTypes = useDropdownGroup('document_types')
  const modes = useDropdownGroup('modes_of_transmittal')
  const actionOptions = useDropdownGroup('action_requested')
  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState<Option[]>([])
  const [modeOfTransmittal, setModeOfTransmittal] = useState<Option[]>(
    modes.filter((m) => m.value === 'internal')
  )
  const [actionRequested, setActionRequested] = useState<Option[]>([])
  const [description, setDescription] = useState('')
  const [ccSelection, setCcSelection] = useState<Option[]>([])
  const [bccSelection, setBccSelection] = useState<Option[]>([])
  const [ccMode, setCcMode] = useState<'office' | 'personnel'>('office')
  const [bccMode, setBccMode] = useState<'office' | 'personnel'>('office')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [recipientMode, setRecipientMode] = useState<'office' | 'personnel'>('office')
  const [recipientSelection, setRecipientSelection] = useState<Option[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

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
      }
    })

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      toast.success('Document created. Send it to its recipient from the document page.')
      navigate(`/documents/${res.data.document.id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create document')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || documentType.length === 0 || recipientSelection.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    const formData = new FormData()
    formData.append('document_type', documentType[0].value)
    formData.append('subject', subject)
    if (modeOfTransmittal[0]) formData.append('mode_of_transmittal', modeOfTransmittal[0].value)
    if (actionRequested[0]) formData.append('action_requested', actionRequested[0].value)
    formData.append('recipient_type', recipientMode)
    formData.append('recipient_id', recipientSelection[0].value)
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

  const [refPreview] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return `BFP-${new Date().getFullYear()}-${code}`
  })
  const dateToday = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/documents')}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
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
                <MultiSelect
                  options={documentTypes}
                  value={documentType}
                  onChange={setDocumentType}
                  placeholder="Select type..."
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Reference Number
                </label>
                <input
                  type="text"
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={refPreview}
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Auto-assigned on creation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Date
                </label>
                <input
                  type="text"
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={dateToday}
                  disabled
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Time
                </label>
                <input
                  type="text"
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={timeNow}
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Subject <span className="text-danger-500">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Brief description of the document..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
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
                <MultiSelect
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-slate-700">To</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { setRecipientMode('office'); setRecipientSelection([]) }}
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
                    onClick={() => { setRecipientMode('personnel'); setRecipientSelection([]) }}
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
                  <MultiSelect
                    options={(recipientMode === 'personnel' ? personnelOptions : officeOptions).filter(
                      (o) =>
                        !ccSelection.some((c) => c.value === o.value) &&
                        !bccSelection.some((b) => b.value === o.value)
                    )}
                    value={recipientSelection}
                    onChange={setRecipientSelection}
                    placeholder={recipientMode === 'personnel' ? 'Search personnel by name, rank, unit...' : 'Search offices...'}
                  />
                </div>
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
                      !recipientSelection.some((t) => t.value === o.value) &&
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
                      !recipientSelection.some((t) => t.value === o.value) &&
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
          <div className="card-header flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Attachments
            </h2>
          </div>
          <div className="card-body">
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300'
              }`}
            >
              <Upload className={`mx-auto h-8 w-8 mb-2 ${isDragging ? 'text-primary-500' : 'text-slate-400'}`} />
              <p className="text-sm text-slate-600 mb-1">
                <label className="font-medium text-primary-600 hover:text-primary-700 cursor-pointer">
                  Click to upload
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                </label>
                {' '}or drag and drop
              </p>
              <p className="text-xs text-slate-400">
                PDF, Word, Excel, or images up to 10MB each
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
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
