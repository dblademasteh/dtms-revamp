<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routing_history', function (Blueprint $table) {
            $table->string('disposition')->nullable()->after('action')
                ->comment('Specific government disposition verb (e.g. signed, endorsed, referred)');
        });
    }

    public function down(): void
    {
        Schema::table('routing_history', function (Blueprint $table) {
            $table->dropColumn('disposition');
        });
    }
};
