import { Link } from 'react-router-dom'
import { MapPin, FilePlus2, ArrowRight, Shield } from 'lucide-react'
import { useBranding } from '@/hooks/useBranding'

export default function AgencyGateway() {
  const branding = useBranding()
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 lg:p-12">
        {/* ===== Top Bar with Logo ===== */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center overflow-hidden text-white shadow-lg shadow-blue-500/30">
              {branding.sidebar_logo || branding.login_logo ? (
                <img
                  src={branding.sidebar_logo || branding.login_logo || ''}
                  alt=""
                  className="w-10 h-10 object-contain"
                  draggable={false}
                />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{branding.system_title}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{branding.system_description}</div>
            </div>
          </div>
          <Link
            to="/login"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            ← Back to Login
          </Link>
        </div>

        {/* ===== Hero Section ===== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-800 text-white p-6 sm:p-10 shadow-xl">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-indigo-300/10 rounded-full blur-[110px]" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-50">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                <span>Public Agency Gateway</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Agency Gateway
              </h1>
              <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl">
                Track any document by tracking number, or create and route a new document
                on behalf of your agency — all without logging in.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition-colors">
              <Shield className="w-4 h-4 text-blue-300" />
              <span>No Login Required</span>
            </div>
          </div>
        </div>

        {/* ===== Action Hub ===== */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Track a Document */}
          <Link
            to="/track"
            className="group relative flex flex-col p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  Track a Document
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter a DTMS tracking number to view live routing status and document history.
                </p>
              </div>
            </div>
            <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Create Document for Agency */}
          <Link
            to="/create"
            className="group relative flex flex-col p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <FilePlus2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  Create Document for Agency
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Submit a new document on behalf of your agency without requiring a login.
                </p>
              </div>
            </div>
            <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* ===== Footer Note ===== */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Agency Gateway — Public access · No authentication required
          </p>
        </div>
      </div>
    </div>
  )
}
