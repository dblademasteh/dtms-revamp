<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routing_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('document_type');
            $table->text('description')->nullable();
            $table->json('steps');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['document_type', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routing_templates');
    }
};
