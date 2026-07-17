<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('mode_of_transmittal')
                ->nullable()
                ->after('classification')
                ->comment('Mode of transmission: hand_carried, registered_mail, courier, email_fax, internal');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('mode_of_transmittal');
        });
    }
};
