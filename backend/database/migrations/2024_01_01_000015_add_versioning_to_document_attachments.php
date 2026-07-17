<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_attachments', function (Blueprint $table) {
            $table->string('file_hash', 64)->nullable()->after('file_size');
            $table->boolean('is_latest')->default(true)->after('version');

            $table->index(['document_id', 'file_name']);
            $table->index(['document_id', 'is_latest']);
        });
    }

    public function down(): void
    {
        Schema::table('document_attachments', function (Blueprint $table) {
            $table->dropIndex(['document_id', 'file_name']);
            $table->dropIndex(['document_id', 'is_latest']);
            $table->dropColumn(['file_hash', 'is_latest']);
        });
    }
};
