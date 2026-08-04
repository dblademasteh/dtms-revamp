import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useState, useMemo } from 'react'
import Select from 'react-select'
import ModalPortal from '@/components/ModalPortal'
import { Plus, Edit, Trash2, Building2, X, ChevronRight, ChevronDown, Save, UserCheck, Search } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { buildSelectStyles } from '@/utils/selectStyles'
import SearchableSelect from '@/components/SearchableSelect'

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

const formatBytes = (bytes?: number | null): string => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  for (; value >= 1024 && i < units.length - 1; i++) value /= 1024
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

const filterOffices = (nodes: any[], type: string, query: string): any[] => {
  const matchesType = (n: any) => !type || n.office_type === type
  const matchesQuery = (n: any) => {
    if (!query) return true
    const q = query.toLowerCase()
    const nameMatch = n.name?.toLowerCase().includes(q)
    const codeMatch = n.code?.toLowerCase().includes(q)
    const unitCodeMatch = n.unit_code?.toLowerCase().includes(q)
    const headMatch = n.head?.full_name?.toLowerCase().includes(q)
      || n.head?.name?.toLowerCase().includes(q)
      || n.head?.rank?.toLowerCase().includes(q)
    return nameMatch || codeMatch || unitCodeMatch || headMatch
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
  const [unitCode, setUnitCode] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [headUserId, setHeadUserId] = useState<number | ''>('')
  const [officeType, setOfficeType] = useState('')
  const [storageQuota, setStorageQuota] = useState('')
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
    setUnitCode('')
    setDescription('')
    setParentId('')
    setHeadUserId('')
    setOfficeType('')
    setStorageQuota('')
  }

  const startEdit = (o: any) => {
    setEditingOffice(o)
    setName(o.name)
    setCode(o.code)
    setUnitCode(o.unit_code || '')
    setDescription(o.description || '')
    setParentId(o.parent_office_id || '')
    setHeadUserId(o.head_user_id || '')
    setOfficeType(o.office_type || '')
    setStorageQuota(o.storage_quota_bytes ? String(o.storage_quota_bytes) : '')
    setShowForm(true)
  }

  const toggleExpand = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const autoCode = (unitCode || code || name.replace(/[^A-Za-z0-9]/g, '')).substring(0, 10).toUpperCase()
    const data: any = { name, code: autoCode, description }
    if (unitCode) data.unit_code = unitCode
    if (parentId) data.parent_office_id = parentId
    if (headUserId) data.head_user_id = headUserId
    if (officeType) data.office_type = officeType
    if (storageQuota !== '') data.storage_quota_bytes = Number(storageQuota)
    if (editingOffice) {
      updateMutation.mutate({ id: editingOffice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const renderOffice = (office: any, level: number = 0) => {
    const hasChildren = office.children?.length > 0
    const isExpanded = searchQuery ? true : expanded[office.id] !== false

    const headInitials = office.head
      ? ((office.head.full_name || office.head.name || '') || '').split(/\s+/).filter(Boolean).slice(0, 2).map((s: string) => s[0]).join('').toUpperCase() || '?'
      : '?'

    return (
      <>
        <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
          <td className="py-3" style={{ paddingLeft: level * 28 + 12 }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button onClick={() => toggleExpand(office.id)} className="flex-shrink-0 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : <div className="w-5 flex-shrink-0" />}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-800">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {cleanOfficeName(office.name)}
                </p>
                {office.description && (
                  <p className="max-w-md truncate text-[11px] text-slate-400 dark:text-slate-500">{office.description}</p>
                )}
              </div>
            </div>
          </td>
          <td className="whitespace-nowrap">
            {office.unit_code ? (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {office.unit_code}
              </span>
            ) : <span className="text-xs text-slate-400">—</span>}
          </td>
          <td className="whitespace-nowrap">
            {office.office_type ? (
              <span className={`badge text-xs ${OFFICE_TYPE_BADGE[office.office_type] || OFFICE_TYPE_BADGE.others}`}>
                {officeTypeLabel(office.office_type)}
              </span>
            ) : (
              <span className="badge badge-neutral">—</span>
            )}
          </td>
          <td className="whitespace-nowrap">
            {office.head ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  <span className="text-[11px] font-bold">{headInitials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {[office.head.full_name || office.head.name].filter(Boolean).join(' ')}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    {office.head.rank && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {office.head.rank}
                      </span>
                    )}
                    {(() => {
                      const badge = getRankBadge(office.head.rank)
                      return badge && (
                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>
            ) : <span className="text-xs text-slate-400">—</span>}
          </td>
          <td className="whitespace-nowrap">
            <span className={`badge text-xs ${office.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
              {office.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <div className="min-w-28">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {formatBytes(office.storage_usage_bytes || 0)}
                {office.storage_quota_bytes ? ` / ${formatBytes(office.storage_quota_bytes)}` : ''}
              </p>
              {office.storage_quota_bytes ? (
                <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(office.storage_usage_bytes || 0) / office.storage_quota_bytes >= 0.9
                      ? 'bg-red-500'
                      : (office.storage_usage_bytes || 0) / office.storage_quota_bytes >= 0.7
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, ((office.storage_usage_bytes || 0) / office.storage_quota_bytes) * 100)}%` }}
                  />
                </div>
              ) : (
                <span className="text-[10px] text-slate-400">Unlimited</span>
              )}
            </div>
          </td>
          <td>
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => startEdit(office)} className="btn btn-ghost btn-sm p-1"><Edit className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteTarget(office)} className="btn btn-ghost btn-sm p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && office.children.map((child: any) => renderOffice(child, level + 1))}
      </>
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
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          onClick={() => setTypeFilter('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            !typeFilter ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All
        </button>
        {OFFICE_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === t.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              <div className="px-6 py-5 space-y-8">
                {/* Details */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Office Name <span className="text-danger-500">*</span>
                      </label>
                      <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Unit Code
                      </label>
                      <input
                        className="input"
                        value={unitCode}
                        onChange={e => {
                          setUnitCode(e.target.value)
                          setCode(e.target.value.substring(0, 10))
                        }}
                        placeholder="e.g. 5.1a or BFP-R2-ICTS"
                        maxLength={20}
                      />
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
                      <SearchableSelect
                        options={OFFICE_TYPES}
                        value={officeType}
                        onChange={setOfficeType}
                        placeholder="Select type..."
                      />
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
                          label: [u.rank, u.full_name || u.name].filter(Boolean).join(' '),
                          designation: u.designation || '',
                          rank: u.rank || '',
                        }))}
                        value={(users || [])
                          .map((u: any) => ({
                            value: u.id,
                            label: [u.rank, u.full_name || u.name].filter(Boolean).join(' '),
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

                {/* Storage quota */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Storage Quota</h3>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                      Max Attachment Storage (bytes)
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={storageQuota}
                      onChange={e => setStorageQuota(e.target.value)}
                      placeholder="Leave empty for unlimited. e.g. 536870912 = 512 MB"
                    />
                    <p className="text-[12px] text-slate-500 mt-1.5">
                      {storageQuota
                        ? `Quota of ${formatBytes(Number(storageQuota))} applies to non-archived attachments of documents originated by this office.`
                        : 'No quota set — office can store unlimited attachments.'}
                    </p>
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
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-56 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 flex-1 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : !filterOffices(offices || [], typeFilter, searchQuery).length ? (
          <div className="flex flex-col items-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Building2 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No offices found</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try adjusting your search or type filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto lg:overflow-visible">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Office</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Head</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Storage</th>
                  <th className="relative px-6 py-3 w-24">
                    <div className="flex items-center justify-end gap-1">
                      <Edit className="w-3.5 h-3.5 text-slate-400" />
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {filterOffices(offices || [], typeFilter, searchQuery).map((office: any) => renderOffice(office))}
              </tbody>
            </table>
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
