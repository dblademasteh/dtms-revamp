<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MailMessage extends Model
{
    protected $fillable = [
        'mailbox_id',
        'uid',
        'folder',
        'subject',
        'from_name',
        'from_email',
        'to',
        'cc',
        'message_id',
        'body_text',
        'body_html',
        'flags',
        'is_seen',
        'has_attachments',
        'received_at',
    ];

    protected $casts = [
        'to' => 'array',
        'cc' => 'array',
        'flags' => 'array',
        'is_seen' => 'boolean',
        'has_attachments' => 'boolean',
        'received_at' => 'datetime',
    ];

    protected $appends = ['preview'];

    public function mailbox(): BelongsTo
    {
        return $this->belongsTo(Mailbox::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MailAttachment::class);
    }

    public function getPreviewAttribute(): string
    {
        $text = $this->body_text ?: strip_tags((string) $this->body_html);
        $text = preg_replace('/\s+/u', ' ', trim((string) $text));
        return mb_substr($text, 0, 140);
    }
}
