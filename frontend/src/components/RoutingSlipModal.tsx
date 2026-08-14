import { useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { BFP_ORG, BFP_ACTION_LEGEND, legendForDisposition } from '@/constants/bfp'
import { dispositionLabel } from '@/constants/documentOptions'
import { useBranding } from '@/hooks/useBranding'

interface RoutingSlipModalProps {
  open: boolean
  onClose: () => void
  document: any
  history: any[]
}

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const personLabel = (p: any) =>
  p ? [p.rank, p.full_name || p.name].filter(Boolean).join(' ') : '—'

const BORDER = '0.7pt solid #000'

const cellStyle = {
  border: BORDER,
  padding: '3px 6px',
  fontSize: '9pt',
  verticalAlign: 'middle' as const,
  wordBreak: 'break-word' as const,
}

const thStyle = {
  border: BORDER,
  padding: '3px 5px',
  fontSize: '9pt',
  fontWeight: 'bold',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
  background: '#fff',
}

export default function RoutingSlipModal({
  open,
  onClose,
  document,
  history,
}: RoutingSlipModalProps) {
  const paperRef = useRef<HTMLDivElement>(null)
  const branding = useBranding()

  if (!open || !document) return null

  const checked = new Set<string>()
  history.forEach((h) => {
    const label = legendForDisposition(h.disposition || h.action)
    if (label) checked.add(label)
  })

  const minRows = Math.max(history.length, 8)
  const recipientLabel = document.recipient
    ? document.recipient_type === 'personnel'
      ? personLabel(document.recipient)
      : personLabel(document.recipient?.head)
    : ''
  const dataRows = history.map((h, index) => {
    const sig = h.actor ? personLabel(h.actor) : ''
    const desig = h.actor?.designation || h.fromOffice?.name || ''
    const forTo = h.toOffice?.name || ''
    const date = h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-PH') : ''
    const disposition = h.disposition ? dispositionLabel(h.disposition) : h.action || ''
    const remarks = [disposition, h.remarks].filter(Boolean).join(' – ')
    return (
      <tr key={h.id || `h-${index}`} style={{ height: 36, pageBreakInside: 'avoid' }}>
        <td style={cellStyle}>{sig}</td>
        <td style={cellStyle}>{desig}</td>
        <td style={cellStyle}>
          {forTo}
          {recipientLabel && <div style={{ marginTop: 1 }}>{recipientLabel}</div>}
        </td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{date}</td>
        <td style={cellStyle}>{remarks}</td>
      </tr>
    )
  })

  while (dataRows.length < minRows) {
    dataRows.push(
      <tr key={`blank-${dataRows.length}`} style={{ height: 36, pageBreakInside: 'avoid' }}>
        <td style={cellStyle}>&nbsp;</td>
        <td style={cellStyle}>&nbsp;</td>
        <td style={cellStyle}>&nbsp;</td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>&nbsp;</td>
        <td style={cellStyle}>&nbsp;</td>
      </tr>
    )
  }

  const legendRows = BFP_ACTION_LEGEND.map((item) => (
    <tr key={item}>
      <td
        style={{
          width: 16,
          border: BORDER,
          textAlign: 'center',
          fontSize: '9pt',
          padding: '1px 0',
          verticalAlign: 'middle',
        }}
      >
        {checked.has(item) ? '✓' : ''}
      </td>
      <td
        style={{
          border: BORDER,
          padding: '2px 5px',
          fontSize: '8pt',
          fontWeight: 'bold',
          letterSpacing: '0.2px',
          verticalAlign: 'middle',
        }}
      >
        {item}
      </td>
    </tr>
  ))

  const handlePrint = () => {
    if (!paperRef.current) return
    const w = window.open('', '_blank', 'width=900,height=1100')
    if (!w) return
    w.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Routing Slip – ${escapeHtml(document.tracking_number)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Times New Roman', Times, serif; color: #000; }
  table { page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .slip-paper { width: 182mm !important; min-width: 182mm !important; }
</style>
</head>
<body>
${paperRef.current.outerHTML}
</body>
</html>`)
    w.document.close()
    setTimeout(() => w.print(), 250)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Routing Slip — {document.tracking_number}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="rounded-lg shadow-2xl overflow-x-auto">
          <div
            ref={paperRef}
            className="slip-paper"
            style={{
              width: '100%',
              background: '#fff',
              color: '#000',
              fontFamily: "'Times New Roman', Times, serif",
              fontSize: '11pt',
              padding: '10mm 9mm 8mm',
            }}
          >
            {/* ── LETTERHEAD ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 7 }}>
              <img
                src={branding.login_logo || branding.sidebar_logo || '/logo.png'}
                alt=""
                style={{ width: 70, height: 70, objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
                <div style={{ fontSize: '10pt', fontStyle: 'italic', letterSpacing: 1.4 }}>REPUBLIC OF THE PHILIPPINES</div>
                <div style={{ fontSize: '9pt' }}>{BFP_ORG.parent}</div>
                <div style={{ fontSize: '12pt', fontWeight: 'bold', letterSpacing: 0.6 }}>{BFP_ORG.agency}</div>
                <div style={{ fontSize: '10.5pt', fontWeight: 'bold', letterSpacing: 0.4 }}>{BFP_ORG.office}</div>
                <div style={{ fontSize: '8.5pt' }}>{BFP_ORG.address}</div>
                <div style={{ fontSize: '8.5pt' }}>
                  Telefax No.: {BFP_ORG.telefax} • Hotline: {BFP_ORG.hotline}
                </div>
                <div style={{ fontSize: '8.5pt' }}>Email: {BFP_ORG.email}</div>
              </div>
            </div>

            <div style={{ borderTop: '2.2pt solid #000', marginTop: 4 }} />
            <div style={{ borderTop: '0.7pt solid #000', marginBottom: 7 }} />

            {/* ── SUBJECT / CONTROL NO ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5 }}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, height: 24 }}>
                    <b><i>SUBJECT:</i></b>&nbsp;{escapeHtml(document.subject)}
                  </td>
                  <td style={{ ...cellStyle, height: 24, whiteSpace: 'nowrap', width: 240 }}>
                    <b><i>Control No.:</i></b>&nbsp;{escapeHtml(document.tracking_number)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── MAIN TABLE ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ verticalAlign: 'top' }}>
                  {/* Action requested legend */}
                  <td style={{ width: '27%', border: BORDER, padding: 0 }}>
                    <div
                      style={{
                        ...thStyle,
                        borderBottom: BORDER,
                        fontSize: '9.5pt',
                        letterSpacing: 0.5,
                        padding: '4px 3px',
                      }}
                    >
                      ACTION REQUESTED
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>{legendRows}</tbody>
                    </table>
                  </td>

                  {/* Routing columns */}
                  <td style={{ border: BORDER, padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th colSpan={2} style={thStyle}>FROM</th>
                          <th style={{ ...thStyle, width: '27%' }}>FOR / TO</th>
                          <th style={{ ...thStyle, width: '10%' }}>DATE</th>
                          <th style={thStyle}>REMARKS</th>
                        </tr>
                        <tr>
                          <th style={{ ...thStyle, width: '15%' }}>SIGNATURE</th>
                          <th style={{ ...thStyle, width: '20%' }}>DESIGNATION</th>
                          <th style={{ ...thStyle, width: '27%' }}>&nbsp;</th>
                          <th style={{ ...thStyle, width: '10%' }}>&nbsp;</th>
                          <th style={thStyle}>&nbsp;</th>
                        </tr>
                      </thead>
                      <tbody>{dataRows}</tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 9, fontSize: '8pt', color: '#555', textAlign: 'right' }}>
              Generated by DTMS — {new Date().toLocaleString('en-PH')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
