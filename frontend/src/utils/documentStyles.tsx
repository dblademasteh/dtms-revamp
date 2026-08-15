import { FileText, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react'
import { PRIORITY_OPTIONS } from '@/constants/documentOptions'

export { classificationLabel, classificationBadgeClass } from '@/constants/documentOptions'

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

export function priorityLabel(value?: string): string {
  return PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? value ?? 'Normal'
}

export function priorityDesc(value?: string): string {
  const meta = PRIORITY_OPTIONS.find((o) => o.value === value)?.meta as { desc?: string } | undefined
  return meta?.desc ?? ''
}

export function priorityBadgeClass(value?: string): string {
  switch (value) {
    case 'low':
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    case 'normal':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30'
    case 'high':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30'
    case 'urgent':
      return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/30'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  }
}

const PRIORITY_RING: Record<string, string> = {
  low: 'ring-slate-400',
  normal: 'ring-blue-400',
  high: 'ring-amber-400',
  urgent: 'ring-red-400',
}

export function prioritySelectionClass(value?: string, isSelected?: boolean): string {
  const ring = PRIORITY_RING[value ?? ''] || 'ring-slate-400'
  return isSelected
    ? `${priorityBadgeClass(value)} ring-2 ring-offset-1 ${ring} dark:ring-offset-slate-900`
    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-900 dark:text-white'
}

export function priorityIcon(value?: string, className = 'w-3.5 h-3.5') {
  switch (value) {
    case 'high':
      return <AlertTriangle className={className} />
    case 'urgent':
      return <AlertCircle className={className} />
    case 'low':
    case 'normal':
    default:
      return <FileText className={className} />
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export const CLASSIFICATION_DESC: Record<string, string> = {
  public: 'Accessible to the public',
  official: 'Routine government business',
  restricted: 'Limited to authorized offices',
  confidential: 'Sensitive, strict access control',
}

export function classificationDesc(value?: string): string {
  return CLASSIFICATION_DESC[value ?? ''] ?? ''
}

const CLASSIFICATION_SELECTED: Record<string, string> = {
  public: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  official: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40',
  restricted: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
  confidential: 'border-red-500 bg-red-50 dark:bg-red-950/40',
}

const CLASSIFICATION_TEXT: Record<string, string> = {
  public: 'text-emerald-700 dark:text-emerald-300',
  official: 'text-blue-700 dark:text-blue-300',
  restricted: 'text-amber-700 dark:text-amber-300',
  confidential: 'text-red-700 dark:text-red-300',
}

const CLASSIFICATION_DESC_CLASS: Record<string, string> = {
  public: 'text-emerald-600 dark:text-emerald-400',
  official: 'text-blue-600 dark:text-blue-400',
  restricted: 'text-amber-600 dark:text-amber-400',
  confidential: 'text-red-600 dark:text-red-400',
}

export function classificationSelectionClass(value?: string, isSelected?: boolean): string {
  const selected = CLASSIFICATION_SELECTED[value ?? ''] || CLASSIFICATION_SELECTED.official
  return isSelected
    ? selected
    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
}

export function classificationTextClass(value?: string): string {
  return CLASSIFICATION_TEXT[value ?? ''] || 'text-slate-700'
}

export function classificationDescClass(value?: string): string {
  return CLASSIFICATION_DESC_CLASS[value ?? ''] || 'text-slate-400'
}

export function classificationWarning(value?: string): string {
  if (value === 'confidential') return 'Confidential documents are only visible to authorized personnel.'
  if (value === 'restricted') return 'Restricted documents have limited visibility and routing.'
  return ''
}

export function classificationIcon(value?: string, className = 'w-3.5 h-3.5') {
  return value === 'restricted' || value === 'confidential'
    ? <ShieldAlert className={className} />
    : <FileText className={className} />
}
