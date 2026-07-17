export const DOCUMENT_TYPES = [
  { value: 'memorandum', label: 'Memorandum' },
  { value: 'memorandum_circular', label: 'Memorandum Circular' },
  { value: 'endorsement', label: 'Endorsement' },
  { value: 'special_order', label: 'Special Order' },
  { value: 'travel_order', label: 'Travel Order' },
  { value: 'communication', label: 'Communication' },
  { value: 'referral', label: 'Referral' },
  { value: 'resolution', label: 'Resolution' },
  { value: 'ordinance', label: 'Ordinance' },
  { value: 'purchase_request', label: 'Purchase Request' },
  { value: 'job_order', label: 'Job Order' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'request', label: 'Request / Letter' },
  { value: 'fsic_application', label: 'FSIC Application' },
  { value: 'fire_investigation_report', label: 'Fire Investigation Report' },
  { value: 'incident_report', label: 'Fire Incident Report' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'training_request', label: 'Training Request' },
  { value: 'others', label: 'Others' },
]

export const CLASSIFICATIONS = [
  { value: 'public', label: 'Public' },
  { value: 'official', label: 'Official' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'confidential', label: 'Confidential' },
]

export function documentTypeLabel(value?: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value ?? 'Unknown'
}

export const DOCUMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'returned', label: 'Returned' },
  { value: 'released', label: 'Released' },
]

export function statusLabel(value?: string): string {
  return DOCUMENT_STATUSES.find((s) => s.value === value)?.label ?? value?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? value ?? 'Unknown'
}

export function classificationLabel(value?: string): string {
  return CLASSIFICATIONS.find((c) => c.value === value)?.label ?? value ?? 'Official'
}

export function classificationBadgeClass(value?: string): string {
  switch (value) {
    case 'confidential':
      return 'bg-red-100 text-red-700 border border-red-200'
    case 'restricted':
      return 'bg-amber-100 text-amber-700 border border-amber-200'
    case 'official':
      return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 'public':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

export function documentTypeBadgeClass(value?: string): string {
  switch (value) {
    case 'request':
      return 'bg-purple-100 text-purple-700 border border-purple-200'
    case 'memorandum':
    case 'memorandum_circular':
      return 'bg-sky-100 text-sky-700 border border-sky-200'
    case 'endorsement':
    case 'special_order':
    case 'travel_order':
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200'
    case 'resolution':
    case 'ordinance':
      return 'bg-teal-100 text-teal-700 border border-teal-200'
    case 'purchase_request':
    case 'job_order':
      return 'bg-orange-100 text-orange-700 border border-orange-200'
    case 'fsic_application':
    case 'fire_investigation_report':
    case 'incident_report':
    case 'inspection_report':
      return 'bg-rose-100 text-rose-700 border border-rose-200'
    case 'communication':
    case 'referral':
    case 'advisory':
    case 'training_request':
      return 'bg-cyan-100 text-cyan-700 border border-cyan-200'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

export function dispositionBadgeClass(value?: string): string {
  switch (value) {
    case 'approved':
    case 'signed':
    case 'endorsed':
    case 'noted':
    case 'recommended':
    case 'forwarded':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
    case 'rejected':
    case 'disapproved':
      return 'bg-red-100 text-red-700 border border-red-200'
    case 'returned':
    case 'referred':
      return 'bg-amber-100 text-amber-700 border border-amber-200'
    default:
      return 'bg-slate-100 text-slate-600 border border-slate-200'
  }
}

export const MODES_OF_TRANSMITTAL = [
  { value: 'hand_carried', label: 'Hand-carried' },
  { value: 'registered_mail', label: 'Registered Mail' },
  { value: 'courier', label: 'Courier' },
  { value: 'email_fax', label: 'Email / Fax' },
  { value: 'internal', label: 'Internal (Inter-Office)' },
]

export function transmittalLabel(value?: string): string {
  return MODES_OF_TRANSMITTAL.find((m) => m.value === value)?.label ?? 'Not Specified'
}

// Action requested of the recipient (standard government routing-slip actions)
export const ACTION_REQUESTED = [
  { value: 'approval_signature', label: 'APPROVAL/SIGNATURE' },
  { value: 'appropriate_staff_action', label: 'APPROPRIATE STAFF ACTION' },
  { value: 'comment_recommendation', label: 'COMMENT/RECOMMENDATION' },
  { value: 'study_investigation', label: 'STUDY/INVESTIGATION' },
  { value: 'reply_direct_to_writer', label: 'REPLY DIRECT TO WRITER' },
  { value: 'reply_for_signature_of', label: 'REPLY FOR SIGNATURE OF' },
  { value: 'rewrite_redraft', label: 'REWRITE/REDRAFT' },
  { value: 'notation_information', label: 'NOTATION/INFORMATION' },
  { value: 'dissemination', label: 'DISSEMINATION' },
  { value: 'see_me_call_me', label: 'SEE ME/CALL ME' },
  { value: 'dispatch', label: 'DISPATCH' },
  { value: 'file', label: 'FILE' },
]

export function actionRequestedLabel(value?: string): string {
  return ACTION_REQUESTED.find((a) => a.value === value)?.label ?? value ?? '—'
}

// Government routing dispositions, grouped by the underlying transition
export const ROUTING_DISPOSITIONS: Record<
  'approve' | 'reject' | 'return',
  { value: string; label: string }[]
> = {
  approve: [
    { value: 'approved', label: 'Approved' },
    { value: 'signed', label: 'Signed' },
    { value: 'endorsed', label: 'Endorsed' },
    { value: 'noted', label: 'Noted' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'forwarded', label: 'Forwarded' },
  ],
  reject: [
    { value: 'rejected', label: 'Rejected' },
    { value: 'disapproved', label: 'Disapproved' },
  ],
  return: [
    { value: 'returned', label: 'Returned' },
    { value: 'referred', label: 'Referred' },
  ],
}

export function dispositionLabel(value?: string): string {
  const all = [
    ...ROUTING_DISPOSITIONS.approve,
    ...ROUTING_DISPOSITIONS.reject,
    ...ROUTING_DISPOSITIONS.return,
  ]
  return all.find((d) => d.value === value)?.label ?? value ?? '—'
}
