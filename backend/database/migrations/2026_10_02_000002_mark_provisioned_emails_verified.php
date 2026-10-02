<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // All user emails in this system are admin-provisioned (there is no
        // self-registration), so existing unverified emails are trusted and
        // should not trigger the verification prompt.
        DB::table('users')
            ->whereNotNull('email')
            ->whereNull('email_verified_at')
            ->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Cannot restore which emails were unverified — no-op.
    }
};
