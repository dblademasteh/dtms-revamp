<?php

namespace App\Http\Controllers\Api;

use App\Jobs\SyncMailbox;
use App\Http\Controllers\Controller;
use App\Models\MailAttachment;
use App\Models\Mailbox;
use App\Models\MailMessage;
use App\Services\Mailbox\MailboxSender;
use App\Services\Mailbox\MailboxSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class MailboxController extends Controller
{
    protected MailboxSyncService $sync;

    protected MailboxSender $sender;

    public function __construct(MailboxSyncService $sync, MailboxSender $sender)
    {
        $this->sync = $sync;
        $this->sender = $sender;
    }

    public function show(Request $request)
    {
        $mailbox = Mailbox::where('user_id', $request->user()->id)->first();
        if (!$mailbox) {
            return response()->json(['configured' => false, 'mailbox' => null]);
        }

        return response()->json([
            'configured' => true,
            'mailbox' => [
                'id' => $mailbox->id,
                'email' => $mailbox->email,
                'imap_host' => $mailbox->imap_host,
                'imap_port' => $mailbox->imap_port,
                'imap_encryption' => $mailbox->imap_encryption,
                'imap_username' => $mailbox->imap_username,
                'imap_password' => $mailbox->imap_password ? true : false,
                'smtp_host' => $mailbox->smtp_host,
                'smtp_port' => $mailbox->smtp_port,
                'smtp_encryption' => $mailbox->smtp_encryption,
                'smtp_username' => $mailbox->smtp_username,
                'smtp_password' => $mailbox->smtp_password ? true : false,
                'sent_folder' => $mailbox->sent_folder,
                'sync_enabled' => $mailbox->sync_enabled,
                'last_synced_at' => $mailbox->last_synced_at,
            ],
            'unread_count' => $mailbox->messages()->where('folder', 'INBOX')->where('is_seen', false)->count(),
        ]);
    }

    public function saveConfig(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'imap_host' => 'required|string|max:255',
            'imap_port' => 'required|integer|min:1|max:65535',
            'imap_encryption' => 'required|in:ssl,starttls,none',
            'imap_username' => 'nullable|string|max:255',
            'imap_password' => 'nullable|string',
            'smtp_host' => 'nullable|string|max:255',
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'smtp_encryption' => 'nullable|in:ssl,starttls,tls,none',
            'smtp_username' => 'nullable|string|max:255',
            'smtp_password' => 'nullable|string',
            'sync_enabled' => 'sometimes|boolean',
        ]);

        $mailbox = Mailbox::firstOrNew(['user_id' => $request->user()->id]);
        $mailbox->email = $data['email'];
        $mailbox->imap_host = $data['imap_host'];
        $mailbox->imap_port = $data['imap_port'];
        $mailbox->imap_encryption = $data['imap_encryption'];
        $mailbox->imap_username = $data['imap_username'] ?? null;
        $mailbox->smtp_host = $data['smtp_host'] ?? null;
        $mailbox->smtp_port = $data['smtp_port'] ?? null;
        $mailbox->smtp_encryption = $data['smtp_encryption'] ?? 'ssl';
        $mailbox->smtp_username = $data['smtp_username'] ?? null;
        $mailbox->sync_enabled = $request->boolean('sync_enabled', true);

        if (!empty($data['imap_password'])) {
            $mailbox->imap_password = Crypt::encryptString($data['imap_password']);
        } elseif ($data['imap_username'] ?? null) {
            // keep existing password
        }
        if (!empty($data['smtp_password'])) {
            $mailbox->smtp_password = Crypt::encryptString($data['smtp_password']);
        }

        $mailbox->save();

        return response()->json([
            'message' => 'Mailbox configuration saved',
            'mailbox' => $mailbox->fresh(),
        ]);
    }

    public function test(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'imap_host' => 'required|string',
            'imap_port' => 'required|integer|min:1|max:65535',
            'imap_encryption' => 'required|in:ssl,starttls,none',
            'imap_username' => 'nullable|string',
            'imap_password' => 'required|string',
            'smtp_host' => 'nullable|string',
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'smtp_encryption' => 'nullable|in:ssl,starttls,tls,none',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
        ]);

        $results = ['imap' => 'ok', 'smtp' => null, 'warnings' => []];

        try {
            $this->sync->testConnection($data);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'IMAP test failed',
                'results' => ['imap' => 'error', 'error' => $e->getMessage()],
            ], 422);
        }

        if (!empty($data['smtp_host']) && !empty($data['smtp_password'])) {
            try {
                $this->sender->testSmtp($data);
                $results['smtp'] = 'ok';
            } catch (Throwable $e) {
                $results['smtp'] = 'error';
                $results['warnings'][] = 'SMTP: ' . $e->getMessage();
            }
        } else {
            $results['warnings'][] = 'SMTP not tested (missing host or password)';
        }

        return response()->json([
            'message' => 'IMAP connection successful',
            'results' => $results,
        ]);
    }

    public function sync(Request $request)
    {
        $mailbox = $this->mailbox($request);
        try {
            $stats = $this->sync->sync($mailbox);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Sync failed: ' . $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Mailbox synced',
            'stats' => $stats,
            'last_synced_at' => $mailbox->fresh()->last_synced_at,
            'unread_count' => $mailbox->messages()->where('folder', 'INBOX')->where('is_seen', false)->count(),
        ]);
    }

    public function folders(Request $request)
    {
        $mailbox = $this->mailbox($request);
        try {
            $client = $this->sync->client($mailbox);
            $client->connect();
            $folders = $client->listFolders();
            $client->logout();
        } catch (Throwable $e) {
            return response()->json(['message' => 'Could not list folders: ' . $e->getMessage()], 422);
        }

        return response()->json(['folders' => $folders]);
    }

    public function messages(Request $request)
    {
        $mailbox = $this->mailbox($request);

        if ($mailbox->sync_enabled && ($mailbox->last_synced_at === null || $mailbox->last_synced_at->lt(now()->subMinutes(5)))) {
            SyncMailbox::dispatch($mailbox);
        }

        $query = $mailbox->messages()
            ->where('folder', $request->get('folder', 'INBOX'))
            ->select(['id', 'mailbox_id', 'folder', 'uid', 'subject', 'from_name', 'from_email', 'to', 'is_seen', 'has_attachments', 'received_at', 'created_at'])
            ->withCount('attachments');

        if ($search = trim((string) $request->get('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'ilike', "%{$search}%")
                    ->orWhere('from_name', 'ilike', "%{$search}%")
                    ->orWhere('from_email', 'ilike', "%{$search}%")
                    ->orWhere('body_text', 'ilike', "%{$search}%");
            });
        }

        $messages = $query->orderBy('received_at', 'desc')
            ->paginate(min((int) $request->get('per_page', 25), 100));

        $unread = $mailbox->messages()->where('folder', 'INBOX')->where('is_seen', false)->count();

        return response()->json([
            'messages' => $messages,
            'unread_count' => $unread,
        ]);
    }

    public function message(Request $request, MailMessage $message)
    {
        $this->authorizeMessage($request, $message);

        $message->load('attachments');

        if (!$message->is_seen && $message->folder === 'INBOX') {
            $message->update(['is_seen' => true]);
        }

        return response()->json(['message' => $message]);
    }

    public function setSeen(Request $request, MailMessage $message)
    {
        $this->authorizeMessage($request, $message);
        $seen = $request->boolean('seen');

        $message->update(['is_seen' => $seen]);

        try {
            $client = $this->sync->client($message->mailbox);
            $client->connect();
            $client->setFlag($message->folder, $message->uid, '\\Seen', $seen);
            $client->logout();
        } catch (Throwable $e) {
            return response()->json(['message' => 'Marked locally but IMAP flag update failed: ' . $e->getMessage()], 200);
        }

        return response()->json(['message' => $seen ? 'Marked as read' : 'Marked as unread']);
    }

    public function destroy(Request $request, MailMessage $message)
    {
        $this->authorizeMessage($request, $message);

        try {
            $client = $this->sync->client($message->mailbox);
            $client->connect();
            $client->delete($message->folder, $message->uid);
            $client->logout();
        } catch (Throwable $e) {
            return response()->json(['message' => 'Could not delete message: ' . $e->getMessage()], 422);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted']);
    }

    public function send(Request $request)
    {
        $mailbox = $this->mailbox($request);

        $data = $request->validate([
            'to' => 'required|json',
            'cc' => 'sometimes|json',
            'bcc' => 'sometimes|json',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'reply_to' => 'sometimes|nullable|json',
        ]);

        $to = json_decode($data['to'], true);
        $cc = $data['cc'] ?? null ? json_decode($data['cc'], true) : [];
        $bcc = $data['bcc'] ?? null ? json_decode($data['bcc'], true) : [];
        $replyTo = $data['reply_to'] ?? null ? json_decode($data['reply_to'], true) : null;

        if (!is_array($to) || empty($to)) {
            return response()->json(['message' => 'At least one recipient is required'], 422);
        }
        foreach (array_merge($to, $cc, $bcc) as $recipient) {
            if (empty($recipient['email']) || filter_var($recipient['email'], FILTER_VALIDATE_EMAIL) === false) {
                return response()->json(['message' => 'One of the recipient emails is invalid'], 422);
            }
        }

        $attachments = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $dir = "private/mailbox/compose/{$request->user()->id}/" . Str::uuid();
                $path = $file->storeAs($dir, $this->cleanUploadName($file->getClientOriginalName()), 'local');
                $attachments[] = [
                    'path' => storage_path('app/' . $path),
                    'name' => $this->cleanUploadName($file->getClientOriginalName()),
                    'mime' => $file->getMimeType() ?: 'application/octet-stream',
                ];
            }
        }

        try {
            $this->sender->send($mailbox, [
                'from_name' => $request->user()->full_name,
                'to' => $to,
                'cc' => $cc,
                'bcc' => $bcc,
                'reply_to' => $replyTo,
                'subject' => $data['subject'],
                'html' => $data['body'],
                'attachments' => $attachments,
            ]);
        } catch (Throwable $e) {
            foreach ($attachments as $attachment) {
                @unlink($attachment['path']);
            }
            return response()->json(['message' => 'Send failed: ' . $e->getMessage()], 422);
        }

        foreach ($attachments as $attachment) {
            @unlink($attachment['path']);
        }

        // Trigger a sync so the sent copy shows up in Sent
        try {
            $this->sync->sync($mailbox);
        } catch (Throwable $e) {
            // ignore
        }

        return response()->json(['message' => 'Email sent']);
    }

    public function downloadAttachment(Request $request, MailAttachment $attachment)
    {
        $this->authorizeAttachment($request, $attachment);

        if (!$attachment->path || !Storage::disk('local')->exists($attachment->path)) {
            abort(404);
        }

        $path = Storage::disk('local')->path($attachment->path);
        $mime = $attachment->mime_type ?: 'application/octet-stream';

        $inline = str_starts_with($mime, 'image/')
            || $mime === 'application/pdf'
            || str_starts_with($mime, 'text/');

        return response()->file($path, [
            'Content-Type' => $mime,
            'Content-Disposition' => ($inline ? 'inline' : 'attachment') . '; filename="' . addslashes($attachment->filename) . '"',
        ]);
    }

    protected function mailbox(Request $request): Mailbox
    {
        $mailbox = Mailbox::where('user_id', $request->user()->id)->first();
        if (!$mailbox) {
            abort(404, 'Mailbox is not configured');
        }
        return $mailbox;
    }

    protected function authorizeMessage(Request $request, MailMessage $message): void
    {
        abort_if($message->mailbox->user_id !== $request->user()->id, 403);
    }

    protected function authorizeAttachment(Request $request, MailAttachment $attachment): void
    {
        abort_if($attachment->message->mailbox->user_id !== $request->user()->id, 403);
    }

    protected function cleanUploadName(string $name): string
    {
        $name = str_replace(['/', '\\', "\0"], '', $name);
        return trim($name) ?: 'attachment.bin';
    }
}
