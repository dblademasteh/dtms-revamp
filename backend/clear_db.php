<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Office;

DB::transaction(function () {
    $tables = [
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

    foreach ($tables as $table) {
        if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
            DB::table($table)->delete();
        }
    }

    User::where('role', 'superadmin')->update(['office_id' => null]);
    $u = User::where('role', '!=', 'superadmin')->delete();
    $o = Office::query()->delete();

    echo "Successfully deleted {$u} personnel/user accounts and {$o} offices from Docker database.\n";
});
