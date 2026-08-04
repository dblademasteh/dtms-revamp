import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import {
  HardDrive,
  Archive,
  Trash2,
  RefreshCw,
  Files,
  FileText,
  Image,
  BarChart3,
  ShieldAlert,
  Database,
  ChevronLeft,
  ChevronRight,
  Link2,
  Boxes,
  FolderOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  for (; value >= 1024 && i < units.length - 1; i++) value /= 1024
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

const TYPE_LABELS: Record<string, string> = {
  image: 'Images',
  pdf: 'PDFs',
  word: 'Word',
  excel: 'Excel',
  presentation: 'Presentations',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  image: 'bg-violet-500',
  pdf: 'bg-rose-500',
  word: 'bg-sky-500',
  excel: 'bg-emerald-500',
  presentation: 'bg-amber-500',
  other: 'bg-slate-400',
}

export default function Storage() {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; action: () => void } | null>(null)
  const [archivePage, setArchivePage] = useState(1)
  const [archiveSearch, setArchiveSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['storage-summary'],
    queryFn: () => api.get('/admin/storage/summary').then((r) => r.data),
  })

  const archiveQuery = useQuery({
    queryKey: ['storage-archive', archivePage, archiveSearch],
    queryFn: () => api.get('/admin/storage/archive', {
      params: { page: archivePage, per_page: 10, search: archiveSearch || undefined },
    }).then((r) => r.data),
  })

  const runAction = (key: string, url: string, successMsg?: string, refreshAll = true) => {
    setBusy(key)
    api.post(url)
      .then((res) => {
        toast.success(res.data?.message || successMsg || 'Done')
        refetch()
        archiveQuery.refetch()
        if (refreshAll) qc.invalidateQueries({ queryKey: ['offices-hierarchy'] })
      })
      .catch((e: any) => toast.error(e.response?.data?.message || 'Action failed'))
      .finally(() => setBusy(null))
  }

  const restore = (id: number) => {
    setBusy(`restore-${id}`)
    api.post(`/admin/storage/archive/${id}/restore`)
      .then((res) => {
        toast.success(res.data?.message || 'Restored')
        refetch()
        archiveQuery.refetch()
      })
      .catch((e: any) => toast.error(e.response?.data?.message || 'Restore failed'))
      .finally(() => setBusy(null))
  }

  const t = data?.totals
  const reclaim = data?.reclaimable
  const maxGrowth = Math.max(1, ...(data?.growth || []).map((g: any) => g.bytes))
  const maxType = Math.max(1, ...(data?.by_type || []).map((b: any) => b.bytes))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Storage Management
          </h2>
          <button
            className="btn btn-ghost btn-sm ml-auto"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="card-body">
          {isLoading && <p className="text-sm text-slate-500">Loading storage statistics...</p>}
          {isError && <p className="text-sm text-slate-500">Unable to load storage statistics.</p>}
          {data && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Files className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Active Storage</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatBytes(t.active_bytes)}</p>
                  <p className="text-xs text-slate-500">{t.active_files.toLocaleString()} active files</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Archive className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Archived</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatBytes(t.archived_bytes)}</p>
                  <p className="text-xs text-slate-500">{t.archived_files.toLocaleString()} files awaiting purge</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Reclaimable</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">{formatBytes(reclaim.total_bytes)}</p>
                  <p className="text-xs text-slate-500">{reclaim.total_files.toLocaleString()} files</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Total on disk</p>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatBytes(t.total_on_disk)}</p>
                  <p className="text-xs text-slate-500">
                    {t.compressed_bytes ? `+ ${formatBytes(t.compressed_bytes)} compressed` : 'compression n/a'}
                  </p>
                </div>
              </div>

              {/* Retention note */}
              <div className="flex items-center gap-2 px-3 py-2 mt-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 text-xs text-primary-800 dark:text-primary-200">
                <Database className="w-4 h-4 flex-shrink-0" />
                Completed (approved/released) documents are archived after{' '}
                <strong>{t.retention_months} months</strong> retention. Archived files are permanently purged after{' '}
                <strong>{t.archive_grace_days} days</strong>. Retention is configurable in Settings.
              </div>

              {/* By type */}
              <div className="mt-5">
                <p className="text-[13px] font-bold text-slate-600 mb-2 uppercase tracking-wider">Storage by File Type</p>
                <div className="space-y-2">
                  {(data.by_type || []).map((b: any) => (
                    <div key={b.category} className="flex items-center gap-3">
                      <span className="w-28 text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        {b.category === 'image'
                          ? <Image className="w-3.5 h-3.5" />
                          : <FileText className="w-3.5 h-3.5" />}
                        {TYPE_LABELS[b.category] || b.category}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${TYPE_COLORS[b.category] || TYPE_COLORS.other} transition-all`}
                          style={{ width: `${Math.max(2, (b.bytes / maxType) * 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs font-semibold text-slate-700">{formatBytes(b.bytes)}</span>
                      <span className="w-12 text-right text-xs text-slate-400">{b.files} files</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth */}
              <div className="mt-5">
                <p className="text-[13px] font-bold text-slate-600 mb-2 uppercase tracking-wider">Growth — Last 12 Months</p>
                <div className="flex items-end gap-1 h-24">
                  {(data.growth || []).map((g: any) => (
                    <div key={g.month} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className="w-full max-w-[22px] rounded-t bg-primary-400 dark:bg-primary-600 hover:bg-primary-500 transition-all"
                        style={{ height: `${Math.max(3, (g.bytes / maxGrowth) * 100)}%` }}
                      />
                      <div className="absolute -top-6 hidden group-hover:block bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                        {formatBytes(g.bytes)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {(data.growth || []).map((g: any) => (
                    <div key={g.month} className="flex-1 text-center text-[10px] text-slate-400">
                      {g.month.slice(2)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* System Directories */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">System Directories</h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Directory</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Path Mapping</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Files Count</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.directories || []).map((d: any) => (
                  <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span>{d.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500">
                      storage/app/public/{d.name}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">
                      {d.files_count.toLocaleString()} file(s)
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold text-slate-700">
                      {formatBytes(d.bytes)}
                    </td>
                  </tr>
                ))}
                {!data?.directories?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-sm text-slate-400 text-center">
                      No directories found in public storage
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Office quotas */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Boxes className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Office Quotas</h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Office</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Used</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Quota</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Usage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.by_office || []).map((o: any) => {
                  const pct = o.quota_bytes ? (o.bytes / o.quota_bytes) * 100 : o.bytes > 0 ? 100 : 0
                  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{o.name}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{formatBytes(o.bytes)}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {o.quota_bytes ? formatBytes(o.quota_bytes) : <span className="text-xs text-slate-400">Unlimited</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-40">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-10">
                            {o.quota_bytes ? `${pct.toFixed(0)}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!data?.by_office?.length && (
                  <tr><td colSpan={4} className="px-4 py-4 text-sm text-slate-400 text-center">No offices</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Quotas are set per office on the{' '}
            <Link2 className="inline w-3 h-3" /> <a href="/admin/offices" className="text-primary-600 hover:underline font-semibold">Offices</a> page.
            Uploads are blocked when an office exceeds its quota.
          </div>
        </div>
      </div>

      {/* Cleanup tools */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Cleanup &amp; Archive Tools</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Old versions */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Delete Old Versions</p>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                {formatBytes(reclaim?.old_versions_bytes || 0)} / {reclaim?.old_versions_files || 0} files — removes every non-latest
                attachment version, keeping only the newest copy of each filename.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy === 'versions' || !reclaim?.old_versions_files}
                onClick={() => setConfirm({
                  title: 'Delete old versions',
                  message: `Permanently delete ${reclaim?.old_versions_files} old version(s) (${formatBytes(reclaim?.old_versions_bytes || 0)})?`,
                  label: 'Delete',
                  action: () => runAction('versions', '/admin/storage/cleanup/versions'),
                })}
              >
                {busy === 'versions' ? 'Deleting...' : 'Purge Old Versions'}
              </button>
            </div>

            {/* Duplicates */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Delete Duplicates</p>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                {formatBytes(reclaim?.duplicate_bytes || 0)} / {reclaim?.duplicate_files || 0} files — identical files attached to
                multiple documents; keeps the newest copy.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy === 'duplicates' || !reclaim?.duplicate_files}
                onClick={() => setConfirm({
                  title: 'Delete duplicates',
                  message: `Permanently delete ${reclaim?.duplicate_files} duplicate(s) (${formatBytes(reclaim?.duplicate_bytes || 0)})?`,
                  label: 'Delete',
                  action: () => runAction('duplicates', '/admin/storage/cleanup/duplicates'),
                })}
              >
                {busy === 'duplicates' ? 'Deleting...' : 'Purge Duplicates'}
              </button>
            </div>

            {/* Archive expired */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Archive Expired Documents</p>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Moves attachments of approved/released documents past the {t?.retention_months || 12}-month retention window into the
                archive. Files are preserved but excluded from active storage.
              </p>
              <button
                className="btn btn-primary btn-sm"
                disabled={busy === 'archive'}
                onClick={() => setConfirm({
                  title: 'Archive expired attachments',
                  message: 'Move attachments of completed documents older than the retention window into the archive?',
                  label: 'Archive',
                  action: () => runAction('archive', '/admin/storage/archive/expired'),
                })}
              >
                {busy === 'archive' ? 'Archiving...' : 'Run Archive'}
              </button>
            </div>

            {/* Purge archived */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Purge Archived Files</p>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Permanently deletes archived files whose grace period ({t?.archive_grace_days || 30} days) has elapsed. This is the final
                space-reclaiming step.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy === 'purge' || !t?.archived_files}
                onClick={() => setConfirm({
                  title: 'Purge archived files',
                  message: `Permanently delete ${t?.archived_files || 0} archived file(s) (${formatBytes(t?.archived_bytes || 0)}) past the grace period?`,
                  label: 'Purge',
                  action: () => runAction('purge', '/admin/storage/archive/purge'),
                })}
              >
                {busy === 'purge' ? 'Purging...' : 'Purge Archived'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Largest files */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Files className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Largest Files</h2>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">File</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Office</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data?.largest || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 max-w-56 truncate">{a.file_name}</span>
                        {a.is_compressed && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            COMPRESSED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">{a.tracking_number || `#${a.document_id}`}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{a.office || '—'}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-slate-700">{formatBytes(a.file_size)}</td>
                  </tr>
                ))}
                {!data?.largest?.length && (
                  <tr><td colSpan={4} className="px-4 py-4 text-sm text-slate-400 text-center">No attachments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Archive list */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Archive className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Archive</h2>
          <div className="ml-auto">
            <input
              value={archiveSearch}
              onChange={(e) => { setArchiveSearch(e.target.value); setArchivePage(1) }}
              placeholder="Search file / tracking number"
              className="input input-sm"
            />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">File</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Archived</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(archiveQuery.data?.data || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900 max-w-56 truncate">{a.file_name}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 font-mono">
                      {a.document?.tracking_number || `#${a.document_id}`}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">
                      {a.archived_at ? new Date(a.archived_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{formatBytes(a.file_size)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className="btn btn-ghost btn-xs"
                        disabled={busy === `restore-${a.id}`}
                        onClick={() => restore(a.id)}
                      >
                        {busy === `restore-${a.id}` ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!archiveQuery.data?.data?.length && (
                  <tr><td colSpan={5} className="px-4 py-4 text-sm text-slate-400 text-center">Archive is empty</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {(archiveQuery.data?.last_page || 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Page {archiveQuery.data?.current_page} of {archiveQuery.data?.last_page}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!archiveQuery.data?.prev_page_url}
                  onClick={() => setArchivePage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!archiveQuery.data?.next_page_url}
                  onClick={() => setArchivePage((p) => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.label || 'Delete'}
        onConfirm={() => { confirm?.action(); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
        danger={confirm?.label === 'Delete' || confirm?.label === 'Purge'}
      />
    </div>
  )
}
