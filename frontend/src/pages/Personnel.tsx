import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Search, Users as UsersIcon, Upload, Download } from 'lucide-react'
import { useState, useRef } from 'react'
import StatCard from '@/components/StatCard'

export default function Personnel() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [officeFilter, setOfficeFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['personnel'],
    queryFn: () => api.get('/personnel').then((res) => res.data),
  })

  const { data: offices } = useQuery({
    queryKey: ['offices-min'],
    queryFn: () => api.get('/offices').then((res) => res.data),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/personnel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] })
      toast.success(res?.data?.message || 'Import complete')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Import failed')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const officesArr = Array.isArray(offices)
    ? offices
    : (offices?.data ?? [])

  const filtered = (personnel ?? []).filter((u: any) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rank?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.item_no?.toLowerCase().includes(q) ||
      u.accnt_no?.toLowerCase().includes(q) ||
      u.unit_assignment?.toLowerCase().includes(q) ||
      u.designation?.toLowerCase().includes(q)
    const matchesOffice =
      !officeFilter || String(u.office_id) === String(officeFilter)
    return matchesSearch && matchesOffice
  })

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
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="btn btn-secondary btn-sm"
          >
            <Upload className="w-4 h-4" />
            {importMutation.isPending ? 'Importing...' : 'Import CSV'}
          </button>
          <a
            href="/api/personnel/export"
            className="btn btn-secondary btn-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
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
                placeholder="Search by name, rank, item no, unit, designation..."
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
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
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
                  <th>Last Name</th>
                  <th>First Name</th>
                  <th>Middle Name</th>
                  <th>Item No</th>
                  <th>Accnt No</th>
                  <th>Unit Assignment</th>
                  <th>Designation</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any) => (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap text-sm font-medium text-slate-700">
                      {u.rank || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-900">
                      {u.last_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-900">
                      {u.first_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {u.middle_name || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {u.item_no || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {u.accnt_no || '—'}
                    </td>
                    <td className="text-sm text-slate-600">
                      {u.unit_assignment || '—'}
                    </td>
                    <td className="text-sm text-slate-600">
                      {u.designation || '—'}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-500">
                      {u.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
