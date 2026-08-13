<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentAcknowledgment extends Model
{
    use HasFactory;

    protected $table = 'document_acknowledgements';

    protected $fillable = [
        'document_id',
        'user_id',
        'office_id',
        'required',
        'acknowledged_at',
        'seen_at',
        'reminded_at',
    ];

    protected $casts = [
        'required' => 'boolean',
        'acknowledged_at' => 'datetime',
        'seen_at' => 'datetime',
        'reminded_at' => 'datetime',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function scopePending($query)
    {
        return $query->whereNull('acknowledged_at');
    }
}
