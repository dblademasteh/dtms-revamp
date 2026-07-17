import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { DOCUMENT_TYPES } from '@/constants/documentOptions'
import ConfirmModal from '@/components/ConfirmModal'

export default function RoutingTemplates() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<any[]>([{ office_id: '', role: 'approver', action: 'review', sla_hours: 24 }])
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
    setSteps([{ office_id: '', role: 'approver', action: 'review', sla_hours: 24 }])
  }

  const startEdit = (t: any) => {
    setEditingTemplate(t)
    setName(t.name)
    setDocType(t.document_type)
    setDescription(t.description || '')
    setSteps(t.steps || [])
    setShowForm(true)
  }

  const addStep = () => setSteps([...steps, { office_id: '', role: 'approver', action: 'review', sla_hours: 24 }])
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
  const updateStep = (i: number, key: string, value: any) => {
    const updated = [...steps]
    updated[i] = { ...updated[i], [key]: value }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Routing Templates</h1>
          <p className="text-sm text-slate-500 mt-1">Define document routing workflows</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Template Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Document Type</label>
                  <select className="input" value={docType} onChange={e => setDocType(e.target.value)} required>
                    <option value="">Select type...</option>
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Description</label>
                <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-slate-700">Routing Steps</label>
                  <button type="button" onClick={addStep} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Step</button>
                </div>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <select className="input flex-1" value={step.office_id} onChange={e => updateStep(i, 'office_id', Number(e.target.value))} required>
                        <option value="">Office...</option>
                        {offices?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <select className="input w-36" value={step.role} onChange={e => updateStep(i, 'role', e.target.value)}>
                        <option value="approver">Approver</option>
                        <option value="division_head">Division Head</option>
                        <option value="records_officer">Records Officer</option>
                      </select>
                      <select className="input w-28" value={step.action} onChange={e => updateStep(i, 'action', e.target.value)}>
                        <option value="review">Review</option>
                        <option value="approve">Approve</option>
                        <option value="release">Release</option>
                      </select>
                      <input type="number" className="input w-20" value={step.sla_hours} onChange={e => updateStep(i, 'sla_hours', Number(e.target.value))} min="1" />
                      <span className="text-xs text-slate-400">hrs</span>
                      {steps.length > 1 && <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn btn-primary btn-sm">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Steps</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates?.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.description}</p>
                      </div>
                    </td>
                    <td className="text-sm text-slate-500 capitalize">{t.document_type?.replace('_', ' ')}</td>
                    <td className="text-sm text-slate-500">{t.steps?.length || 0} steps</td>
                    <td>
                      <span className={`badge ${t.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(t)} className="btn btn-ghost btn-sm"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(t)} className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
