<?php

namespace App\Console\Commands;

use App\Jobs\SyncMailbox;
use App\Models\Mailbox;
use Illuminate\Console\Command;

class SyncAllMailboxes extends Command
{
    protected $signature = 'mailbox:sync-all';

    protected $description = 'Dispatch background sync jobs for all enabled mailboxes';

    public function handle(): int
    {
        $due = Mailbox::where('sync_enabled', true)
            ->where(function ($q) {
                $q->whereNull('last_synced_at')
                    ->orWhere('last_synced_at', '<=', now()->subMinutes(4));
            })
            ->pluck('id');

        $count = 0;
        foreach ($due as $mailboxId) {
            SyncMailbox::dispatch(Mailbox::find($mailboxId));
            $count++;
        }

        $this->info("Dispatched {$count} mailbox sync job(s).");
        return self::SUCCESS;
    }
}
