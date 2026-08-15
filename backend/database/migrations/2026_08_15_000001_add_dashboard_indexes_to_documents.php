<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->index('current_office_id');
            $table->index('originator_id');
            $table->index('due_at');
            $table->index('released_at');
            $table->index('is_public');
            $table->index(['status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['current_office_id']);
            $table->dropIndex(['originator_id']);
            $table->dropIndex(['due_at']);
            $table->dropIndex(['released_at']);
            $table->dropIndex(['is_public']);
            $table->dropIndex(['status', 'due_at']);
        });
    }
};
