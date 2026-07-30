import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Search, Users as UsersIcon, Building2, X, UserPlus, Shield, Trash2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import StatCard from '@/components/StatCard'
import ModalPortal from '@/components/ModalPortal'
import Select from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'

export default function Personnel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [officeFilter, setOfficeFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [targetOfficeId, setTargetOfficeId] = useState<string>('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [personnelSearch, setPersonnelSearch] = useState('')
  const [showOfficeAccount, setShowOfficeAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', email: '', role: 'officer', office_id: '', password: 'bfp12345' })
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => api.get('/personnel').then((res) => res.data),
  })

  const { data: offices } = useQuery({
    queryKey: ['offices-min'],
    queryFn: () => api.get('/offices').then((res) => res.data),
  })

  const { data: personnelList } = useQuery({
    queryKey: ['personnel-all'],
    queryFn: () => api.get('/personnel').then(res => res.data),
    enabled: showAddUser,
  })

  const fromPersonnelMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/users/from-personnel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success('User account created')
      setShowAddUser(false)
      setPersonnelSearch('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create account')
    },
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

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success('Office account created')
      setShowOfficeAccount(false)
      setNewAccount({ name: '', email: '', role: 'officer', office_id: '', password: 'bfp12345' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create account')
    },
  })

  const officesArr = Array.isArray(offices)
    ? offices
    : (offices?.data ?? [])

  const selectStyles = buildSelectStyles()

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
    return matchesSearch && matchesOffice
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personnel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of all personnel across offices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="btn btn-primary btn-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={() => setShowOfficeAccount(true)}
            className="btn btn-secondary btn-sm"
          >
            <Shield className="w-4 h-4" />
            Add Office Account
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
          color="bg-primary-50 text-primary-600"
        />
        <StatCard
          label="Distinct Units"
          value={new Set((personnel ?? []).map((u: any) => u.unit_assignment).filter(Boolean)).size}
          icon={<UsersIcon className="w-5 h-5" />}
          color="bg-cyan-50 text-cyan-600"
        />
        <StatCard
          label="Without Office"
          value={(personnel ?? []).filter((u: any) => !u.office_id).length}
          icon={<UsersIcon className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Officers"
          value={(personnel ?? []).filter((u: any) =>
            ['SUPT', 'INSP', 'CINSP', 'FO1', 'FO2', 'FO3', 'SFO1', 'SFO2', 'SFO3', 'SFO4']
              .includes((u.rank || '').toUpperCase())
          ).length}
          icon={<UsersIcon className="w-5 h-5" />}
          color="bg-green-50 text-green-600"
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
        </div>
      </div>

      {/* Directory */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
                <div className="h-4 flex-1 bg-slate-200 rounded" />
                <div className="h-4 w-40 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">No personnel found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>First Name</th>
                  <th>Middle Name</th>
                  <th>Last Name</th>
                  <th>Suffix</th>
                  <th>Office</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr
                    key={u.id}
                    onClick={() => openDetail(u)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                      {u.rank || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                      {u.first_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {u.middle_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                      {u.last_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {u.suffix || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {u.office?.name || '—'}
                    </td>
                    <td className="text-sm text-slate-600 dark:text-slate-300">
                      {u.designation || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                      {u.role ? u.role.replace('_', ' ') : '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
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
                      <option value="">—</option>
                      {['SUPT', 'CSUPT', 'FCSUPT', 'SINSP', 'CINSP', 'FCINSP', 'INSP', 'FO1', 'FO2', 'FO3', 'SFO1', 'SFO2', 'SFO3', 'SFO4'].map((r) => (
                        <option key={r} value={r}>{r}</option>
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

      {/* Add User from Personnel Modal */}
      {showAddUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAddUser(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 px-6 pt-6 pb-8 relative overflow-hidden">
                <UserPlus className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <button onClick={() => setShowAddUser(false)} className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Add User from Personnel</h3>
                <p className="text-sm text-primary-200 mt-1">Select a personnel record to provision their login account</p>
              </div>
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="input pl-9"
                    placeholder="Search by name, rank, unit..."
                    value={personnelSearch}
                    onChange={(e) => setPersonnelSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  {(personnelList ?? [])
                    .filter((p: any) => {
                      const q = personnelSearch.toLowerCase()
                      return !personnelSearch || `${p.name} ${p.rank} ${p.unit_assignment} ${p.designation}`.toLowerCase().includes(q)
                    })
                    .map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {p.rank ? `${p.rank} ` : ''}{p.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {p.unit_assignment || '—'}{p.designation ? ` · ${p.designation}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => fromPersonnelMutation.mutate({ user_id: p.id })}
                          disabled={fromPersonnelMutation.isPending}
                          className="btn btn-primary btn-sm flex-shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Create
                        </button>
                      </div>
                    ))}
                </div>
              </div>
              <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-400">
                Role is derived from rank; default password is <span className="font-mono">bfp12345</span>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Add Office Account Modal */}
      {showOfficeAccount && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowOfficeAccount(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-6 pb-8 relative overflow-hidden">
                <Shield className="absolute right-4 bottom-4 w-20 h-20 text-white/10" />
                <button onClick={() => setShowOfficeAccount(false)} className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-white">Add Office Account</h3>
                <p className="text-sm text-indigo-200 mt-1">Create a new user account for an office</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Full name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="email@bfp-r2.gov.ph"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Role</label>
                  <select
                    className="input"
                    value={newAccount.role}
                    onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="officer">Officer</option>
                    <option value="non_officer">Non-Officer</option>
                    <option value="fcos">FCOS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office</label>
                  <Select
                    styles={{
                      ...selectStyles,
                      menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                    }}
                    placeholder="Select office..."
                    isClearable
                    options={officesArr.map((o: any) => ({ value: String(o.id), label: o.name }))}
                    value={newAccount.office_id ? { value: newAccount.office_id, label: officesArr.find((o: any) => String(o.id) === newAccount.office_id)?.name } : null}
                    onChange={(opt: any) => setNewAccount({ ...newAccount, office_id: opt ? opt.value : '' })}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="text"
                    className="input"
                    value={newAccount.password}
                    onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Default: bfp12345</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                <button onClick={() => setShowOfficeAccount(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (!newAccount.name || !newAccount.email || !newAccount.office_id) {
                      toast.error('Name, email, and office are required')
                      return
                    }
                    createAccountMutation.mutate(newAccount)
                  }}
                  disabled={createAccountMutation.isPending}
                  className="btn btn-primary btn-sm"
                >
                  {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
                </button>
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
