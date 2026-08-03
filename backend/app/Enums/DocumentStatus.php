<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case CREATED = 'created';
    case RECEIVED = 'received';
    case IN_REVIEW = 'in_review';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case RETURNED = 'returned';
    case RELEASED = 'released';
    case FILED = 'filed';

    public function label(): string
    {
        return match($this) {
            self::CREATED => 'Created',
            self::RECEIVED => 'Received',
            self::IN_REVIEW => 'In Review',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Declined',
            self::RETURNED => 'Returned for Revision',
            self::RELEASED => 'Released',
            self::FILED => 'Filed',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::CREATED => 'neutral',
            self::RECEIVED => 'warning',
            self::IN_REVIEW => 'info',
            self::APPROVED => 'success',
            self::REJECTED => 'danger',
            self::RETURNED => 'secondary',
            self::RELEASED => 'primary',
            self::FILED => 'success',
        };
    }
}
