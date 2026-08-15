<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Office;
use App\Models\User;
use App\Models\RoutingTemplate;
use Illuminate\Support\Facades\Hash;
use App\Enums\UserRole;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(BfpRegion2Seeder::class);
        $this->call(DropdownOptionSeeder::class);

        // ---------------------------------------------------------------------
        // Legacy generic demo data (kept for local development / smoke tests).
        // Idempotent so the seeder can be re-run safely.
        // ---------------------------------------------------------------------
        $rootOffice = Office::firstOrCreate(['code' => 'MUN'], [
            'name' => 'Municipal Government',
            'description' => 'Root office for the entire organization',
            'status' => 'active',
        ]);

        $hrOffice = Office::firstOrCreate(['code' => 'HRD'], [
            'name' => 'Human Resource Department',
            'parent_office_id' => $rootOffice->id,
            'description' => 'Handles employee relations, benefits, and records',
            'status' => 'active',
        ]);

        $p15024Admin = User::firstOrCreate(['accnt_no' => 'P15024'], [
            'name' => 'P15024',
            'email' => 'p15024@dts.gov.ph',
            'password' => Hash::make('password'),
            'role' => UserRole::SUPERADMIN,
            'office_id' => $rootOffice->id,
            'phone' => '+639171234567',
            'status' => 'active',
        ]);
        // Ensure the P15024 account (whether pre-existing or just created)
        // is promoted to superadmin with a known password.
        $p15024Admin->update([
            'role' => UserRole::SUPERADMIN,
            'password' => Hash::make('password'),
            'status' => 'active',
            'office_id' => $p15024Admin->office_id ?? $rootOffice->id,
        ]);

        $adminOffice = Office::firstOrCreate(['code' => 'ADS'], [
            'name' => 'Administrative Services',
            'parent_office_id' => $rootOffice->id,
            'description' => 'Manages administrative operations and support',
            'status' => 'active',
        ]);

        $financeOffice = Office::firstOrCreate(['code' => 'FIN'], [
            'name' => 'Finance Department',
            'parent_office_id' => $rootOffice->id,
            'description' => 'Handles financial operations and budget',
            'status' => 'active',
        ]);

        $legalOffice = Office::firstOrCreate(['code' => 'LEG'], [
            'name' => 'Legal Division',
            'parent_office_id' => $rootOffice->id,
            'description' => 'Provides legal services and review',
            'status' => 'active',
        ]);

        $admin = User::firstOrCreate(['email' => 'admin@dts.gov.ph'], [
            'accnt_no' => 'ADMIN',
            'name' => 'System Administrator',
            'password' => Hash::make('password'),
            'role' => UserRole::SUPERADMIN,
            'office_id' => $rootOffice->id,
            'phone' => '+639171234567',
            'status' => 'active',
        ]);
        $admin->update([
            'accnt_no' => 'ADMIN',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        $rootOffice->update(['head_user_id' => $admin->id]);

        $encoder = User::firstOrCreate(['email' => 'encoder@dts.gov.ph'], [
            'name' => 'Maria Santos',
            'password' => Hash::make('password'),
            'role' => UserRole::NON_OFFICER,
            'office_id' => $hrOffice->id,
            'phone' => '+639181234567',
            'status' => 'active',
        ]);

        $approver = User::firstOrCreate(['email' => 'approver@dts.gov.ph'], [
            'name' => 'Juan Dela Cruz',
            'password' => Hash::make('password'),
            'role' => UserRole::OFFICER,
            'office_id' => $hrOffice->id,
            'phone' => '+639191234567',
            'status' => 'active',
        ]);

        $hrHead = User::firstOrCreate(['email' => 'hrhead@dts.gov.ph'], [
            'name' => 'Pedro Reyes',
            'password' => Hash::make('password'),
            'role' => UserRole::OFFICER,
            'office_id' => $hrOffice->id,
            'phone' => '+639201234567',
            'status' => 'active',
        ]);

        $hrOffice->update(['head_user_id' => $hrHead->id]);

        RoutingTemplate::firstOrCreate(['name' => 'Standard Memorandum Routing'], [
            'document_type' => 'memorandum',
            'description' => 'Standard routing for leave requests',
            'steps' => [
                [
                    'step' => 1,
                    'office_id' => $hrOffice->id,
                    'role' => 'approver',
                    'action' => 'review',
                ],
                [
                    'step' => 2,
                    'office_id' => $hrOffice->id,
                    'role' => 'division_head',
                    'action' => 'approve',
                ],
                [
                    'step' => 3,
                    'office_id' => $hrOffice->id,
                    'role' => 'records_officer',
                    'action' => 'release',
                ],
            ],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        RoutingTemplate::firstOrCreate(['name' => 'Purchase Request'], [
            'document_type' => 'purchase_request',
            'description' => 'Standard routing for purchase requests',
            'steps' => [
                [
                    'step' => 1,
                    'office_id' => $adminOffice->id,
                    'role' => 'approver',
                    'action' => 'review',
                ],
                [
                    'step' => 2,
                    'office_id' => $financeOffice->id,
                    'role' => 'approver',
                    'action' => 'review',
                ],
                [
                    'step' => 3,
                    'office_id' => $financeOffice->id,
                    'role' => 'division_head',
                    'action' => 'approve',
                ],
            ],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        echo "Demo (legacy) data ensured.\n";
        echo "Admin credentials: admin@dts.gov.ph / password\n";
        echo "Encoder credentials: encoder@dts.gov.ph / password\n";
        echo "Approver credentials: approver@dts.gov.ph / password\n";
        echo "HR Head credentials: hrhead@dts.gov.ph / password\n";
    }
}