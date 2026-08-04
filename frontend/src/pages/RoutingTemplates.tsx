import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  X,
  Workflow,
  ArrowRight,
  Building2,
  UserCheck,
  Users,
  Archive,
  Search,
  CheckCircle2,
   Send,
   GripVertical,
} from 'lucide-react'
import { DOCUMENT_TYPES, documentTypeLabel } from '@/constants/documentOptions'
import ConfirmModal from '@/components/ConfirmModal'
import SearchableSelect from '@/components/SearchableSelect'

const ROLE_META: Record<string, { label: string; icon: typeof UserCheck }> = {
  approver: { label: 'Approver', icon: UserCheck },
  division_head: { label: 'Division Head', icon: Users },
  records_officer: { label: 'Records Officer', icon: Archive },
}

const ACTION_META: Record<string, { label: string; icon: typeof Search; color: string }> = {
  review: { label: 'Review', icon: Search, color: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800' },
  approve: { label: 'Approve', icon: CheckCircle2, color: 'text-success-700 bg-success-50 border-success-200 dark:bg-success-900/40 dark:text-success-300 dark:border-success-800' },
  release: { label: 'Release', icon: Send, color: 'text-primary-700 bg-primary-50 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800' },
}

export default function RoutingTemplates() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('')
  const [description, setDescription] = useState('')
   const [steps, setSteps] = useState<any[]>([{ office_id: '', role: 'approver', action: 'review' }])
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['routing-templates-all'],
    queryFn: () => api.get('/routing-templates/all').then(res => res.data),
  })

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.get('/offices').then(res => res.data.value || res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/routing-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-templates-all'] })
      toast.success('Template created')
      resetForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/routing-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-templates-all'] })
      toast.success('Template updated')
      resetForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/routing-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routing-templates-all'] })
      toast.success('Template deleted')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingTemplate(null)
    setName('')
    setDocType('')
    setDescription('')
    setSteps([{ office_id: '', role: 'approver', action: 'review' }])
  }

  const startEdit = (t: any) => {
    setEditingTemplate(t)
    setName(t.name)
    setDocType(t.document_type)
    setDescription(t.description || '')
    setSteps(t.steps || [])
    setShowForm(true)
  }

   const addStep = () => setSteps([...steps, { office_id: '', role: 'approver', action: 'review' }])
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i: number, key: string, value: any) => {
    const updated = [...steps]
    updated[i] = { ...updated[i], [key]: value }
    setSteps(updated)
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const reorderSteps = (from: number, to: number) => {
    if (from === to) return
    const updated = [...steps]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    setSteps(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { name, document_type: docType, description, steps }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const officeName = (id: any) => offices?.find((o: any) => o.id === Number(id))?.name || 'Unassigned office'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 ring-1 ring-primary-100 dark:bg-primary-900/40 dark:ring-primary-800">
            <Workflow className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Routing Templates</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Define reusable document routing workflows
            </p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-primary btn-sm flex-shrink-0">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>
            <button onClick={resetForm} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Template Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Memo Approval" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Document Type</label>
                   <SearchableSelect
                     options={DOCUMENT_TYPES.map(type => ({ value: type.value, label: type.label }))}
                     value={docType}
                     onChange={setDocType}
                     placeholder="Select type..."
                   />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</label>
                <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional — what is this workflow for?" />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Routing Steps</label>
                  <div className="flex items-center gap-3">
                    <span className="hidden text-[11px] text-slate-400 sm:inline">Drag <GripVertical className="inline h-3 w-3" /> to reorder</span>
                    <button type="button" onClick={addStep} className="btn btn-secondary btn-sm !py-1 !px-2.5 !text-xs">
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragIndex !== null && dragIndex !== i) setOverIndex(i)
                      }}
                      onDragLeave={() => setOverIndex((prev) => (prev === i ? null : prev))}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (dragIndex !== null) reorderSteps(dragIndex, i)
                        setDragIndex(null)
                        setOverIndex(null)
                      }}
                      onDragEnd={() => {
                        setDragIndex(null)
                        setOverIndex(null)
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-150 ${
                        dragIndex === i
                          ? 'border-primary-400 bg-primary-50 opacity-60 shadow-sm dark:border-primary-600 dark:bg-primary-900/30'
                          : overIndex === i
                            ? 'border-primary-400 bg-primary-50/70 ring-2 ring-primary-200 dark:border-primary-600 dark:bg-primary-900/20 dark:ring-primary-800'
                            : 'border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40'
                      }`}
                    >
                      <span
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(i)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(i))
                        }}
                        title="Drag to reorder"
                        className="flex h-7 w-7 flex-shrink-0 cursor-grab items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow-sm active:cursor-grabbing"
                      >
                        {i + 1}
                      </span>
                      <span className="hidden flex-shrink-0 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing sm:block dark:text-slate-600 dark:hover:text-slate-400">
                        <GripVertical className="h-4 w-4" />
                      </span>
                       <div className="relative flex-1">
                         <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                         <SearchableSelect
                           className="!pl-8"
                           options={offices?.map((o: any) => ({ value: String(o.id), label: o.name })) ?? []}
                           value={String(step.office_id)}
                           onChange={(v) => updateStep(i, 'office_id', Number(v))}
                           placeholder="Select office..."
                         />
                       </div>
                       <SearchableSelect
                         options={Object.entries(ROLE_META).map(([key, meta]) => ({ value: key, label: meta.label }))}
                         value={step.role}
                         onChange={(v) => updateStep(i, 'role', v)}
                         placeholder="Select role..."
                       />
                       <SearchableSelect
                         options={Object.entries(ACTION_META).map(([key, meta]) => ({ value: key, label: meta.label }))}
                         value={step.action}
                         onChange={(v) => updateStep(i, 'action', v)}
                         placeholder="Select action..."
                       />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(i)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn btn-primary btn-sm">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : !templates?.length ? (
        <div className="card flex flex-col items-center py-16 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Workflow className="h-6 w-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">No routing templates yet</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first workflow to speed up document routing.</p>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-primary btn-sm mt-4">
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates?.map((t: any) => {
            return (
              <div key={t.id} className="card overflow-hidden transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3 p-5 pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{t.name}</h3>
                      <span className={`badge flex-shrink-0 ${t.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      title="Edit"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800 dark:hover:text-primary-300 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      title="Delete"
                      className="rounded-lg p-2 text-slate-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-5">
                  <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
                    {documentTypeLabel(t.document_type)}
                  </span>
                </div>

                {/* Workflow preview */}
                <div className="mt-4 px-5 pb-5">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    {t.steps?.length ? (
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {t.steps.map((s: any, i: number) => {
                          const roleMeta = ROLE_META[s.role] || { label: s.role, icon: UserCheck }
                          const actMeta = ACTION_META[s.action] || { label: s.action, icon: Search, color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
                          const RoleIcon = roleMeta.icon
                          const StepActionIcon = actMeta.icon
                          return (
                            <div key={i} className="flex items-center gap-2 flex-shrink-0">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                                    {i + 1}
                                  </span>
                                  <p className="whitespace-nowrap text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {officeName(s.office_id)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 pl-0.5">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${actMeta.color}`}>
                                    <StepActionIcon className="h-3 w-3" />
                                    {actMeta.label}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                    <RoleIcon className="h-3 w-3" />
                                    {roleMeta.label}
                                  </span>
                                </div>
                              </div>
                              {i < t.steps.length - 1 && (
                                <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No steps defined.</p>
                    )}
                  </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {t.steps?.length || 0} step{(t.steps?.length || 0) !== 1 ? 's' : ''}
                   </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
