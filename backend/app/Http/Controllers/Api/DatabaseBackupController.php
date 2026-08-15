<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DatabaseBackupService;
use Illuminate\Http\Request;

class DatabaseBackupController extends Controller
{
    public function __construct(protected DatabaseBackupService $service)
    {
    }

    public function info()
    {
        return response()->json($this->service->info());
    }

    public function index()
    {
        return response()->json(['backups' => $this->service->listBackups()]);
    }

    public function backup()
    {
        $result = $this->service->createBackup();

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    public function restore(Request $request, string $file)
    {
        if (!str_starts_with(basename($file), 'dtms_backup_')) {
            return response()->json(['success' => false, 'message' => 'Invalid backup file'], 422);
        }

        $result = $this->service->restoreBackup($file);

        return response()->json($result, $result['success'] ? 200 : 500);
    }

    public function delete(Request $request, string $file)
    {
        if (!$this->service->deleteBackup($file)) {
            return response()->json(['success' => false, 'message' => 'Backup not found'], 404);
        }

        return response()->json(['success' => true, 'message' => 'Backup deleted']);
    }

    public function download(Request $request, string $file)
    {
        $path = $this->service->backupDir() . DIRECTORY_SEPARATOR . basename($file);
        if (!str_starts_with(basename($file), 'dtms_backup_') || !\Illuminate\Support\Facades\File::exists($path)) {
            abort(404);
        }

        return response()->download($path);
    }

    public function optimize()
    {
        $result = $this->service->optimize();

        return response()->json($result, $result['success'] ? 200 : 500);
    }
}
