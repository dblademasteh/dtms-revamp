<?php

namespace App\Listeners;

use App\Events\NotificationCreated;
use App\Models\User;
use App\Services\SmsService;

class SendSmsNotification
{
    private const TYPE_PREF_MAP = [
        'doc_created' => 'doc_created',
        'doc_routed' => 'doc_routed',
        'doc_received' => 'doc_routed',
        'doc_due_soon' => 'doc_status',
        'doc_overdue' => 'doc_status',
        'doc_escalated' => 'doc_status',
        'ack_request' => 'doc_status',
        'ack_confirmed' => 'doc_status',
    ];

    public function __construct(private SmsService $sms)
    {
    }

    public function handle(NotificationCreated $event): void
    {
        if (!$this->sms->isConfigured()) {
            return;
        }

        $user = User::find($event->userId);

        if (!$user || empty($user->phone)) {
            return;
        }

        $prefs = $user->notification_preferences;

        if (is_array($prefs) && count($prefs) > 0) {
            $prefKey = self::TYPE_PREF_MAP[$event->type] ?? null;
            if ($prefKey && empty($prefs[$prefKey])) {
                return;
            }
        }

        $message = "DTMS: {$event->title} — {$event->message}";

        $this->sms->send($user->phone, $message);
    }
}
