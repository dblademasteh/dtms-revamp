<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: drop old check constraint
        $db = DB::connection();
        if ($db->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
        }

        // Update data
        DB::table('users')->where('role', 'administrator')->update(['role' => 'superadmin']);
        DB::table('users')->where('role', 'division_head')->update(['role' => 'officer']);
        DB::table('users')->where('role', 'approver')->update(['role' => 'officer']);
        DB::table('users')->where('role', 'records_officer')->update(['role' => 'officer']);
        DB::table('users')->where('role', 'encoder')->update(['role' => 'non_officer']);

        // Drop and recreate enum column
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('non_officer');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['encoder', 'approver', 'records_officer', 'division_head', 'administrator'])->default('encoder');
        });

        DB::table('users')->where('role', 'superadmin')->update(['role' => 'administrator']);
        DB::table('users')->where('role', 'officer')->update(['role' => 'encoder']);
        DB::table('users')->where('role', 'non_officer')->update(['role' => 'encoder']);
        DB::table('users')->where('role', 'fcos')->update(['role' => 'encoder']);
    }
};
