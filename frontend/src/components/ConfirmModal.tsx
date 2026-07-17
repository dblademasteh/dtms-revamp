import { AlertTriangle, X } from 'lucide-react'
import ModalPortal from '@/components/ModalPortal'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel} />
        <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
              danger ? 'bg-red-100 dark:bg-red-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
            </div>
            <button onClick={onCancel} className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 justify-end px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm ${
              danger
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                : 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      </div>
    </ModalPortal>

  )
}
