<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mail_message_id')->constrained()->cascadeOnDelete();
            $table->string('filename');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->string('content_id')->nullable();
            $table->string('path')->nullable();
            $table->timestamps();

            $table->index('mail_message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_attachments');
    }
};
