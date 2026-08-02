<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class Mailbox extends Model
{
    protected $fillable = [
        'user_id',
        'email',
        'imap_host',
        'imap_port',
        'imap_encryption',
        'imap_username',
        'imap_password',
        'smtp_host',
        'smtp_port',
        'smtp_encryption',
        'smtp_username',
        'smtp_password',
        'sync_enabled',
        'sent_folder',
        'last_synced_at',
    ];

    protected $hidden = [
        'imap_password',
        'smtp_password',
    ];

    protected $casts = [
        'sync_enabled' => 'boolean',
        'imap_port' => 'integer',
        'smtp_port' => 'integer',
        'last_synced_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(MailMessage::class);
    }

    public function imapUsername(): string
    {
        return $this->imap_username ?: $this->email;
    }

    public function smtpUsername(): string
    {
        return $this->smtp_username ?: $this->email;
    }

    public function getDecryptedImapPassword(): ?string
    {
        return $this->imap_password ? Crypt::decryptString($this->imap_password) : null;
    }

    public function getDecryptedSmtpPassword(): ?string
    {
        return $this->smtp_password ? Crypt::decryptString($this->smtp_password) : null;
    }

    public static function maskPassword(?string $password): ?string
    {
        if (!$password) {
            return null;
        }
        $len = strlen($password);
        return str_repeat('•', min($len, 8)) . ($len > 8 ? '…' : '');
    }
}
