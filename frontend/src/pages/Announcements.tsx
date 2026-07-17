import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import {
  Megaphone,
  FileText,
  Calendar,
  Building2,
  ChevronRight,
  Search,
  Plus,
  X,
  Paperclip,
  Upload
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import ModalPortal from '@/components/ModalPortal'
import { DOCUMENT_TYPES, documentTypeLabel } from '@/constants/documentOptions'

export default function Announcements() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [docType, setDocType] = useState('memorandum')
  const [files, setFiles] = useState<File[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['announcements-all'],
    queryFn: () => api.get('/documents', { params: { is_public: 1, per_page: 50 } }).then(res => res.data?.data || res.data || []),
  })

  const postMutation = useMutation({
    mutationFn: (formData: FormData) => api.post('/announcements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-all'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Announcement posted successfully!')
      setShowModal(false)
      // reset form
      setSubject('')
      setDescription('')
      setDocType('memorandum')
      setFiles([])
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to post announcement')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast.error('Subject is required')
      return
    }

    const formData = new FormData()
    formData.append('subject', subject)
    formData.append('description', description)
    formData.append('document_type', docType)
    
    files.forEach((file) => {
      formData.append('attachments[]', file)
    })

    postMutation.mutate(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const filteredAnnouncements = (data || []).filter((doc: any) =>
    doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm text-blue-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bulletin &amp; Announcements</h1>
            <p className="text-sm text-slate-500 mt-0.5">Documents posted for all-staff information and reference</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              className="input w-full pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Post Button */}
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Announcements Found</h3>
          <p className="text-sm text-slate-500 mt-1">There are no public notices or documents matching your query.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((doc: any) => (
            <div
              key={doc.id}
              className="card bg-white hover:shadow-md hover:border-blue-200 transition-all duration-200 overflow-hidden border border-slate-200 relative group"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Left Indicator */}
                <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {doc.tracking_number}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      <FileText className="w-3 h-3 text-slate-400" />
                      {documentTypeLabel(doc.document_type)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {doc.subject}
                  </h3>
                  
                  {doc.description && (
                    <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{doc.description}</p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {doc.released_at ? new Date(doc.released_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className="hidden sm:inline text-slate-300">·</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {doc.current_office?.name || doc.originator?.office?.name || 'HQ Office'}
                    </span>
                  </div>
                </div>

                {/* Arrow Link */}
                <div className="flex-shrink-0 self-end sm:self-center">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3.5 py-1.5 rounded-lg group-hover:bg-blue-100"
                  >
                    View Document
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Announcement Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <form
              onSubmit={handleSubmit}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pt-6 pb-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
                  <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Post Announcement</h3>
                    <p className="text-sm text-white/75 mt-0.5">Publish a notice directly to all active staff</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Subject / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    placeholder="Enter announcement subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                      Document Type
                    </label>
                    <select
                      className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Description / Content
                  </label>
                  <textarea
                    className="input w-full min-h-[90px] bg-slate-50/50 border-slate-200 focus:bg-white text-sm resize-none"
                    placeholder="Provide details about the announcement..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
                    Attachments
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Click to upload files</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {postMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Posting...</>
                  ) : (
                    <><Megaphone className="w-4 h-4" /> Post Now</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
