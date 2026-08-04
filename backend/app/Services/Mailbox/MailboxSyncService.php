<?php

namespace App\Services\Mailbox;

use App\Models\MailAttachment;
use App\Models\MailMessage;
use App\Models\Mailbox;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;
use ZBateson\MailMimeParser\MailMimeParser;

class MailboxSyncService
{
    public const MAX_NEW_PER_SYNC = 100;
    public const MAX_FLAG_SYNC = 500;

    public function sync(Mailbox $mailbox): array
    {
        $client = $this->client($mailbox);
        $client->connect();

        $stats = [
            'inbox_new' => 0,
            'sent_new' => 0,
            'inbox_total' => 0,
            'sent_total' => 0,
            'folders' => [],
        ];

        try {
            $folders = $client->listFolders();
            $stats['folders'] = $folders;

            $sentFolder = $mailbox->sent_folder;
            if (!$sentFolder) {
                foreach ($folders as $folder) {
                    if ($folder['sent']) {
                        $sentFolder = $folder['name'];
                        break;
                    }
                }
                if ($sentFolder) {
                    $mailbox->update(['sent_folder' => $sentFolder]);
                }
            }

            $stats['inbox_total'] = $this->syncFolder($client, $mailbox, 'INBOX', $stats['inbox_new']);

            if ($sentFolder) {
                $stats['sent_total'] = $this->syncFolder($client, $mailbox, $sentFolder, $stats['sent_new']);
            }

            $mailbox->update(['last_synced_at' => now()]);
        } catch (Throwable $e) {
            $stats['error'] = $e->getMessage();
            throw $e;
        } finally {
            $client->logout();
        }

        return $stats;
    }

    protected function syncFolder(ImapClient $client, Mailbox $mailbox, string $folder, int &$newCounter): int
    {
        $uids = $client->allUids($folder);
        if (empty($uids)) {
            return 0;
        }

        $existing = MailMessage::where('mailbox_id', $mailbox->id)
            ->where('folder', $folder)
            ->pluck('uid')
            ->all();
        $existingMap = array_flip($existing);

        $newUids = array_values(array_filter($uids, fn ($u) => !isset($existingMap[$u])));
        $newUids = array_slice($newUids, -self::MAX_NEW_PER_SYNC);

        if ($newUids) {
            foreach ($client->fetchMessages($folder, $newUids) as $item) {
                try {
                    $this->storeMessage($mailbox, $folder, $item);
                    $newCounter++;
                } catch (Throwable $e) {
                    report($e);
                }
            }
        }

        $flagSyncUids = array_values(array_filter($uids, fn ($u) => isset($existingMap[$u])));
        $flagSyncUids = array_slice($flagSyncUids, -self::MAX_FLAG_SYNC);
        if ($flagSyncUids) {
            foreach ($client->fetchFlags($folder, $flagSyncUids) as $uid => $flags) {
                MailMessage::where('mailbox_id', $mailbox->id)
                    ->where('folder', $folder)
                    ->where('uid', $uid)
                    ->update([
                        'is_seen' => in_array('\\Seen', $flags),
                        'flags' => $flags,
                    ]);
            }
        }

        return count($uids);
    }

    protected function storeMessage(Mailbox $mailbox, string $folder, array $item): void
    {
        $parser = new MailMimeParser();
        $msg = $parser->parse($item['raw'], true);

        $from = $this->firstAddress($msg, 'from');
        $receivedAt = $this->parseDate($item['internaldate'], $msg->getHeaderValue('date'));

        $message = MailMessage::updateOrCreate(
            ['mailbox_id' => $mailbox->id, 'folder' => $folder, 'uid' => $item['uid']],
            [
                'subject' => $msg->getHeaderValue('subject') ?: '(no subject)',
                'from_name' => $from['name'] ?? null,
                'from_email' => $from['email'] ?? null,
                'to' => $this->addresses($msg, 'to'),
                'cc' => $this->addresses($msg, 'cc'),
                'message_id' => $msg->getHeaderValue('message-id'),
                'body_text' => $msg->getTextContent(),
                'body_html' => $msg->getHtmlContent(),
                'is_seen' => in_array('\\Seen', $item['flags']),
                'flags' => $item['flags'],
                'received_at' => $receivedAt,
            ]
        );

        $this->storeAttachments($mailbox, $message, $msg);
    }

    protected function storeAttachments(Mailbox $mailbox, MailMessage $message, $msg): void
    {
        $savedAny = false;
        $dir = "private/mailbox/{$mailbox->id}/{$message->id}";

        foreach ($msg->getAllAttachmentParts() as $part) {
            $filename = $part->getFilename();
            if (!$filename) {
                continue;
            }
            $filename = $this->sanitizeFilename($filename);
            if (!$filename) {
                continue;
            }

            $content = $part->getContent();
            $path = $dir . '/' . $filename;
            Storage::disk('local')->put($path, $content);

            MailAttachment::updateOrCreate(
                [
                    'mail_message_id' => $message->id,
                    'filename' => $filename,
                ],
                [
                    'mime_type' => $part->getContentType(),
                    'size' => strlen($content),
                    'content_id' => trim((string) $part->getHeaderValue('Content-ID'), '<>') ?: null,
                    'path' => $path,
                ]
            );

            $savedAny = true;
        }

        if ($savedAny !== $message->has_attachments) {
            $message->update(['has_attachments' => $savedAny]);
        }
    }

    protected function firstAddress($msg, string $header): ?array
    {
        $header = $msg->getHeader($header);
        if (!$header) {
            return null;
        }
        $addresses = $header->getAddresses();
        if (empty($addresses)) {
            return null;
        }
        return ['name' => $addresses[0]->getName(), 'email' => $addresses[0]->getEmail()];
    }

    protected function addresses($msg, string $header): array
    {
        $header = $msg->getHeader($header);
        if (!$header) {
            return [];
        }
        return array_map(fn ($addr) => [
            'name' => $addr->getName(),
            'email' => $addr->getEmail(),
        ], $header->getAddresses());
    }

    protected function parseDate(?string $internaldate, ?string $dateHeader): Carbon
    {
        if ($internaldate) {
            try {
                return Carbon::createFromFormat('d-M-Y H:i:s O', $internaldate);
            } catch (Throwable $e) {
                // fall through
            }
        }
        if ($dateHeader) {
            try {
                return Carbon::parse($dateHeader);
            } catch (Throwable $e) {
                // fall through
            }
        }
        return now();
    }

    protected function sanitizeFilename(string $filename): string
    {
        $filename = str_replace(['/', '\\', "\0"], '', $filename);
        $filename = trim($filename);
        if (strlen($filename) > 180) {
            $filename = substr($filename, -180);
        }
        return $filename;
    }

    public function client(Mailbox $mailbox): ImapClient
    {
        return new ImapClient([
            'host' => $mailbox->imap_host,
            'port' => $mailbox->imap_port,
            'encryption' => $mailbox->imap_encryption,
            'username' => $mailbox->imapUsername(),
            'password' => $mailbox->getDecryptedImapPassword(),
        ]);
    }

    public function testConnection(array $config): void
    {
        $client = new ImapClient([
            'host' => $config['imap_host'],
            'port' => (int) $config['imap_port'],
            'encryption' => $config['imap_encryption'] ?? 'ssl',
            'username' => $config['imap_username'] ?: $config['email'],
            'password' => $config['imap_password'],
        ]);
        $client->connect();
        $client->logout();
    }
}
