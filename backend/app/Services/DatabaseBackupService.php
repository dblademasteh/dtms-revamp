<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class DatabaseBackupService
{
    /**
     * Directory where SQL dumps are stored (bind-mounted to the NAS in production).
     */
    public function backupDir(): string
    {
        $dir = storage_path('app/backups');
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        return $dir;
    }

    /**
     * Resolve a Postgres client binary, preferring whatever is on PATH
     * (postgresql-client inside the container) and falling back to common
     * local dev installs.
     */
    public function binary(string $name): string
    {
        $candidates = [
            $name,
            'C:\\Program Files\\PostgreSQL\\18\\bin\\' . $name . '.exe',
            'C:\\Program Files\\PostgreSQL\\17\\bin\\' . $name . '.exe',
            'C:\\Program Files\\PostgreSQL\\16\\bin\\' . $name . '.exe',
            'C:\\Program Files\\PostgreSQL\\15\\bin\\' . $name . '.exe',
        ];

        foreach ($candidates as $candidate) {
            if ($candidate !== $name && file_exists($candidate)) {
                return $candidate;
            }
        }

        return $name;
    }

    /**
     * Number of backups to keep (pruned oldest-first after each new backup).
     */
    public function retention(): int
    {
        return max(1, (int) env('DB_BACKUP_RETENTION', 14));
    }

    /**
     * Create a compressed custom-format dump (pg_dump -F c) and prune old backups.
     *
     * @return array{success: bool, file?: string, message: string}
     */
    public function createBackup(): array
    {
        set_time_limit(0);

        $file = $this->backupDir() . DIRECTORY_SEPARATOR
            . 'dtms_backup_' . now()->format('Y-m-d_His') . '.dump';

        $cmd = sprintf(
            '%s -h %s -p %s -U %s -F c -Z 9 -f %s %s 2>&1',
            $this->binary('pg_dump'),
            escapeshellarg(env('DB_HOST', '127.0.0.1')),
            escapeshellarg(env('DB_PORT', '5432')),
            escapeshellarg(env('DB_USERNAME', 'dts_user')),
            escapeshellarg($file),
            escapeshellarg(env('DB_DATABASE', 'dts_database'))
        );

        putenv('PGPASSWORD=' . env('DB_PASSWORD', ''));
        $output = shell_exec($cmd);
        putenv('PGPASSWORD');

        $ok = File::exists($file) && filesize($file) > 0;

        if ($ok) {
            $this->pruneBackups();
        }

        return [
            'success' => (bool) $ok,
            'file' => $ok ? basename($file) : null,
            'message' => $ok
                ? 'Database backup created successfully'
                : ('Backup failed: ' . substr((string) $output, 0, 500)),
        ];
    }

    /**
     * Keep only the newest N backup files.
     */
    public function pruneBackups(): int
    {
        $files = $this->allBackupFiles();
        $removed = 0;

        while (count($files) > $this->retention()) {
            $oldest = array_shift($files);
            if ($oldest && File::delete($oldest->getPathname())) {
                $removed++;
            }
        }

        return $removed;
    }

    /**
     * All existing backup files sorted oldest-first.
     */
    protected function allBackupFiles(): array
    {
        if (!is_dir($this->backupDir())) {
            return [];
        }

        return collect(File::files($this->backupDir()))
            ->filter(fn ($f) => str_starts_with($f->getFilename(), 'dtms_backup_'))
            ->sortBy(fn ($f) => $f->getMTime())
            ->values()
            ->all();
    }

    /**
     * List backups with size, date, and format.
     */
    public function listBackups(): array
    {
        return array_map(fn ($f) => [
            'file' => $f->getFilename(),
            'size' => $f->getSize(),
            'modified_at' => $f->getMTime(),
            'format' => str_ends_with($f->getFilename(), '.sql') ? 'Plain SQL' : 'Compressed',
        ], array_reverse($this->allBackupFiles()));
    }

    /**
     * Delete a single backup file by name (path traversal is blocked).
     */
    public function deleteBackup(string $file): bool
    {
        $path = $this->backupDir() . DIRECTORY_SEPARATOR . basename($file);
        if (!File::exists($path) || !str_starts_with(basename($file), 'dtms_backup_')) {
            return false;
        }

        return File::delete($path);
    }

    /**
     * Restore a backup. Custom-format dumps go through pg_restore; plain SQL
     * dumps are replayed with psql. Existing objects are dropped/recreated.
     *
     * @return array{success: bool, message: string}
     */
    public function restoreBackup(string $file): array
    {
        set_time_limit(0);

        $path = $this->backupDir() . DIRECTORY_SEPARATOR . basename($file);
        if (!File::exists($path)) {
            return ['success' => false, 'message' => 'Backup file not found'];
        }

        $host = escapeshellarg(env('DB_HOST', '127.0.0.1'));
        $port = escapeshellarg(env('DB_PORT', '5432'));
        $user = escapeshellarg(env('DB_USERNAME', 'dts_user'));
        $db = escapeshellarg(env('DB_DATABASE', 'dts_database'));

        putenv('PGPASSWORD=' . env('DB_PASSWORD', ''));

        if (str_ends_with(basename($file), '.sql')) {
            $cmd = sprintf(
                '%s -h %s -p %s -U %s -d %s -v ON_ERROR_STOP=1 -f %s 2>&1',
                $this->binary('psql'),
                $host,
                $port,
                $user,
                $db,
                escapeshellarg($path)
            );
        } else {
            $cmd = sprintf(
                '%s --clean --if-exists --no-owner --no-privileges -h %s -p %s -U %s -d %s %s 2>&1',
                $this->binary('pg_restore'),
                $host,
                $port,
                $user,
                $db,
                escapeshellarg($path)
            );
        }

        $output = shell_exec($cmd);
        putenv('PGPASSWORD');

        $failed = str_contains((string) $output, 'error:')
            || str_contains((string) $output, 'FATAL:');

        return [
            'success' => !$failed,
            'message' => $failed
                ? 'Restore completed with errors: ' . substr((string) $output, 0, 500)
                : 'Database restored successfully from ' . basename($file),
        ];
    }

    /**
     * Connection + table overview used by the Settings > Database panel.
     */
    public function info(): array
    {
        $db = DB::connection()->getDatabaseName();
        $driver = DB::connection()->getDriverName();

        $tables = DB::select("
            SELECT table_name AS name,
                   (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS rows
            FROM information_schema.tables t
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        ");

        $size = (int) DB::selectOne('SELECT pg_database_size(current_database()) AS size')->size;

        $docRoot = storage_path('app/public/documents');
        $fileCount = 0;
        $bytes = 0;
        if (is_dir($docRoot)) {
            $rii = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($docRoot, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($rii as $file) {
                if ($file->isFile()) {
                    $fileCount++;
                    $bytes += $file->getSize();
                }
            }
        }

        $backups = $this->listBackups();

        return [
            'database' => $db,
            'driver' => $driver,
            'tables' => array_map(fn ($t) => [
                'name' => $t->name,
                'rows' => (int) $t->rows,
            ], $tables),
            'size_bytes' => $size,
            'storage' => [
                'path' => $docRoot,
                'files' => $fileCount,
                'bytes' => $bytes,
            ],
            'backups_path' => $this->backupDir(),
            'retention' => $this->retention(),
            'backups' => $backups,
            'last_backup' => $backups[0]['file'] ?? null,
        ];
    }

    /**
     * VACUUM ANALYZE to reclaim space and refresh statistics.
     */
    public function optimize(): array
    {
        set_time_limit(0);

        try {
            DB::statement('VACUUM ANALYZE');

            return ['success' => true, 'message' => 'Database optimized (VACUUM ANALYZE)'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}
