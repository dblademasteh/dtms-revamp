import { ReactNode } from 'react'

export default function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number | string
  icon: ReactNode
  color: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  )
}
