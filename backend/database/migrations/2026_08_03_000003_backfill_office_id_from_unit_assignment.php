<?php

use App\Models\User;
use App\Services\PersonnelOfficeResolver;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $resolver = new PersonnelOfficeResolver();

        $users = User::query()
            ->whereNull('office_id')
            ->whereNotNull('unit_assignment')
            ->get();

        $updated = 0;
        foreach ($users as $user) {
            $officeId = $resolver->resolveForUnitId($user->unit_assignment);
            if ($officeId) {
                $user->update(['office_id' => $officeId]);
                $updated++;
            }
        }
    }

    public function down(): void
    {
        // No reversible schema change.
    }
};
