import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Save,
} from 'lucide-react'
import { DOCUMENT_TYPES, CLASSIFICATIONS, MODES_OF_TRANSMITTAL } from '@/constants/documentOptions'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', desc: 'Standard processing' },
  { value: 'normal', label: 'Normal', desc: 'Default priority' },
  { value: 'high', label: 'High', desc: 'Expedited processing' },
  { value: 'urgent', label: 'Urgent', desc: 'Immediate attention' },
]

export default function EditDocument() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [priority, setPriority] = useState('normal')
  const [classification, setClassification] = useState('official')
  const [modeOfTransmittal, setModeOfTransmittal] = useState('internal')
  const [description, setDescription] = useState('')

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`).then(res => res.data),
  })

  useEffect(() => {
    if (document) {
      setSubject(document.subject || '')
      setDocumentType(document.document_type || '')
      setPriority(document.priority || 'normal')
      setClassification(document.classification || 'official')
      setModeOfTransmittal(document.mode_of_transmittal || 'internal')
      setDescription(document.description || '')
    }
  }, [document])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/documents/${id}`, data),
    onSuccess: () => {
      toast.success('Document updated successfully')
      navigate(`/documents/${id}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update document')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || !documentType) {
      toast.error('Please fill in all required fields')
      return
    }

    updateMutation.mutate({
      subject,
      document_type: documentType,
      priority,
      classification,
      mode_of_transmittal: modeOfTransmittal,
      description,
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="card p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/documents/${id}`)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Document</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {document?.tracking_number}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Document Details
            </h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Document Type <span className="text-danger-500">*</span>
                </label>
                <select
                  className="input"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Tracking Number
                </label>
                <input
                  type="text"
                  className="input bg-slate-50 text-slate-500"
                  value={document?.tracking_number || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Classification
                </label>
                <select
                  className="input"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                >
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Mode of Transmittal
                </label>
                <select
                  className="input"
                  value={modeOfTransmittal}
                  onChange={(e) => setModeOfTransmittal(e.target.value)}
                >
                  {MODES_OF_TRANSMITTAL.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
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
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priority <span className="text-danger-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      priority === opt.value
                        ? 'border-primary-500 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      priority === opt.value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Detailed description or notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/documents/${id}`)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
