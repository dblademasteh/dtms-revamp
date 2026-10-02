<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('profile_setup_skipped')->default(false)->after('profile_setup_complete');
        });

        // No backfill needed: existing users were already marked
        // profile_setup_complete = true by the earlier migration.
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_setup_skipped');
        });
    }
};
