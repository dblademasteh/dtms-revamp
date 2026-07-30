<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ClearData extends Command
{
    protected $signature = 'data:clear';
    protected $description = 'Clear all transactional data while keeping personnel (users) and offices';

    public function handle()
    {
        if (!$this->confirm('This will delete ALL documents, routing history, notifications, audit trails, suggestions, templates, and announcements. Keep users and offices?', true)) {
            return;
        }

        DB::statement('TRUNCATE TABLE audit_trails CASCADE');
        DB::statement('TRUNCATE TABLE document_comments CASCADE');
        DB::statement('TRUNCATE TABLE routing_history CASCADE');
        DB::statement('TRUNCATE TABLE document_attachments CASCADE');
        DB::statement('TRUNCATE TABLE notifications CASCADE');
        DB::statement('TRUNCATE TABLE suggestions CASCADE');
        DB::statement('TRUNCATE TABLE documents CASCADE');
        DB::statement('TRUNCATE TABLE routing_templates CASCADE');
        DB::statement('TRUNCATE TABLE system_settings CASCADE');

        $this->info('All transactional data cleared. Users (personnel) and offices preserved.');
    }
}
