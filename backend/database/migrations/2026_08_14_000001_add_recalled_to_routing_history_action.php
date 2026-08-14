<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check');
            DB::statement(
                "ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['created'::character varying, 'routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying, 'resubmitted'::character varying, 'referred'::character varying, 'filed'::character varying, 'recalled'::character varying]))"
            );
            return;
        }

        Schema::table('routing_history', function ($table) {
            $table->enum('action', [
                'created',
                'routed',
                'approved',
                'rejected',
                'returned',
                'received',
                'resubmitted',
                'referred',
                'filed',
                'recalled',
            ])->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE routing_history DROP CONSTRAINT IF EXISTS routing_history_action_check');
            DB::statement(
                "ALTER TABLE routing_history ADD CONSTRAINT routing_history_action_check CHECK (action::text = ANY (ARRAY['created'::character varying, 'routed'::character varying, 'approved'::character varying, 'rejected'::character varying, 'returned'::character varying, 'received'::character varying, 'resubmitted'::character varying, 'referred'::character varying, 'filed'::character varying]))"
            );
            return;
        }

        Schema::table('routing_history', function ($table) {
            $table->enum('action', [
                'created',
                'routed',
                'approved',
                'rejected',
                'returned',
                'received',
                'resubmitted',
                'referred',
                'filed',
            ])->change();
        });
    }
};
