<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DropdownOption extends Model
{
    protected $fillable = ['group', 'value', 'label', 'sort_order', 'meta', 'is_active'];

    protected $casts = [
        'meta' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeForGroup($query, string $group)
    {
        return $query->where('group', $group);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
