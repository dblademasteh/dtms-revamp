<?php

namespace App\Enums;

enum UserRole: string
{
    case SUPERADMIN = 'superadmin';
    case OFFICER = 'officer';
    case NON_OFFICER = 'non_officer';
    case FCOS = 'fcos';

    public function label(): string
    {
        return match($this) {
            self::SUPERADMIN => 'Super Admin',
            self::OFFICER => 'Officer',
            self::NON_OFFICER => 'Non-Officer',
            self::FCOS => 'FCOS',
        };
    }
}
