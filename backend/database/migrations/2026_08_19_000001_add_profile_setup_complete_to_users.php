<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('profile_setup_complete')->default(false)->after('must_change_password');
        });

        // Backfill: mark existing users with names as already set up
        DB::table('users')
            ->where(function ($query) {
                $query->whereNotNull('first_name')
                    ->where('first_name', '!=', '')
                    ->whereNotNull('last_name')
                    ->where('last_name', '!=', '');
            })
            ->update(['profile_setup_complete' => true]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_setup_complete');
        });
    }
};
