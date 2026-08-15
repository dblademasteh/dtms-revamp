<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class DbBackup extends Command
{
    protected $signature = 'db:backup';

    protected $description = 'Create a compressed database backup (and prune old ones)';

    public function handle(DatabaseBackupService $backup): int
    {
        $this->info('Creating database backup...');

        $result = $backup->createBackup();
        if (!$result['success']) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message'] . ' (' . $result['file'] . ')');
        $this->info('Retention: keeping the newest ' . $backup->retention() . ' backups.');

        return self::SUCCESS;
    }
}
