import type { LucideIcon } from 'lucide-react'
import {
  Rocket,
  LayoutDashboard,
  FilePlus2,
  FolderOpen,
  MapPin,
  ListChecks,
  Mail,
  BarChart3,
  Megaphone,
  Shield,
  Settings,
  Wrench,
} from 'lucide-react'

export interface HelpSection {
  id: string
  icon: LucideIcon
  title: string
  tagline: string
  link?: string
  linkLabel?: string
  steps?: { title: string; body: string }[]
  notes?: string[]
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Getting Started',
    tagline: 'Log in, recover your account, and set up your profile.',
    link: '/settings',
    linkLabel: 'Open Settings',
    steps: [
      {
        title: 'Log in to DTMS',
        body: 'Use your account number or registered email together with your password. If you have not been given an account yet, ask your administrator to create one for you.',
      },
      {
        title: 'Forgot your password?',
        body: 'Click "Forgot Password" on the login screen, enter your email, and follow the reset link sent to you.',
      },
      {
        title: 'Set up your station',
        body: 'If you are an Office/Station user without an assigned office, the dashboard will prompt you to claim or create your station profile before you can start routing documents.',
      },
    ],
    notes: [
      'Keep your account number handy — it appears in the top-right of every page.',
      'You can change your display theme, font, and interface size anytime under Settings.',
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    tagline: 'A quick snapshot of your documents, tasks, and activity.',
    link: '/',
    linkLabel: 'Go to Dashboard',
    steps: [
      {
        title: 'Stat cards',
        body: 'Total Documents, Received, Approved, and Returned give you a one-glance count. Click any card to jump to the filtered document list.',
      },
      {
        title: 'Charts',
        body: 'Document Volume shows how many documents were created/released over time, while Status Distribution breaks documents down by their current status.',
      },
      {
        title: 'Quick actions',
        body: 'Shortcuts to Reports, New Document, and Track Document let you move around the system faster.',
      },
      {
        title: 'Announcements & Recent Documents',
        body: 'The latest public announcements and your most recently created documents are listed for quick access.',
      },
    ],
  },
  {
    id: 'create-document',
    icon: FilePlus2,
    title: 'Creating a Document',
    tagline: 'Register, classify, and route a new document in a few steps.',
    link: '/documents/new',
    linkLabel: 'Open New Document',
    steps: [
      {
        title: 'Fill in the details',
        body: 'Provide the subject, choose the document type (Memorandum, Endorsement, etc.), classification (Public, Official, Restricted, Confidential), and priority (Low, Normal, High, Urgent).',
      },
      {
        title: 'Set the mode of transmittal',
        body: 'Choose how the document will be sent (Hand-carried, Registered Mail, Courier, Email/Fax, or Internal inter-office).',
      },
      {
        title: 'Choose the recipient',
        body: 'Select the action requested (Approval/Signature, Comment/Recommendation, etc.) and the office or personnel the document should go to. You can also add Cc and Bcc recipients.',
      },
      {
        title: 'Attach files and submit',
        body: 'Upload supporting attachments, then submit. The system assigns a tracking number automatically once the document is created.',
      },
    ],
    notes: [
      'Documents marked Confidential are only visible to authorized personnel.',
      'You can set a routing template to auto-fill the intended route.',
    ],
  },
  {
    id: 'documents',
    icon: FolderOpen,
    title: 'Managing Documents',
    tagline: 'Search, filter, and act on the full document registry.',
    link: '/documents',
    linkLabel: 'Open Documents',
    steps: [
      {
        title: 'Search',
        body: 'Search by tracking number or subject title from the search box at the top of the list.',
      },
      {
        title: 'Quick tabs',
        body: 'Use All Documents, My Documents, and Action Required (For Me) to quickly narrow the list to what matters to you.',
      },
      {
        title: 'Advanced filters',
        body: 'Open the Filters button to filter by office, personnel, status, priority, and document type. The badge on the button shows how many filters are active.',
      },
      {
        title: 'Open a document',
        body: 'Click any row to view the full document, its attachments, comments, and routing history.',
      },
    ],
    notes: [
      'Use Reset (or Clear All Filters) to remove every active filter at once.',
      'Bulk actions let you select multiple documents and apply changes together.',
    ],
  },
  {
    id: 'track-document',
    icon: MapPin,
    title: 'Tracking a Document',
    tagline: 'Follow a document anywhere, with or without an account.',
    link: '/track',
    linkLabel: 'Open Track',
    steps: [
      {
        title: 'Enter the tracking number',
        body: 'Type the tracking number (e.g. 2026-07-0001) into the tracker, or scan the QR code printed on the document.',
      },
      {
        title: 'View live routing',
        body: 'You will see the document’s current status, the office it is with, and the full routing history from creation to the present.',
      },
      {
        title: 'Share the link',
        body: 'The tracking page works without logging in, so you can share it with anyone who needs to verify a document’s status.',
      },
    ],
  },
  {
    id: 'statuses',
    icon: ListChecks,
    title: 'Document Statuses',
    tagline: 'Understand what each status means and how documents move.',
    steps: [
      {
        title: 'Created',
        body: 'The document has been registered in the system but not yet acted upon.',
      },
      {
        title: 'Received',
        body: 'The document has been received by an office and is waiting for action.',
      },
      {
        title: 'In Review',
        body: 'The document is currently being evaluated or reviewed by the assigned office.',
      },
      {
        title: 'Approved',
        body: 'The document has been approved for the requested action.',
      },
      {
        title: 'Declined / Returned',
        body: 'The document was not approved — it may have been declined or sent back for revision.',
      },
      {
        title: 'Released',
        body: 'The document has been finalized, released, and may be published as an announcement.',
      },
      {
        title: 'Filed',
        body: 'The document has been closed and archived.',
      },
    ],
    notes: [
      'A document’s status can change multiple times as it moves through offices.',
      'The routing history on each document records every status change and who made it.',
    ],
  },
  {
    id: 'mailbox',
    icon: Mail,
    title: 'Mailbox',
    tagline: 'Handle incoming and outgoing email correspondence.',
    link: '/mailbox',
    linkLabel: 'Open Mailbox',
    steps: [
      {
        title: 'Inbox & Sent',
        body: 'The mailbox syncs with your email account. Use the folder tabs to switch between Inbox and your Sent folder.',
      },
      {
        title: 'Compose an email',
        body: 'Click Compose, fill in the recipient, subject, and message, then send. Sent messages are filed under your Sent folder.',
      },
      {
        title: 'Open a message',
        body: 'Click any message to read its full content and any linked document attachments.',
      },
    ],
    notes: [
      'Mailbox is synced automatically in the background.',
      'Email threads can be linked to tracked documents for a complete record.',
    ],
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Reports & Analytics',
    tagline: 'Measure turnaround, bottlenecks, volume, and activity.',
    link: '/reports',
    linkLabel: 'Open Reports',
    steps: [
      {
        title: 'Turnaround',
        body: 'See the average time documents spend with each office, so you can spot slow points.',
      },
      {
        title: 'Bottlenecks',
        body: 'Identify offices with the most pending documents and the longest wait times.',
      },
      {
        title: 'Volume',
        body: 'Track how many documents are created, released, and pending over time.',
      },
      {
        title: 'Activity & export',
        body: 'Review the audit trail of system activity and export any report to CSV for offline use.',
      },
    ],
  },
  {
    id: 'announcements',
    icon: Megaphone,
    title: 'Announcements',
    tagline: 'Published, public-facing documents and circulars.',
    link: '/announcements',
    linkLabel: 'Open Announcements',
    steps: [
      {
        title: 'Browse published documents',
        body: 'Released documents marked as public appear here as announcements. Use the filter to view all posted items.',
      },
      {
        title: 'Open an announcement',
        body: 'Click any announcement to read its full content and download attached files.',
      },
    ],
    notes: [
      'Only authorized users can publish announcements.',
      'Announcements also appear on the Dashboard for quick access.',
    ],
  },
  {
    id: 'roles',
    icon: Shield,
    title: 'Roles & Permissions',
    tagline: 'Who can see and do what inside DTMS.',
    steps: [
      {
        title: 'Super Admin',
        body: 'Full access. Manages users, offices, personnel, routing templates, storage, activity logs, suggestions, and dropdown options.',
      },
      {
        title: 'Officer',
        body: 'Creates, routes, reviews, and approves documents within their area of responsibility.',
      },
      {
        title: 'Non-Officer',
        body: 'Creates and routes documents and supports document processing, without approval rights.',
      },
      {
        title: 'FCOS',
        body: 'Fire Station personnel who create, receive, and route documents within the station.',
      },
      {
        title: 'Office/Station',
        body: 'Represents a fire station or office. Manages the station profile and handles the station’s documents.',
      },
    ],
    notes: [
      'Your role determines which menu items and actions are available to you.',
      'Only Super Admin sees the Administration menu.',
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Settings',
    tagline: 'Personalize your account and the interface.',
    link: '/settings',
    linkLabel: 'Open Settings',
    steps: [
      {
        title: 'Appearance',
        body: 'Switch between light and dark mode, change the font, and adjust the interface size (small, medium, large).',
      },
      {
        title: 'Account',
        body: 'Update your personal details and change your password.',
      },
    ],
    notes: [
      'Your appearance preferences are saved on your device.',
      'Contact your administrator if you need to change your role or account number.',
    ],
  },
  {
    id: 'administration',
    icon: Wrench,
    title: 'Administration',
    tagline: 'Super Admin tools for keeping the system running.',
    link: '/admin/users',
    linkLabel: 'Open Users',
    steps: [
      {
        title: 'Users & Roles',
        body: 'Create user accounts and assign roles under Users.',
      },
      {
        title: 'Templates & Offices',
        body: 'Maintain reusable routing templates and the office/unit hierarchy.',
      },
      {
        title: 'Personnel',
        body: 'Keep personnel records (ranks, designations, stations) up to date.',
      },
      {
        title: 'Storage, Activity, Suggestions, Dropdowns',
        body: 'Monitor storage usage, review the audit trail, respond to user suggestions, and manage dropdown lists used across forms.',
      },
    ],
  },
]

export interface FaqItem {
  q: string
  a: string
  link?: string
  linkLabel?: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'How do I create a new document?',
    a: 'Go to the Documents page and click "New Document" (or use the quick action on the Dashboard). Fill in the subject, type, classification, priority, mode of transmittal, recipient, and attachments, then submit. A tracking number is assigned automatically.',
    link: '/documents/new',
  },
  {
    q: 'What is a tracking number and where do I find it?',
    a: 'Every document gets a unique tracking number (e.g. 2026-07-0001) when it is created. You can find it on the document list, on the document details page, or by asking the sender.',
  },
  {
    q: 'How do I track a document?',
    a: 'Open the Track page, enter the tracking number (or scan the QR code), and view the current status and full routing history. Tracking works without logging in.',
    link: '/track',
  },
  {
    q: 'What do the document statuses mean?',
    a: 'Created, Received, In Review, Approved, Declined, Returned, Released, and Filed. See the "Document Statuses" section above for a plain-language explanation of each one.',
    link: '/help#statuses',
  },
  {
    q: 'How do I set a document priority?',
    a: 'When creating a document, use the priority selector: Low, Normal, High, or Urgent. Normal is the default.',
  },
  {
    q: 'What is the difference between Declined and Returned?',
    a: 'A declined document was not approved. A returned document was sent back (usually for revision or more information) and can be resubmitted.',
  },
  {
    q: 'How do I upload or remove attachments?',
    a: 'On the New Document or Edit Document form, use the attachment section to add files. On the document details page you can view and download attached files.',
  },
  {
    q: 'How do I forward or route a document?',
    a: 'Open the document and use the routing controls to select the next office or personnel, choose the action requested, and submit the route. The routing history records every step.',
  },
  {
    q: 'What are routing templates?',
    a: 'Routing templates are pre-built routes you can reuse. Super Admin manages them under Administration → Templates, and you can apply one when creating a document.',
  },
  {
    q: 'How do I use the Mailbox?',
    a: 'Open Mailbox to see your synced Inbox and Sent folders. Use Compose to send email, and click any message to read it.',
    link: '/mailbox',
  },
  {
    q: 'How do I change my password?',
    a: 'Open Settings → Account and use the change password option. If you forgot your password, use "Forgot Password" on the login screen.',
    link: '/settings',
  },
  {
    q: 'Why can’t I see the Administration menu?',
    a: 'The Administration menu is only visible to Super Admin users. If you believe you need admin access, contact your system administrator.',
  },
  {
    q: 'Who can see my documents?',
    a: 'It depends on the classification. Public documents are visible to everyone, Official documents to system users, and Restricted/Confidential documents to authorized personnel only.',
  },
  {
    q: 'How do I report a problem or suggest a feature?',
    a: 'Use the lightbulb Suggestions button at the bottom-right of the screen to submit a suggestion or report. Super Admin can review and respond to it.',
  },
]

export interface ChatbotEntry {
  id: string
  keywords: string[]
  question: string
  answer: string
  link?: string
  linkLabel?: string
}

export const CHATBOT_KB: ChatbotEntry[] = [
  {
    id: 'create-doc',
    keywords: ['create', 'new document', 'add document', 'make a document', 'register document'],
    question: 'How do I create a new document?',
    answer:
      'Go to Documents → New Document (or the quick action on the Dashboard). Fill in the subject, document type, classification, priority, mode of transmittal, recipient, and attachments, then submit. A tracking number is assigned automatically.',
    link: '/documents/new',
    linkLabel: 'Open New Document',
  },
  {
    id: 'track',
    keywords: ['track', 'tracking number', 'find document', 'status of document', 'where is my document', 'look up'],
    question: 'How do I track a document?',
    answer:
      'Open the Track page, enter the tracking number (e.g. 2026-07-0001) or scan the QR code, and you will see the current status and full routing history. Tracking works even without logging in.',
    link: '/track',
    linkLabel: 'Open Track',
  },
  {
    id: 'statuses',
    keywords: ['status', 'statuses', 'approved', 'released', 'filed', 'declined', 'returned', 'received', 'in review', 'status mean', 'statuses mean'],
    question: 'What do the document statuses mean?',
    answer:
      'Created (registered), Received (waiting for action), In Review (being evaluated), Approved (action approved), Declined (not approved), Returned (sent back for revision), Released (finalized/published), and Filed (closed). See the statuses guide for details.',
    link: '/help#statuses',
    linkLabel: 'Open Statuses Guide',
  },
  {
    id: 'priority',
    keywords: ['priority', 'urgent', 'high priority', 'normal', 'low priority'],
    question: 'How do I set a document priority?',
    answer:
      'When creating a document, use the priority selector: Low, Normal, High, or Urgent. Normal is the default. Priority helps recipients know how urgently a document needs attention.',
  },
  {
    id: 'classification',
    keywords: ['classification', 'confidential', 'restricted', 'public', 'official', 'sensitive'],
    question: 'What do document classifications mean?',
    answer:
      'Public (visible to everyone), Official (visible to system users), Restricted (limited to authorized personnel), and Confidential (only authorized personnel can see it). Choose based on how sensitive the content is.',
  },
  {
    id: 'mode',
    keywords: ['mode', 'transmittal', 'hand carried', 'courier', 'registered mail', 'fax', 'send method'],
    question: 'What is the mode of transmittal?',
    answer:
      'It describes how the physical document will be delivered: Hand-carried, Registered Mail, Courier, Email/Fax, or Internal (inter-office). Pick the one that matches how you are sending it.',
  },
  {
    id: 'mailbox',
    keywords: ['mailbox', 'email', 'compose', 'inbox', 'sent', 'message'],
    question: 'How do I use the Mailbox?',
    answer:
      'Open Mailbox to see your synced Inbox and Sent folders. Click Compose to send a new email, and click any message to read its content. Mailbox syncs automatically in the background.',
    link: '/mailbox',
    linkLabel: 'Open Mailbox',
  },
  {
    id: 'reports',
    keywords: ['reports', 'analytics', 'turnaround', 'bottleneck', 'volume', 'export', 'csv'],
    question: 'How do reports work?',
    answer:
      'Reports cover turnaround time per office, bottlenecks (most pending documents), document volume over time, and a full activity audit trail. You can also export any report to CSV.',
    link: '/reports',
    linkLabel: 'Open Reports',
  },
  {
    id: 'announcements',
    keywords: ['announcement', 'announcements', 'publish', 'public document', 'circular'],
    question: 'What are Announcements?',
    answer:
      'Announcements are public-facing documents that have been released and marked as public. They appear on the Announcements page and the Dashboard.',
    link: '/announcements',
    linkLabel: 'Open Announcements',
  },
  {
    id: 'roles',
    keywords: ['role', 'roles', 'permission', 'permissions', 'admin', 'super admin', 'access', 'who can'],
    question: 'What are the user roles?',
    answer:
      'Super Admin (full control, including Administration), Officer (reviews and approves), Non-Officer (creates/routes documents), FCOS (fire station personnel), and Office/Station (manages a station profile and its documents). Only Super Admin sees the Administration menu.',
  },
  {
    id: 'password',
    keywords: ['password', 'forgot', 'reset', 'change password', 'login', 'log in', 'can\'t login', 'cant login', 'sign in'],
    question: 'How do I reset or change my password?',
    answer:
      'If you forgot your password, use "Forgot Password" on the login screen to get a reset link by email. To change it while logged in, go to Settings → Account.',
    link: '/settings',
    linkLabel: 'Open Settings',
  },
  {
    id: 'routing',
    keywords: ['route', 'routing', 'forward', 'send to office', 'next office', 'action requested'],
    question: 'How do I route or forward a document?',
    answer:
      'Open the document and use the routing controls to choose the next office or personnel, set the action requested (e.g. Approval/Signature, Comment/Recommendation), and submit. Every step is recorded in the routing history.',
  },
  {
    id: 'templates',
    keywords: ['template', 'routing template', 'route template'],
    question: 'What are routing templates?',
    answer:
      'Routing templates are reusable, pre-built routes. Super Admin manages them under Administration → Templates. You can apply a template when creating a document to auto-fill the route.',
  },
  {
    id: 'attachments',
    keywords: ['attachment', 'attachments', 'upload', 'file', 'attach', 'download'],
    question: 'How do I attach files to a document?',
    answer:
      'On the New Document or Edit Document form, use the attachment section to upload files. On the document details page you can view and download attachments.',
  },
  {
    id: 'settings',
    keywords: ['settings', 'theme', 'dark mode', 'font', 'appearance', 'interface size', 'scale'],
    question: 'How do I change the theme or appearance?',
    answer:
      'Open Settings → Appearance to switch between light and dark mode, change the font, and adjust the interface size. Your preferences are saved on your device.',
    link: '/settings',
    linkLabel: 'Open Settings',
  },
  {
    id: 'office-profile',
    keywords: ['office profile', 'station', 'office', 'claim office', 'setup station'],
    question: 'How do I set up my office/station profile?',
    answer:
      'If you are an Office/Station user, the dashboard will prompt you to claim an existing office or create your station profile. You can manage it later under Office Profile.',
  },
  {
    id: 'bulk',
    keywords: ['bulk', 'select multiple', 'batch', 'multiple documents'],
    question: 'Can I act on multiple documents at once?',
    answer:
      'Yes. On the Documents page you can select multiple rows and apply bulk actions (such as batch status changes) to them together.',
  },
  {
    id: 'qr',
    keywords: ['qr', 'scan', 'barcode'],
    question: 'How do I scan a QR code?',
    answer:
      'On the Track page, click the Scan QR button and point your camera at the document’s QR code. It will automatically fill in the tracking number and load the document.',
  },
  {
    id: 'help',
    keywords: ['help', 'guide', 'tutorial', 'how to', 'manual', 'documentation', 'faq'],
    question: 'Where can I find help?',
    answer:
      'You are looking at it! The Help page has step-by-step guides and an FAQ, and this chatbot can answer common questions. For anything else, use the Suggestions button to reach your administrator.',
    link: '/help',
    linkLabel: 'Open Help',
  },
]

export const CHATBOT_SUGGESTIONS = [
  'How do I create a document?',
  'How do I track a document?',
  'What do the statuses mean?',
  'How do I change my password?',
  'What is the mode of transmittal?',
]

export const CHATBOT_FALLBACK =
  'Sorry, I’m not sure about that one. Try rephrasing, or browse the Help page for guides. You can also tap one of the suggested questions below, or use the Suggestions button to ask your administrator.'

export const CHATBOT_WELCOME =
  "Hi! I'm the DTMS assistant. Ask me anything about creating documents, tracking, statuses, roles, the mailbox, reports, and more. 👋"

/* ------------------------------------------------------------------ */
/* Matching helper (shared by the chatbot)                             */
/* ------------------------------------------------------------------ */

export function findChatbotAnswer(input: string): ChatbotEntry | null {
  const q = input.toLowerCase().trim()
  if (!q) return null

  // Generic catch-all entries should never beat a specific topic match.
  const genericIds = new Set(['help', 'greeting', 'contact-support'])

  let best: ChatbotEntry | null = null
  let bestScore = 0

  for (const entry of CHATBOT_KB) {
    let score = 0
    let matches = 0
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        matches++
        // Longer, more specific phrases score higher.
        score += kw.split(' ').length * 3
      }
    }
    // Reward entries where multiple distinct keywords matched.
    if (matches > 1) score += matches * 2
    // Heavily de-prioritize generic catch-all entries.
    if (genericIds.has(entry.id)) score = Math.floor(score / 3)

    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore > 0 ? best : null
}
