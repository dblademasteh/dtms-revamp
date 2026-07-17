<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type');
            $table->unsignedBigInteger('file_size');
            $table->integer('version')->default(1);
            $table->foreignId('uploaded_by')->constrained('users');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['document_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_attachments');
    }
};
