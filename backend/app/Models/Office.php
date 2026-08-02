<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Office extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'unit_code',
        'parent_office_id',
        'head_user_id',
        'description',
        'office_type',
        'status',
        'storage_quota_bytes',
        'logo',
    ];

    // Relationships
    public function parent()
    {
        return $this->belongsTo(Office::class, 'parent_office_id');
    }

    public function children()
    {
        return $this->hasMany(Office::class, 'parent_office_id')
            ->orderByRaw("CASE
                WHEN office_type = 'regional_office' THEN 1
                WHEN office_type = 'provincial_office' THEN 2
                WHEN office_type = 'fire_station' THEN 3
                WHEN office_type = 'division' THEN 4
                WHEN office_type = 'unit' THEN 5
                WHEN office_type = 'others' THEN 6
                ELSE 7
            END, name");
    }

    public function head()
    {
        return $this->belongsTo(User::class, 'head_user_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'current_office_id');
    }

    /**
     * Total bytes of non-archived attachments owned by documents originated in this office.
     */
    public function storageUsageBytes(): int
    {
        return (int) DocumentAttachment::query()
            ->join('documents', 'documents.id', '=', 'document_attachments.document_id')
            ->join('users', 'users.id', '=', 'documents.originator_id')
            ->where('users.office_id', $this->id)
            ->whereNull('document_attachments.archived_at')
            ->sum('document_attachments.file_size');
    }

    // Helper methods
    public function getHierarchyPath(): string
    {
        $path = [$this->name];
        $parent = $this->parent;

        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }

        return implode(' > ', $path);
    }
}
