<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoutingTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'document_type',
        'description',
        'steps',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'steps' => 'array',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    // Helper methods
    public function getNextStep(int $currentStep): ?array
    {
        $steps = $this->steps ?? [];
        
        if (isset($steps[$currentStep + 1])) {
            return $steps[$currentStep + 1];
        }

        return null;
    }

    public function getTotalSteps(): int
    {
        return count($this->steps ?? []);
    }
}
