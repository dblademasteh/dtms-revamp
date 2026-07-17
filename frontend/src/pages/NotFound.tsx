import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-primary-400/60" />
        <h1 className="mt-6 text-6xl font-bold text-white tracking-tight">404</h1>
        <p className="mt-3 text-lg text-slate-300">Page not found</p>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/"
            className="btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <Link
            to="/track"
            className="btn btn-secondary"
          >
            Track Document
          </Link>
        </div>
      </div>
    </div>
  )
}
