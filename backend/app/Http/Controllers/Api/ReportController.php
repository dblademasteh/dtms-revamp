<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
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
        ->whereBetween('created_at', [$fromDate, $toDate])
        ->groupBy('current_office_id');

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
        ->whereIn('status', ['pending', 'in_review'])
        ->whereBetween('created_at', [$fromDate, $toDate])
        ->groupBy('current_office_id')
        ->orderByDesc('pending_count')
        ->with('currentOffice')
        ->get();

        return response()->json($bottlenecks);
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
            COUNT(CASE WHEN status IN ('pending', 'in_review') THEN 1 END) as pending
        ")
        ->whereBetween('created_at', [$fromDate, $toDate])
        ->groupBy('period')
        ->orderBy('period')
        ->get();

        return response()->json($volume);
    }

    public function overdue(Request $request)
    {
        $query = Document::where('sla_deadline', '<', now())
            ->whereNotIn('status', ['approved', 'released'])
            ->with(['originator', 'currentOffice'])
            ->orderBy('sla_deadline');

        $documents = $query->get();

        $summary = [
            'total_overdue' => $documents->count(),
            'urgent' => $documents->where('priority', 'urgent')->count(),
            'high' => $documents->where('priority', 'high')->count(),
        ];

        return response()->json([
            'data' => $documents,
            'summary' => $summary,
        ]);
    }

    public function export(Request $request)
    {
        $request->validate([
            'type' => 'required|in:turnaround,bottlenecks,volume,overdue,activity',
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
        ]);

        $fromDate = $request->from_date ? Carbon::parse($request->from_date) : now()->subDays(30);
        $toDate = $request->to_date ? Carbon::parse($request->to_date) : now();

        $headers = ['Content-Type' => 'text/csv'];
        $callback = function () use ($request, $fromDate, $toDate) {
            $handle = fopen('php://output', 'w');

            switch ($request->type) {
                case 'overdue':
                    fputcsv($handle, ['Tracking Number', 'Subject', 'Status', 'Priority', 'Office', 'SLA Deadline', 'Days Overdue']);
                    Document::where('sla_deadline', '<', now())
                        ->whereNotIn('status', ['approved', 'released'])
                        ->with(['currentOffice'])
                        ->orderBy('sla_deadline')
                        ->each(function ($doc) use ($handle) {
                            fputcsv($handle, [
                                $doc->tracking_number,
                                $doc->subject,
                                $doc->status->value,
                                $doc->priority->value,
                                $doc->currentOffice->name ?? 'N/A',
                                $doc->sla_deadline?->format('Y-m-d H:i'),
                                $doc->sla_deadline ? now()->diffInDays($doc->sla_deadline) : '',
                            ]);
                        });
                    break;

                case 'turnaround':
                    fputcsv($handle, ['Office', 'Avg Turnaround (hrs)', 'Documents']);
                    Document::selectRaw('current_office_id, AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours, COUNT(*) as total_documents')
                        ->whereBetween('created_at', [$fromDate, $toDate])
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
                    Document::selectRaw("DATE_TRUNC('day', created_at) as period, COUNT(*) as total, COUNT(CASE WHEN status = 'released' THEN 1 END) as released, COUNT(CASE WHEN status IN ('pending', 'in_review') THEN 1 END) as pending")
                        ->whereBetween('created_at', [$fromDate, $toDate])
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
                    Document::selectRaw('current_office_id, COUNT(*) as pending_count, AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_wait_hours')
                        ->whereIn('status', ['pending', 'in_review'])
                        ->whereBetween('created_at', [$fromDate, $toDate])
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
                    \App\Models\AuditTrail::with(['user', 'document'])
                        ->whereBetween('created_at', [$fromDate, $toDate])
                        ->orderBy('created_at', 'desc')
                        ->each(function ($trail) use ($handle) {
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

    public function dashboard(Request $request)
    {
        $user = $request->user();

        $stats = [
            'total_documents' => Document::count(),
            'pending_documents' => Document::whereIn('status', ['pending', 'in_review', 'returned'])->count(),
            'returned_documents' => Document::where('status', 'returned')->count(),
            'released_today' => Document::where('status', 'released')
                ->whereDate('released_at', today())
                ->count(),
            'overdue_documents' => Document::where('sla_deadline', '<', now())
                ->whereNotIn('status', ['approved', 'released'])
                ->count(),
        ];

        // Office-specific stats if not admin
        if (!$user->isAdmin()) {
            $stats['my_office_pending'] = Document::where('current_office_id', $user->office_id)
                ->whereIn('status', ['pending', 'in_review', 'returned'])
                ->count();
        }

        $stats['my_documents'] = Document::where('originator_id', $user->id)->count();

        // Recent documents
        $recentDocuments = Document::with(['originator', 'currentOffice'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'stats' => $stats,
            'recent_documents' => $recentDocuments,
        ]);
    }
}
