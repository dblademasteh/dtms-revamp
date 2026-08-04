<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Office;

class ClearPersonnelAndOffices extends Command
{
    protected $signature = 'app:clear-personnel-offices';
    protected $description = 'Clear all personnel, non-superadmin users, offices, and related documents from the database';

    public function handle()
    {
        $this->info('Starting database cleanup...');

        DB::transaction(function () {
            // Delete dependent records safely if table exists
            $tablesToDelete = [
                'audit_trails',
                'notifications',
                'document_comments',
                'document_attachments',
                'routing_history',
                'documents',
                'routing_templates',
                'mail_attachments',
                'mail_messages',
                'mailboxes',
                'suggestions',
            ];

            foreach ($tablesToDelete as $table) {
                if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    DB::table($table)->delete();
                }
            }

            // Clear office references on superadmin accounts
            User::where('role', 'superadmin')->update(['office_id' => null]);

            // Clear non-superadmin user/personnel records
            $deletedUsers = User::where('role', '!=', 'superadmin')->delete();

            // Clear offices
            $deletedOffices = Office::query()->delete();

            $this->info("Successfully deleted {$deletedUsers} user/personnel accounts and {$deletedOffices} offices.");
        });

        $this->info('Cleanup completed successfully. Only Superadmin account(s) remain.');
        return 0;
    }
}
