<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pincodes are now stored as bcrypt hashes (60 chars), so the column
        // must be widened from the original 6-char limit.
        Schema::table('users', function (Blueprint $table) {
            $table->string('pincode', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pincode', 6)->nullable()->change();
        });
    }
};
