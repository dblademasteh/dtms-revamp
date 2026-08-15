import { useDropdownStore } from '@/stores/dropdownStore'

export type Option = { value: string; label: string; meta?: Record<string, unknown> | null }

function liveOptions(group: string): Option[] | undefined {
  const loaded = useDropdownStore.getState().groups[group]
  return loaded && loaded.length ? loaded : undefined
}

export const BFP_RANKS = [
  { value: 'COMMR', label: 'COMMR - Commissioner' },
  { value: 'DIR', label: 'DIR - Director' },
  { value: 'FCSUPT', label: 'FCSUPT - Fire Chief Superintendent' },
  { value: 'CSUPT', label: 'CSUPT - Chief Superintendent' },
  { value: 'SSUPT', label: 'SSUPT - Senior Superintendent' },
  { value: 'SUPT', label: 'SUPT - Superintendent' },
  { value: 'FCINSP', label: 'FCINSP - Fire Chief Inspector' },
  { value: 'CINSP', label: 'CINSP - Chief Inspector' },
  { value: 'SINSP', label: 'SINSP - Senior Inspector' },
  { value: 'INSP', label: 'INSP - Inspector' },
  { value: 'SFO4', label: 'SFO4 - Senior Fire Officer 4' },
  { value: 'SFO3', label: 'SFO3 - Senior Fire Officer 3' },
  { value: 'SFO2', label: 'SFO2 - Senior Fire Officer 2' },
  { value: 'SFO1', label: 'SFO1 - Senior Fire Officer 1' },
  { value: 'FO3', label: 'FO3 - Fire Officer 3' },
  { value: 'FO2', label: 'FO2 - Fire Officer 2' },
  { value: 'FO1', label: 'FO1 - Fire Officer 1' },
  { value: 'NUP', label: 'NUP - Non-Uniformed Personnel' },
]

export const DESIGNATIONS: Option[] = [
  { value: 'Officer-in-Charge (OIC)', label: 'Officer-in-Charge (OIC)' },
  { value: 'Chief', label: 'Chief' },
  { value: 'Administrative Officer', label: 'Administrative Officer' },
  { value: 'Administrative Aide', label: 'Administrative Aide' },
  { value: 'Accountant', label: 'Accountant' },
  { value: 'Budget Officer', label: 'Budget Officer' },
  { value: 'Supply Officer', label: 'Supply Officer' },
  { value: 'Human Resource Management Officer', label: 'Human Resource Management Officer' },
  { value: 'Information Technology Officer', label: 'Information Technology Officer' },
  { value: 'Public Information Officer', label: 'Public Information Officer' },
  { value: 'Fire Marshal', label: 'Fire Marshal' },
  { value: 'Fire Fighter', label: 'Fire Fighter' },
  { value: 'Secretary', label: 'Secretary' },
  { value: 'Driver', label: 'Driver' },
  { value: 'Utility Worker', label: 'Utility Worker' },
]

// Fallback BFP internal offices for the public agency portal (used when the
// offices API is unavailable — e.g. on the Login page without authentication).
export const BFP_OFFICES_FALLBACK: Option[] = [
  { value: 'bfp-national', label: 'BFP National Office' },
  { value: 'bfp-ncr', label: 'BFP-NCR Regional Office' },
  { value: 'bfp-r1', label: 'BFP Region 1 - Ilocos' },
  { value: 'bfp-r2', label: 'BFP Region 2 - Cagayan Valley' },
  { value: 'bfp-r3', label: 'BFP Region 3 - Central Luzon' },
  { value: 'bfp-r4a', label: 'BFP Region 4 - CALABARZON' },
  { value: 'bfp-r5', label: 'BFP Region 5 - Bicol' },
  { value: 'bfp-r6', label: 'BFP Region 6 - Western Visayas' },
  { value: 'bfp-r7', label: 'BFP Region 7 - Central Visayas' },
  { value: 'bfp-r8', label: 'BFP Region 8 - Eastern Visayas' },
  { value: 'bfp-r9', label: 'BFP Region 9 - Zamboanga' },
  { value: 'bfp-r10', label: 'BFP Region 10 - Northern Mindanao' },
  { value: 'bfp-r11', label: 'BFP Region 11 - Davao' },
  { value: 'bfp-r12', label: 'BFP Region 12 - Soccsksargen' },
  { value: 'bfp-car', label: 'BFP CAR - Cordillera Administrative Region' },
  { value: 'bfp-barmm', label: 'BFP-BARMM - Bangsamora Autonomous Region' },
]

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
  const list = liveOptions('document_types') ?? DOCUMENT_TYPES
  return list.find((t) => t.value === value)?.label ?? value ?? 'Unknown'
}

export const DOCUMENT_STATUSES = [
  { value: 'created', label: 'Created' },
  { value: 'received', label: 'Received' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Declined' },
  { value: 'returned', label: 'Returned' },
  { value: 'released', label: 'Released' },
  { value: 'filed', label: 'Filed' },
]

export function statusLabel(value?: string): string {
  const list = liveOptions('document_statuses') ?? DOCUMENT_STATUSES
  return list.find((s) => s.value === value)?.label ?? value?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? value ?? 'Unknown'
}

export function classificationLabel(value?: string): string {
  const list = liveOptions('classifications') ?? CLASSIFICATIONS
  return list.find((c) => c.value === value)?.label ?? value ?? 'Official'
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
    case 'filed':
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
  const list = liveOptions('modes_of_transmittal') ?? MODES_OF_TRANSMITTAL
  return list.find((m) => m.value === value)?.label ?? 'Not Specified'
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
  const list = liveOptions('action_requested') ?? ACTION_REQUESTED
  return list.find((a) => a.value === value)?.label ?? value ?? '—'
}

// Government routing dispositions, grouped by the underlying transition
export const ROUTING_DISPOSITIONS: Record<
  'approve' | 'reject' | 'return' | 'file',
  { value: string; label: string }[]
> = {
  approve: [
    { value: 'approved', label: 'Approved' },
    { value: 'forwarded', label: 'Forwarded' },
  ],
  reject: [
    { value: 'rejected', label: 'Declined' },
    { value: 'disapproved', label: 'Disapproved' },
  ],
  return: [
    { value: 'returned', label: 'Returned' },
    { value: 'referred', label: 'Referred' },
  ],
  file: [
    { value: 'filed', label: 'Filed' },
  ],
}

export function dispositionLabel(value?: string): string {
  const live = liveOptions('routing_dispositions')
  if (live) return live.find((d) => d.value === value)?.label ?? value ?? '—'
  const all = [
    ...ROUTING_DISPOSITIONS.approve,
    ...ROUTING_DISPOSITIONS.reject,
    ...ROUTING_DISPOSITIONS.return,
    ...ROUTING_DISPOSITIONS.file,
  ]
  return all.find((d) => d.value === value)?.label ?? value ?? '—'
}

export const OFFICE_TYPES: Option[] = [
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'provincial_office', label: 'Provincial Office' },
  { value: 'fire_station', label: 'Fire Station' },
  { value: 'division', label: 'Division' },
  { value: 'unit', label: 'Unit' },
  { value: 'others', label: 'Others' },
]

export const PRIORITY_OPTIONS: Option[] = [
  { value: 'low', label: 'Low', meta: { desc: 'Standard processing' } },
  { value: 'normal', label: 'Normal', meta: { desc: 'Default priority' } },
  { value: 'high', label: 'High', meta: { desc: 'Expedited processing' } },
  { value: 'urgent', label: 'Urgent', meta: { desc: 'Immediate attention' } },
]

// Sending agencies available in the public agency portal (admin-managed via
// Settings > Administration > Dropdown Options). Defaults mirror the original
// hardcoded list so existing submissions keep their values.
export const AGENCY_DEFAULTS: Option[] = [
  { value: 'rcs', label: 'RCS - Civil Security' },
  { value: 'fcos', label: 'FCOS - Fire Code Operations' },
  { value: 'dnd', label: 'DND - National Defense' },
  { value: 'doj', label: 'DOJ - Justice' },
  { value: 'dotr', label: 'DOTr - Transportation' },
  { value: 'other', label: 'Other Agency' },
]

// Recipient offices allowed in the public agency portal. Only FCOS and RCS
// are valid targets, so the "To" field is gated to them. Fallback list is used
// when the public offices API is unavailable.
export const GATEWAY_TARGET_OFFICES: Option[] = [
  { value: 'bfp-r2-rcs', label: 'Regional Chief of Staff (RCS)' },
  { value: 'bfp-r2-fcos', label: 'Fire Communications Operations Section (FCOS)' },
]

export function isGatewayTargetOffice(name: string): boolean {
  return /\bRCS\b/i.test(name) || /\bFCOS\b/i.test(name)
}

export function gatewayTargetOffices(options: Option[]): Option[] {
  const filtered = options.filter((o) => isGatewayTargetOffice(o.label))
  return filtered.length ? filtered : GATEWAY_TARGET_OFFICES
}

export const SUGGESTION_CATEGORIES: Option[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'bug', label: 'Bug' },
  { value: 'other', label: 'Other' },
]

export const SUGGESTION_STATUSES: Option[] = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'planned', label: 'Planned' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'closed', label: 'Closed' },
]

export const DEFAULT_GROUPS: Record<string, Option[]> = {
  document_types: DOCUMENT_TYPES,
  classifications: CLASSIFICATIONS,
  modes_of_transmittal: MODES_OF_TRANSMITTAL,
  action_requested: ACTION_REQUESTED,
  routing_dispositions: [
    ...ROUTING_DISPOSITIONS.approve.map((d) => ({ ...d, meta: { group: 'approve' } })),
    ...ROUTING_DISPOSITIONS.reject.map((d) => ({ ...d, meta: { group: 'reject' } })),
    ...ROUTING_DISPOSITIONS.return.map((d) => ({ ...d, meta: { group: 'return' } })),
    ...ROUTING_DISPOSITIONS.file.map((d) => ({ ...d, meta: { group: 'file' } })),
  ],
  document_statuses: DOCUMENT_STATUSES,
  office_types: OFFICE_TYPES,
  ranks: BFP_RANKS,
  designations: DESIGNATIONS,
  priorities: PRIORITY_OPTIONS,
  agencies: AGENCY_DEFAULTS,
  suggestion_categories: SUGGESTION_CATEGORIES,
  suggestion_statuses: SUGGESTION_STATUSES,
}
