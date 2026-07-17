<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The routing_history.action column is a varchar guarded by a CHECK constraint
        // that only allowed the original 5 actions. Resubmit/Refer produce
        // 'resubmitted' / 'referred', which were rejected. Extend the constraint.
        DB::statement("ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check");
        DB::statement("ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying, 'resubmitted'::character varying, 'referred'::character varying]))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check");
        DB::statement("ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying]))");
    }
};
