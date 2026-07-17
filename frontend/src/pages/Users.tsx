import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Search, X, UserPlus, Users as UsersIcon, UserCheck, UserX, Shield } from 'lucide-react'
import { useState, useMemo } from 'react'
import Select from 'react-select'
import ModalPortal from '@/components/ModalPortal'
import { useAuthStore } from '@/stores/authStore'
import StatCard from '@/components/StatCard'
import { buildSelectStyles } from '@/utils/selectStyles'

const ROLES = [
  { value: 'superadmin', label: 'Super Admin', color: 'bg-red-50 text-red-700 border border-red-200' },
  { value: 'officer', label: 'Officer', color: 'bg-violet-50 text-violet-700 border border-violet-200' },
  { value: 'non_officer', label: 'Non-Officer', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { value: 'fcos', label: 'FCOS', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
]

const STATUSES = [
  { value: 'active', label: 'Active', color: 'badge-success' },
  { value: 'inactive', label: 'Inactive', color: 'badge-neutral' },
  { value: 'suspended', label: 'Suspended', color: 'badge-danger' },
]



export default function Users() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editOffice, setEditOffice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  // Build select styles once on mount (dark-mode aware)
  const selectStyles = useMemo(() => buildSelectStyles(), [])
  const [newUser, setNewUser] = useState({
    name: '', email: '', accnt_no: '', password: '', role: 'non_officer', office_id: '', phone: ''
  })
  const [showPersonnel, setShowPersonnel] = useState(false)
  const [personnelSearch, setPersonnelSearch] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(res => res.data),
  })

  const { data: offices } = useQuery({
    queryKey: ['offices-all'],
    queryFn: () => api.get('/offices').then(res => res.data),
  })

  const { data: personnel, isLoading: personnelLoading } = useQuery({
    queryKey: ['personnel-picker'],
    queryFn: () => api.get('/personnel').then(res => res.data),
    enabled: showPersonnel,
  })

  const fromPersonnelMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/users/from-personnel', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(res?.data?.message || 'Account created')
      setShowPersonnel(false)
      setPersonnelSearch('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create account')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated')
      setEditingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Update failed')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User created')
      setShowCreate(false)
      setNewUser({ name: '', email: '', accnt_no: '', password: '', role: 'non_officer', office_id: '', phone: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Create failed')
    },
  })

  const filtered = users?.filter((u: any) =>
    (u.full_name || u.name)?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.accnt_no?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const getRoleBadge = (role: string) => ROLES.find(r => r.value === role)?.color || 'bg-slate-50 text-slate-700 border border-slate-200'
  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role
  const getStatusBadge = (status: string) => STATUSES.find(s => s.value === status)?.color || 'badge-neutral'
  const getStatusLabel = (status: string) => STATUSES.find(s => s.value === status)?.label || status

  const startEdit = (u: any) => {
    setEditingUser(u)
    setEditRole(u.role)
    setEditStatus(u.status)
    setEditOffice(u.office_id ? String(u.office_id) : '')
  }

  const saveEdit = () => {
    if (!editingUser) return
    updateMutation.mutate({
      id: editingUser.id,
      data: { role: editRole, status: editStatus, office_id: editOffice || null },
    })
  }

  const handleCreate = () => {
    if (!newUser.name || !newUser.accnt_no || !newUser.password || !newUser.office_id) {
      toast.error('Please fill in all required fields')
      return
    }
    createMutation.mutate(newUser)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage system users and their roles
          </p>
        </div>
        <button
          onClick={() => setShowPersonnel(true)}
          className="btn btn-secondary btn-sm"
        >
          <UserPlus className="w-4 h-4" /> Add from Personnel
        </button>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={(users ?? []).length}
          icon={<UsersIcon className="w-5 h-5" />}
          color="bg-primary-50 text-primary-600"
        />
        <StatCard
          label="Active"
          value={(users ?? []).filter((u: any) => u.status === 'active').length}
          icon={<UserCheck className="w-5 h-5" />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Inactive / Suspended"
          value={(users ?? []).filter((u: any) => u.status !== 'active').length}
          icon={<UserX className="w-5 h-5" />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          label="Administrators"
          value={(users ?? []).filter((u: any) => u.role === 'superadmin').length}
          icon={<Shield className="w-5 h-5" />}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or account number..."
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-28 bg-slate-200 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Account No</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 text-sm font-semibold">
                            {u.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.full_name || u.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email || 'No email'}</p>
                          {u.designation && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{u.designation}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-mono text-slate-600">{u.accnt_no || '—'}</span>
                    </td>
                    <td>
                      <span className={`badge ${getRoleBadge(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(u.status)}`}>
                        {getStatusLabel(u.status)}
                      </span>
                    </td>
                    <td className="text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => startEdit(u)}
                          className="btn btn-ghost btn-sm"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setEditingUser(null)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-primary-600 to-primary-700">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                    {editingUser.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{editingUser.full_name || editingUser.name}</h3>
                    <p className="text-sm text-primary-200 truncate">{editingUser.accnt_no || editingUser.email}</p>
                    {editingUser.rank && (
                      <p className="text-xs text-primary-300 mt-0.5">{editingUser.rank}</p>
                    )}
                  </div>
                  <button onClick={() => setEditingUser(null)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Role */}
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3 block">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setEditRole(r.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          editRole === r.value
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-200'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide mb-1.5 ${r.color}`}>
                          {r.label}
                        </div>
                        <p className="text-xs text-slate-500">
                          {r.value === 'superadmin' && 'Full system access'}
                          {r.value === 'officer' && 'Can approve & route'}
                          {r.value === 'non_officer' && 'Can create documents'}
                          {r.value === 'fcos' && 'Fire Code Officer'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                    Account Status
                  </label>
                  <div className="flex gap-2">
                    {STATUSES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setEditStatus(s.value)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          editStatus === s.value
                            ? s.value === 'active'
                              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-200'
                              : s.value === 'inactive'
                              ? 'border-slate-300 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-2 ring-slate-200'
                              : 'border-red-300 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Office */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                    Assigned Office
                  </label>
                  <Select
                    isClearable
                    isSearchable
                    options={offices?.map((o: any) => ({ value: String(o.id), label: o.name.replace(/^[\d\.]+\s*/, '') })) || []}
                    value={editOffice ? { value: editOffice, label: offices?.find((o: any) => String(o.id) === editOffice)?.name.replace(/^[\d\.]+\s*/, '') } : null}
                    onChange={(val: any) => setEditOffice(val ? val.value : '')}
                    placeholder="Search office..."
                    styles={selectStyles}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700/30 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/60">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Create Modal */}
      {showCreate && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create User</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Account Number *</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.accnt_no}
                  onChange={(e) => setNewUser({ ...newUser, accnt_no: e.target.value })}
                  placeholder="e.g. ACC-100"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email (Optional)</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@dts.gov.ph"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password *</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                  <select
                    className="input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Office *</label>
                    <Select
                      isSearchable
                      options={offices?.map((o: any) => ({ value: String(o.id), label: o.name.replace(/^[\d\.]+\s*/, '') })) || []}
                      value={newUser.office_id ? { value: newUser.office_id, label: offices?.find((o: any) => String(o.id) === newUser.office_id)?.name.replace(/^[\d\.]+\s*/, '') } : null}
                      onChange={(val: any) => setNewUser({ ...newUser, office_id: val ? val.value : '' })}
                      placeholder="Search..."
                      styles={{
                        ...selectStyles,
                        control: (base: any, state: any) => ({
                          ...selectStyles.control(base, state),
                          backgroundColor: '#fff',
                        })
                      }}
                    />
                  </div>
                </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary btn-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Add from Personnel Modal */}
      {showPersonnel && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowPersonnel(false)}
            />
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add from Personnel</h3>
              <button onClick={() => setShowPersonnel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="input pl-9"
                  placeholder="Search by name, rank, item no, unit..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {personnelLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(personnel ?? [])
                    .filter((p: any) => {
                      const q = personnelSearch.toLowerCase()
                      return (
                        !personnelSearch ||
                        `${p.name} ${p.rank} ${p.item_no} ${p.unit_assignment} ${p.designation}`.toLowerCase().includes(q)
                      )
                    })
                    .map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {p.rank ? `${p.rank} ` : ''}{p.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {p.unit_assignment || '—'}
                            {p.designation ? ` · ${p.designation}` : ''}
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
              )}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400">
              Select a personnel record to provision their login account. Role is derived from rank; default password is <span className="font-mono">bfp12345</span>.
            </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
