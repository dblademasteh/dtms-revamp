import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Search, X, UserPlus, Users as UsersIcon, UserCheck, UserX, Shield, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import Select from 'react-select'
import ModalPortal from '@/components/ModalPortal'
import { useAuthStore } from '@/stores/authStore'
import StatCard from '@/components/StatCard'
import { buildSelectStyles } from '@/utils/selectStyles'
import { useRanks } from '@/hooks/useRanks'

const ROLES = [
  { value: 'superadmin', label: 'Super Admin', color: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  { value: 'officer', label: 'Officer', color: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' },
  { value: 'non_officer', label: 'Non-Officer', color: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
  { value: 'fcos', label: 'FCOS', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
  { value: 'office_station', label: 'Office/Station', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800' },
]

const STATUSES = [
  { value: 'active', label: 'Active', color: 'badge-success' },
  { value: 'inactive', label: 'Inactive', color: 'badge-neutral' },
  { value: 'suspended', label: 'Suspended', color: 'badge-danger' },
]



export default function Users() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const ranks = useRanks()
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState<'all' | 'personnel' | 'office'>('all')
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editOffice, setEditOffice] = useState('')
  const [editRank, setEditRank] = useState('')
  const [editCanViewAllDocs, setEditCanViewAllDocs] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  // Build select styles once on mount (dark-mode aware)
  const selectStyles = useMemo(() => buildSelectStyles(), [])
  const [showOfficeAccount, setShowOfficeAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', email: '', role: 'office_station', office_id: '', password: 'bfp12345', is_chief: true })
  const [showPersonnel, setShowPersonnel] = useState(false)
  const [personnelSearch, setPersonnelSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

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
    enabled: showPersonnel || showOfficeAccount,
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

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/office-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['offices-all'] })
      toast.success('Office account created')
      setShowOfficeAccount(false)
      setNewAccount({ name: '', email: '', role: 'office_station', office_id: '', password: 'bfp12345', is_chief: true })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create account')
    },
  })

  const filtered = users?.filter((u: any) => {
    const matchesSearch =
      (u.full_name || u.name)?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.accnt_no?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (accountFilter === 'office') return u.role === 'office_station'
    if (accountFilter === 'personnel') return u.role !== 'office_station'
    return true
  }) || []

  const getRoleBadge = (role: string) => ROLES.find(r => r.value === role)?.color || 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role
  const getStatusBadge = (status: string) => STATUSES.find(s => s.value === status)?.color || 'badge-neutral'
  const getStatusLabel = (status: string) => STATUSES.find(s => s.value === status)?.label || status

  const startEdit = (u: any) => {
    setEditingUser(u)
    setEditRole(u.role)
    setEditStatus(u.status)
    setEditOffice(u.office_id ? String(u.office_id) : '')
    setEditRank(u.rank || '')
    setEditCanViewAllDocs(Boolean(u.can_view_all_documents))
    setResetPassword('')
    setShowResetPassword(false)
  }

  const saveEdit = () => {
    if (!editingUser) return
    const data: any = { 
      role: editRole, 
      status: editStatus, 
      office_id: editOffice || null, 
      rank: editRank || null,
      can_view_all_documents: editCanViewAllDocs 
    }
    if (resetPassword) data.password = resetPassword
    updateMutation.mutate({ id: editingUser.id, data })
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted')
      setDeleteTarget(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Delete failed')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage system users and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOfficeAccount(true)}
            className="btn btn-primary btn-sm"
          >
            <Shield className="w-4 h-4" /> Add Office Account
          </button>
          <button
            onClick={() => setShowPersonnel(true)}
            className="btn btn-secondary btn-sm"
          >
            <UserPlus className="w-4 h-4" /> Add from Personnel
          </button>
        </div>
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
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative max-w-md flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or account number..."
                className="input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'personnel', label: 'Personnel' },
                { value: 'office', label: 'Office' },
              ].map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setAccountFilter(f.value as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    accountFilter === f.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Account No</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => startEdit(u)}>
                    <td>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{u.rank || '—'}</span>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.full_name}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{u.email || '—'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{u.designation || '—'}</span>
                    </td>
                    <td>
                      <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{u.accnt_no || '—'}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`badge ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                        {u.can_view_all_documents && (
                          <span className="badge bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800 text-[10px]" title="Granted permission to view all system documents">
                            View All Docs
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(u.status)}`}>
                        {getStatusLabel(u.status)}
                      </span>
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
                {/* Rank */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                    Rank
                  </label>
                  <select
                    value={editRank}
                    onChange={(e) => setEditRank(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="">No Rank / Select Rank...</option>
                    {ranks.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

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
                          {r.value === 'superadmin' && 'Full system access & elevated doc status tracking'}
                          {r.value === 'officer' && 'Can approve & route office documents'}
                          {r.value === 'non_officer' && 'Can create & track own documents'}
                          {r.value === 'fcos' && 'Elevated access — View & track all system documents'}
                          {r.value === 'office_station' && 'Office/station account'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Permissions */}
                <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800/60 bg-primary-50/50 dark:bg-primary-900/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        View & Track All System Documents
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Grants permission to view and check status of all documents system-wide without changing account role.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="checkbox w-5 h-5 accent-primary-600 rounded cursor-pointer"
                      checked={editCanViewAllDocs}
                      onChange={(e) => setEditCanViewAllDocs(e.target.checked)}
                    />
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
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>

                {/* Reset Password */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
                  >
                    {showResetPassword ? '−' : '+'} Reset Password
                  </button>
                  {showResetPassword && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="Enter new password (min. 6 chars)"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-700/30 flex justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
                <div>
                  {editingUser.id !== user?.id && (
                    <button
                      onClick={() => { setEditingUser(null); setDeleteTarget(editingUser) }}
                      className="px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
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
          </div>
        </ModalPortal>
      )}

      {/* Add Office Account Modal */}
      {showOfficeAccount && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowOfficeAccount(false)} />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-primary-600 to-primary-700 relative overflow-hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white leading-tight">Add Office Account</h3>
                  <p className="text-xs text-primary-100 mt-0.5">Creates a new dedicated account — login username is the office unit code</p>
                </div>
                <button onClick={() => setShowOfficeAccount(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Account Details */}
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Account Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Auto-filled from selected office"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">This is a new dedicated account for the office — it does not modify any personnel record.</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Username (login)</label>
                      <input
                        type="text"
                        className="input bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                        placeholder="Auto-filled from unit code"
                        value={(() => {
                          const off = offices?.find((o: any) => String(o.id) === newAccount.office_id)
                          return off?.unit_code || ''
                        })()}
                        disabled
                        readOnly
                      />
                      <p className="text-[11px] text-slate-400 mt-1">The office unit code is the login username (e.g. 20500).</p>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                      <input
                        type="email"
                        className="input"
                        placeholder="office@bfp-r2.gov.ph"
                        value={newAccount.email}
                        onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Optional; can also be used to log in.</p>
                    </div>
                  </div>
                </section>

                {/* Role & Office */}
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Role & Office</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role <span className="text-danger-500">*</span></label>
                      <select
                        className="input"
                        value={newAccount.role}
                        onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value })}
                      >
                        <option value="office_station">Office/Station</option>
                        <option value="officer">Officer</option>
                        <option value="non_officer">Non-Officer</option>
                        <option value="fcos">FCOS</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Office <span className="text-danger-500">*</span></label>
                      <Select
                        isSearchable
                        isClearable
                        options={offices?.map((o: any) => ({ value: String(o.id), label: o.name.replace(/^[\d\.]+\s*/, '') })) || []}
                        value={newAccount.office_id ? { value: newAccount.office_id, label: offices?.find((o: any) => String(o.id) === newAccount.office_id)?.name.replace(/^[\d\.]+\s*/, '') } : null}
                        onChange={(opt: any) => {
                          const off = offices?.find((o: any) => String(o.id) === opt?.value)
                          setNewAccount({ ...newAccount, office_id: opt ? opt.value : '', name: off ? off.name : newAccount.name })
                        }}
                        placeholder="Search office..."
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  </div>
                </section>

                {/* Chief Assignment */}
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Chief Assignment</h4>
                  <div className="p-4 rounded-xl border-2 border-primary-100 bg-gradient-to-br from-primary-50/60 to-white dark:border-primary-800/60 dark:from-primary-900/20 dark:to-slate-900">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newAccount.is_chief}
                        onChange={(e) => setNewAccount({ ...newAccount, is_chief: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Set as office chief</span>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                          The new account leads this office and appears in the office hierarchy.
                        </p>
                      </div>
                    </label>
                    {(() => {
                      const sel = offices?.find((o: any) => String(o.id) === newAccount.office_id)
                      if (!sel) {
                        return <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-3">Select an office to see its current chief.</p>
                      }
                      return (
                        <div className="mt-3 pt-3 border-t border-primary-100 dark:border-primary-800/60">
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            Current chief:{' '}
                            {sel.head ? (
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {[sel.head.rank, sel.head.full_name || sel.head.name].filter(Boolean).join(' ')}
                              </span>
                            ) : (
                              <span className="font-medium text-slate-700 dark:text-slate-200">None</span>
                            )}
                          </p>
                          {newAccount.is_chief && sel.head && (
                            <p className="text-[12px] text-primary-600 dark:text-primary-400 mt-1">
                              The new account will replace the current chief.
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </section>

                {/* Password */}
                <section>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Password</h4>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password <span className="text-danger-500">*</span></label>
                    <input
                      type="text"
                      className="input"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Default: bfp12345 (min. 6 characters)</p>
                  </div>
                </section>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/60">
                <button onClick={() => setShowOfficeAccount(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={() => {
                    if (!newAccount.office_id) {
                      toast.error('Select an office')
                      return
                    }
                    createAccountMutation.mutate({
                      office_id: Number(newAccount.office_id),
                      name: newAccount.name || undefined,
                      role: newAccount.role,
                      password: newAccount.password,
                      email: newAccount.email || null,
                      is_chief: newAccount.is_chief,
                    })
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
                  placeholder="Search by name, rank, designation, unit..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {personnelLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
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
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
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

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeleteTarget(null)} />
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Delete User</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-300">{deleteTarget.full_name}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
