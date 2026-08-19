<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; }
        .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 12px; }
        .brand { font-size: 14px; font-weight: bold; color: #1d4ed8; }
        .sub { font-size: 9px; color: #64748b; }
        .title { font-size: 12px; font-weight: bold; margin: 10px 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
        th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
        tr:nth-child(even) td { background: #f8fafc; }
        .summary { margin-bottom: 10px; }
        .summary span { display: inline-block; margin-right: 16px; }
        .summary b { color: #1d4ed8; }
        .footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">DTMS Report — {{ ucfirst($type) }}</div>
        <div class="sub">{{ $fromDate->format('M d, Y') }} to {{ $toDate->format('M d, Y') }} · Generated {{ now()->format('M d, Y h:i A') }}</div>
    </div>

    @if (!empty($summary))
        <div class="title">Summary</div>
        <div class="summary">
            @foreach ($summary as $label => $value)
                <span>{{ $label }}: <b>{{ $value }}</b></span>
            @endforeach
        </div>
    @endif

    <div class="title">Detail</div>
    <table>
        <thead>
            <tr>
                @foreach ($columns as $column)
                    <th>{{ $column }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($columns) }}" style="text-align:center;color:#94a3b8;">No records found.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">DTMS · Report generated automatically. Figures are as of {{ now()->format('M d, Y h:i A') }}.</div>
</body>
</html>
