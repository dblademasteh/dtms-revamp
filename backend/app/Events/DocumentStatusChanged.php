<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DocumentStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $documentId,
        public string $trackingNumber,
        public string $subject,
        public string $status,
        public string $action,
        public ?int $actorId = null,
        public ?string $actorName = null,
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('documents'),
            new PrivateChannel('App.Models.Document.'.$this->documentId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'document_id' => $this->documentId,
            'action' => $this->action,
            'actor_id' => $this->actorId,
        ];
    }
}
