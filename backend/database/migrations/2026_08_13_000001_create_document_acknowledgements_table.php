<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_acknowledgements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('office_id')->nullable()->constrained('offices')->cascadeOnDelete();
            $table->boolean('required')->default(true);
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('seen_at')->nullable();
            $table->timestamp('reminded_at')->nullable();
            $table->timestamps();

            $table->index(['document_id', 'acknowledged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_acknowledgements');
    }
};
