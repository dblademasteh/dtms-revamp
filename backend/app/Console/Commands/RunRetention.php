<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\StorageController;
use Illuminate\Console\Command;

class RunRetention extends Command
{
    protected $signature = 'retention:run';

    protected $description = 'Archive and purge document attachments per the retention policy';

    public function handle(StorageController $storage): int
    {
        $archive = json_decode($storage->archiveExpired()->getContent(), true);
        $this->info("Archive: {$archive['message']}");

        $purge = json_decode($storage->purgeArchived()->getContent(), true);
        $this->info("Purge: {$purge['message']}");

        return self::SUCCESS;
    }
}
