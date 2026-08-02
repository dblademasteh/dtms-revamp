<?php

namespace App\Services\Mailbox;

use App\Models\Mailbox;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class MailboxSender
{
    public function send(Mailbox $mailbox, array $params): void
    {
        if (!$mailbox->smtp_host) {
            throw new RuntimeException('SMTP is not configured for this mailbox');
        }

        $this->configureSmtp($mailbox);

        $mailable = (new Mailable())
            ->from($mailbox->email, $params['from_name'] ?? null)
            ->subject((string) $params['subject']);

        if (!empty($params['to'])) {
            $mailable->to($this->formatAddresses($params['to']));
        }
        if (!empty($params['cc'])) {
            $mailable->cc($this->formatAddresses($params['cc']));
        }
        if (!empty($params['bcc'])) {
            $mailable->bcc($this->formatAddresses($params['bcc']));
        }
        if (!empty($params['reply_to'])) {
            $mailable->replyTo($params['reply_to']['email'], $params['reply_to']['name'] ?? null);
        }

        if (!empty($params['html'])) {
            $mailable->html($params['html']);
        }
        if (!empty($params['text'])) {
            $mailable->text($params['text']);
        }

        foreach ($params['attachments'] ?? [] as $attachment) {
            $mailable->attach(
                $attachment['path'],
                [
                    'as' => $attachment['name'],
                    'mime' => $attachment['mime'] ?? 'application/octet-stream',
                ]
            );
        }

        Mail::mailer('personal')->send($mailable);
    }

    public function testSmtp(array $config): void
    {
        $host = $config['smtp_host'] ?? null;
        if (!$host) {
            throw new RuntimeException('SMTP host is required');
        }
        $port = (int) ($config['smtp_port'] ?? 465);
        $encryption = $config['smtp_encryption'] ?? 'ssl';
        $username = $config['smtp_username'] ?: $config['email'];
        $password = $config['smtp_password'] ?? '';

        $transport = $encryption === 'ssl' ? 'ssl' : 'tcp';
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ]);

        $sock = @stream_socket_client($transport . '://' . $host . ':' . $port, $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
        if (!$sock) {
            throw new RuntimeException("Could not connect to SMTP server {$host}:{$port} ({$errstr})");
        }
        stream_set_timeout($sock, 30);

        try {
            if (fgets($sock) === false) {
                throw new RuntimeException('SMTP server did not respond');
            }
            fwrite($sock, "EHLO dts\r\n");
            $this->drainResponse($sock);

            if ($encryption === 'starttls' || $encryption === 'tls') {
                fwrite($sock, "STARTTLS\r\n");
                $this->drainResponse($sock);
                if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('SMTP STARTTLS negotiation failed');
                }
                fwrite($sock, "EHLO dts\r\n");
                $this->drainResponse($sock);
            }

            fwrite($sock, "AUTH LOGIN\r\n");
            $line = fgets($sock);
            if ($line === false || !str_starts_with($line, '334')) {
                throw new RuntimeException('SMTP server does not support AUTH LOGIN');
            }
            fwrite($sock, base64_encode($username) . "\r\n");
            $line = fgets($sock);
            if ($line === false || !str_starts_with($line, '334')) {
                throw new RuntimeException('SMTP authentication rejected (username)');
            }
            fwrite($sock, base64_encode($password) . "\r\n");
            $line = fgets($sock);
            if ($line === false || !str_starts_with($line, '235')) {
                throw new RuntimeException('SMTP authentication failed — check your app password');
            }
        } finally {
            fwrite($sock, "QUIT\r\n");
            fclose($sock);
        }
    }

    protected function drainResponse($sock): void
    {
        while (($line = fgets($sock)) !== false) {
            if (strlen($line) >= 4 && substr($line, 3, 1) === ' ') {
                break;
            }
        }
    }

    protected function configureSmtp(Mailbox $mailbox): void
    {
        config([
            'mail.default' => 'personal',
            'mail.mailers.personal' => [
                'transport' => 'smtp',
                'host' => $mailbox->smtp_host,
                'port' => (int) ($mailbox->smtp_port ?: 465),
                'encryption' => $mailbox->smtp_encryption ?: 'ssl',
                'username' => $mailbox->smtpUsername(),
                'password' => $mailbox->getDecryptedSmtpPassword(),
                'timeout' => 30,
                'stream' => [
                    'ssl' => [
                        'allow_self_signed' => true,
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                    ],
                ],
            ],
        ]);
    }

    protected function formatAddresses(array $addresses): array
    {
        return array_map(fn ($a) => [
            'email' => $a['email'],
            'name' => $a['name'] ?? null,
        ], $addresses);
    }
}
