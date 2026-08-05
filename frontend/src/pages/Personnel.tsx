import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Search, Users as UsersIcon, Building2, X, UserPlus, Trash2, AlertTriangle, Grid3X3, UserX, Award, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import StatCard from '@/components/StatCard'
import ModalPortal from '@/components/ModalPortal'
import Select from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'
import { useRanks } from '@/hooks/useRanks'

export default function Personnel() {
  const queryClient = useQueryClient()
  const ranks = useRanks()
  const [search, setSearch] = useState('')
  const [officeFilter, setOfficeFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [targetOfficeId, setTargetOfficeId] = useState<string>('')
  const [showCreatePersonnel, setShowCreatePersonnel] = useState(false)
  const [newPersonnel, setNewPersonnel] = useState({
    rank: '', first_name: '', last_name: '', middle_name: '', suffix: '',
    item_no: '', accnt_no: '', unit_assignment: '', designation: '', email: '',
  })
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => api.get('/personnel').then((res) => res.data),
  })

  const { data: offices } = useQuery({
    queryKey: ['offices-min'],
    queryFn: () => api.get('/offices').then((res) => res.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) =>
      api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success('Personnel updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Update failed')
    },
  })

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/admin/personnel/clear'),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success(res?.data?.message || 'All personnel data cleared')
      setShowClearConfirm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clear data')
    },
  })

  const createPersonnelMutation = useMutation({
    mutationFn: (data: any) => api.post('/personnel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success('Personnel created')
      setShowCreatePersonnel(false)
      setNewPersonnel({
        rank: '', first_name: '', last_name: '', middle_name: '', suffix: '',
        item_no: '', accnt_no: '', unit_assignment: '', designation: '', email: '',
      })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Create failed')
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/personnel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((res) => res.data)
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      setImportResult(data)
      toast.success(data?.message || 'Import complete')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Import failed')
    },
  })

  const officesArr = Array.isArray(offices)
    ? offices
    : (offices?.data ?? [])

  const selectStyles = buildSelectStyles()

  const [rankFilter, setRankFilter] = useState('')

  const filtered = (personnel ?? []).filter((u: any) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rank?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.unit_assignment?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q)
    const matchesOffice =
      !officeFilter || String(u.office_id) === String(officeFilter)
    const matchesRank =
      !rankFilter || u.rank === rankFilter
    return matchesSearch && matchesOffice && matchesRank
  })

  const openDetail = (u: any) => {
    setSelected(u)
    setEditForm({
      rank: u.rank || '',
      last_name: u.last_name || '',
      first_name: u.first_name || '',
      middle_name: u.middle_name || '',
      suffix: u.suffix || '',
      accnt_no: u.accnt_no || '',
      email: u.email || '',
      designation: u.designation || '',
      role: u.role || '',
      unit_assignment: u.unit_assignment || '',
      office_id: u.office_id ? String(u.office_id) : '',
    })
    setTargetOfficeId(String(u.office_id || ''))
  }

  const roleBadge = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
      case 'officer': return 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800'
      case 'non_officer': return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      case 'fcos': return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      case 'office_station': return 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800'
      default: return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  const roleLabel = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin'
      case 'officer': return 'Officer'
      case 'non_officer': return 'Non-Officer'
      case 'fcos': return 'FCOS'
      case 'office_station': return 'Office/Station'
      default: return role?.replace('_', ' ') || '—'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreatePersonnel(true)}
            className="btn btn-primary btn-sm"
          >
            <UserPlus className="w-4 h-4" /> Create Personnel
          </button>
          <button
            onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null) }}
            className="btn btn-outline btn-sm"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Personnel"
          value={(personnel ?? []).length}
          icon={<UsersIcon className="w-5 h-5" />}
          color="stat-icon-primary"
        />
        <StatCard
          label="Distinct Units"
          value={new Set((personnel ?? []).map((u: any) => u.unit_assignment).filter(Boolean)).size}
          icon={<Grid3X3 className="w-5 h-5" />}
          color="stat-icon-cyan"
        />
        <StatCard
          label="Without Office"
          value={(personnel ?? []).filter((u: any) => !u.office_id).length}
          icon={<UserX className="w-5 h-5" />}
          color="stat-icon-amber"
        />
        <StatCard
          label="Officers"
          value={(personnel ?? []).filter((u: any) =>
            ['SUPT', 'INSP', 'CINSP', 'FO1', 'FO2', 'FO3', 'SFO1', 'SFO2', 'SFO3', 'SFO4']
              .includes((u.rank || '').toUpperCase())
          ).length}
          icon={<Award className="w-5 h-5" />}
          color="stat-icon-green"
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, rank, unit, designation..."
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
          </div>
          <select
            className="input sm:w-56"
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
          >
            <option value="">All offices</option>
            {officesArr.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select
            className="input sm:w-48 text-sm"
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
          >
            <option value="">All Ranks</option>
            {ranks.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 flex-1 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <UsersIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No personnel found</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Personnel</th>
                  <th>Designation</th>
                  <th>Office</th>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u)}
                    className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {u.rank && <span className="mr-1.5 text-primary-700 dark:text-primary-400">{u.rank}</span>}
                            {[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ') || '—'}
                            {u.suffix ? ` ${u.suffix}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate text-sm text-slate-600 dark:text-slate-300">
                      {u.designation || '—'}
                    </td>
                    <td className="whitespace-nowrap">
                      {u.office?.name ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {u.office.name}
                        </span>
                      ) : (
                        <span className="badge badge-warning">No Office</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {u.role ? (
                        <span className={`badge ${roleBadge(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      ) : (
                        <span className="badge badge-neutral">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">
                      {u.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Transfer Modal */}
      {selected && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelected(null)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 pt-6 pb-8 relative overflow-hidden">
                <Building2 className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Personnel Details</h3>
                <p className="text-sm text-primary-200 mt-1">
                  {selected.rank && `${selected.rank} `}{selected.last_name}, {selected.first_name} {selected.middle_name || ''}
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Rank</label>
                    <select className="input input-sm w-full text-sm" value={editForm.rank} onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}>
                      <option value="">Select Rank...</option>
                      {ranks.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Suffix</label>
                    <select className="input input-sm w-full text-sm" value={editForm.suffix} onChange={(e) => setEditForm({ ...editForm, suffix: e.target.value })}>
                      <option value="">—</option>
                      {['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">First Name</label>
                    <input type="text" className="input input-sm text-sm w-full" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Last Name</label>
                    <input type="text" className="input input-sm text-sm w-full" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Middle Name</label>
                    <input type="text" className="input input-sm text-sm w-full" value={editForm.middle_name} onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Email</label>
                    <input type="email" className="input input-sm text-sm w-full" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Designation</label>
                    <input type="text" className="input input-sm text-sm w-full" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Office</label>
                    <Select
                      styles={{
                        ...selectStyles,
                        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                      }}
                      placeholder="Select..."
                      isClearable
                      options={officesArr.map((o: any) => ({ value: String(o.id), label: o.name }))}
                      value={targetOfficeId ? { value: targetOfficeId, label: officesArr.find((o: any) => String(o.id) === targetOfficeId)?.name } : null}
                      onChange={(opt: any) => setTargetOfficeId(opt ? opt.value : '')}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Role</label>
                    <select className="input input-sm w-full text-sm" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                      <option value="">—</option>
                      <option value="superadmin">Super Admin</option>
                      <option value="officer">Officer</option>
                      <option value="non_officer">Non-Officer</option>
                      <option value="fcos">FCOS</option>
                      <option value="office_station">Office/Station</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/60">
                <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={() => {
                    const data: any = { ...editForm, office_id: targetOfficeId ? Number(targetOfficeId) : null }
                    Object.keys(data).forEach((k) => { if (data[k] === '') data[k] = null })
                    updateMutation.mutate({ id: selected.id, data })
                  }}
                  disabled={updateMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Create Personnel Modal */}
      {showCreatePersonnel && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCreatePersonnel(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 pt-6 pb-8 relative overflow-hidden">
                <UserPlus className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <button onClick={() => setShowCreatePersonnel(false)} className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Create Personnel</h3>
                <p className="text-sm text-primary-200 mt-1">Add a new personnel record to the directory</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Rank</label>
                    <select className="input input-sm w-full text-sm" value={newPersonnel.rank} onChange={(e) => setNewPersonnel({ ...newPersonnel, rank: e.target.value })}>
                      <option value="">Select Rank...</option>
                      {ranks.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Suffix</label>
                    <select className="input input-sm w-full text-sm" value={newPersonnel.suffix} onChange={(e) => setNewPersonnel({ ...newPersonnel, suffix: e.target.value })}>
                      <option value="">—</option>
                      {['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">First Name *</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.first_name} onChange={(e) => setNewPersonnel({ ...newPersonnel, first_name: e.target.value })} placeholder="Required" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Last Name *</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.last_name} onChange={(e) => setNewPersonnel({ ...newPersonnel, last_name: e.target.value })} placeholder="Required" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Middle Name</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.middle_name} onChange={(e) => setNewPersonnel({ ...newPersonnel, middle_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Email</label>
                    <input type="email" className="input input-sm text-sm w-full" value={newPersonnel.email} onChange={(e) => setNewPersonnel({ ...newPersonnel, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Item No.</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.item_no} onChange={(e) => setNewPersonnel({ ...newPersonnel, item_no: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Account No.</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.accnt_no} onChange={(e) => setNewPersonnel({ ...newPersonnel, accnt_no: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Unit Assignment</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.unit_assignment} onChange={(e) => setNewPersonnel({ ...newPersonnel, unit_assignment: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold mb-1">Designation</label>
                    <input type="text" className="input input-sm text-sm w-full" value={newPersonnel.designation} onChange={(e) => setNewPersonnel({ ...newPersonnel, designation: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/60">
                <button onClick={() => setShowCreatePersonnel(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (!newPersonnel.first_name || !newPersonnel.last_name) {
                      toast.error('First name and last name are required')
                      return
                    }
                    createPersonnelMutation.mutate(newPersonnel)
                  }}
                  disabled={createPersonnelMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {createPersonnelMutation.isPending ? 'Creating...' : 'Create Personnel'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowImport(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 pt-6 pb-8 relative overflow-hidden">
                <FileSpreadsheet className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <button onClick={() => setShowImport(false)} className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Import Personnel</h3>
                <p className="text-sm text-primary-200 mt-1">Bulk-upload personnel from a roster CSV</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expected CSV columns</p>
                  <code className="text-[11px] leading-5 text-slate-600 dark:text-slate-300 font-mono">
                    rank, last_name, first_name, middle_name, item_no,<br />
                    accnt_no, unit_assignment, designation, email
                  </code>
                </div>

                {importResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Import finished
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 py-2">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.created ?? 0}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Created</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 py-2">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated ?? 0}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Updated</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 py-2">
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped ?? 0}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Skipped</p>
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((e: string, i: number) => (
                          <p key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 mb-1">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{String(e)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                      importFile
                        ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <Upload className="w-8 h-8 mb-2 text-slate-400" />
                    {importFile ? (
                      <>
                        <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{importFile.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(importFile.size / 1024).toFixed(1)} KB — click to change</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Click to choose a CSV file</p>
                        <p className="text-xs text-slate-400 mt-1">.csv or .txt, max 10 MB</p>
                      </>
                    )}
                  </label>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/60">
                <button onClick={() => setShowImport(false)} className="btn btn-ghost btn-sm">Close</button>
                {!importResult && (
                  <button
                    onClick={() => importFile && importMutation.mutate(importFile)}
                    disabled={!importFile || importMutation.isPending}
                    className="btn btn-primary btn-sm"
                  >
                    {importMutation.isPending ? 'Importing...' : 'Import'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Clear Data Confirmation */}
      {showClearConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowClearConfirm(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-red-500 to-red-700 px-6 pt-6 pb-8 relative overflow-hidden">
                <AlertTriangle className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <h3 className="text-lg font-bold text-white">Clear Personnel Data</h3>
                <p className="text-sm text-red-200 mt-1">This action cannot be undone</p>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600">
                  This will permanently delete all non-admin personnel records. 
                  Admin accounts will be preserved. Are you sure?
                </p>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                <button onClick={() => setShowClearConfirm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-none"
                >
                  {clearMutation.isPending ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
