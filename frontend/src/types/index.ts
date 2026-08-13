export type UserRole = 'superadmin' | 'officer' | 'non_officer' | 'fcos' | 'office_station'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  office_id: number
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
  office?: Office
  has_pincode?: boolean
  can_view_all_documents?: boolean
  must_change_password?: boolean
  accnt_no?: string | null
  rank?: string | null
  full_name?: string
  designation?: string | null
  unit_assignment?: string | null
  created_at: string
  updated_at: string
}

export interface Office {
  id: number
  name: string
  code: string
  parent_office_id?: number
  head_user_id?: number
  description?: string
  status: 'active' | 'inactive'
  parent?: Office
  head?: User
  children?: Office[]
}

export type DocumentStatus =
  | 'created'
  | 'received'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'released'
  | 'filed'

export interface Document {
  id: number
  tracking_number: string
  document_no?: string
  suffix?: string
  document_type: string
  subject: string
  description?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: DocumentStatus
  originator_id: number
  current_office_id: number
  current_step?: number
  routing_template_id?: number
  due_at?: string | null
  sla_days?: number | null
  require_ack?: boolean
  released_at?: string
  is_public: boolean
  originator?: User
  current_office?: Office
  routing_template?: RoutingTemplate
  attachments?: DocumentAttachment[]
  routing_history?: RoutingHistory[]
  created_at: string
  updated_at: string
}

export interface RoutingTemplate {
  id: number
  name: string
  document_type: string
  description?: string
  steps: RoutingStep[]
  is_active: boolean
  created_by: number
}

export interface RoutingStep {
  step: number
  office_id: number
  role: string
  action: string
}

export interface DocumentAttachment {
  id: number
  document_id: number
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  version: number
  uploaded_by: number
  description?: string
  uploader?: User
  created_at: string
}

export type RoutingAction =
  | 'created'
  | 'received'
  | 'approved'
  | 'signed'
  | 'endorsed'
  | 'noted'
  | 'recommended'
  | 'forwarded'
  | 'rejected'
  | 'disapproved'
  | 'returned'
  | 'referred'
  | 'resubmitted'
  | 'filed'
  | 'routed'
  | 'acknowledged'

export interface RoutingHistory {
  id: number
  document_id: number
  from_office_id: number
  to_office_id: number
  action: RoutingAction
  remarks?: string
  actor_id: number
  step_number: number
  timestamp: string
  actor?: User
  from_office?: Office
  to_office?: Office
}

export interface AuditTrail {
  id: number
  document_id: number
  user_id: number
  action: string
  description?: string
  ip_address?: string
  user_agent?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  user?: User
  created_at: string
}

export interface Suggestion {
  id: number
  user_id: number
  title: string
  description: string
  category: 'feature' | 'improvement' | 'bug' | 'other'
  status: 'open' | 'under_review' | 'planned' | 'implemented' | 'closed'
  admin_response?: string
  user?: { id: number; name: string; rank?: string | null; full_name?: string }
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface DropdownOption {
  id: number
  group: string
  value: string
  label: string
  sort_order: number
  meta?: Record<string, unknown> | null
  is_active: boolean
}
