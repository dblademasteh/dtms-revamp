import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import toast from 'react-hot-toast'
import Select from 'react-select'
import { buildSelectStyles } from '@/utils/selectStyles'
import {
  Building2,
  Camera,
  User as UserIcon,
  Users,
  Trash2,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const OFFICE_TYPES = [
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'provincial_office', label: 'Provincial Office' },
  { value: 'fire_station', label: 'Fire Station' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
  { value: 'others', label: 'Others' },
]

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  OFFICE_TYPES.map((t) => [t.value, t.label])
)

function normalizeLogo(office: any): string | null {
  if (!office?.logo) return null
  return office.logo.startsWith('/') ? office.logo : `/storage/${office.logo}`
}

export default function OfficeProfile() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [unitCode, setUnitCode] = useState('')
  const [description, setDescription] = useState('')
  const [officeType, setOfficeType] = useState('')
  const [headUserId, setHeadUserId] = useState<number | ''>('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [onboardMode, setOnboardMode] = useState<'claim' | 'create'>('claim')
  const [parentId, setParentId] = useState<number | ''>('')
  const selectStyles = useMemo(() => buildSelectStyles(), [])

  const officeQuery = useQuery({
    queryKey: ['my-office'],
    queryFn: () => api.get('/my-office').then((r) => r.data.office),
  })

  const personnelQuery = useQuery({
    queryKey: ['my-office-personnel'],
    queryFn: () => api.get('/personnel').then((r) => r.data),
  })

  const office = officeQuery.data
  const personnel = personnelQuery.data || []
  const members = personnel.filter(
    (p: any) => office && String(p.office_id) === String(office.id)
  )

  const claimableQuery = useQuery({
    queryKey: ['offices-claimable'],
    queryFn: () =>
      api.get('/offices/claimable').then((r) =>
        Array.isArray(r.data) ? r.data : r.data?.value || r.data || []
      ),
  })

  const parentQuery = useQuery({
    queryKey: ['offices'],
    queryFn: () =>
      api.get('/offices').then((r) =>
        Array.isArray(r.data) ? r.data : r.data?.value || r.data || []
      ),
  })

  const claimMutation = useMutation({
    mutationFn: (officeId: number) => api.post('/my-office/claim', { office_id: officeId }),
    onSuccess: (res) => {
      handleBound(res.data.office)
      toast.success('Office claimed')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to claim office'),
  })

  const registerMutation = useMutation({
    mutationFn: (data: any) => api.post('/my-office/register', data),
    onSuccess: (res) => {
      handleBound(res.data.office)
      toast.success('Station profile created')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create station profile'),
  })

  const handleBound = (office: any) => {
    const { user, setUser } = useAuthStore.getState()
    if (user) {
      setUser({ ...user, office_id: office.id, office: { id: office.id, name: office.name } })
    }
    queryClient.invalidateQueries({ queryKey: ['my-office'] })
    queryClient.invalidateQueries({ queryKey: ['my-office-personnel'] })
    queryClient.invalidateQueries({ queryKey: ['offices'] })
    queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
    queryClient.invalidateQueries({ queryKey: ['offices-claimable'] })
    queryClient.invalidateQueries({ queryKey: ['personnel'] })
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = {
      name,
      unit_code: unitCode || null,
      office_type: officeType || null,
      description: description || null,
    }
    if (parentId) data.parent_office_id = parentId
    registerMutation.mutate(data)
  }

  useEffect(() => {
    if (office) {
      setName(office.name || '')
      setUnitCode(office.unit_code || '')
      setDescription(office.description || '')
      setOfficeType(office.office_type || '')
      setHeadUserId(office.head_user_id || '')
    }
  }, [office])

  const logoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('logo', file)
      return api.post('/my-office/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-office'] })
      setLogoPreview(null)
      toast.success('Office logo updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Logo upload failed')
    },
  })

  const removeLogoMutation = useMutation({
    mutationFn: () => api.delete('/my-office/logo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-office'] })
      setLogoPreview(null)
      toast.success('Office logo removed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove logo')
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.put('/my-office', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-office'] })
      queryClient.invalidateQueries({ queryKey: ['offices'] })
      queryClient.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      setName(res.data.office.name || '')
      setUnitCode(res.data.office.unit_code || '')
      setDescription(res.data.office.description || '')
      setOfficeType(res.data.office.office_type || '')
      setHeadUserId(res.data.office.head_user_id || '')
      toast.success(res.data.message || 'Office profile updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Save failed')
    },
  })

  const logoUrl = logoPreview || normalizeLogo(office)

  const chiefOptions = personnel.map((p: any) => ({
    value: p.id,
    label: [p.rank, p.full_name || p.name].filter(Boolean).join(' '),
    designation: p.designation || '',
    isMember: p.office_id ? String(p.office_id) === String(office.id) : false,
  }))

  const handleSave = () => {
    saveMutation.mutate({ name, unit_code: unitCode, description, office_type: officeType, head_user_id: headUserId || null })
  }

  const typeLabel = office?.office_type ? TYPE_LABELS[office.office_type] || office.office_type : ''

  if (officeQuery.isLoading) {
    return (
      <div className="card">
        <div className="card-body text-sm text-slate-500">Loading office profile...</div>
      </div>
    )
  }

  if (officeQuery.isError || !office) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Set Up Your Station</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your station has no office profile yet. Claim an existing office or create your own
            station profile.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setOnboardMode('claim')}
            className={`card p-5 text-left cursor-pointer transition-all ${
              onboardMode === 'claim'
                ? 'ring-2 ring-primary-500 border-primary-500'
                : 'hover:border-slate-300'
            }`}
          >
            <Building2 className="w-6 h-6 text-primary-600" />
            <h2 className="mt-2 font-semibold text-slate-900">Claim an existing office</h2>
            <p className="text-xs text-slate-500 mt-1">
              Pick your station from the list of unclaimed offices.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setOnboardMode('create')}
            className={`card p-5 text-left cursor-pointer transition-all ${
              onboardMode === 'create'
                ? 'ring-2 ring-primary-500 border-primary-500'
                : 'hover:border-slate-300'
            }`}
          >
            <Plus className="w-6 h-6 text-primary-600" />
            <h2 className="mt-2 font-semibold text-slate-900">Create station profile</h2>
            <p className="text-xs text-slate-500 mt-1">
              Register a brand-new office for your station.
            </p>
          </button>
        </div>

        {onboardMode === 'claim' ? (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Available offices
              </h2>
            </div>
            <div className="card-body">
              {claimableQuery.isLoading ? (
                <div className="text-sm text-slate-500">Loading offices...</div>
              ) : claimableQuery.data?.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No unclaimed offices available. Create your station profile instead.
                </div>
              ) : (
                <div className="space-y-2">
                  {(claimableQuery.data || []).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:border-primary-300"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{o.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                          {o.unit_code && <span className="font-mono">{o.unit_code}</span>}
                          <span className="font-mono">{o.code}</span>
                          {o.office_type && (
                            <span className="capitalize">{o.office_type.replace('_', ' ')}</span>
                          )}
                          {o.parent && <span>· {o.parent.name}</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => claimMutation.mutate(o.id)}
                        disabled={claimMutation.isPending}
                        className="btn btn-primary btn-sm"
                      >
                        Claim
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Station profile
              </h2>
            </div>
            <form onSubmit={handleRegister} className="card-body space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Station name *</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BFP Cauayan Fire Station"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Unit code</span>
                  </label>
                  <input
                    className="input input-bordered w-full"
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    placeholder="e.g. 9.0"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Office type</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={officeType}
                    onChange={(e) => setOfficeType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    {OFFICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Under office (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">— None —</option>
                  {(parentQuery.data || []).map((o: any) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of your station"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="submit" disabled={registerMutation.isPending} className="btn btn-primary">
                  {registerMutation.isPending ? 'Creating...' : 'Create station profile'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Office Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your office's identity, contact information, and members
        </p>
      </div>

      {/* Header banner with logo */}
      <div className="card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-navy-900 to-navy-700 relative">
          {logoUrl && (
            <img src={logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}
        </div>
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative -mt-16 flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 ring-4 ring-white dark:ring-slate-800 shadow-xl border border-slate-200 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Office logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 flex gap-1">
                <label className="cursor-pointer w-9 h-9 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg flex items-center justify-center transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('Image must be under 5 MB')
                        return
                      }
                      setLogoPreview(URL.createObjectURL(file))
                      logoMutation.mutate(file)
                    }}
                  />
                </label>
                {(office.logo || logoPreview) && (
                  <button
                    type="button"
                    onClick={() => removeLogoMutation.mutate()}
                    disabled={removeLogoMutation.isPending}
                    className="w-9 h-9 rounded-full bg-danger-600 hover:bg-danger-700 text-white shadow-lg flex items-center justify-center transition-colors"
                    title="Remove logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-slate-900 truncate">{office.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {office.unit_code && (
                  <span className="font-mono text-[11px] font-bold tracking-wide text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-700/60">
                    {office.unit_code}
                  </span>
                )}
                <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                  {office.code}
                </span>
                {typeLabel && (
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 capitalize">
                    {typeLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 mt-3 text-sm text-slate-500">
                {office.parent && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Under {office.parent.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {members.length} member(s)
                </span>
                {office.head && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Chief:{' '}
                    <span className="font-medium text-slate-700">
                      {[office.head.rank, office.head.full_name || office.head.name].filter(Boolean).join(' ')}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable details */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Office Information
          </h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Unit Code</label>
              <input className="input" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="e.g. 20500" maxLength={20} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Office Type</label>
              <select className="input" value={officeType} onChange={(e) => setOfficeType(e.target.value)}>
                <option value="">Select type...</option>
                {OFFICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Chief of Office</label>
            <Select
              styles={selectStyles}
              placeholder="Search and select a chief..."
              isClearable
              menuPortalTarget={document.body}
              menuPosition="fixed"
              options={chiefOptions}
              value={chiefOptions.find((o: any) => o.value === headUserId) || null}
              onChange={(opt: any) => setHeadUserId(opt ? opt.value : '')}
              formatOptionLabel={(option: any) => (
                <div className="flex flex-col">
                  <span className="font-medium text-sm">
                    {option.label}
                    {!option.isMember && (
                      <span className="ml-2 text-[10px] font-semibold text-primary-600 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 px-1.5 py-0.5 rounded border border-primary-200 dark:border-primary-700/60">
                        Not a member
                      </span>
                    )}
                  </span>
                  {option.designation && (
                    <span className="text-[11px] text-slate-400">{option.designation}</span>
                  )}
                </div>
              )}
            />
            <p className="text-xs text-slate-400 mt-1">
              Search the personnel directory. Selecting someone who is not yet a member adds them to your office.
            </p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of the office..." />
          </div>
          <div className="flex justify-end pt-1">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn btn-primary btn-sm">
              {saveMutation.isPending ? 'Saving...' : 'Save Office Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Office Members
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600">
            {members.length}
          </span>
        </div>
        <div className="card-body">
          {members.length === 0 ? (
            <p className="text-sm text-slate-500">No members assigned to this office yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((p: any) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 ring-1 ring-primary-200 dark:ring-primary-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar.startsWith('/') ? p.avatar : `/storage/${p.avatar}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {p.rank ? `${p.rank} ` : ''}{p.full_name || p.name}
                      {office.head_user_id === p.id && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-700/60">
                          <ShieldCheck className="w-3 h-3" /> Chief
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {[p.designation, p.accnt_no && `No. ${p.accnt_no}`].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
