<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Document;
use App\Models\Notification;
use App\Enums\DocumentStatus;

class CheckOverdueDocuments extends Command
{
    protected $signature = 'dts:check-overdue';
    protected $description = 'Check for overdue documents and send notifications to office heads';

    public function handle()
    {
        $overdueDocs = Document::where('sla_deadline', '<', now())
            ->whereNotIn('status', [
                DocumentStatus::APPROVED,
                DocumentStatus::RELEASED,
                DocumentStatus::FILED,
                DocumentStatus::REJECTED,
            ])
            ->with('currentOffice')
            ->get();

        $notified = 0;

        foreach ($overdueDocs as $doc) {
            $office = $doc->currentOffice;
            if (!$office || !$office->head_user_id) {
                continue;
            }

            $existingNotification = Notification::where('user_id', $office->head_user_id)
                ->where('type', 'document_overdue')
                ->where('data->document_id', $doc->id)
                ->whereDate('created_at', today())
                ->exists();

            if ($existingNotification) {
                continue;
            }

            $daysOverdue = now()->diffInDays($doc->sla_deadline);

            Notification::create([
                'user_id' => $office->head_user_id,
                'type' => 'document_overdue',
                'title' => 'Document Overdue',
                'message' => "The document \"{$doc->subject}\" ({$doc->tracking_number}) is {$daysOverdue} day(s) overdue at {$office->name}. Immediate action is required.",
                'channel' => 'in_app',
                'sent_at' => now(),
                'data' => ['document_id' => $doc->id, 'tracking_number' => $doc->tracking_number, 'subject' => $doc->subject],
            ]);

            $notified++;
        }

        $this->info("Checked {$overdueDocs->count()} overdue documents, sent {$notified} new notifications.");

        return Command::SUCCESS;
    }
}
