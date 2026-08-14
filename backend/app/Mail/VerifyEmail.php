<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerifyEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Verify Your Email — ' . config('app.name'));
    }

    public function content(): Content
    {
        $frontendUrl = rtrim(env('FRONTEND_URL', config('app.url')), '/');

        return new Content(
            markdown: 'emails.verify-email',
            with: [
                'user' => $this->user,
                'verifyUrl' => $frontendUrl . '/verify-email?email=' . urlencode($this->user->email) . '&token=' . urlencode($this->token),
            ],
        );
    }
}
