import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

interface ToastProgressProps {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onDismiss?: () => void
}

function ToastProgress({ message, type = 'info', duration = 4000, onDismiss }: ToastProgressProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 50))
        return next <= 0 ? 0 : next
      })
    }, 50)
    return () => clearInterval(interval)
  }, [duration])

  const colorMap = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      icon: 'text-green-600',
      text: 'text-green-800',
      bar: 'bg-green-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      icon: 'text-red-600',
      text: 'text-red-800',
      bar: 'bg-red-500',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      icon: 'text-amber-600',
      text: 'text-amber-800',
      bar: 'bg-amber-500',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      icon: 'text-blue-600',
      text: 'text-blue-800',
      bar: 'bg-blue-500',
    },
  }

  const c = colorMap[type]
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }
  const Icon = icons[type]

  return (
    <div className="flex flex-col gap-0 min-w-[300px] max-w-[420px]">
      <div className={`flex items-center gap-3 px-4 py-3 ${c.bg} border ${c.border} rounded-xl shadow-lg`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${c.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <p className={`text-sm font-medium flex-1 ${c.text}`}>{message}</p>
        <button onClick={onDismiss} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-slate-100 rounded-b-xl overflow-hidden">
        <div className={`h-full ${c.bar} rounded-b-xl transition-all`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function showProgressToast(message: string, type: 'success' | 'error' | 'warning' | 'info', duration: number) {
  return toast(
    <ToastProgress message={message} type={type} duration={duration} onDismiss={() => toast.dismiss()} />,
    {
      duration,
      position: 'top-center',
      style: { padding: '0', background: 'none', boxShadow: 'none' },
    }
  )
}

export function progressToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) {
  return showProgressToast(message, type ?? 'info', duration ?? 4000)
}

export function progressSuccess(message: string, duration?: number) {
  return showProgressToast(message, 'success', duration ?? 4000)
}

export function progressError(message: string, duration?: number) {
  return showProgressToast(message, 'error', duration ?? 4000)
}

export function progressWarning(message: string, duration?: number) {
  return showProgressToast(message, 'warning', duration ?? 4000)
}

export function progressInfo(message: string, duration?: number) {
  return showProgressToast(message, 'info', duration ?? 4000)
}
