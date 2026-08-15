import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Check, X, RotateCcw, GripVertical } from 'lucide-react'
import { useDropdownOptions } from '@/hooks/useDropdownOptions'
import type { DropdownOption } from '@/types'

const GROUP_META: { key: string; label: string; hint: string }[] = [
  { key: 'document_types', label: 'Document Types', hint: 'Used when creating and editing documents' },
  { key: 'classifications', label: 'Classifications', hint: 'Document security classification levels' },
  { key: 'modes_of_transmittal', label: 'Modes of Transmittal', hint: 'How documents are transmitted' },
  { key: 'action_requested', label: 'Action Requested', hint: 'Standard routing-slip actions' },
  { key: 'agencies', label: 'Agencies', hint: 'Sending agencies in the public agency portal' },
  { key: 'routing_dispositions', label: 'Routing Dispositions', hint: 'Disposition actions when routing documents' },
  { key: 'document_statuses', label: 'Document Statuses', hint: 'Document lifecycle statuses' },
  { key: 'office_types', label: 'Office Types', hint: 'Office classification types' },
  { key: 'ranks', label: 'Ranks', hint: 'Personnel / user rank codes and titles (BFP)' },
  { key: 'designations', label: 'Designations', hint: 'Personnel / user role or position titles (pick-or-type)' },
  { key: 'priorities', label: 'Priorities', hint: 'Document priority levels' },
  { key: 'suggestion_categories', label: 'Suggestion Categories', hint: 'Feedback categories in the suggestions widget' },
  { key: 'suggestion_statuses', label: 'Suggestion Statuses', hint: 'Feedback statuses in the suggestions widget' },
]

const EmptyState = () => (
  <div className="text-center py-12">
    <GripVertical className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
    <p className="text-sm text-slate-500 dark:text-slate-400">No options yet for this list.</p>
  </div>
)

export default function Dropdowns() {
  const { groups, refetch } = useDropdownOptions()
  const queryClient = useQueryClient()
  const [activeGroup, setActiveGroup] = useState('document_types')
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [editing, setEditing] = useState<DropdownOption | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editValue, setEditValue] = useState('')

  const meta = GROUP_META.find((g) => g.key === activeGroup)
  const options = groups[activeGroup] ?? []

  const sync = () => {
    queryClient.invalidateQueries({ queryKey: ['dropdown-options'] })
    refetch()
  }

  const addMutation = useMutation({
    mutationFn: (data: { group: string; label: string; value?: string }) =>
      api.post('/admin/dropdown-options', data),
    onSuccess: () => {
      toast.success('Option added')
      setNewLabel('')
      setNewValue('')
      sync()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add option'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; label: string; value: string; is_active: boolean }) =>
      api.put(`/admin/dropdown-options/${data.id}`, {
        label: data.label,
        value: data.value,
        is_active: data.is_active,
      }),
    onSuccess: () => {
      toast.success('Option updated')
      setEditing(null)
      sync()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update option'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/dropdown-options/${id}`),
    onSuccess: () => {
      toast.success('Option deleted')
      sync()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to delete option'),
  })

  const resetMutation = useMutation({
    mutationFn: (group: string) => api.post(`/admin/dropdown-options/${group}/reset`),
    onSuccess: () => {
      toast.success('List reset to defaults')
      sync()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reset list'),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) {
      toast.error('Please enter a label')
      return
    }
    addMutation.mutate({
      group: activeGroup,
      label: newLabel.trim(),
      value: newValue.trim() || undefined,
    })
  }

  const startEdit = (option: DropdownOption) => {
    setEditing(option)
    setEditLabel(option.label)
    setEditValue(option.value)
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !editLabel.trim()) return
    updateMutation.mutate({
      id: editing.id,
      label: editLabel.trim(),
      value: editValue.trim() || editing.value,
      is_active: editing.is_active,
    })
  }

  const toggleActive = (option: DropdownOption) => {
    updateMutation.mutate({
      id: option.id,
      label: option.label,
      value: option.value,
      is_active: !option.is_active,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <select
            className="input sm:w-72"
            value={activeGroup}
            onChange={(e) => {
              setActiveGroup(e.target.value)
              setEditing(null)
            }}
          >
            {GROUP_META.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => resetMutation.mutate(activeGroup)}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="w-4 h-4" />
            Reset to defaults
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{meta?.label}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta?.hint}</p>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              className="input sm:flex-1"
              placeholder="Label (e.g. Endorsement)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              className="input sm:w-64"
              placeholder="Value (optional, auto-generated)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm sm:w-auto"
              disabled={addMutation.isPending}
            >
              <Plus className="w-4 h-4" />
              Add option
            </button>
          </form>

          {options.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {options.map((option) => (
                <li key={option.id} className="py-2.5 flex items-center gap-3">
                  {editing?.id === option.id ? (
                    <form onSubmit={handleUpdate} className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <input
                        className="input input-sm sm:flex-1"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        autoFocus
                      />
                      <input
                        className="input input-sm sm:w-56"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="flex items-center gap-1.5">
                        <button type="submit" className="btn btn-success btn-sm" disabled={updateMutation.isPending}>
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          option.is_active
                            ? 'bg-emerald-500'
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        title={option.is_active ? 'Active' : 'Inactive'}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${option.is_active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                          {option.label}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">{option.value}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleActive(option)}
                          disabled={updateMutation.isPending}
                          title={option.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {option.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(option)}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          onClick={() => deleteMutation.mutate(option.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
