<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;
use App\Enums\DocumentStatus;
use App\Enums\DocumentPriority;
use Illuminate\Support\Str;

class Document extends Model
{
    use HasFactory, Searchable;

    protected $fillable = [
        'tracking_number',
        'document_type',
        'subject',
        'description',
        'priority',
        'status',
        'originator_id',
        'current_office_id',
        'routing_template_id',
        'current_step',
        'released_at',
        'is_public',
        'classification',
        'mode_of_transmittal',
        'action_requested',
        'recipient_type',
        'recipient_id',
        'cc_list',
        'bcc_list',
    ];

    protected $casts = [
        'priority' => DocumentPriority::class,
        'status' => DocumentStatus::class,
        'current_step' => 'integer',
        'released_at' => 'datetime',
        'is_public' => 'boolean',
        'cc_list' => 'array',
        'bcc_list' => 'array',
    ];

    // Philippine government document type taxonomy
    public const DOCUMENT_TYPES = [
        'memorandum' => 'Memorandum',
        'memorandum_circular' => 'Memorandum Circular',
        'endorsement' => 'Endorsement',
        'special_order' => 'Special Order',
        'travel_order' => 'Travel Order',
        'communication' => 'Communication',
        'referral' => 'Referral',
        'resolution' => 'Resolution',
        'ordinance' => 'Ordinance',
        'purchase_request' => 'Purchase Request',
        'job_order' => 'Job Order',
        'advisory' => 'Advisory',
        'request' => 'Request / Letter',
        'fsic_application' => 'FSIC Application',
        'fire_investigation_report' => 'Fire Investigation Report',
        'incident_report' => 'Fire Incident Report',
        'inspection_report' => 'Inspection Report',
        'training_request' => 'Training Request',
        'others' => 'Others',
    ];

    // Document classification / confidentiality markings
    public const CLASSIFICATIONS = [
        'public' => 'Public',
        'official' => 'Official',
        'restricted' => 'Restricted',
        'confidential' => 'Confidential',
    ];

    public static function documentTypeLabel(string $type): string
    {
        return self::DOCUMENT_TYPES[$type] ?? str_replace('_', ' ', ucwords($type));
    }

    public static function classificationLabel(string $classification): string
    {
        return self::CLASSIFICATIONS[$classification] ?? ucfirst($classification);
    }

    // Modes of transmission commonly used in Philippine government offices
    public const MODES_OF_TRANSMITTAL = [
        'hand_carried' => 'Hand-carried',
        'registered_mail' => 'Registered Mail',
        'courier' => 'Courier',
        'email_fax' => 'Email / Fax',
        'internal' => 'Internal (Inter-Office)',
    ];

    public static function transmittalLabel(?string $mode): string
    {
        return $mode && isset(self::MODES_OF_TRANSMITTAL[$mode])
            ? self::MODES_OF_TRANSMITTAL[$mode]
            : 'Not Specified';
    }

    /**
     * Government routing disposition verbs mapped to state-machine transitions.
     * approve  -> advance to the next routing step
     * reject   -> terminate the document
     * return   -> send back to the originating office
     */
    public const ACTION_TRANSITIONS = [
        'approved' => 'approve',
        'signed' => 'approve',
        'endorsed' => 'approve',
        'noted' => 'approve',
        'recommended' => 'approve',
        'forwarded' => 'approve',
        'rejected' => 'reject',
        'disapproved' => 'reject',
        'returned' => 'return',
        'referred' => 'return',
        'resubmitted' => 'resubmit',
        'filed' => 'file',
        'routed' => 'send',
    ];

    public static function transitionFor(string $action): ?string
    {
        return self::ACTION_TRANSITIONS[$action] ?? null;
    }

    public static function canonicalAction(string $transition): string
    {
        return match ($transition) {
            'approve' => 'approved',
            'reject' => 'rejected',
            'return' => 'returned',
            'resubmit' => 'resubmitted',
            'file' => 'filed',
            'send' => 'routed',
            default => $transition,
        };
    }

    public static function routingActionVerbs(): array
    {
        return array_keys(self::ACTION_TRANSITIONS);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($document) {
            if (empty($document->tracking_number)) {
                $document->tracking_number = self::generateTrackingNumber();
            }
        });
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'tracking_number' => $this->tracking_number,
            'subject' => $this->subject,
            'description' => $this->description,
            'document_type' => self::documentTypeLabel($this->document_type ?? 'others'),
            'status' => $this->status ? $this->status->value : null,
            'classification' => $this->classification ? self::classificationLabel($this->classification) : null,
            'created_at' => $this->created_at ? $this->created_at->timestamp : null,
        ];
    }

    // Relationships
    public function originator()
    {
        return $this->belongsTo(User::class, 'originator_id');
    }

    public function currentOffice()
    {
        return $this->belongsTo(Office::class, 'current_office_id');
    }

    public function routingTemplate()
    {
        return $this->belongsTo(RoutingTemplate::class);
    }

    public function attachments()
    {
        return $this->hasMany(DocumentAttachment::class);
    }

    public function latestAttachments()
    {
        return $this->hasMany(DocumentAttachment::class)
            ->where('is_latest', true)
            ->orderBy('file_name');
    }

    public function recipient()
    {
        if ($this->recipient_type === 'personnel') {
            return $this->belongsTo(User::class, 'recipient_id');
        }
        return $this->belongsTo(Office::class, 'recipient_id');
    }

    public function routingHistory()
    {
        return $this->hasMany(RoutingHistory::class);
    }

    public function auditTrails()
    {
        return $this->hasMany(AuditTrail::class);
    }

    public function comments()
    {
        return $this->hasMany(DocumentComment::class)->orderBy('created_at', 'asc');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', DocumentStatus::RECEIVED);
    }

    public function scopeInReview($query)
    {
        return $query->where('status', DocumentStatus::IN_REVIEW);
    }

    public function scopeReleased($query)
    {
        return $query->where('status', DocumentStatus::RELEASED);
    }

    // Helper methods
    public static function generateTrackingNumber(?string $officeCode = null): string
    {
        $year = date('Y');
        $prefix = $officeCode ? strtoupper(trim($officeCode)) : 'BFP';
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return sprintf('%s-%s-%s', $prefix, $year, $code);
    }
}
