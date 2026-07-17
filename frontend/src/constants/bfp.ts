// Bureau of Fire Protection — Region 2 (Cagayan Valley) Regional Headquarters
// Letterhead and routing-slip constants used for printable BFP forms.
export const BFP_ORG = {
  republic: 'Republic of the Philippines',
  parent: 'Department of the Interior and Local Government',
  agency: 'BUREAU OF FIRE PROTECTION',
  office: 'REGION 2 – REGIONAL HEADQUARTERS',
  address: '#7 Dalan na Pavvurulun corner Paccorofun, RGC, Carig Sur, Tuguegarao City, Cagayan',
  telefax: '(078) 846-1419',
  hotline: '0917-3239365',
  email: 'bfp_ro2@yahoo.com',
}

// Standard BFP / DILG "ACTION REQUESTED" legend printed on the routing slip.
export const BFP_ACTION_LEGEND = [
  'APPROVAL/SIGNATURE',
  'APPROPRIATE STAFF ACTION',
  'COMMENT/RECOMMENDATION',
  'STUDY/INVESTIGATION',
  'REPLY DIRECT TO WRITER',
  'REPLY FOR SIGNATURE OF',
  'REWRITE/REDRAFT',
  'NOTATION/INFORMATION',
  'DISSEMINATION',
  'SEE ME/CALL ME',
  'DISPATCH',
  'FILE',
]

// Map a recorded routing disposition verb to the matching BFP legend item(s).
const DISPOSITION_TO_LEGEND: Record<string, string> = {
  approved: 'APPROVAL/SIGNATURE',
  signed: 'APPROVAL/SIGNATURE',
  endorsed: 'APPROPRIATE STAFF ACTION',
  recommended: 'COMMENT/RECOMMENDATION',
  noted: 'NOTATION/INFORMATION',
  forwarded: 'DISSEMINATION',
  returned: 'FILE',
  referred: 'FILE',
  rejected: 'FILE',
  disapproved: 'FILE',
}

export function legendForDisposition(disposition?: string): string | null {
  if (!disposition) return null
  return DISPOSITION_TO_LEGEND[disposition] ?? null
}
