<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
        .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 14px; }
        .brand { font-size: 16px; font-weight: bold; color: #1d4ed8; }
        .sub { font-size: 10px; color: #64748b; }
        .title { font-size: 13px; font-weight: bold; margin: 14px 0 8px; color: #0f172a; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; }
        .badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .badge.green { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
        .badge.amber { background: #fffbeb; color: #d97706; border-color: #fde68a; }
        .badge.red { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
        .kv { margin-bottom: 2px; }
        .kv b { display: inline-block; min-width: 130px; color: #475569; font-weight: 600; }
        .muted { color: #64748b; }
        .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
        .section { margin-top: 14px; }
    </style>
</head>
<body>
    @php
        $val = fn ($v) => is_object($v) && $v instanceof \UnitEnum ? $v->value : $v;
        $label = fn ($v) => ucfirst(str_replace('_', ' ', (string) $val($v)));
    @endphp
    <div class="header">
        <div class="brand">Department Tracking and Management System (DTMS)</div>
        <div class="sub">{{ $title }} · Generated {{ now()->format('M d, Y h:i A') }}</div>
    </div>

    <div class="title">Document Information</div>
    <table>
        <tr>
            <th style="width:22%">Tracking Number</th>
            <td style="width:28%">{{ $document->tracking_number }}</td>
            <th style="width:22%">Document No.</th>
            <td style="width:28%">{{ $document->document_no ?? '—' }}</td>
        </tr>
        <tr>
            <th>Subject</th>
            <td colspan="3"><strong>{{ $document->subject }}</strong></td>
        </tr>
        <tr>
            <th>Description</th>
            <td colspan="3">{{ $document->description ?: '—' }}</td>
        </tr>
        <tr>
            <th>Type</th>
            <td>{{ $label($document->document_type) }}</td>
            <th>Classification</th>
            <td>{{ $label($document->classification) }}</td>
        </tr>
        <tr>
            <th>Priority</th>
            <td>{{ $label($document->priority) }}</td>
            <th>Status</th>
            <td>{{ $label($document->status) }}</td>
        </tr>
        <tr>
            <th>Mode of Transmittal</th>
            <td>{{ $document->mode_of_transmittal ? $label($document->mode_of_transmittal) : '—' }}</td>
            <th>Action Requested</th>
            <td>{{ $document->action_requested ?? '—' }}</td>
        </tr>
        <tr>
            <th>Due Date</th>
            <td>{{ $document->due_at?->format('M d, Y h:i A') ?: '—' }}</td>
            <th>SLA</th>
            <td>{{ $document->sla_days ? $document->sla_days . ' day(s)' : '—' }}</td>
        </tr>
        <tr>
            <th>Created</th>
            <td>{{ $document->created_at?->format('M d, Y h:i A') }}</td>
            <th>Requires Ack</th>
            <td>{{ $document->require_ack ? 'Yes' : 'No' }}</td>
        </tr>
    </table>

    <div class="section">
        <div class="title">Routing</div>
        <table>
            <tr>
                <th style="width:22%">Originator</th>
                <td style="width:28%">{{ $document->originator?->full_name ?? '—' }}</td>
                <th style="width:22%">Current Office</th>
                <td style="width:28%">{{ $document->currentOffice?->name ?? '—' }}</td>
            </tr>
            <tr>
                <th>Recipient</th>
                <td colspan="3">
                    @if ($document->recipient_type === 'personnel' && $document->recipient_id)
                        {{ $document->recipient?->full_name ?? 'Personnel #' . $document->recipient_id }}
                    @elseif ($document->recipient_type === 'office' && $document->recipient_id)
                        {{ $document->recipient?->name ?? 'Office #' . $document->recipient_id }}
                    @else
                        —
                    @endif
                </td>
            </tr>
        </table>
    </div>

    @if ($document->routingHistory->isNotEmpty())
        <div class="section">
            <div class="title">Routing History</div>
            <table>
                <tr><th style="width:16%">Date</th><th style="width:18%">Action</th><th>From</th><th>To</th><th>Remarks</th></tr>
                @foreach ($document->routingHistory->sortByDesc('created_at') as $h)
                    <tr>
                        <td>{{ $h->created_at?->format('M d, Y h:i A') }}</td>
                        <td>{{ $label($h->action ?? $h->disposition ?? '') }}</td>
                        <td>{{ $h->fromOffice?->name ?? $h->actor?->full_name ?? '—' }}</td>
                        <td>{{ $h->toOffice?->name ?? '—' }}</td>
                        <td>{{ $h->remarks ?: '—' }}</td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    @if ($document->acknowledgements->isNotEmpty())
        <div class="section">
            <div class="title">Acknowledgements</div>
            <table>
                <tr><th style="width:40%">Acknowledger</th><th style="width:20%">Type</th><th>Status</th><th>Acknowledged At</th></tr>
                @foreach ($document->acknowledgements as $ack)
                    <tr>
                        <td>
                            @if ($ack->user)
                                {{ $ack->user->full_name ?? $ack->user->name }}
                            @elseif ($ack->office)
                                {{ $ack->office->name }}
                            @else
                                —
                            @endif
                        </td>
                        <td>{{ $ack->user ? 'Personnel' : 'Office' }}</td>
                        <td>{{ $ack->acknowledged_at ? 'Acknowledged' : 'Pending' }}</td>
                        <td>{{ $ack->acknowledged_at?->format('M d, Y h:i A') ?: '—' }}</td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    @if ($document->attachments->isNotEmpty())
        <div class="section">
            <div class="title">Attachments ({{ $document->attachments->count() }})</div>
            <table>
                <tr><th>File Name</th><th style="width:16%">Size</th><th style="width:18%">Uploaded</th></tr>
                @foreach ($document->attachments as $att)
                    <tr>
                        <td>{{ $att->file_name ?? '—' }}</td>
                        <td>{{ $att->file_size ? round($att->file_size / 1024, 1) . ' KB' : '—' }}</td>
                        <td>{{ $att->created_at?->format('M d, Y') }}</td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    <div class="footer">DTMS · {{ $document->tracking_number }} · Confidentiality applies per DTMS classification rules.</div>
</body>
</html>
