<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoutingHistory extends Model
{
    use HasFactory;

    protected $table = 'routing_history';

    protected $fillable = [
        'document_id',
        'from_office_id',
        'to_office_id',
        'action',
        'disposition',
        'remarks',
        'actor_id',
        'step_number',
        'timestamp',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    // Relationships
    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function fromOffice()
    {
        return $this->belongsTo(Office::class, 'from_office_id');
    }

    public function toOffice()
    {
        return $this->belongsTo(Office::class, 'to_office_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
