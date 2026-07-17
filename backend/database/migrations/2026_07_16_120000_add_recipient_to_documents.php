<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('recipient_type')->nullable()->after('subject');
            $table->unsignedBigInteger('recipient_id')->nullable()->after('recipient_type');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['recipient_type', 'recipient_id']);
        });
    }
};
