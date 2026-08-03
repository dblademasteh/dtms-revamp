<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_check');

            DB::statement(
                "ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status::text = ANY (ARRAY['created'::character varying, 'received'::character varying, 'in_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'released'::character varying, 'filed'::character varying]::text[]))"
            );

            DB::statement("ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'created'::character varying");
            return;
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->enum('status', [
                'created',
                'received',
                'in_review',
                'approved',
                'rejected',
                'returned',
                'released',
                'filed',
            ])->default('created')->change();
        });
    }

    public function down(): void
    {
        DB::table('documents')
            ->where('status', 'created')
            ->update(['status' => 'received']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_check');

            DB::statement(
                "ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status::text = ANY (ARRAY['received'::character varying, 'in_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'released'::character varying, 'filed'::character varying]::text[]))"
            );

            DB::statement("ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'received'::character varying");
            return;
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->enum('status', [
                'received',
                'in_review',
                'approved',
                'rejected',
                'returned',
                'released',
                'filed',
            ])->default('received')->change();
        });
    }
};
