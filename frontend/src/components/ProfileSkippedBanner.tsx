import { AlertTriangle, X, UserCheck } from 'lucide-react'

interface ProfileSkippedBannerProps {
  onComplete: () => void
  onDismiss: () => void
}

export default function ProfileSkippedBanner({ onComplete, onDismiss }: ProfileSkippedBannerProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-[13px] text-amber-700 dark:text-amber-400 flex-1 min-w-0">
          Your profile setup was skipped. Complete it to get the most out of the system.
        </p>
        <button
          onClick={onComplete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5" /> Complete now
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex-shrink-0"
          title="Dismiss for this session"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
