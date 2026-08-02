<?php

namespace App\Enums;

enum DocumentStatus: string
{
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
            self::RECEIVED => 'Received',
            self::IN_REVIEW => 'In Review',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::RETURNED => 'Returned for Revision',
            self::RELEASED => 'Released',
            self::FILED => 'Filed',
        };
    }

    public function color(): string
    {
        return match($this) {
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
