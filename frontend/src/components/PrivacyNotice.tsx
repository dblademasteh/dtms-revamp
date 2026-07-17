import { useEffect, useState } from 'react'
import ModalPortal from './ModalPortal'
import { useAuthStore } from '@/stores/authStore'

const STORAGE_KEY = 'dtms-privacy-ack'

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
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-start gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900/40">
              🔒
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Data Privacy Notice
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Republic Act No. 10173 &middot; Data Privacy Act of 2012
              </p>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-4">
            <p>
              The <strong>Document Tracking System (DTS)</strong> is a government
              service that collects and processes personal data in accordance with
              the <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its
              Implementing Rules and Regulations, as administered by the National
              Privacy Commission (NPC) of the Philippines.
            </p>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                What We Collect
              </h3>
              <p>
                We collect personal information you provide such as your name,
                government email address, office/agency, position, and account
                credentials, as well as document metadata, routing and tracking
                records, and system activity logs necessary to operate the service.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Why We Process It (Purpose)
              </h3>
              <p>
                Your data is processed for the legitimate functions of the agency:
                to authenticate users, track and route official documents, maintain
                audit trails, generate reports, and comply with legal and
                records-retention obligations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Legal Basis
              </h3>
              <p>
                Processing is based on your consent and the performance of a task
                in the public interest or in the exercise of official authority
                vested in the agency (Sections 12 and 13, RA 10173).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Your Rights
              </h3>
              <p>
                Under the Data Privacy Act, you have the right to be informed,
                access, correct, object to, erase, and withdraw consent to the
                processing of your personal data, subject to law and regulation.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Data Sharing &amp; Retention
              </h3>
              <p>
                Your information may be shared with authorized government offices
                strictly on a need-to-know basis and will be retained only for as
                long as necessary to fulfill the purposes above or as required by
                applicable records retention policies.
              </p>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              For questions or to exercise your data privacy rights, contact the
              agency&rsquo;s Data Protection Officer. By clicking &ldquo;I
              Understand&rdquo; you acknowledge that you have read and understood
              this notice.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              onClick={handleAccept}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
              I Understand
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
