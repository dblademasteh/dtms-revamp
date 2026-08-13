<?php

namespace App\Services;

use App\Models\Document;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class PdfExportService
{
    public function documentPdf(Document $document, ?string $title = null)
    {
        $document->loadMissing([
            'originator',
            'currentOffice',
            'recipient',
            'attachments',
            'routingHistory.actor',
            'routingHistory.fromOffice',
            'routingHistory.toOffice',
            'acknowledgements.user',
            'acknowledgements.office',
        ]);

        $html = view('pdf.document', [
            'document' => $document,
            'title' => $title ?? 'Document Record',
        ])->render();

        return Pdf::loadHTML($html)
            ->setPaper('a4', 'portrait')
            ->setOptions(['defaultFont' => 'Helvetica', 'isRemoteEnabled' => false]);
    }

    public function reportPdf(string $type, Carbon $fromDate, Carbon $toDate, array $columns, array $rows, array $summary = [])
    {
        $html = view('pdf.report', [
            'type' => $type,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'columns' => $columns,
            'rows' => $rows,
            'summary' => $summary,
        ])->render();

        return Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->setOptions(['defaultFont' => 'Helvetica', 'isRemoteEnabled' => false]);
    }

    public function activityPdf(Carbon $fromDate, Carbon $toDate, array $rows, array $columns)
    {
        return $this->reportPdf('activity', $fromDate, $toDate, $columns, $rows);
    }
}
