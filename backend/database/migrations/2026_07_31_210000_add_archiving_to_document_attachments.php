<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_attachments', function (Blueprint $table) {
            $table->boolean('is_compressed')->default(false)->after('is_latest');
            $table->timestamp('archived_at')->nullable()->after('is_compressed');

            $table->index('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('document_attachments', function (Blueprint $table) {
            $table->dropIndex(['archived_at']);
            $table->dropColumn(['is_compressed', 'archived_at']);
        });
    }
};
