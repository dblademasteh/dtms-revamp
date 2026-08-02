<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::table('documents')
            ->where('status', 'pending')
            ->update(['status' => 'received']);

        DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_check');

        DB::statement(
            "ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status::text = ANY (ARRAY['received'::character varying, 'in_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'released'::character varying, 'filed'::character varying]::text[]))"
        );

        DB::statement("ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'received'::character varying");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::table('documents')
            ->where('status', 'received')
            ->update(['status' => 'pending']);

        DB::statement('ALTER TABLE documents DROP CONSTRAINT documents_status_check');

        DB::statement(
            "ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status::text = ANY (ARRAY['pending'::character varying, 'in_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'released'::character varying]::text[]))"
        );

        DB::statement("ALTER TABLE documents ALTER COLUMN status SET DEFAULT 'pending'::character varying");
    }
};