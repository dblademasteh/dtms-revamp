<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAcknowledgment;
use App\Models\Office;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Restrict report queries to the requesting user's office unless they are an admin.
     */
    private function officeScope($query, $user)
    {
        if ($user && !$user->isAdmin()) {
            $query->where('current_office_id', $user->office_id);
        }

        return $query;
    }

    public function turnaround(Request $request)
    {
        $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'office_id' => 'nullable|exists:offices,id',
        ]);

        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $query = Document::selectRaw('
            current_office_id,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours,
            COUNT(*) as total_documents
        ')
        ->whereBetween('created_at', [$fromDate, $toDate]);

        $this->officeScope($query, $request->user());

        $query->groupBy('current_office_id');

        if ($request->office_id) {
            $query->where('current_office_id', $request->office_id);
        }

        $results = $query->with('currentOffice')->get();

        return response()->json([
            'data' => $results,
            'summary' => [
                'average_turnaround_hours' => $results->avg('avg_hours'),
                'total_documents' => $results->sum('total_documents'),
            ],
        ]);
    }

    public function bottlenecks(Request $request)
    {
        $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ]);

        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $bottlenecks = Document::selectRaw('
            current_office_id,
            COUNT(*) as pending_count,
            AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_wait_hours
        ')
        ->whereIn('status', ['received', 'in_review'])
        ->whereBetween('created_at', [$fromDate, $toDate]);

        $this->officeScope($bottlenecks, $request->user());

        $results = $bottlenecks
            ->groupBy('current_office_id')
            ->orderByDesc('pending_count')
            ->with('currentOffice')
            ->get();

        return response()->json($results);
    }

    public function volume(Request $request)
    {
        $request->validate([
            'period' => 'nullable|in:day,week,month',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ]);

        $period = $request->period ?? 'month';
        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $dateFormat = match($period) {
            'day' => 'Y-m-d',
            'week' => 'Y-W',
            'month' => 'Y-m',
        };

        $volume = Document::selectRaw("
            DATE_TRUNC('{$period}', created_at) as period,
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'released' THEN 1 END) as released,
            COUNT(CASE WHEN status IN ('received', 'in_review') THEN 1 END) as pending
        ")
        ->whereBetween('created_at', [$fromDate, $toDate]);

        $this->officeScope($volume, $request->user());

        $results = $volume
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return response()->json($results);
    }

    public function export(Request $request)
    {
        $request->validate([
            'type' => 'required|in:turnaround,bottlenecks,volume,activity',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ]);

        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $headers = ['Content-Type' => 'text/csv'];
        $user = $request->user();
        $callback = function () use ($request, $fromDate, $toDate, $user) {
            $handle = fopen('php://output', 'w');

             switch ($request->type) {
                 case 'turnaround':
                    fputcsv($handle, ['Office', 'Avg Turnaround (hrs)', 'Documents']);
                    $turnaround = Document::selectRaw('current_office_id, AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours, COUNT(*) as total_documents')
                        ->whereBetween('created_at', [$fromDate, $toDate]);
                    $this->officeScope($turnaround, $user);
                    $turnaround
                        ->groupBy('current_office_id')
                        ->with('currentOffice')
                        ->each(function ($row) use ($handle) {
                            fputcsv($handle, [
                                $row->currentOffice->name ?? 'Unknown',
                                round($row->avg_hours, 1),
                                $row->total_documents,
                            ]);
                        });
                    break;

                case 'volume':
                    fputcsv($handle, ['Period', 'Total', 'Released', 'Pending']);
                    $volumeExport = Document::selectRaw("DATE_TRUNC('day', created_at) as period, COUNT(*) as total, COUNT(CASE WHEN status = 'released' THEN 1 END) as released, COUNT(CASE WHEN status IN ('received', 'in_review') THEN 1 END) as pending")
                        ->whereBetween('created_at', [$fromDate, $toDate]);
                    $this->officeScope($volumeExport, $user);
                    $volumeExport
                        ->groupBy('period')
                        ->orderBy('period')
                        ->each(function ($row) use ($handle) {
                            fputcsv($handle, [
                                $row->period?->format('Y-m-d'),
                                $row->total,
                                $row->released,
                                $row->pending,
                            ]);
                        });
                    break;

                case 'bottlenecks':
                    fputcsv($handle, ['Office', 'Pending Count', 'Avg Wait (hrs)']);
                    $bottlenecksExport = Document::selectRaw('current_office_id, COUNT(*) as pending_count, AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_wait_hours')
                        ->whereIn('status', ['received', 'in_review'])
                        ->whereBetween('created_at', [$fromDate, $toDate]);
                    $this->officeScope($bottlenecksExport, $user);
                    $bottlenecksExport
                        ->groupBy('current_office_id')
                        ->with('currentOffice')
                        ->each(function ($row) use ($handle) {
                            fputcsv($handle, [
                                $row->currentOffice->name ?? 'Unknown',
                                $row->pending_count,
                                round($row->avg_wait_hours, 1),
                            ]);
                        });
                    break;

                case 'activity':
                    fputcsv($handle, ['Date', 'User', 'Action', 'Description', 'IP Address', 'Document']);
                    $activityExport = \App\Models\AuditTrail::with(['user', 'document'])
                        ->whereBetween('created_at', [$fromDate, $toDate])
                        ->orderBy('created_at', 'desc');
                    if (!$user->isAdmin()) {
                        $activityExport->whereHas('document', fn ($q) => $q->where('current_office_id', $user->office_id));
                    }
                    $activityExport->each(function ($trail) use ($handle) {
                        fputcsv($handle, [
                            $trail->created_at?->format('Y-m-d H:i:s'),
                            $trail->user?->name ?? 'System',
                            $trail->action,
                            $trail->description,
                            $trail->ip_address ?? '',
                            $trail->document?->tracking_number ?? '',
                        ]);
                    });
                    break;
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportPdf(Request $request)
    {
        $request->validate([
            'type' => 'required|in:turnaround,bottlenecks,volume,activity',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ]);

        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $columns = [];
        $rows = [];
        $summary = [];
        $user = $request->user();

        switch ($request->type) {
            case 'turnaround':
                $columns = ['Office', 'Avg Turnaround (hrs)', 'Documents'];
                $q = Document::selectRaw('current_office_id, AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours, COUNT(*) as total_documents')
                    ->whereBetween('created_at', [$fromDate, $toDate]);
                $this->officeScope($q, $user);
                $q->groupBy('current_office_id')->with('currentOffice')->get()
                    ->each(function ($row) use (&$rows) {
                        $rows[] = [
                            $row->currentOffice->name ?? 'Unknown',
                            round($row->avg_hours, 1),
                            $row->total_documents,
                        ];
                    });
                $summary = ['Period' => $fromDate->format('M d, Y') . ' – ' . $toDate->format('M d, Y')];
                break;

            case 'volume':
                $columns = ['Period', 'Total', 'Released', 'Pending'];
                $q = Document::selectRaw("DATE_TRUNC('day', created_at) as period, COUNT(*) as total, COUNT(CASE WHEN status = 'released' THEN 1 END) as released, COUNT(CASE WHEN status IN ('received', 'in_review') THEN 1 END) as pending")
                    ->whereBetween('created_at', [$fromDate, $toDate]);
                $this->officeScope($q, $user);
                $q->groupBy('period')->orderBy('period')->get()
                    ->each(function ($row) use (&$rows) {
                        $rows[] = [
                            $row->period ? Carbon::parse($row->period)->format('Y-m-d') : '',
                            $row->total,
                            $row->released,
                            $row->pending,
                        ];
                    });
                $summary = ['Documents' => array_sum(array_column($rows, 1))];
                break;

            case 'bottlenecks':
                $columns = ['Office', 'Pending Count', 'Avg Wait (hrs)'];
                $q = Document::selectRaw('current_office_id, COUNT(*) as pending_count, AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_wait_hours')
                    ->whereIn('status', ['received', 'in_review'])
                    ->whereBetween('created_at', [$fromDate, $toDate]);
                $this->officeScope($q, $user);
                $q->groupBy('current_office_id')->with('currentOffice')->get()
                    ->each(function ($row) use (&$rows) {
                        $rows[] = [
                            $row->currentOffice->name ?? 'Unknown',
                            $row->pending_count,
                            round($row->avg_wait_hours, 1),
                        ];
                    });
                $summary = ['As of' => now()->format('M d, Y h:i A')];
                break;

            case 'activity':
                $columns = ['Date', 'User', 'Action', 'Description', 'IP Address', 'Document'];
                $q = \App\Models\AuditTrail::with(['user', 'document'])
                    ->whereBetween('created_at', [$fromDate, $toDate])
                    ->orderBy('created_at', 'desc');
                if (!$user->isAdmin()) {
                    $q->whereHas('document', fn ($qq) => $qq->where('current_office_id', $user->office_id));
                }
                $q->get()->each(function ($trail) use (&$rows) {
                    $rows[] = [
                        $trail->created_at?->format('Y-m-d H:i:s'),
                        $trail->user?->name ?? 'System',
                        $trail->action,
                        $trail->description,
                        $trail->ip_address ?? '',
                        $trail->document?->tracking_number ?? '',
                    ];
                });
                $summary = ['Entries' => count($rows)];
                break;
        }

        $pdf = app(\App\Services\PdfExportService::class)->reportPdf(
            $request->type,
            $fromDate,
            $toDate,
            $columns,
            $rows,
            $summary
        );

        return $pdf->stream('report-' . $request->type . '-' . now()->format('Ymd-His') . '.pdf');
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();

        $stats = [
            'total_documents' => Document::count(),
            'pending_documents' => Document::whereIn('status', ['received', 'in_review', 'returned'])->count(),
            'approved_documents' => Document::where('status', 'approved')->count(),
            'returned_documents' => Document::where('status', 'returned')->count(),
            'released_today' => Document::where('status', 'released')
                ->whereDate('released_at', today())
                ->count(),
        ];

        // Scoped stats for non-admins (matches what they can see in the document list)
        if (!$user->isAdmin()) {
            $scope = fn ($q) => $q->visibleTo($user);

            $stats['total_documents'] = Document::where($scope)->count();
            $stats['pending_documents'] = Document::where($scope)->whereIn('status', ['received', 'in_review', 'returned'])->count();
            $stats['approved_documents'] = Document::where($scope)->where('status', 'approved')->count();
            $stats['returned_documents'] = Document::where($scope)->where('status', 'returned')->count();
            $stats['released_today'] = Document::where($scope)->where('status', 'released')
                ->whereDate('released_at', today())
                ->count();
        }

        // Office-specific stats if not admin
        if (!$user->isAdmin()) {
            $stats['my_office_pending'] = Document::where('current_office_id', $user->office_id)
                ->whereIn('status', ['received', 'in_review', 'returned'])
                ->count();
        }

        // SLA: overdue in-flight documents + pending acknowledgements for this user/office
        $inflight = ['received', 'in_review'];
        $stats['overdue_documents'] = Document::whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereIn('status', $inflight)
            ->when(!$user->isAdmin(), fn ($q) => $q->where('current_office_id', $user->office_id))
            ->count();

        $stats['pending_acknowledgements'] = DocumentAcknowledgment::whereNull('acknowledged_at')
            ->when(
                !$user->isAdmin(),
                fn ($q) => $q->where(fn ($w) => $w->where('user_id', $user->id)
                    ->orWhere(fn ($o) => $o->whereNull('user_id')->where('office_id', $user->office_id)))
            )
            ->count();

        $stats['my_documents'] = Document::where('originator_id', $user->id)->count();

        // Corpus-wide aggregates, scoped to the user's permission
        $statusCounts = Document::selectRaw('status, COUNT(*) as count')
            ->when(!$user->isAdmin(), fn ($q) => $q->visibleTo($user))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $typeCounts = Document::selectRaw('document_type, COUNT(*) as count')
            ->when(!$user->isAdmin(), fn ($q) => $q->visibleTo($user))
            ->groupBy('document_type')
            ->orderByDesc('count')
            ->get()
            ->pluck('count', 'document_type');

        $topOffices = Document::select('offices.id', 'offices.name')
            ->selectRaw('COUNT(*) as count')
            ->join('offices', 'documents.current_office_id', '=', 'offices.id')
            ->when(!$user->isAdmin(), fn ($q) => $q->visibleTo($user))
            ->groupBy('offices.id', 'offices.name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        // Volume series (same as /reports/volume default: last 30 days, monthly)
        $volumeSeries = Document::selectRaw("DATE_TRUNC('month', created_at) as period, COUNT(*) as total, COUNT(CASE WHEN status = 'released' THEN 1 END) as released, COUNT(CASE WHEN status IN ('received', 'in_review') THEN 1 END) as pending")
            ->whereBetween('created_at', [now()->subDays(30), now()]);
        $this->officeScope($volumeSeries, $user);
        $volumeSeries = $volumeSeries->groupBy('period')->orderBy('period')->get();

        // Latest public announcements (same as the frontend's /documents?is_public=1 feed)
        $announcements = Document::with('currentOffice:id,name')
            ->where('is_public', true)
            ->when(!$user->isAdmin(), fn ($q) => $q->visibleTo($user))
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Recent documents (scoped to the user's permission, same as the document list)
        $recentDocuments = Document::with(['originator', 'currentOffice'])
            ->when(!$user->isAdmin(), fn ($q) => $q->visibleTo($user))
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => $stats,
            'status_counts' => $statusCounts,
            'type_counts' => $typeCounts,
            'top_offices' => $topOffices,
            'volume_series' => $volumeSeries,
            'announcements' => $announcements,
            'recent_documents' => $recentDocuments,
        ]);
    }
}
