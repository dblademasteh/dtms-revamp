<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentAttachment;
use App\Models\Office;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    private const ARCHIVE_GRACE_DAYS = 30;

    private function disk()
    {
        return Storage::disk('public');
    }

    /**
     * Dashboard summary: totals, breakdowns, largest files, growth, reclaimable space.
     */
    public function summary()
    {
        $activeQuery = DocumentAttachment::query()->whereNull('archived_at');

        $totals = [
            'active_files' => (clone $activeQuery)->count(),
            'active_bytes' => (clone $activeQuery)->sum('file_size'),
            'archived_files' => DocumentAttachment::query()->whereNotNull('archived_at')->count(),
            'archived_bytes' => DocumentAttachment::query()->whereNotNull('archived_at')->sum('file_size'),
            'avatar_bytes' => \App\Models\User::whereNotNull('avatar')->count(),
            'compressed_bytes' => $this->compressedBytes(),
            'retention_months' => (int) SystemSetting::get('retention_months', 12),
            'archive_grace_days' => self::ARCHIVE_GRACE_DAYS,
        ];

        $totals['total_on_disk'] = $totals['active_bytes'] + $totals['archived_bytes'];

        $byType = $this->byType((clone $activeQuery));

        $byOffice = Office::orderBy('name')->get()
            ->map(function ($office) {
                $usage = $office->storageUsageBytes();
                return [
                    'id' => $office->id,
                    'name' => $office->name,
                    'code' => $office->code,
                    'unit_code' => $office->unit_code,
                    'bytes' => $usage,
                    'quota_bytes' => $office->storage_quota_bytes,
                    'pct' => $office->storage_quota_bytes
                        ? round(($usage / $office->storage_quota_bytes) * 100, 1)
                        : null,
                ];
            });

        $largest = (clone $activeQuery)
            ->with(['document.originator.office'])
            ->orderByDesc('file_size')
            ->limit(20)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'file_name' => $a->file_name,
                'file_size' => $a->file_size,
                'file_type' => $a->file_type,
                'is_compressed' => $a->is_compressed,
                'tracking_number' => $a->document?->tracking_number,
                'document_id' => $a->document_id,
                'office' => $a->document?->originator?->office?->name,
                'created_at' => $a->created_at?->toISOString(),
            ]);

        $growth = $this->growth();

        $reclaimable = $this->reclaimable();

        return response()->json([
            'totals' => $totals,
            'by_type' => $byType,
            'by_office' => $byOffice,
            'largest' => $largest,
            'growth' => $growth,
            'reclaimable' => $reclaimable,
        ]);
    }

    /**
     * Delete all non-latest attachment versions (keeps only the newest copy of each filename).
     */
    public function cleanupVersions()
    {
        $targets = DocumentAttachment::query()
            ->whereNull('archived_at')
            ->where('is_latest', false)
            ->get();

        $deleted = 0;
        $bytes = 0;
        foreach ($targets as $attachment) {
            if ($this->deleteAttachmentFile($attachment)) {
                $attachment->delete();
                $deleted++;
                $bytes += $attachment->file_size;
            }
        }

        return response()->json([
            'message' => "Deleted {$deleted} old version(s), freed " . $this->humanBytes($bytes),
            'deleted' => $deleted,
            'bytes_freed' => $bytes,
        ]);
    }

    /**
     * Delete exact-duplicate attachments across documents (keeps the newest copy of each hash).
     */
    public function cleanupDuplicates()
    {
        $duplicates = DocumentAttachment::query()
            ->select('file_hash')
            ->whereNotNull('file_hash')
            ->whereNull('archived_at')
            ->groupBy('file_hash')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $deleted = 0;
        $bytes = 0;

        foreach ($duplicates as $dup) {
            if (!$dup->file_hash) {
                continue;
            }

            $copies = DocumentAttachment::query()
                ->where('file_hash', $dup->file_hash)
                ->whereNull('archived_at')
                ->orderByDesc('created_at')
                ->get();

            // Keep the newest copy.
            foreach ($copies->slice(1) as $attachment) {
                if ($this->deleteAttachmentFile($attachment)) {
                    $attachment->delete();
                    $deleted++;
                    $bytes += $attachment->file_size;
                }
            }
        }

        return response()->json([
            'message' => "Deleted {$deleted} duplicate(s), freed " . $this->humanBytes($bytes),
            'deleted' => $deleted,
            'bytes_freed' => $bytes,
        ]);
    }

    /**
     * Move attachments of completed documents past their retention window into the archive.
     */
    public function archiveExpired()
    {
        $retentionMonths = (int) SystemSetting::get('retention_months', 12);
        $cutoff = now()->subMonths($retentionMonths);

        $targets = DocumentAttachment::query()
            ->whereNull('archived_at')
            ->whereHas('document', function ($q) use ($cutoff) {
                $q->whereIn('status', ['approved', 'released'])
                    ->where(fn ($q2) => $q2
                        ->whereNull('released_at')
                        ->orWhere('released_at', '<', $cutoff));
            })
            ->get();

        $archived = 0;
        $bytes = 0;

        foreach ($targets as $attachment) {
            if ($this->moveToArchive($attachment)) {
                $archived++;
                $bytes += $attachment->file_size;
            }
        }

        return response()->json([
            'message' => "Archived {$archived} attachment(s) (" . $this->humanBytes($bytes) . ") from documents past {$retentionMonths} month retention",
            'archived' => $archived,
            'bytes_moved' => $bytes,
            'retention_months' => $retentionMonths,
        ]);
    }

    /**
     * Permanently delete archived files whose grace period has elapsed.
     */
    public function purgeArchived()
    {
        $graceCutoff = now()->subDays(self::ARCHIVE_GRACE_DAYS);

        $targets = DocumentAttachment::query()
            ->whereNotNull('archived_at')
            ->where('archived_at', '<', $graceCutoff)
            ->get();

        $deleted = 0;
        $bytes = 0;

        foreach ($targets as $attachment) {
            if ($this->deleteAttachmentFile($attachment)) {
                $attachment->delete();
                $deleted++;
                $bytes += $attachment->file_size;
            }
        }

        return response()->json([
            'message' => "Purged {$deleted} archived attachment(s), freed " . $this->humanBytes($bytes),
            'deleted' => $deleted,
            'bytes_freed' => $bytes,
        ]);
    }

    public function listArchive(Request $request)
    {
        $query = DocumentAttachment::query()
            ->with(['document.originator.office', 'uploader'])
            ->whereNotNull('archived_at')
            ->orderByDesc('archived_at');

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('file_name', 'like', "%{$s}%")
                    ->orWhereHas('document', function ($q2) use ($s) {
                        $q2->where('tracking_number', 'like', "%{$s}%");
                    });
            });
        }

        return response()->json($query->paginate($request->get('per_page', 25)));
    }

    public function restoreArchived(Request $request, DocumentAttachment $attachment)
    {
        if (!$attachment->archived_at) {
            return response()->json(['message' => 'Attachment is not archived'], 422);
        }

        $source = $this->disk()->path($attachment->file_path);
        $target = 'documents/' . $attachment->document_id . '/' . basename($attachment->file_path);

        if (!is_file($source)) {
            return response()->json(['message' => 'Archived file not found on disk'], 404);
        }

        $this->disk()->makeDirectory('documents/' . $attachment->document_id);
        if (!@copy($source, $this->disk()->path($target))) {
            return response()->json(['message' => 'Could not restore file'], 500);
        }
        $this->disk()->delete($attachment->file_path);

        $attachment->update([
            'file_path' => $target,
            'archived_at' => null,
        ]);

        return response()->json([
            'message' => 'Attachment restored from archive',
            'attachment' => $attachment->fresh(),
        ]);
    }

    // ------------------------------------------------------------------------

    private function deleteAttachmentFile(DocumentAttachment $attachment): bool
    {
        $path = $attachment->file_path;
        if ($path && $this->disk()->exists($path)) {
            return $this->disk()->delete($path);
        }

        return true;
    }

    private function moveToArchive(DocumentAttachment $attachment): bool
    {
        $source = $attachment->file_path;
        if (!$source || !$this->disk()->exists($source)) {
            return false;
        }

        $target = 'archive/' . $attachment->document_id . '/' . basename($source);
        $this->disk()->makeDirectory('archive/' . $attachment->document_id);

        if (!$this->disk()->move($source, $target)) {
            return false;
        }

        $attachment->update([
            'file_path' => $target,
            'archived_at' => now(),
        ]);

        return true;
    }

    private function byType($activeQuery)
    {
        $categories = [
            'image' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            'pdf' => ['application/pdf'],
            'word' => ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'excel' => ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'presentation' => ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        ];

        $rows = (clone $activeQuery)
            ->selectRaw('file_type, COUNT(*) AS files, SUM(file_size) AS bytes')
            ->groupBy('file_type')
            ->get();

        $result = [];
        foreach ($categories as $label => $mimes) {
            $match = $rows->filter(fn ($r) => in_array($r->file_type, $mimes, true));
            $result[] = [
                'category' => $label,
                'files' => $match->sum('files'),
                'bytes' => (int) $match->sum('bytes'),
            ];
        }

        $covered = $rows->filter(fn ($r) => !in_array($r->file_type, array_merge(...array_values($categories)), true));
        $result[] = [
            'category' => 'other',
            'files' => $covered->sum('files'),
            'bytes' => (int) $covered->sum('bytes'),
        ];

        return $result;
    }

    private function growth(): array
    {
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $months[now()->startOfMonth()->subMonths($i)->format('Y-m')] = null;
        }

        $rows = DocumentAttachment::query()
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS files, SUM(file_size) AS bytes")
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->whereNull('archived_at')
            ->groupBy('month')
            ->get();

        foreach ($rows as $row) {
            $months[$row->month] = ['month' => $row->month, 'files' => (int) $row->files, 'bytes' => (int) $row->bytes];
        }

        return array_values(array_map(
            fn ($month, $data) => $data ?? ['month' => $month, 'files' => 0, 'bytes' => 0],
            array_keys($months),
            array_values($months)
        ));
    }

    private function reclaimable(): array
    {
        $oldVersions = DocumentAttachment::query()
            ->whereNull('archived_at')
            ->where('is_latest', false)
            ->selectRaw('COUNT(*) AS files, COALESCE(SUM(file_size), 0) AS bytes')
            ->first();

        $duplicateHashes = DocumentAttachment::query()
            ->select('file_hash')
            ->whereNotNull('file_hash')
            ->whereNull('archived_at')
            ->groupBy('file_hash')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        $dupBytes = 0;
        $dupFiles = 0;
        foreach ($duplicateHashes as $dup) {
            $copies = DocumentAttachment::query()
                ->where('file_hash', $dup->file_hash)
                ->whereNull('archived_at')
                ->orderByDesc('created_at')
                ->get();
            $dupFiles += max(0, $copies->count() - 1);
            $dupBytes += $copies->slice(1)->sum('file_size');
        }

        [$orphanFiles, $orphanBytes] = $this->orphanScan();

        return [
            'old_versions_files' => (int) $oldVersions->files,
            'old_versions_bytes' => (int) $oldVersions->bytes,
            'duplicate_files' => $dupFiles,
            'duplicate_bytes' => (int) $dupBytes,
            'orphan_files' => $orphanFiles,
            'orphan_bytes' => $orphanBytes,
            'total_files' => (int) $oldVersions->files + $dupFiles + $orphanFiles,
            'total_bytes' => (int) $oldVersions->bytes + $dupBytes + $orphanBytes,
        ];
    }

    private function orphanScan(): array
    {
        $root = $this->disk()->path('documents');
        if (!is_dir($root)) {
            return [0, 0];
        }

        $known = DocumentAttachment::query()
            ->where('file_path', 'like', 'documents/%')
            ->pluck('file_path')
            ->flip();

        $orphanFiles = 0;
        $orphanBytes = 0;

        $rii = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        foreach ($rii as $file) {
            if (!$file->isFile()) {
                continue;
            }
            $rel = 'documents/' . ltrim(str_replace('\\', '/', substr($file->getPathname(), strlen($root))), '/');
            if (!$known->has($rel)) {
                $orphanFiles++;
                $orphanBytes += $file->getSize();
            }
        }

        return [$orphanFiles, $orphanBytes];
    }

    private function compressedBytes(): int
    {
        return (int) DocumentAttachment::query()
            ->where('is_compressed', true)
            ->whereNull('archived_at')
            ->sum('file_size');
    }

    private function humanBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        for ($i = 0; $bytes >= 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
