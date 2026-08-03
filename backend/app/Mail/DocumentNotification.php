<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Document;

class DocumentNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Document $document,
        public string $action,
        public string $message = '',
    ) {}

    public function envelope(): Envelope
    {
        $subject = match($this->action) {
            'created' => "New Document: {$this->document->subject}",
            'approved' => "Document Approved: {$this->document->subject}",
            'rejected' => "Document Declined: {$this->document->subject}",
            'returned' => "Document Returned: {$this->document->subject}",
            default => "Document Update: {$this->document->subject}",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.document-notification',
            with: [
                'document' => $this->document,
                'action' => $this->action,
                'message' => $this->message,
                'trackingNumber' => $this->document->tracking_number,
                'subject' => $this->document->subject,
            ],
        );
    }
}
