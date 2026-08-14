<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoginAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email',
        'success',
        'ip_address',
        'user_agent',
        'reason',
    ];

    protected $casts = [
        'success' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
