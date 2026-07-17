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
        'parent_office_id',
        'head_user_id',
        'description',
        'office_type',
        'status',
    ];

    // Relationships
    public function parent()
    {
        return $this->belongsTo(Office::class, 'parent_office_id');
    }

    public function children()
    {
        return $this->hasMany(Office::class, 'parent_office_id')->orderBy('name');
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
