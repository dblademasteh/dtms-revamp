<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Enums\UserRole;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'office_id',
        'phone',
        'status',
        'must_change_password',
        'notification_preferences',
        'rank',
        'last_name',
        'first_name',
        'middle_name',
        'suffix',
        'item_no',
        'accnt_no',
        'unit_assignment',
        'designation',
        'two_factor_secret',
        'two_factor_enabled',
        'two_factor_confirmed_at',
        'two_factor_recovery_codes',
        'avatar',
        'pincode',
        'can_view_all_documents',
    ];

    protected $appends = ['full_name', 'has_pincode'];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'pincode',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => UserRole::class,
        'notification_preferences' => 'array',
        'two_factor_enabled' => 'boolean',
        'must_change_password' => 'boolean',
        'can_view_all_documents' => 'boolean',
        'two_factor_confirmed_at' => 'datetime',
        'two_factor_recovery_codes' => 'array',
    ];

    // Relationships
    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function headedOffice()
    {
        return $this->hasOne(Office::class, 'head_user_id');
    }

    public function getFullNameAttribute(): string
    {
        if ($this->first_name && $this->last_name) {
            $middle = $this->middle_name ? ' ' . $this->middle_name : '';
            $suffix = $this->suffix ? ', ' . $this->suffix : '';
            return $this->first_name . $middle . ' ' . $this->last_name . $suffix;
        }
        return $this->name ?? 'Unknown';
    }

    /**
     * Normalize the officer rank to uppercase everywhere (e.g. FINSP, FO3).
     * The setter also normalizes on write so mixed-case ranks never persist.
     */
    protected function rank(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => is_string($value) ? strtoupper($value) : $value,
            set: fn ($value) => is_string($value) ? strtoupper(trim($value)) : $value,
        );
    }

    protected static function booted(): void
    {
        // Keep the display name in sync with the name parts whenever the parts
        // change and no explicit display name was provided in the same update.
        static::saving(function (User $user) {
            $partsChanged = $user->isDirty('first_name') || $user->isDirty('last_name') || $user->isDirty('middle_name');
            if ($user->exists && $partsChanged && !$user->isDirty('name')) {
                if ($user->first_name || $user->last_name) {
                    $user->name = $user->getFullNameAttribute();
                }
            }
        });
    }

    public function getHasPincodeAttribute(): bool
    {
        return !is_null($this->pincode);
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'originator_id');
    }

    public function routedDocuments()
    {
        return $this->hasMany(Document::class, 'current_office_id');
    }

    public function auditTrails()
    {
        return $this->hasMany(AuditTrail::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === UserRole::SUPERADMIN;
    }

    public function canApprove(): bool
    {
        return in_array($this->role, [
            UserRole::OFFICER,
            UserRole::FCOS,
            UserRole::SUPERADMIN,
        ]);
    }
}
