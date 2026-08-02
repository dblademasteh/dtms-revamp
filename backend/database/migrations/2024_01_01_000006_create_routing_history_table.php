<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routing_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_office_id')->constrained('offices');
            $table->foreignId('to_office_id')->constrained('offices');
            $table->enum('action', ['routed', 'approved', 'rejected', 'returned', 'received', 'resubmitted', 'referred', 'filed']);
            $table->text('remarks')->nullable();
            $table->foreignId('actor_id')->constrained('users');
            $table->integer('step_number')->default(1);
            $table->timestamp('timestamp');
            $table->timestamps();

            $table->index(['document_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routing_history');
    }
};
