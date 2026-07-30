import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useState, useMemo } from 'react'
import Select from 'react-select'
import ModalPortal from '@/components/ModalPortal'
import { Plus, Edit, Trash2, Building2, X, ChevronRight, ChevronDown, Save, UserCheck, Search } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { buildSelectStyles } from '@/utils/selectStyles'

const OFFICE_TYPES = [
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'provincial_office', label: 'Provincial Office' },
  { value: 'fire_station', label: 'Fire Station' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
  { value: 'others', label: 'Others' },
]

const OFFICE_TYPE_BADGE: Record<string, string> = {
  regional_office: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-700/60',
  provincial_office: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  fire_station: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  division: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  unit: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  others: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
}

const officeTypeLabel = (v?: string) =>
  OFFICE_TYPES.find(t => t.value === v)?.label ?? v ?? 'Office'

const OFFICER_RANKS = ['FSSUPT', 'FSUPT', 'FSINSP', 'FINSP', 'FCINSP']

const getRankBadge = (rank?: string | null) => {
  if (!rank) return null
  const isOfficer = OFFICER_RANKS.includes(rank)
  return isOfficer
    ? { label: 'Officer', className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' }
    : { label: 'Non-Officer', className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
}

const cleanOfficeName = (name?: string) =>
  (name || '')
    .replace(/^\s*\d+(?:\.\d+)?[a-z]?\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()

const filterOffices = (nodes: any[], type: string, query: string): any[] => {
  const matchesType = (n: any) => !type || n.office_type === type
  const matchesQuery = (n: any) => {
    if (!query) return true
    const q = query.toLowerCase()
    const nameMatch = n.name?.toLowerCase().includes(q)
    const codeMatch = n.code?.toLowerCase().includes(q)
    const headMatch = n.head?.name?.toLowerCase().includes(q)
      || n.head?.rank?.toLowerCase().includes(q)
    return nameMatch || codeMatch || headMatch
  }
  return nodes
    .map((n) => {
      const children = filterOffices(n.children || [], type, query)
      if ((matchesType(n) && matchesQuery(n)) || children.length) return { ...n, children }
      return null
    })
    .filter(Boolean)
}

export default function Offices() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingOffice, setEditingOffice] = useState<any>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [headUserId, setHeadUserId] = useState<number | ''>('')
  const [officeType, setOfficeType] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const selectStyles = useMemo(() => buildSelectStyles(), [])

  const { data: offices, isLoading } = useQuery({
    queryKey: ['offices-hierarchy'],
    queryFn: () => api.get('/offices-hierarchy').then(res => res.data.value || res.data),
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(res => res.data.value || res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/offices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['offices'] })
      toast.success('Office created')
      resetForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/offices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['offices'] })
      toast.success('Office updated')
      resetForm()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/offices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['offices'] })
      toast.success('Office deleted')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingOffice(null)
    setName('')
    setCode('')
    setDescription('')
    setParentId('')
    setHeadUserId('')
    setOfficeType('')
  }

  const startEdit = (o: any) => {
    setEditingOffice(o)
    setName(o.name)
    setCode(o.code)
    setDescription(o.description || '')
    setParentId(o.parent_office_id || '')
    setHeadUserId(o.head_user_id || '')
    setOfficeType(o.office_type || '')
    setShowForm(true)
  }

  const toggleExpand = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = { name, code, description }
    if (parentId) data.parent_office_id = parentId
    if (headUserId) data.head_user_id = headUserId
    if (officeType) data.office_type = officeType
    if (editingOffice) {
      updateMutation.mutate({ id: editingOffice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const renderOffice = (office: any, level: number = 0) => {
    const hasChildren = office.children?.length > 0
    const isExpanded = searchQuery ? true : expanded[office.id] !== false

    return (
      <div key={office.id}>
        <div className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 border-l-2 ${
          level === 0 ? 'border-primary-400' : level === 1 ? 'border-slate-300' : 'border-slate-200'
        }`} style={{ marginLeft: level * 24 }}>
          {hasChildren && (
            <button onClick={() => toggleExpand(office.id)} className="text-slate-400 hover:text-slate-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{cleanOfficeName(office.name)}</span>
              <span className="text-xs text-slate-400">({office.code})</span>
            </div>
            {office.head && (() => {
              const badge = getRankBadge(office.head.rank)
              return (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                    {[office.head.rank, office.head.name].filter(Boolean).join(' ')}
                  </span>
                  {badge && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
          <span className={`badge text-xs ${office.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
            {office.status}
          </span>
          {office.office_type && (
            <span className={`badge text-xs ${OFFICE_TYPE_BADGE[office.office_type] || OFFICE_TYPE_BADGE.others}`}>
              {officeTypeLabel(office.office_type)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => startEdit(office)} className="btn btn-ghost btn-sm p-1"><Edit className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDeleteTarget(office)} className="btn btn-ghost btn-sm p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {hasChildren && isExpanded && office.children.map((child: any) => renderOffice(child, level + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Offices</h1>
          <p className="text-sm text-slate-500 mt-1">Manage organizational structure</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" /> New Office
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search offices, codes, chiefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
          />
        </div>
        <button
          onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            !typeFilter ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All
        </button>
        {OFFICE_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === t.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm} />
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold leading-tight">
                  {editingOffice ? 'Edit Office' : 'New Office'}
                </h2>
                <p className="text-xs text-primary-100">
                  {editingOffice ? `Updating ${editingOffice.name}` : 'Add a unit to the organization hierarchy'}
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-lg text-primary-100 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">
                {/* Details */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Office Name <span className="text-danger-500">*</span>
                      </label>
                      <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Code <span className="text-danger-500">*</span>
                      </label>
                      <input className="input" value={code} onChange={e => setCode(e.target.value)} required maxLength={10} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                    <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                </section>

                {/* Hierarchy */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Hierarchy & Assignment</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Parent Office</label>
                      <Select
                        styles={selectStyles}
                        placeholder="None (Root)"
                        isClearable
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        options={(offices || [])
                          .filter((o: any) => !editingOffice || o.id !== editingOffice.id)
                          .map((o: any) => ({ value: o.id, label: cleanOfficeName(o.name) }))}
                        value={(offices || [])
                          .filter((o: any) => !editingOffice || o.id !== editingOffice.id)
                          .map((o: any) => ({ value: o.id, label: cleanOfficeName(o.name) }))
                          .find((o: any) => o.value === parentId) || null}
                        onChange={(opt: any) => setParentId(opt ? opt.value : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Type</label>
                      <select className="input" value={officeType} onChange={e => setOfficeType(e.target.value)}>
                        <option value="">Select type...</option>
                        {OFFICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="p-4 rounded-xl border-2 border-primary-100 bg-gradient-to-br from-primary-50/50 to-white">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">Assign Chief</span>
                      </div>
                      <p className="text-[12px] text-slate-500 mb-3">Select the officer-in-charge who leads this office.</p>
                      <Select
                        styles={selectStyles}
                        placeholder="Search and select a chief..."
                        isClearable
                        menuPlacement="top"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        options={(users || []).map((u: any) => ({
                          value: u.id,
                          label: [u.rank, u.name].filter(Boolean).join(' '),
                          designation: u.designation || '',
                          rank: u.rank || '',
                        }))}
                        value={(users || [])
                          .map((u: any) => ({
                            value: u.id,
                            label: [u.rank, u.name].filter(Boolean).join(' '),
                            designation: u.designation || '',
                            rank: u.rank || '',
                          }))
                          .find((u: any) => u.value === headUserId) || null}
                        onChange={(opt: any) => setHeadUserId(opt ? opt.value : '')}
                        formatOptionLabel={(option: any) => {
                          const badge = getRankBadge(option.rank)
                          return (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{option.label}</span>
                                {badge && (
                                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                              {option.designation && (
                                <span className="text-[11px] text-slate-400">{option.designation}</span>
                              )}
                            </div>
                          )
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn btn-primary btn-sm">
                  {createMutation.isPending || updateMutation.isPending ? (
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
                      {editingOffice ? 'Update Office' : 'Create Office'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Organization Hierarchy</h2>
        </div>
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filterOffices(offices || [], typeFilter, searchQuery).map((office: any) => renderOffice(office))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Office"
        message={`Are you sure you want to delete "${deleteTarget ? cleanOfficeName(deleteTarget.name) : ''}"? This action cannot be undone.`}
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
