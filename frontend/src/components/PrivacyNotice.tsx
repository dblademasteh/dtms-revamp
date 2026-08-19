import { useEffect, useState } from 'react'
import { Database, ShieldCheck, Target, Scale, UserCheck, Clock, ChevronRight } from 'lucide-react'
import ModalPortal from './ModalPortal'
import { useAuthStore } from '@/stores/authStore'

const STORAGE_KEY = 'dtms-privacy-ack'

const SECTIONS = [
  {
    icon: Database,
    title: 'What We Collect',
    body: 'Personal information you provide such as your name, government email address, office/agency, position, and account credentials — as well as document metadata, routing and tracking records, and system activity logs necessary to operate the service.',
  },
  {
    icon: Target,
    title: 'Why We Process It',
    body: 'Your data is processed for the legitimate functions of the agency: to authenticate users, track and route official documents, maintain audit trails, generate reports, and comply with legal and records-retention obligations.',
  },
  {
    icon: Scale,
    title: 'Legal Basis',
    body: 'Processing is based on your consent and the performance of a task in the public interest or in the exercise of official authority vested in the agency (Sections 12 and 13, RA 10173).',
  },
  {
    icon: UserCheck,
    title: 'Your Rights',
    body: 'Under the Data Privacy Act, you have the right to be informed, access, correct, object to, erase, and withdraw consent to the processing of your personal data, subject to law and regulation.',
  },
  {
    icon: Clock,
    title: 'Sharing & Retention',
    body: 'Your information may be shared with authorized government offices strictly on a need-to-know basis and will be retained only for as long as necessary to fulfill the purposes above or as required by applicable records retention policies.',
  },
]

export default function PrivacyNotice() {
  const [open, setOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY)
    // Only suppress the notice once the user has agreed AND is logged in.
    // If they refresh or leave without logging in, the flag is cleared below
    // so the notice shows again on the next load.
    if (!acknowledged) {
      setOpen(true)
    } else if (!isAuthenticated) {
      localStorage.removeItem(STORAGE_KEY)
      setOpen(true)
    }
  }, [isAuthenticated])

  const handleAccept = () => {
    // Persist the acknowledgment, but it only "counts" after a successful login.
    // We keep the flag; it is cleared on logout so the flow repeats for safety.
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setOpen(false)
  }

  if (!open) return null

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" />

          {/* Header */}
          <div className="flex items-start gap-4 px-6 py-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-50 ring-1 ring-primary-100 dark:bg-primary-900/40 dark:ring-primary-800">
              <ShieldCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Data Privacy Notice
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Document Tracking System &middot; Republic of the Philippines
              </p>
            </div>
            <span className="flex-shrink-0 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:ring-primary-800">
              RA No. 10173
            </span>
          </div>

          {/* Body */}
          <div className="max-h-[52vh] overflow-y-auto px-6 pb-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-3 dark:border-primary-800/60 dark:bg-primary-900/20">
              <p>
                The <strong>Document Tracking and Management System (DTMS)</strong> collects and
                processes personal data in accordance with the{' '}
                <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its
                Implementing Rules and Regulations, as administered by the National
                Privacy Commission (NPC) of the Philippines.
              </p>
            </div>

            <div className="space-y-3">
              {SECTIONS.map(({ icon: Icon, title, body }, i) => (
                <div
                  key={title}
                  className="flex gap-3.5 rounded-xl border border-slate-100 p-4 transition-colors hover:border-primary-200 dark:border-slate-800 dark:hover:border-primary-800"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {title}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              For questions or to exercise your data privacy rights, contact the
              agency&rsquo;s <strong>Data Protection Officer</strong>. By clicking
              &ldquo;I Understand&rdquo; you acknowledge that you have read and
              understood this notice.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4">
            <button
              onClick={handleAccept}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              I Understand
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
