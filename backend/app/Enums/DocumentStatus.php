<?php

namespace App\Enums;

enum DocumentStatus: string
{
    case PENDING = 'pending';
    case IN_REVIEW = 'in_review';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case RETURNED = 'returned';
    case RELEASED = 'released';

    public function label(): string
    {
        return match($this) {
            self::PENDING => 'Pending',
            self::IN_REVIEW => 'In Review',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::RETURNED => 'Returned for Revision',
            self::RELEASED => 'Released',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING => 'warning',
            self::IN_REVIEW => 'info',
            self::APPROVED => 'success',
            self::REJECTED => 'danger',
            self::RETURNED => 'secondary',
            self::RELEASED => 'primary',
        };
    }
}
