<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number')->unique();
            $table->string('document_type');
            $table->string('subject');
            $table->text('description')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', [
                'pending',
                'in_review',
                'approved',
                'rejected',
                'returned',
                'released'
            ])->default('pending');
            $table->foreignId('originator_id')->constrained('users');
            $table->foreignId('current_office_id')->constrained('offices');
            $table->foreignId('routing_template_id')->nullable()->constrained();
            $table->timestamp('sla_deadline')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamps();

            $table->index('status');
            $table->index('document_type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
