<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'file_hash',
        'version',
        'is_latest',
        'is_compressed',
        'archived_at',
        'uploaded_by',
        'description',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'version' => 'integer',
        'is_latest' => 'boolean',
        'is_compressed' => 'boolean',
        'archived_at' => 'datetime',
    ];

    // Scopes
    public function scopeLatest($query)
    {
        return $query->where('is_latest', true);
    }

    // Relationships
    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // Helper methods
    public function getFormattedFileSize(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes >= 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }
}
