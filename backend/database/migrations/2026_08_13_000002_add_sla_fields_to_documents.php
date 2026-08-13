<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('documents', 'due_at')) {
            return;
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->timestamp('due_at')->nullable();
            $table->integer('sla_days')->nullable();
            $table->boolean('require_ack')->default(false);
            $table->timestamp('sla_reminded_at')->nullable();
            $table->timestamp('sla_escalated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['due_at', 'sla_days', 'require_ack', 'sla_reminded_at', 'sla_escalated_at']);
        });
    }
};
