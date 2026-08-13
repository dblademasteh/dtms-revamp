<?php

namespace App\Console\Commands;

use App\Enums\DocumentStatus;
use App\Models\Document;
use App\Models\DocumentAcknowledgment;
use App\Models\Notification;
use App\Models\User;
use App\Events\NotificationCreated;
use Illuminate\Console\Command;

class SlaCheck extends Command
{
    protected $signature = 'sla:check';

    protected $description = 'Send SLA due/overdue reminders, escalations and acknowledgment reminders';

    public function handle(): int
    {
        $sent = 0;
        $sent += $this->remindAcknowledgers();
        $sent += $this->checkSla();

        $this->info("SLA check complete ({$sent} notification(s) sent).");

        return self::SUCCESS;
    }

    private function notify(int $userId, string $type, string $title, string $message, array $data): bool
    {
        if (!$userId) {
            return false;
        }

        $notification = Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'channel' => 'in_app',
            'sent_at' => now(),
            'data' => $data,
        ]);

        NotificationCreated::dispatch(
            $notification->id,
            $notification->user_id,
            $notification->type,
            $notification->title,
            $notification->message,
            $notification->data,
        );

        return true;
    }

    private function holderUser(Document $document): ?int
    {
        if ($document->recipient_type === 'personnel' && $document->recipient_id) {
            return $document->recipient_id;
        }
        if ($document->recipient_type === 'office' && $document->recipient_id) {
            return \App\Models\Office::find($document->recipient_id)?->head_user_id;
        }
        return \App\Models\Office::find($document->current_office_id)?->head_user_id;
    }

    private function checkSla(): int
    {
        $sent = 0;
        $tracking = fn (Document $d) => ['document_id' => $d->id, 'tracking_number' => $d->tracking_number, 'subject' => $d->subject];

        // Documents with a due date, still in flight, never reminded.
        $documents = Document::whereNotNull('due_at')
            ->whereIn('status', [DocumentStatus::RECEIVED->value, DocumentStatus::IN_REVIEW->value])
            ->whereNull('sla_reminded_at')
            ->get();

        foreach ($documents as $document) {
            $overdue = $document->due_at->isPast();
            $dueInHours = (int) round(now()->diffInRealHours($document->due_at, false));
            $holderId = $this->holderUser($document);

            if ($overdue) {
                // Overdue — warn the holder and escalate to the office chief + superadmins.
                $sent += (int) $this->notify(
                    $holderId,
                    'doc_overdue',
                    'Document Overdue',
                    "The document \"{$document->subject}\" ({$document->tracking_number}) is overdue by " . abs($dueInHours) . " hour(s). Please act on it immediately.",
                    $tracking($document)
                );

                $office = \App\Models\Office::find($document->current_office_id);
                if ($office?->head_user_id) {
                    $sent += (int) $this->notify(
                        $office->head_user_id,
                        'doc_escalated',
                        'Overdue Document Escalated',
                        "Overdue document \"{$document->subject}\" ({$document->tracking_number}) is awaiting action at {$office->name} and has been escalated.",
                        $tracking($document)
                    );
                }

                foreach (User::where('role', 'superadmin')->pluck('id') as $superId) {
                    $sent += (int) $this->notify(
                        $superId,
                        'doc_escalated',
                        'Overdue Document Escalated',
                        "Overdue document \"{$document->subject}\" ({$document->tracking_number}) is awaiting action and has been escalated.",
                        $tracking($document)
                    );
                }

                $document->update(['sla_reminded_at' => now(), 'sla_escalated_at' => now()]);
            } elseif ($dueInHours >= 0 && $dueInHours <= 48) {
                // Due within 48 hours.
                $sent += (int) $this->notify(
                    $holderId,
                    'doc_due_soon',
                    'Document Due Soon',
                    "The document \"{$document->subject}\" ({$document->tracking_number}) is due within " . max(1, $dueInHours) . " hour(s). Please complete processing before {$document->due_at->format('M d, Y H:i')}.",
                    $tracking($document)
                );

                $document->update(['sla_reminded_at' => now()]);
            }
        }

        return $sent;
    }

    private function remindAcknowledgers(): int
    {
        $sent = 0;

        $pending = DocumentAcknowledgment::with('document')
            ->whereNull('acknowledged_at')
            ->whereNull('reminded_at')
            ->where('created_at', '<=', now()->subHours(24))
            ->get();

        foreach ($pending as $ack) {
            $document = $ack->document;
            if (!$document) {
                continue;
            }

            if ($ack->user_id) {
                $sent += (int) $this->notify(
                    $ack->user_id,
                    'ack_request',
                    'Please Acknowledge Document',
                    "Please acknowledge the document \"{$document->subject}\" ({$document->tracking_number}).",
                    ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject]
                );
            } elseif ($ack->office_id) {
                $headId = \App\Models\Office::find($ack->office_id)?->head_user_id;
                $sent += (int) $this->notify(
                    $headId,
                    'ack_request',
                    'Please Acknowledge Document',
                    "Please acknowledge the document \"{$document->subject}\" ({$document->tracking_number}) on behalf of your office.",
                    ['document_id' => $document->id, 'tracking_number' => $document->tracking_number, 'subject' => $document->subject]
                );
            }

            $ack->update(['reminded_at' => now()]);
        }

        return $sent;
    }
}
