<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mailbox_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('uid');
            $table->string('folder')->default('INBOX');
            $table->string('subject')->nullable();
            $table->string('from_name')->nullable();
            $table->string('from_email')->nullable();
            $table->text('to')->nullable();
            $table->text('cc')->nullable();
            $table->string('message_id')->nullable();
            $table->longText('body_text')->nullable();
            $table->longText('body_html')->nullable();
            $table->text('flags')->nullable();
            $table->boolean('is_seen')->default(false);
            $table->boolean('has_attachments')->default(false);
            $table->timestamp('received_at')->nullable();
            $table->timestamps();

            $table->unique(['mailbox_id', 'folder', 'uid']);
            $table->index(['mailbox_id', 'folder', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_messages');
    }
};
