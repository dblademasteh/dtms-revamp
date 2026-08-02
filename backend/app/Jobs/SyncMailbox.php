<?php

namespace App\Jobs;

use App\Models\Mailbox;
use App\Services\Mailbox\MailboxSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncMailbox implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public int $tries = 1;

    public int $uniqueFor = 300;

    public function __construct(public Mailbox $mailbox)
    {
    }

    public function uniqueId(): string
    {
        return 'mailbox-' . $this->mailbox->id;
    }

    public function handle(MailboxSyncService $sync): void
    {
        try {
            $sync->sync($this->mailbox);
            Log::info('Mailbox synced automatically', [
                'mailbox_id' => $this->mailbox->id,
                'user_id' => $this->mailbox->user_id,
            ]);
        } catch (Throwable $e) {
            Log::warning('Automatic mailbox sync failed', [
                'mailbox_id' => $this->mailbox->id,
                'user_id' => $this->mailbox->user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
