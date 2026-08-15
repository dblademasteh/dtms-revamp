import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { X, Save, FileText, AlertTriangle, AlertCircle } from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'

const PRIORITY_STYLES: Record<string, { badgeClass: string; activeStyle: string }> = {
  low: {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    activeStyle: 'border-slate-500 bg-slate-50 dark:bg-slate-800/60 ring-2 ring-slate-400/30',
  },
  normal: {
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
    activeStyle: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400/30',
  },
  high: {
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    activeStyle: 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 ring-2 ring-amber-400/30',
  },
  urgent: {
    badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
    activeStyle: 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400/30',
  },
}

const DEFAULT_PRIORITY_STYLE = {
  badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  activeStyle: 'border-slate-500 bg-slate-50 dark:bg-slate-800/60 ring-2 ring-slate-400/30',
}

const priorityIcons: Record<string, JSX.Element> = {
  low: <FileText className="w-3.5 h-3.5" />,
  normal: <FileText className="w-3.5 h-3.5" />,
  high: <AlertTriangle className="w-3.5 h-3.5" />,
  urgent: <AlertCircle className="w-3.5 h-3.5" />,
}

export default function EditDocumentModal({
  document,
  onClose,
}: {
  document: any
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const id = document.id
  const documentTypes = useDropdownGroup('document_types')
  const classifications = useDropdownGroup('classifications')
  const modes = useDropdownGroup('modes_of_transmittal')
  const priorities = useDropdownGroup('priorities')
  const [subject, setSubject] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [priority, setPriority] = useState('normal')
  const [classification, setClassification] = useState('official')
  const [modeOfTransmittal, setModeOfTransmittal] = useState('internal')
  const [description, setDescription] = useState('')

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
      queryClient.invalidateQueries({ queryKey: ['document', String(id)] })
      onClose()
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

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit Document</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{document?.tracking_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Document Type <span className="text-danger-500">*</span>
                </label>
                <select
                  className="input"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  {documentTypes.map((type: any) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
                  {classifications.map((c: any) => (
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
                  {modes.map((m: any) => (
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {priorities.map((opt) => {
                  const style = PRIORITY_STYLES[opt.value] ?? DEFAULT_PRIORITY_STYLE
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        priority === opt.value
                          ? style.activeStyle
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {priorityIcons[opt.value] || <FileText className="w-3.5 h-3.5" />}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${style.badgeClass}`}>
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{String(opt.meta?.desc ?? '')}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
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
      </div>
    </ModalPortal>
  )
}
