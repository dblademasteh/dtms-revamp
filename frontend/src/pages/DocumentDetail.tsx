import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import ConfirmModal from '@/components/ConfirmModal'
import ModalPortal from '@/components/ModalPortal'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  Paperclip,
  AlertCircle,
  Upload,
  History,
  Printer,
  Trash2,
  Download,
  Undo2,
  MessageSquare,
  Send,
  Eye,
  X,
  ChevronDown,
  Shield,
  ChevronRight,
  Megaphone,
  Users,
  Building2,
  Clock,
  ArrowRight,
  CornerUpLeft,
  FileOutput,
  User,
  EyeOff,
  Archive,
  BadgeCheck,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  documentTypeLabel,
  classificationLabel,
  classificationBadgeClass,
  documentTypeBadgeClass,
  dispositionBadgeClass,
  statusLabel,
  transmittalLabel,
  ROUTING_DISPOSITIONS,
} from '@/constants/documentOptions'
import RoutingSlipModal from '@/components/RoutingSlipModal'
import { useDropdownGroup } from '@/hooks/useDropdownOptions'

const personLabel = (p: any) =>
  p ? [p.rank, p.full_name || p.name].filter(Boolean).join(' ') : '—'
import EditDocumentModal from '@/components/EditDocumentModal'
import MultiSelect from '@/components/MultiSelect'

export default function DocumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isSuperadmin = useAuthStore((s) => s.isSuperadmin)()
  const dispositions = useDropdownGroup('routing_dispositions')
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | 'resubmit' | 'file' | 'send' | null>(null)
  const [disposition, setDisposition] = useState('approved')
  const [remarks, setRemarks] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRecallModal, setShowRecallModal] = useState(false)
  const [showDisseminateModal, setShowDisseminateModal] = useState(false)
  const [disseminateRemarks, setDisseminateRemarks] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [recallRemarks, setRecallRemarks] = useState('')
  const [newComment, setNewComment] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewVersions, setPreviewVersions] = useState<any[]>([])
  const [loadingPreviewVersions, setLoadingPreviewVersions] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Record<number, any[]>>({})
  const [loadingVersions, setLoadingVersions] = useState<number | null>(null)
  
  const [recipientMode, setRecipientMode] = useState<'office' | 'personnel'>('personnel')

  // Sidebar panel collapse state: sectionId -> collapsed boolean
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])
  const [recipientSelection, setRecipientSelection] = useState<any[]>([])
  const [actionAttachment, setActionAttachment] = useState<File | null>(null)

  const toggleVersionHistory = async (attachment: any) => {
    if (expandedVersions[attachment.id]) {
      setExpandedVersions((prev) => {
        const next = { ...prev }
        delete next[attachment.id]
        return next
      })
      return
    }
    setLoadingVersions(attachment.id)
    try {
      const res = await api.get(`/documents/${id}/attachments/${attachment.id}/versions`)
      setExpandedVersions((prev) => ({ ...prev, [attachment.id]: res.data }))
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load version history')
    } finally {
      setLoadingVersions(null)
    }
  }

  const openPreview = async (attachment: any) => {
    setPreviewAttachment(attachment)
    setLoadingPreviewVersions(true)
    try {
      const [versionsRes, blobRes] = await Promise.all([
        api.get(`/documents/${id}/attachments/${attachment.id}/versions`),
        api.get(`/documents/${id}/attachments/${attachment.id}/download`, { responseType: 'blob' })
      ])
      setPreviewVersions(versionsRes.data)
      setPreviewUrl(window.URL.createObjectURL(new Blob([blobRes.data])))
    } catch {
      setPreviewVersions([])
      toast.error('Failed to load preview')
    } finally {
      setLoadingPreviewVersions(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewAttachment(null)
    setPreviewVersions([])
  }

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`).then(res => res.data),
  })

  const { data: acknowledgements } = useQuery({
    queryKey: ['acknowledgements', id],
    queryFn: () => api.get(`/documents/${id}/acknowledgements`).then(res => res.data),
    enabled: !!document?.require_ack || !!document?.due_at,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: () => api.post(`/documents/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgements', id] })
      toast.success('Document acknowledged')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to acknowledge'),
  })

  const myAck = (acknowledgements || []).find((a: any) => a.user_id === user?.id)
    || (user?.office_id && (acknowledgements || []).find((a: any) => !a.user_id && a.office_id === user.office_id))
  const hasAcked = !!myAck?.acknowledged_at
  const pendingAckCount = (acknowledgements || []).filter((a: any) => !a.acknowledged_at).length

  const sortedHistory = document?.routing_history 
    ? [...document.routing_history].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : []

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get('/offices').then(res => res.data),
  })

  const { data: personnelRaw } = useQuery({
    queryKey: ['personnel-min'],
    queryFn: () => api.get('/personnel').then(res => res.data),
  })

  const personnel = Array.isArray(personnelRaw) ? personnelRaw : (personnelRaw?.data ?? [])
  const personnelOptions = personnel
    .filter((p: any) => p.role !== 'superadmin' && p.role !== 'office_station' && p.role !== 'office')
    .map((p: any) => {
      const head = [p.rank, p.full_name || p.name].filter(Boolean).join(' ')
      const tail = p.unit_assignment || p.designation
      return {
        value: String(p.id),
        label: [head, tail].filter(Boolean).join(' - '),
        office_id: p.office_id ? String(p.office_id) : null
      }
    })

  const officeOptions = offices?.map((o: any) => ({
    value: String(o.id),
    label: o.name.replace(/^[\d\.]+\s*/, '')
  })) || []

  const routeMutation = useMutation({
    mutationFn: (data: any) => {
      const isFormData = data instanceof FormData
      return api.post(`/documents/${id}/route`, data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      toast.success('Document action completed successfully')
      setAction(null)
      setRemarks('')
      setActionAttachment(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Action failed')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post(`/documents/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      if (res?.data?.duplicate) {
        toast(res.data.message || 'Identical file already attached', { icon: 'âš ï¸' })
      } else {
        toast.success(res?.data?.message || 'Attachment uploaded')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed')
    },
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadMutation.mutate(e.target.files[0])
      e.target.value = ''
    }
  }

  const handleDownload = async (attachmentId: number, fileName: string) => {
    try {
      const response = await api.get(`/documents/${id}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      // Dispatch click without bubbling to prevent IDM from intercepting it
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: false,
        cancelable: true
      })
      link.dispatchEvent(clickEvent)
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      toast.error('Failed to download attachment')
    }
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast.success('Document deleted')
      navigate('/documents')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const recallMutation = useMutation({
    mutationFn: (data: any) => api.post(`/documents/${id}/recall`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      toast.success('Document recalled')
      setShowRecallModal(false)
      setRecallRemarks('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Recall failed'),
  })

  const disseminateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/documents/${id}/disseminate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      toast.success('Document disseminated to all staff!')
      setShowDisseminateModal(false)
      setDisseminateRemarks('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Dissemination failed'),
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => api.post(`/documents/${id}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] })
      setNewComment('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Comment failed'),
  })

  const selectAction = (a: 'approve' | 'reject' | 'return' | 'resubmit' | 'file' | 'send') => {
    setAction(a)
    setDisposition(
      a === 'resubmit'
        ? 'resubmitted'
        : a === 'send'
          ? 'routed'
          : (dispositions.find((d) => d.meta?.group === a)?.value ?? ROUTING_DISPOSITIONS[a][0].value)
    )
    if (a === 'approve') {
      // Forward target is optional on approval
      setRecipientSelection([])
    } else if (a === 'return' || a === 'resubmit') {
      setRecipientMode('personnel')
      
      // Attempt to prepopulate with the previous actor
      let targetUserId = null;
      if (sortedHistory.length > 0) {
        targetUserId = sortedHistory[0].actor_id;
      } else if (document?.originator_id) {
        targetUserId = document.originator_id;
      }

      if (targetUserId) {
        const opt = personnelOptions.find((p: any) => p.value === String(targetUserId));
        if (opt) {
          setRecipientSelection([opt]);
        } else {
          setRecipientSelection([]);
        }
      } else {
        setRecipientSelection([]);
      }
    } else if (a === 'send') {
      // Prepopulate with the document's stored recipient (if any)
      setRecipientSelection([])
      if (document?.recipient_type === 'office') {
        setRecipientMode('office')
        const opt = officeOptions.find((o: any) => o.value === String(document.recipient_id))
        if (opt) setRecipientSelection([opt])
      } else if (document?.recipient_type === 'personnel') {
        setRecipientMode('personnel')
        const opt = personnelOptions.find((p: any) => p.value === String(document.recipient_id))
        if (opt) setRecipientSelection([opt])
      }
    }
  }

  const isRoutingDisposition = action === 'approve' && ['forwarded', 'endorsed', 'recommended'].includes(disposition)

  const handleAction = () => {
    if (!action || !disposition) return
    if ((action === 'return' || action === 'resubmit') && !remarks) return
    
    let targetOffice = document?.current_office_id
    if (action === 'return' || action === 'resubmit' || action === 'send' || isRoutingDisposition) {
      if (recipientSelection.length === 0) {
        toast.error('Please select a recipient')
        return
      }
      if (recipientMode === 'office') {
        targetOffice = recipientSelection[0].value
      } else {
        // Personnel without an assigned office still receives the document;
        // it simply stays at its current office for tracking.
        targetOffice = recipientSelection[0].office_id || targetOffice
      }
    }

    const extra: Record<string, any> = {}
    if (action === 'return' || action === 'resubmit' || action === 'send' || isRoutingDisposition) {
      extra.recipient_type = recipientMode
      extra.recipient_id = recipientSelection[0].value
    }

    if (actionAttachment) {
      const fd = new FormData()
      fd.append('action', disposition)
      fd.append('remarks', remarks)
      if (targetOffice) fd.append('to_office_id', targetOffice)
      Object.entries(extra).forEach(([k, v]) => fd.append(k, v))
      fd.append('attachment', actionAttachment)
      routeMutation.mutate(fd)
    } else {
      routeMutation.mutate({
        action: disposition,
        remarks,
        to_office_id: targetOffice,
        ...extra,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                    <div className="h-4 flex-1 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card p-6">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="text-center py-16">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-sm font-semibold text-slate-900">Document not found</h3>
        <p className="mt-1 text-sm text-slate-500">The document you're looking for doesn't exist.</p>
        <Link to="/documents" className="btn btn-primary btn-sm mt-4 inline-flex">
          Back to Documents
        </Link>
      </div>
    )
  }

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'released':
        return 'badge-success'
      case 'approved':
        return 'badge-success'
      case 'filed':
        return 'badge-success'
      case 'received':
        return 'badge-warning'
      case 'in_review':
        return 'badge-primary'
      case 'rejected':
        return 'badge-danger'
      case 'returned':
        return 'badge-warning'
      case 'created':
        return 'badge-neutral'
      default:
        return 'badge-neutral'
    }
  }

  // Most recent return reason (if the document was returned)
  const lastReturn = (document?.routingHistory || [])
    .filter((h: any) => (h.action || '').toLowerCase() === 'returned' || (h.disposition || '').toLowerCase() === 'returned' || (h.disposition || '').toLowerCase() === 'referred')
    .sort((a: any, b: any) => new Date(b.timestamp ?? b.created_at).getTime() - new Date(a.timestamp ?? a.created_at).getTime())[0]

  // Check if current user is the main recipient and can take action
  const isMainRecipient = (() => {
    if (!document || !user) return false
    if (!['received', 'in_review', 'returned'].includes(document.status)) return false
    
    // If the document is returned for revision, it can be acted upon (resubmitted)
    // by anyone in the office it was returned to, or by its originator.
    if (document.status === 'returned') {
      if (user.office_id && document.current_office_id === user.office_id) return true
      if (document.originator_id === user.id) return true
      return false
    }

    // For active documents (pending/in_review)
    // If sent to a specific personnel, only they can act
    if (document.recipient_type === 'personnel') {
      return document.recipient_id === user.id
    }
    
    // If sent to an office, anyone in that office can act
    if (document.recipient_type === 'office') {
      return user.office_id === document.recipient_id
    }
    
    return false
  })()

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>${document.tracking_number} - ${document.subject}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
        .field { display: flex; gap: 8px; margin-bottom: 6px; font-size: 13px; }
        .label { font-weight: 600; min-width: 140px; color: #475569; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-primary { background: #dbeafe; color: #1e40af; }
        .badge-neutral { background: #f1f5f9; color: #475569; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h1>${document.subject}</h1>
          <p style="color:#64748b;font-size:14px;font-family:monospace;">${document.tracking_number}</p>
        </div>
        <span class="badge ${statusBadgeClass(document.status)}">${statusLabel(document.status)}</span>
      </div>
      <h2>Document Details</h2>
       <div class="field"><span class="label">Type:</span> ${documentTypeLabel(document.document_type)}</div>
       <div class="field"><span class="label">Classification:</span> ${classificationLabel(document.classification)}</div>
       <div class="field"><span class="label">Mode of Transmittal:</span> ${transmittalLabel(document.mode_of_transmittal)}</div>
       <div class="field"><span class="label">Priority:</span> ${document.priority}</div>
      <div class="field"><span class="label">Originator:</span> ${personLabel(document.originator)}</div>
       <div class="field"><span class="label">Current Office:</span> ${document.current_office?.name}</div>
       ${document.description ? `<div class="field"><span class="label">Description:</span> ${document.description}</div>` : ''}
      ${sortedHistory.length > 0 ? `
      <h2>Routing History</h2>
      <table>
        <tr><th>Date</th><th>Actor</th><th>Action</th><th>From</th><th>To</th><th>Remarks</th></tr>
        ${sortedHistory.map((h: any) => `
          <tr>
            <td>${new Date(h.timestamp).toLocaleString()}</td>
            <td>${h.actor?.name || '-'}</td>
            <td>${h.action}</td>
            <td>${h.fromOffice?.name || '-'}</td>
            <td>${h.toOffice?.name || '-'}</td>
            <td>${h.remarks || '-'}</td>
          </tr>
        `).join('')}
      </table>` : ''}
      <div style="margin-top:32px;text-align:center;color:#94a3b8;font-size:11px;">
        Generated by DTMS on ${new Date().toLocaleString()}
      </div>
      </body></html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 200)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/documents"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {document.subject}
              </h1>
              <span className={`badge ${statusBadgeClass(document.status)}`}>
                {statusLabel(document.status)}
              </span>
              {document.is_public && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  <Megaphone className="w-3 h-3" /> Public
                </span>
              )}
              <span className={`badge ${documentTypeBadgeClass(document.document_type)}`}>
                {documentTypeLabel(document.document_type)}
              </span>
              <span className={`badge ${classificationBadgeClass(document.classification)}`}>
                {classificationLabel(document.classification)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wide text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2.5 py-1 rounded border border-primary-200 dark:border-primary-700/60 shadow-sm inline-block">
                {document.tracking_number}
              </span>
              {document.document_no && (
                <span className="font-mono text-xs font-bold tracking-wide text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 inline-block">
                  {document.document_no}
                </span>
              )}
              {document.due_at && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border ${
                    new Date(document.due_at).getTime() < Date.now()
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  }`}
                  title={`Due ${new Date(document.due_at).toLocaleString('en-PH')}`}
                >
                  <Clock className="w-3 h-3" />
                  {new Date(document.due_at).getTime() < Date.now()
                    ? `Overdue · ${new Date(document.due_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`
                    : `Due ${new Date(document.due_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                </span>
              )}
            </div>
          </div>
        </div>
          <div className="flex items-center gap-2">
            {document.require_ack && (
              <button
                onClick={() => acknowledgeMutation.mutate()}
                disabled={hasAcked || acknowledgeMutation.isPending}
                className={`btn btn-sm ${hasAcked ? 'btn-ghost text-emerald-600' : 'btn-primary'}`}
              >
                <BadgeCheck className="w-4 h-4" />
                {hasAcked ? 'Acknowledged' : 'Acknowledge'}
                {pendingAckCount > 0 && !hasAcked && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">
                    {pendingAckCount}
                  </span>
                )}
              </button>
            )}
            <button onClick={() => setShowEditModal(true)} className="btn btn-secondary btn-sm">
              <FileText className="w-4 h-4" /> Edit
            </button>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await api.get(`/documents/${id}/pdf`, { responseType: 'blob' })
                  const url = window.URL.createObjectURL(new Blob([res.data]))
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${document.tracking_number}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  window.URL.revokeObjectURL(url)
                } catch (e: any) {
                  toast.error(e.response?.data?.message || 'Failed to download PDF')
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => setShowSlipModal(true)} className="btn btn-secondary btn-sm">
              <FileText className="w-4 h-4" /> Routing Slip
            </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Details — Sender / Receiver panels */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Document Details
              </h2>
            </div>
            <div className="card-body">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sender Panel */}
                  <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-blue-100/50">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                        <Send className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-blue-900 tracking-wide uppercase">Origin / Sender</h3>
                    </div>
                    <dl className="space-y-2">
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Originator</dt>
                          <dd className="text-sm font-semibold text-slate-800">
                            {personLabel(document.originator)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Office</dt>
                          <dd className="text-sm font-semibold text-slate-800">
                            {document.originator?.office?.name || document.current_office?.name || '—'}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <BadgeCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</dt>
                          <dd className="text-sm font-semibold text-slate-800">
                            {document.originator?.designation || '—'}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <Send className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Mode of Transmittal</dt>
                          <dd className="text-sm font-semibold text-slate-800">
                            {transmittalLabel(document.mode_of_transmittal)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Type</dt>
                          <dd className="text-sm font-semibold text-slate-800">
                            {documentTypeLabel(document.document_type)}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
                        <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-blue-400 shadow-sm border border-blue-50 dark:border-blue-900/50 flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Priority</dt>
                          <dd className="text-sm font-semibold text-slate-800 capitalize">
                            {document.priority}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>

                  {/* Receiver Panel */}
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-emerald-100/50">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-emerald-900 tracking-wide uppercase">Destination / Receiver</h3>
                    </div>
                    <dl className="space-y-2">
                      {document.recipient_type && (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                          <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Recipient ({document.recipient_type})
                            </dt>
                            <dd className="text-sm font-semibold text-slate-800">
                              {personLabel(document.recipient)}
                            </dd>
                          </div>
                        </div>
                      )}
                      {document.recipient_type === 'personnel' && document.recipient && (
                        <>
                          <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                            <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                              <BadgeCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</dt>
                              <dd className="text-sm font-semibold text-slate-800">
                                {document.recipient?.designation || '—'}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                            <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                              <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Office</dt>
                              <dd className="text-sm font-semibold text-slate-800">
                                {document.recipient?.office?.name || document.current_office?.name || '—'}
                              </dd>
                            </div>
                          </div>
                        </>
                      )}
                      {document.recipient_type === 'office' && document.recipient && (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                          <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Destination Office</dt>
                            <dd className="text-sm font-semibold text-slate-800">
                              {document.recipient?.name || '—'}
                            </dd>
                          </div>
                        </div>
                      )}
                      {document.cc_users && document.cc_users.length > 0 && (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                          <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              CC (Carbon Copy)
                            </dt>
                            <dd className="text-sm font-semibold text-slate-800">
                              {document.cc_users.map((u: any) => personLabel(u)).join(', ')}
                            </dd>
                          </div>
                        </div>
                      )}
                      {document.bcc_users && document.bcc_users.length > 0 && (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50/50 transition-colors">
                          <div className="p-1.5 rounded-md bg-white dark:bg-slate-800 text-emerald-400 shadow-sm border border-emerald-50 dark:border-emerald-900/50 flex-shrink-0 mt-0.5">
                            <EyeOff className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              BCC (Blind Carbon Copy)
                            </dt>
                            <dd className="text-sm font-semibold text-slate-800">
                              {user?.role === 'superadmin' || document.originator_id === user?.id
                                ? document.bcc_users.map((u: any) => personLabel(u)).join(', ')
                                : '***'}
                            </dd>
                          </div>
                        </div>
                      )}
                     </dl>
                  </div>
                </div>

              {document.description && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Description</dt>
                  <dd className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                    {document.description}
                  </dd>
                </div>
              )}
            </div>
          </div>

          {/* Routing History */}
          <div className="card border-0 shadow-sm ring-1 ring-slate-200">
            <div className="card-header bg-slate-50 border-b border-slate-100 py-4 px-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                Routing History
              </h2>
            </div>
            <div className="card-body p-6">
              {sortedHistory.length > 0 ? (
                <div className="relative">
                  {/* Premium Timeline line */}
                  <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary-200 via-slate-200 to-transparent" />

                  <div className="space-y-8">
                    {sortedHistory.map((history: any, index: number) => {
                      const isLatest = index === 0;
                      const action = (history.disposition || history.action)?.toLowerCase() || ''
                      
                      let Icon = Clock
                      let iconColor = 'text-slate-400 bg-slate-50 border-slate-200'
                      
                      if (action.includes('creat')) { Icon = FileText; iconColor = 'text-blue-500 bg-blue-50 border-blue-200' }
                      else if (action.includes('rout') || action.includes('forward')) { Icon = Send; iconColor = 'text-indigo-500 bg-indigo-50 border-indigo-200' }
                      else if (action.includes('approv')) { Icon = CheckCircle; iconColor = 'text-emerald-500 bg-emerald-50 border-emerald-200' }
                      else if (action.includes('reject')) { Icon = XCircle; iconColor = 'text-red-500 bg-red-50 border-red-200' }
                      else if (action.includes('return') || action.includes('recall')) { Icon = CornerUpLeft; iconColor = 'text-amber-500 bg-amber-50 border-amber-200' }
                      else if (action.includes('releas')) { Icon = FileOutput; iconColor = 'text-teal-500 bg-teal-50 border-teal-200' }

                      return (
                        <div key={history.id} className="relative flex gap-6 group">
                          {/* Timeline node */}
                          <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${iconColor}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            {isLatest && (
                               <span className="absolute -inset-1.5 rounded-full border border-primary-400 animate-ping opacity-30"></span>
                            )}
                          </div>

                          {/* Content Card */}
                          <div className={`flex-1 min-w-0 bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all hover:shadow-md ${isLatest ? 'border-primary-200 dark:border-primary-700 shadow-sm ring-1 ring-primary-500/10' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${dispositionBadgeClass(history.disposition || history.action)}`}>
                                    {history.disposition || history.action}
                                  </span>
                                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(history.timestamp).toLocaleString(undefined, { 
                                      dateStyle: 'medium', 
                                      timeStyle: 'short' 
                                    })}
                                  </span>
                                </div>
                                <h3 className="text-[15px] font-semibold text-slate-900">
                                  {history.actor?.id ? personLabel(history.actor) : 'System'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {[history.actor?.role?.replace('_', ' '), history.fromOffice?.name].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' • ')}
                                </p>
                              </div>
                            </div>
                            
                            {/* Movement (From -> To) */}
                            {(history.fromOffice || history.toOffice) && (
                               <div className="flex items-center gap-3 py-2 px-3 bg-slate-50/80 rounded-lg text-sm border border-slate-100 mb-3">
                                 {history.fromOffice && (
                                   <div className="flex-1 min-w-0 truncate font-medium text-slate-600">
                                     {history.fromOffice.name}
                                   </div>
                                 )}
                                 {(history.fromOffice && history.toOffice) && (
                                   <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                 )}
                                 {history.toOffice && (
                                   <div className="flex-1 min-w-0 truncate font-medium text-primary-700 dark:text-primary-300">
                                     {history.toOffice.name}
                                   </div>
                                 )}
                               </div>
                            )}

                            {/* Remarks */}
                            {history.remarks && (
                              <div className="text-sm text-slate-700 bg-amber-50/50 border border-amber-100/50 p-3 rounded-lg flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed">{history.remarks}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                  <History className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-900">No Routing History</h3>
                  <p className="text-sm text-slate-500 mt-1">This document hasn't been routed yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

{/* Sidebar */}
<div className="space-y-6">
{/* Acknowledgements */}
{document.require_ack && acknowledgements?.length > 0 && (
<div className="card">
<div className="card-header">
<h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Acknowledgements</h2>
</div>
<div className="card-body space-y-2">
<div className="flex items-center justify-between text-xs">
<span className="text-slate-500">Pending</span>
<span className="font-bold text-amber-600">{pendingAckCount}</span>
</div>
<div className="flex items-center justify-between text-xs">
<span className="text-slate-500">Acknowledged</span>
<span className="font-bold text-emerald-600">{acknowledgements.length - pendingAckCount}</span>
</div>
<div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto">
{acknowledgements.map((a: any) => (
<div key={a.id} className="flex items-start justify-between gap-2 text-xs">
<div className="min-w-0">
<p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
{a.user ? [a.user.rank, a.user.full_name || a.user.name].filter(Boolean).join(' ') : a.office?.name || 'Office'}
</p>
<p className="text-[11px] text-slate-400">
{a.user ? 'Personnel' : 'Office'}
</p>
</div>
{a.acknowledged_at ? (
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold whitespace-nowrap">
<BadgeCheck className="w-3 h-3" />
{new Date(a.acknowledged_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
</span>
) : (
<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold whitespace-nowrap">
Pending
</span>
)}
</div>
))}
</div>
</div>
</div>
)}
{/* Actions */}
<div className="card" id="sidebar-actions">
<div className="card-header">
<button
type="button"
onClick={() => toggleCollapse('actions')}
className="flex items-center justify-between w-full text-left"
>
<h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Actions</h2>
{!collapsedSections['actions'] ? (
<ChevronDown className="w-4 h-4 text-slate-400" />
) : (
<ChevronRight className="w-4 h-4 text-slate-400" />
)}
</button>
</div>
{collapsedSections['actions'] ? null : (
<div className="card-body space-y-2.5">
              {document.status === 'created' && (user?.role === 'superadmin' || document.originator_id === user?.id) ? (
                <>
                  <button
                    onClick={() => selectAction('send')}
                    className="w-full btn btn-primary"
                  >
                    <Send className="w-4 h-4" />
                    Send Document
                  </button>
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    This document is still with your office. Send it to route it to its recipient.
                  </p>
                </>
              ) : isMainRecipient ? (
                <>
                  {document.status === 'returned' ? (
                    <>
                      {lastReturn && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-left">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                            Reason for Return
                          </p>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            {lastReturn.remarks || 'No reason provided.'}
                          </p>
                          <p className="text-[11px] text-amber-500 mt-1">
                            Returned by {lastReturn.actor?.id ? personLabel(lastReturn.actor) : '—'}
                            {lastReturn.fromOffice?.name && <> • {lastReturn.fromOffice.name}</>}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => selectAction('resubmit')}
                        className="w-full btn btn-primary"
                      >
                        <Send className="w-4 h-4" />
                        Resubmit Document
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => selectAction('approve')}
                        className="w-full btn btn-success"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Document
                      </button>
                      <button
                        onClick={() => selectAction('reject')}
                        className="w-full btn btn-danger"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                      <button
                        onClick={() => selectAction('return')}
                        className="w-full btn btn-secondary"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Return for Revision
                      </button>
                    </>
                  )}
                </>
              ) : document.status === 'released' ? (
                <button
                  onClick={() => selectAction('file')}
                  className="w-full btn btn-primary"
                >
                  <Archive className="w-4 h-4" />
                  File Document
                </button>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  {document.status === 'approved' ? (
                    <span className="text-green-600 font-medium">This document has been approved</span>
                  ) : document.status === 'rejected' ? (
                    <span className="text-red-600 font-medium">This document has been declined</span>
                  ) : document.status === 'filed' ? (
                    <span className="text-slate-600 font-medium">This document has been filed</span>
                  ) : (
                    'You are viewing this document as a CC recipient'
                  )}
                </p>
              )}
              {['received', 'in_review', 'returned', 'released'].includes(document.status) && (user?.role === 'superadmin' || user?.role === 'fcos' || document.originator_id === user?.id) && (
                <button
                  onClick={() => setShowRecallModal(true)}
                  className="w-full btn btn-warning"
                >
                  <Undo2 className="w-4 h-4" />
                  Recall Document
                </button>
              )}

              {document.is_public && (
                <div className="flex items-center gap-2 justify-center px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold">
                  <Megaphone className="w-4 h-4" />
                  Posted for all staff
                </div>
              )}
              {(user?.role === 'superadmin' || document.originator_id === user?.id) && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full btn btn-danger-outline"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Document
                </button>
)}
</div>
)}
</div>

{/* Action Modal */}
          {action && (() => {
            const cfg = {
              approve: {
                gradient: 'from-emerald-500 to-teal-600',
                lightBg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-emerald-700',
                icon: CheckCircle,
                label: 'Approve Document',
                subtitle: 'Confirm your approval and choose the disposition',
                btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                confirmLabel: 'Approve',
              },
              reject: {
                gradient: 'from-red-500 to-rose-600',
                lightBg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                icon: XCircle,
                label: 'Decline Document',
                subtitle: 'This action will decline the document',
                btnClass: 'bg-red-600 hover:bg-red-700 text-white',
                confirmLabel: 'Decline',
              },
              return: {
                gradient: 'from-amber-500 to-orange-500',
                lightBg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-700',
                icon: CornerUpLeft,
                label: 'Return Document',
                subtitle: 'Return this document for revision',
                btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
                confirmLabel: 'Return',
              },
              resubmit: {
                gradient: 'from-indigo-500 to-blue-600',
                lightBg: 'bg-indigo-50',
                border: 'border-indigo-200',
                text: 'text-indigo-700',
                icon: Send,
                label: 'Resubmit Document',
                subtitle: 'Resubmit this document with revisions applied',
                btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
                confirmLabel: 'Resubmit',
              },
              file: {
                gradient: 'from-slate-600 to-slate-800',
                lightBg: 'bg-slate-100',
                border: 'border-slate-300',
                text: 'text-slate-700',
                icon: Archive,
                label: 'File Document',
                subtitle: 'Mark this document as filed and close it out',
                btnClass: 'bg-slate-700 hover:bg-slate-800 text-white',
                confirmLabel: 'File',
              },
              send: {
                gradient: 'from-blue-500 to-indigo-600',
                lightBg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-blue-700',
                icon: Send,
                label: 'Send Document',
                subtitle: 'Route this document to its recipient',
                btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
                confirmLabel: 'Send',
              },
            }[action]
            const ActionIcon = cfg.icon

            return (
              <ModalPortal>
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setAction(null); setRemarks('') }} />
                  <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Gradient Header */}
                    <div className={`bg-gradient-to-br ${cfg.gradient} px-6 pt-6 pb-8 relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
                        <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white" />
                      </div>
                      <button
                        onClick={() => { setAction(null); setRemarks('') }}
                        className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                          <ActionIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{cfg.label}</h3>
                          <p className="text-sm text-white/75 mt-0.5">{cfg.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 -mt-3 space-y-5">

                      {/* Disposition — card grid for approve, dropdown for others */}
                      {action === 'approve' ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            Disposition
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {dispositions.filter((d) => d.meta?.group === 'approve').map((d) => {
                              const isSelected = disposition === d.value
                              return (
                                <button
                                  key={d.value}
                                  type="button"
                                  onClick={() => setDisposition(d.value)}
                                  className={`relative py-2.5 px-3 rounded-xl border-2 text-sm font-semibold text-center transition-all ${
                                    isSelected
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                                  )}
                                  {d.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : action === 'reject' || action === 'return' ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            Disposition
                          </label>
                          <select
                            className="input w-full bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                            value={disposition}
                            onChange={(e) => setDisposition(e.target.value)}
                          >
                            {dispositions.filter((d) => d.meta?.group === (action as 'reject' | 'return')).map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : action === 'file' ? (
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${cfg.lightBg} border ${cfg.border}`}>
                          <Archive className={`w-5 h-5 ${cfg.text}`} />
                          <div>
                            <p className={`text-sm font-semibold ${cfg.text}`}>Filing document</p>
                            <p className="text-xs text-slate-500 mt-0.5">Document will be marked as filed</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${cfg.lightBg} border ${cfg.border}`}>
                          <Send className={`w-5 h-5 ${cfg.text}`} />
                          <div>
                            <p className={`text-sm font-semibold ${cfg.text}`}>Resubmitting document</p>
                            <p className="text-xs text-slate-500 mt-0.5">Document will be forwarded back for review</p>
                          </div>
                        </div>
                      )}

                      {/* Return/Resubmit/Send/Approve-forward recipient */}
                      {(action === 'approve' ? isRoutingDisposition : action === 'return' || action === 'resubmit' || action === 'send') && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                              {action === 'approve' ? 'Forward To' : action === 'return' ? 'Return To' : action === 'resubmit' ? 'Resubmit To' : 'Send To'}
                            </label>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <button
                                type="button"
                                onClick={() => { setRecipientMode('office'); setRecipientSelection([]) }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                  recipientMode === 'office'
                                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                Office
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRecipientMode('personnel'); setRecipientSelection([]) }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                  recipientMode === 'personnel'
                                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <Users className="w-3.5 h-3.5" />
                                Personnel
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                              {recipientMode === 'office' ? (
                                <Building2 className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Users className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="pl-10">
                              <MultiSelect
                                options={recipientMode === 'personnel' ? personnelOptions : officeOptions}
                                value={recipientSelection}
                                onChange={setRecipientSelection}
                                placeholder={recipientMode === 'personnel' ? 'Search personnel...' : 'Search offices...'}
                              />
                            </div>
                          </div>
                          {action === 'approve' && (
                            <p className="text-[11px] font-medium text-slate-500 mt-2">
                              This disposition routes the document onward; a recipient is required.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Remarks */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                          {action === 'return' ? 'Reason for Return' : action === 'resubmit' ? 'Resubmission Notes' : 'Remarks'}
                          {action === 'return' || action === 'resubmit' ? (
                            <span className="ml-1 text-red-400">*</span>
                          ) : (
                            <span className="text-slate-400 font-normal normal-case"> (optional)</span>
                          )}
                        </label>
                        <textarea
                          className="input w-full min-h-[90px] bg-slate-50/50 border-slate-200 focus:bg-white text-sm resize-none"
                          placeholder={
                            action === 'return'
                              ? 'State clearly why this document is being returned...'
                              : action === 'resubmit'
                              ? 'Describe the revisions made before resubmitting...'
                              : action === 'approve'
                              ? 'Add any notes or remarks for this approval...'
                              : 'Enter your remarks or notes here...'
                          }
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                        {action === 'return' && (
                          <p className="text-[11px] font-medium text-amber-600 mt-1.5 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                            <AlertCircle className="w-3 h-3" />
                            This reason is recorded and shown to the sender when they resubmit.
                          </p>
                        )}
                      </div>

                      {/* Revised attachment for return/resubmit */}
                      {(action === 'return' || action === 'resubmit') && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                            Revised Attachment <span className="text-slate-400 font-normal normal-case">(optional)</span>
                          </label>
                          {!actionAttachment ? (
                            <label className="flex flex-col items-center justify-center gap-2 w-full py-5 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors group">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                <Upload className="w-5 h-5 text-slate-400" />
                              </div>
                              <span className="text-sm text-slate-500 font-medium">Click to upload a revised file</span>
                              <span className="text-xs text-slate-400">PDF, DOC, DOCX, XLS, PNG, JPG up to 10MB</span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setActionAttachment(e.target.files?.[0] || null)}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                              />
                            </label>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                                <Paperclip className="w-5 h-5 text-primary-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{actionAttachment.name}</p>
                                <p className="text-xs text-slate-400">{(actionAttachment.size / 1024).toFixed(0)} KB</p>
                              </div>
                              <label className="text-xs text-slate-500 hover:text-primary-600 cursor-pointer font-semibold px-2 py-1 rounded-md hover:bg-slate-100 transition-colors">
                                Change
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => setActionAttachment(e.target.files?.[0] || null)}
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                />
                              </label>
                              <button type="button" onClick={() => setActionAttachment(null)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">
                        {action === 'approve' ? `Disposition: ${disposition}` : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setAction(null); setRemarks('') }}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAction}
                          disabled={routeMutation.isPending || ((action === 'return' || action === 'resubmit') && !remarks) || ((['return', 'resubmit', 'send'].includes(action) || isRoutingDisposition) && recipientSelection.length === 0)}
                          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${cfg.btnClass}`}
                        >
                          {routeMutation.isPending ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ActionIcon className="w-4 h-4" />
                              {cfg.confirmLabel}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )
          })()}


{/* Attachments */}
<div className="card" id="main-attachments">
<div className="card-header flex items-center justify-between">
<button
type="button"
onClick={() => toggleCollapse('attachments')}
className="flex items-center gap-2 text-left"
>
<h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Attachments</h2>
{!collapsedSections['attachments'] ? (
<ChevronDown className="w-4 h-4 text-slate-400" />
) : (
<ChevronRight className="w-4 h-4 text-slate-400" />
)}
</button>
              <label className="btn btn-secondary btn-sm cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  disabled={uploadMutation.isPending}
                />
              </label>
            </div>
            <div className="card-body">
              {document.latest_attachments?.length === 0 ? (
                <div className="text-center py-4">
                  <Paperclip className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-1.5 text-sm text-slate-400">No attachments</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {document.latest_attachments?.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleVersionHistory(attachment)}
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-primary-600 rounded transition-colors"
                          title="Version history"
                        >
                          {loadingVersions === attachment.id ? (
                            <span className="block w-4 h-4 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin" />
                          ) : expandedVersions[attachment.id] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {attachment.file_name}
                            </p>
                            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700/60">
                              v{attachment.version}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {(attachment.file_size / 1024).toFixed(0)} KB
                            {attachment.version > 1 && (
                              <span className="ml-1 text-primary-500">• {attachment.version} versions</span>
                            )}
                          </p>
                          {attachment.file_hash && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1" title={attachment.file_hash}>
                              <Shield className="w-3 h-3 text-emerald-500" />
                              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">SHA-256: {attachment.file_hash.substring(0, 16)}...</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDownload(attachment.id, attachment.file_name)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      <button
                        onClick={() => openPreview(attachment)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      </div>

                      {expandedVersions[attachment.id] && (
                        <div className="mt-2 ml-12 space-y-1 border-l-2 border-slate-200 pl-3">
                          {expandedVersions[attachment.id].map((v: any) => (
                            <div key={v.id} className="flex flex-col gap-0.5 mb-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                                  v{v.version}
                                </span>
                                <span className="text-slate-500">
                                  {new Date(v.created_at).toLocaleString()}
                                </span>
                                <span className="text-slate-400 truncate">
                                  by {v.uploader?.id ? personLabel(v.uploader) : 'Unknown'}
                                </span>
                                <div className="flex items-center gap-1 ml-auto">
                                  {!v.is_latest && (
                                    <button
                                      onClick={() => handleDownload(v.id, v.file_name)}
                                      className="p-1 text-slate-400 hover:text-primary-600 rounded"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {v.file_hash && (
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1" title={v.file_hash}>
                                  <Shield className="w-3 h-3 text-emerald-500" /> SHA-256: {v.file_hash.substring(0, 16)}...
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Comments ({document.comments?.length || 0})
              </h2>
            </div>
            <div className="card-body">
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                {document.comments?.length === 0 ? (
                  <div className="text-center py-4">
                    <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-1.5 text-sm text-slate-400">No comments yet</p>
                  </div>
                ) : (
                  document.comments?.map((comment: any) => (
                    <div key={comment.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 text-xs font-semibold">
                          {comment.user?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{comment.user?.id ? personLabel(comment.user) : 'Unknown'}</p>
                          <span className="text-xs text-slate-400">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{comment.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-start gap-2">
                <textarea
                  className="input flex-1 min-h-[60px] resize-y text-sm"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      if (newComment.trim()) commentMutation.mutate(newComment.trim())
                    }
                  }}
                />
                <button
                  onClick={() => newComment.trim() && commentMutation.mutate(newComment.trim())}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="btn btn-primary btn-sm self-end"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Tracking QR Code
              </h2>
            </div>
            <div className="card-body text-center">
              <img
                src={`/api/documents/${id}/qr`}
                alt="QR Code"
                className="mx-auto"
                style={{ width: 150, height: 150 }}
              />
              <p className="text-xs text-slate-400 mt-2">
                Scan to track: {document.tracking_number}
              </p>
            </div>
          </div>

          {/* Audit Trail */}
          {isSuperadmin && document.audit_trails?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Audit Trail
                </h2>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {document.audit_trails.map((trail: any) => (
                    <div key={trail.id} className="flex items-start gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-600 text-xs font-semibold">
                          {trail.user?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{trail.user?.id ? personLabel(trail.user) : 'System'}</p>
                          <span className="badge badge-neutral text-xs">{trail.action}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{trail.description}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(trail.created_at).toLocaleString()}
                          {trail.ip_address && <> • {trail.ip_address}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Delete Document"
        message={`Are you sure you want to delete ${document.tracking_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Recall Modal */}
      {showRecallModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRecallModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900">Recall Document</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600">
                This will recall <strong>{document.tracking_number}</strong> back to your office.
              </p>
              <label className="block text-[13px] font-medium text-slate-700">Reason (required)</label>
              <textarea
                className="input min-h-[80px]"
                value={recallRemarks}
                onChange={(e) => setRecallRemarks(e.target.value)}
                placeholder="Enter reason for recall..."
              />
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowRecallModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button
                onClick={() => recallMutation.mutate({ remarks: recallRemarks })}
                disabled={!recallRemarks.trim() || recallMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {recallMutation.isPending ? 'Recalling...' : 'Confirm Recall'}
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closePreview} />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl mx-4 h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">{previewAttachment.file_name}</h3>
                  <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700/60">
                    v{previewAttachment.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewAttachment.id, previewAttachment.file_name)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={closePreview}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-slate-100 flex items-center justify-center">
                <div className="flex-1 min-w-0 h-full">
                  {!previewUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="block w-8 h-8 border-4 border-slate-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  ) : previewAttachment.file_type?.startsWith('image/') ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.file_name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title={previewAttachment.file_name}
                    />
                  )}
                </div>
              {previewVersions.length > 1 && (
                <div className="w-64 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Version History
                    {loadingPreviewVersions && (
                      <span className="ml-auto block w-3 h-3 border-2 border-slate-300 border-t-primary-600 rounded-full animate-spin" />
                    )}
                  </h4>
                  <div className="space-y-1.5">
                    {previewVersions.map((v: any) => (
                      <div
                        key={v.id}
                        className={`p-2 rounded-lg border ${
                          v.is_latest ? 'border-primary-200 bg-primary-50' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold">
                            v{v.version}
                          </span>
                          {v.is_latest && <span className="badge badge-success text-[10px]">current</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{new Date(v.created_at).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{(v.file_size / 1024).toFixed(0)} KB</p>
                        {v.file_hash && (
                          <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={v.file_hash}>
                            SHA-256: {v.file_hash.substring(0, 16)}...
                          </p>
                        )}
                        {!v.is_latest && (
                          <button
                            onClick={() => handleDownload(v.id, v.file_name)}
                            className="text-xs text-primary-600 hover:underline mt-2"
                          >
                            Download this version
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {showDisseminateModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowDisseminateModal(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pt-6 pb-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
                  <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white" />
                </div>
                <button
                  onClick={() => setShowDisseminateModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Disseminate to All Staff</h3>
                    <p className="text-sm text-white/75 mt-0.5">This document will be visible to everyone</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">What will happen:</p>
                    <ul className="space-y-1 text-blue-600 list-disc list-inside">
                      <li>Document is marked as <strong>Public</strong></li>
                      <li>Status changes to <strong>Released</strong></li>
                      <li>All active staff receive a notification</li>
                      <li>Document appears in the Announcements bulletin</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                    Message / Remarks <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    className="input w-full min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white text-sm resize-none"
                    placeholder="Add a message for staff (e.g., 'Please read and acknowledge by Friday.')..."
                    value={disseminateRemarks}
                    onChange={(e) => setDisseminateRemarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDisseminateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => disseminateMutation.mutate({ remarks: disseminateRemarks })}
                  disabled={disseminateMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disseminateMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Disseminating...</>
                  ) : (
                    <><Megaphone className="w-4 h-4" /> Post to All Staff</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Modal */}
      {showEditModal && document && (
        <EditDocumentModal document={document} onClose={() => setShowEditModal(false)} />
      )}

      {/* Routing Slip Modal */}
      {document && (
        <RoutingSlipModal
          open={showSlipModal}
          onClose={() => setShowSlipModal(false)}
          document={document}
          history={sortedHistory}
        />
      )}
    </div>
  )
}
