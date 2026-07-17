import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'

export function toastConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Are you sure?</p>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  resolve(true)
                }}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  resolve(false)
                }}
                className="px-4 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: 10000,
        position: 'top-center',
        style: {
          minWidth: '380px',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px -12px rgba(0,0,0,0.25)',
        },
      }
    )
  })
}
