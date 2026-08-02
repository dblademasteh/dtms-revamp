<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check");
            DB::statement("ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying, 'resubmitted'::character varying, 'referred'::character varying, 'filed'::character varying]))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check");
            DB::statement("ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying, 'resubmitted'::character varying, 'referred'::character varying]))");
        }
    }
};
