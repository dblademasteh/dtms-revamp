<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('rank')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('rank');
            $table->string('first_name')->nullable()->after('last_name');
            $table->string('middle_name')->nullable()->after('first_name');
            $table->string('item_no')->nullable()->after('middle_name');
            $table->string('accnt_no')->nullable()->after('item_no');
            $table->string('unit_assignment')->nullable()->after('accnt_no');
            $table->string('designation')->nullable()->after('unit_assignment');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'rank',
                'last_name',
                'first_name',
                'middle_name',
                'item_no',
                'accnt_no',
                'unit_assignment',
                'designation',
            ]);
        });
    }
};
