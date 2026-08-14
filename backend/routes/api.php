<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\OfficeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\SuggestionController;
use App\Http\Controllers\Api\StorageController;
use App\Http\Controllers\Api\DropdownOptionController;
use App\Http\Controllers\Api\DocumentAcknowledgmentController;

// Public routes (throttled to mitigate brute-force attacks)
Route::middleware(['throttle:auth-ip', 'throttle:auth'])->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/login-pincode', [AuthController::class, 'loginViaPincode']);
    Route::post('/auth/2fa/verify', [AuthController::class, 'verify2fa']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

// Public tracking lookup
Route::get('/track/{trackingNumber}', [DocumentController::class, 'trackByNumber']);

// Public QR code for tracking (matches public /track route)
Route::get('/documents/{document}/qr', [DocumentController::class, 'qrCode']);

// Public Ranks endpoint (backed by the unified dropdown-options system)
Route::get('/ranks', [DropdownOptionController::class, 'ranks']);

// Public dropdown options endpoint
Route::get('/dropdown-options', [DropdownOptionController::class, 'index']);

// Public branding (system title/description/logos) for login & public pages
Route::get('/branding', [App\Http\Controllers\Api\BrandingController::class, 'publicIndex']);

// Public PWA manifest (branded name/description/icons) for install & splash
Route::get('/manifest.webmanifest', [App\Http\Controllers\Api\BrandingController::class, 'manifest']);

// Protected routes
Route::middleware(['auth:sanctum', 'force-password-change'])->group(function () {
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);
    Route::delete('/auth/avatar', [AuthController::class, 'deleteAvatar']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);
    Route::put('/auth/pincode', [AuthController::class, 'changePincode']);
    Route::put('/auth/notification-preferences', [AuthController::class, 'updateNotificationPreferences']);

    // Two-factor authentication (authenticated)
    Route::get('/auth/2fa/status', [TwoFactorController::class, 'status']);
    Route::post('/auth/2fa/enable', [TwoFactorController::class, 'enable']);
    Route::post('/auth/2fa/confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/auth/2fa/disable', [TwoFactorController::class, 'disable']);
    Route::post('/auth/2fa/recovery-codes', [TwoFactorController::class, 'recoveryCodes']);
    Route::post('/auth/2fa/regenerate-recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);

    // Routing Templates
    Route::get('/routing-templates', function () {
        return \App\Models\RoutingTemplate::where('is_active', true)->get();
    });

    // Documents
    Route::post('/announcements', [DocumentController::class, 'storeAnnouncement']);
    Route::apiResource('documents', DocumentController::class);
    Route::post('/documents/{document}/route', [DocumentController::class, 'route']);
    Route::post('/documents/{document}/recall', [DocumentController::class, 'recall']);
    Route::post('/documents/{document}/disseminate', [DocumentController::class, 'disseminate']);
    Route::post('/documents/{document}/attachments', [DocumentController::class, 'uploadAttachment']);
    Route::get('/documents/{document}/attachments/{attachment}/versions', [DocumentController::class, 'attachmentVersions']);
    Route::get('/documents/{document}/attachments/{attachment}/download', [DocumentController::class, 'downloadAttachment']);
    Route::post('/documents/{document}/comments', [DocumentController::class, 'storeComment']);
    Route::get('/documents/{document}/acknowledgements', [DocumentAcknowledgmentController::class, 'index']);
    Route::post('/documents/{document}/acknowledge', [DocumentAcknowledgmentController::class, 'acknowledge']);
    Route::get('/documents/{document}/pdf', [DocumentController::class, 'exportPdf']);
    Route::post('/documents/bulk-delete', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'document_ids' => 'required|array|min:1',
        ]);

        $user = $request->user();
        $deleted = 0;
        $errors = [];

        foreach ($request->document_ids as $docId) {
            $document = \App\Models\Document::find($docId);
            if (!$document) {
                $errors[] = ['document_id' => $docId, 'error' => 'Not found'];
                continue;
            }

            if (!$user->isAdmin()) {
                $errors[] = ['document_id' => $docId, 'error' => 'Unauthorized'];
                continue;
            }

            if (in_array($document->status->value, ['approved', 'released'])) {
                $errors[] = ['document_id' => $docId, 'error' => 'Cannot delete approved/released'];
                continue;
            }

            $document->delete();
            $deleted++;
        }

        return response()->json([
            'message' => "Deleted {$deleted} document(s)",
            'deleted' => $deleted,
            'errors' => $errors,
        ]);
    });

    // Offices
    Route::get('/offices/claimable', [OfficeController::class, 'claimable']);
    Route::apiResource('offices', OfficeController::class);
    Route::get('/offices-hierarchy', [OfficeController::class, 'hierarchy']);

    // Self-service office management for office accounts
    Route::post('/my-office/claim', [OfficeController::class, 'claim']);
    Route::post('/my-office/register', [OfficeController::class, 'register']);
    Route::get('/my-office', [OfficeController::class, 'myOffice']);
    Route::put('/my-office', [OfficeController::class, 'updateMyOffice']);
    Route::post('/my-office/logo', [OfficeController::class, 'uploadMyOfficeLogo']);
    Route::delete('/my-office/logo', [OfficeController::class, 'deleteMyOfficeLogo']);

    // Personnel directory (all authenticated users)
    Route::get('/personnel', function () {
        return \App\Models\User::whereNotIn('role', ['office_station', 'office'])
            ->with(['office', 'headedOffice'])
            ->withCount(['documents', 'routedDocuments'])
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                // If they don't have a direct office_id, fallback to the office they head
                if (!$user->office_id && $user->headedOffice) {
                    $user->office_id = $user->headedOffice->id;
                    $user->setRelation('office', $user->headedOffice);
                }
                // hide headedOffice to keep the payload clean
                unset($user->headedOffice);
                return $user;
            });
    });
    Route::post('/personnel', [PersonnelController::class, 'store']);
    Route::post('/personnel/import', [PersonnelController::class, 'import']);
    Route::get('/personnel/export', [PersonnelController::class, 'export']);

    // Reports
     Route::prefix('reports')->group(function () {
         Route::get('/dashboard', [ReportController::class, 'dashboard']);
         Route::get('/turnaround', [ReportController::class, 'turnaround']);
         Route::get('/bottlenecks', [ReportController::class, 'bottlenecks']);
         Route::get('/volume', [ReportController::class, 'volume']);
         Route::get('/export', [ReportController::class, 'export']);
         Route::get('/export-pdf', [ReportController::class, 'exportPdf']);
     });

    // Notifications
    Route::get('/notifications', function (\Illuminate\Http\Request $request) {
        $notifications = $request->user()->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        return response()->json($notifications);
    });

    Route::get('/notifications/unread-count', function (\Illuminate\Http\Request $request) {
        return response()->json([
            'count' => $request->user()->notifications()->where('is_read', false)->count(),
        ]);
    });

    Route::post('/notifications/{notification}/read', function (\Illuminate\Http\Request $request, \App\Models\Notification $notification) {
        $notification->update(['is_read' => true]);
        return response()->json(['message' => 'Marked as read']);
    });

    Route::post('/notifications/read-all', function (\Illuminate\Http\Request $request) {
        $request->user()->notifications()->where('is_read', false)->update(['is_read' => true]);
        return response()->json(['message' => 'All marked as read']);
    });

    Route::post('/notifications/clear-all', function (\Illuminate\Http\Request $request) {
        $request->user()->notifications()->delete();
        return response()->json(['message' => 'All notifications cleared']);
    });

    // Personal Mailbox
    Route::prefix('mailbox')->group(function () {
        Route::get('/config', [\App\Http\Controllers\Api\MailboxController::class, 'show']);
        Route::put('/config', [\App\Http\Controllers\Api\MailboxController::class, 'saveConfig']);
        Route::post('/test', [\App\Http\Controllers\Api\MailboxController::class, 'test']);
        Route::post('/sync', [\App\Http\Controllers\Api\MailboxController::class, 'sync']);
        Route::get('/folders', [\App\Http\Controllers\Api\MailboxController::class, 'folders']);
        Route::get('/messages', [\App\Http\Controllers\Api\MailboxController::class, 'messages']);
        Route::get('/messages/{message}', [\App\Http\Controllers\Api\MailboxController::class, 'message']);
        Route::patch('/messages/{message}/seen', [\App\Http\Controllers\Api\MailboxController::class, 'setSeen']);
        Route::delete('/messages/{message}', [\App\Http\Controllers\Api\MailboxController::class, 'destroy']);
        Route::get('/attachments/{attachment}', [\App\Http\Controllers\Api\MailboxController::class, 'downloadAttachment']);
        Route::post('/send', [\App\Http\Controllers\Api\MailboxController::class, 'send']);
    });

    // Routing Templates
    Route::get('/routing-templates/all', function () {
        return \App\Models\RoutingTemplate::with('creator')->orderBy('created_at', 'desc')->get();
    });

    Route::post('/routing-templates', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'name' => 'required|string|max:255',
            'document_type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'steps' => 'required|array|min:1',
        ]);

        $template = \App\Models\RoutingTemplate::create([
            'name' => $request->name,
            'document_type' => $request->document_type,
            'description' => $request->description,
            'steps' => $request->steps,
            'is_active' => $request->get('is_active', true),
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Template created', 'template' => $template], 201);
    });

    Route::put('/routing-templates/{template}', function (\Illuminate\Http\Request $request, \App\Models\RoutingTemplate $template) {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'document_type' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'steps' => 'sometimes|array|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $template->update($request->only(['name', 'document_type', 'description', 'steps', 'is_active']));
        return response()->json(['message' => 'Template updated', 'template' => $template->refresh()]);
    });

    Route::delete('/routing-templates/{template}', function (\App\Models\RoutingTemplate $template) {
        $template->delete();
        return response()->json(['message' => 'Template deleted']);
    });

    // Bulk operations
    Route::post('/documents/bulk-route', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'document_ids' => 'required|array|min:1',
            'action' => 'required|in:approved,rejected,returned',
            'remarks' => 'required|string|max:500',
            'to_office_id' => 'required_if:action,returned|exists:offices,id',
        ]);

        $user = $request->user();
        $results = ['success' => 0, 'failed' => 0, 'errors' => []];

        foreach ($request->document_ids as $docId) {
            try {
                $document = \App\Models\Document::findOrFail($docId);
                $newStatus = match($request->action) {
                    'approved' => \App\Enums\DocumentStatus::APPROVED,
                    'rejected' => \App\Enums\DocumentStatus::REJECTED,
                    'returned' => \App\Enums\DocumentStatus::RETURNED,
                };

                $document->update(['status' => $newStatus]);
                if ($request->action === 'returned') {
                    $document->update(['current_office_id' => $request->to_office_id]);
                }

                \App\Models\RoutingHistory::create([
                    'document_id' => $document->id,
                    'from_office_id' => $document->current_office_id,
                    'to_office_id' => $request->to_office_id ?? $document->current_office_id,
                    'action' => $request->action,
                    'remarks' => $request->remarks,
                    'actor_id' => $user->id,
                    'step_number' => $document->routingHistory()->max('step_number') + 1,
                    'timestamp' => now(),
                ]);

                $results['success']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = ['document_id' => $docId, 'error' => $e->getMessage()];
            }
        }

        return response()->json($results);
    });

    // Suggestions
    Route::get('/suggestions', [SuggestionController::class, 'index']);
    Route::post('/suggestions', [SuggestionController::class, 'store']);
    Route::get('/suggestions/{suggestion}', [SuggestionController::class, 'show']);

    // Admin suggestions management
    Route::middleware('admin')->group(function () {
        Route::put('/suggestions/{suggestion}', [SuggestionController::class, 'update']);
        Route::delete('/suggestions/{suggestion}', [SuggestionController::class, 'destroy']);
    });

    // System settings (admin only)
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/settings', function () {
            return response()->json([
                'settings' => \App\Http\Controllers\Api\BrandingController::settingsArray(),
            ]);
        });

        Route::put('/settings', function (\Illuminate\Http\Request $request) {
            $request->validate([
                'retention_months' => 'sometimes|integer|min:1|max:240',
                'system_title' => 'sometimes|string|max:100',
                'system_description' => 'sometimes|string|max:255',
            ]);

            if ($request->has('retention_months')) {
                \App\Models\SystemSetting::set('retention_months', $request->retention_months);
            }
            if ($request->has('system_title')) {
                \App\Models\SystemSetting::set('system_title', $request->system_title);
            }
            if ($request->has('system_description')) {
                \App\Models\SystemSetting::set('system_description', $request->system_description);
            }

            return response()->json([
                'message' => 'Settings updated',
                'settings' => \App\Http\Controllers\Api\BrandingController::settingsArray(),
            ]);
        });

        // Branding logo uploads (admin only)
        Route::post('/branding/logo', [\App\Http\Controllers\Api\BrandingController::class, 'uploadLogo']);
        Route::delete('/branding/logo', [\App\Http\Controllers\Api\BrandingController::class, 'deleteLogo']);


        // Dropdown options management (admin only) — includes the 'ranks' group
        Route::post('/dropdown-options', [DropdownOptionController::class, 'store']);
        Route::put('/dropdown-options/{option}', [DropdownOptionController::class, 'update']);
        Route::delete('/dropdown-options/{option}', [DropdownOptionController::class, 'destroy']);
        Route::post('/dropdown-options/{group}/reset', [DropdownOptionController::class, 'reset']);

        // Users (admin only) — only accounts with an account number
        Route::get('/users', function () {
            return \App\Models\User::with('office')
                ->whereNotNull('accnt_no')
                ->orderBy('created_at', 'desc')
                ->get();
        });

        Route::get('/users/{user}', function (\App\Models\User $user) {
            return $user->load('office');
        });

        Route::post('/users/from-personnel', function (\Illuminate\Http\Request $request) {
            $request->validate([
                'user_id' => 'required|exists:users,id',
                'password' => 'nullable|min:6',
                'role' => 'nullable|in:superadmin,officer,non_officer,fcos,office_station',
                'office_id' => 'nullable|exists:offices,id',
                'email' => 'nullable|email|unique:users,email',
                'is_chief' => 'nullable|boolean',
            ]);

            $person = \App\Models\User::findOrFail($request->user_id);

            $password = $request->password ?: 'bfp12345';
            $role = $request->role ?: (function ($rank) {
                $r = strtoupper((string) $rank);
                if (preg_match('/SUPT/', $r)) return 'officer';
                if (preg_match('/(F|FC)?INSP/', $r)) return 'officer';
                if (preg_match('/^SFO/', $r)) return 'officer';
                return 'non_officer';
            })($person->rank);

            $person->update([
                'password' => \Illuminate\Support\Facades\Hash::make($password),
                'role' => $role,
                'office_id' => $request->office_id,
                'email' => $request->filled('email') ? $request->email : null,
                'status' => 'active',
                'must_change_password' => true,
            ]);

            if ($request->boolean('is_chief') && $request->office_id) {
                $office = \App\Models\Office::find($request->office_id);
                $office->head_user_id = $person->id;
                $office->save();
            }

            return response()->json([
                'message' => 'Account created from personnel',
                'user' => $person->load('office'),
            ], 201);
        });

        // Create a dedicated office account (a brand-new user, not the chief's
        // personnel record). The login username is the office's unit code.
        Route::post('/office-accounts', function (\Illuminate\Http\Request $request) {
            $request->validate([
                'office_id' => 'required|exists:offices,id',
                'name' => 'nullable|string|max:255',
                'role' => 'nullable|in:office_station,officer,non_officer,fcos,superadmin',
                'password' => 'nullable|min:6',
                'email' => 'nullable|email|unique:users,email',
                'is_chief' => 'nullable|boolean',
            ]);

            $office = \App\Models\Office::findOrFail($request->office_id);

            if (!$office->unit_code) {
                return response()->json([
                    'message' => 'This office has no unit code yet. Set a unit code in Offices first.',
                ], 422);
            }

            if (\App\Models\User::where('accnt_no', $office->unit_code)->exists()) {
                return response()->json([
                    'message' => 'An account for this office already exists (username: ' . $office->unit_code . ').',
                ], 422);
            }

            $user = \App\Models\User::create([
                'name' => $request->name ?: $office->name,
                'email' => $request->email,
                'accnt_no' => $office->unit_code,
                'password' => \Illuminate\Support\Facades\Hash::make($request->password ?: 'bfp12345'),
                'role' => $request->role ?: 'office_station',
                'office_id' => $office->id,
                'status' => 'active',
                'must_change_password' => true,
            ]);

            if ($request->boolean('is_chief', true)) {
                $office->head_user_id = $user->id;
                $office->save();
            }

            return response()->json([
                'message' => 'Office account created (username: ' . $office->unit_code . ')',
                'user' => $user->load('office'),
            ], 201);
        });

        Route::put('/users/{user}', function (\Illuminate\Http\Request $request, \App\Models\User $user) {
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'role' => 'sometimes|in:superadmin,officer,non_officer,fcos,office_station',
                'status' => 'sometimes|in:active,inactive,suspended',
                'office_id' => 'sometimes|exists:offices,id',
                'rank' => 'sometimes|nullable|string|max:50',
                'first_name' => 'sometimes|nullable|string|max:255',
                'last_name' => 'sometimes|nullable|string|max:255',
                'middle_name' => 'sometimes|nullable|string|max:255',
                'suffix' => 'sometimes|nullable|string|max:20',
                'item_no' => 'sometimes|nullable|string|max:50',
                'accnt_no' => 'sometimes|nullable|string|max:50',
                'email' => 'sometimes|nullable|email|max:255',
                'designation' => 'sometimes|nullable|string|max:255',
                'unit_assignment' => 'sometimes|nullable|string|max:255',
                'password' => 'sometimes|string|min:6',
                'can_view_all_documents' => 'sometimes|boolean',
            ]);

            $allowed = $request->only([
                'name', 'role', 'status', 'office_id',
                'rank', 'first_name', 'last_name', 'middle_name', 'suffix',
                'item_no', 'accnt_no', 'email', 'designation', 'unit_assignment',
                'password', 'can_view_all_documents',
            ]);

            if ($request->has('password')) {
                $allowed['password'] = \Illuminate\Support\Facades\Hash::make($request->password);
            }

            $user->update(array_filter($allowed, fn($v) => !is_null($v)));

            return response()->json([
                'message' => 'User updated',
                'user' => $user->refresh()->load('office'),
            ]);
        });

        Route::delete('/users/{user}', function (\App\Models\User $user) {
            if ($user->role === 'superadmin') {
                return response()->json(['message' => 'Cannot delete a superadmin account'], 422);
            }

            $user->delete();

            return response()->json(['message' => 'User deleted']);
        });

        Route::post('/personnel/transfer', function (\Illuminate\Http\Request $request) {
            $request->validate([
                'user_ids' => 'required|array|min:1',
                'user_ids.*' => 'exists:users,id',
                'office_id' => 'required|exists:offices,id',
            ]);

            $count = \App\Models\User::whereIn('id', $request->user_ids)
                ->update(['office_id' => $request->office_id]);

            return response()->json([
                'message' => "{$count} personnel transferred successfully",
                'count' => $count,
            ]);
        });

        Route::delete('/personnel/clear', function () {
            \Illuminate\Support\Facades\Artisan::call('app:clear-personnel-offices');
            return response()->json([
                'message' => 'Personnel, users (except superadmin), offices, and documents cleared successfully',
            ]);
        });

        // Database management (superadmin only)
        Route::prefix('database')->group(function () {
            // Overview: connection, tables, storage usage
            Route::get('/info', function () {
                $db = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
                $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();

                $tables = \Illuminate\Support\Facades\DB::select("
                    SELECT table_name AS name,
                           (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS rows
                    FROM information_schema.tables t
                    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                ");

                // Disk usage of the storage/app/public/documents folder
                $docRoot = storage_path('app/public/documents');
                $fileCount = 0;
                $bytes = 0;
                if (is_dir($docRoot)) {
                    $rii = new \RecursiveIteratorIterator(
                        new \RecursiveDirectoryIterator($docRoot, \FilesystemIterator::SKIP_DOTS)
                    );
                    foreach ($rii as $file) {
                        if ($file->isFile()) {
                            $fileCount++;
                            $bytes += $file->getSize();
                        }
                    }
                }

                return response()->json([
                    'database' => $db,
                    'driver' => $driver,
                    'tables' => array_map(fn($t) => [
                        'name' => $t->name,
                        'rows' => (int) $t->rows,
                    ], $tables),
                    'storage' => [
                        'path' => $docRoot,
                        'files' => $fileCount,
                        'bytes' => $bytes,
                    ],
                    'backups_path' => storage_path('app/backups'),
                    'last_backup' => \Illuminate\Support\Facades\File::exists(storage_path('app/backups'))
                        ? collect(\Illuminate\Support\Facades\File::files(storage_path('app/backups')))
                            ->sortByDesc(fn($f) => $f->getMTime())
                            ->first()?->getFilename()
                        : null,
                ]);
            });

            // Trigger a manual backup (pg_dump -> storage/app/backups)
            Route::post('/backup', function () {
                $dir = storage_path('app/backups');
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                $ts = now()->format('Y-m-d_His');
                $file = $dir . DIRECTORY_SEPARATOR . "dtms_backup_{$ts}.sql";

                $host = env('DB_HOST', '127.0.0.1');
                $port = env('DB_PORT', '5432');
                $db = env('DB_DATABASE', 'dts_database');
                $user = env('DB_USERNAME', 'dts_user');
                $pass = env('DB_PASSWORD', 'dts_password');

                $cmd = sprintf(
                    'PGPASSWORD=%s pg_dump -h %s -p %s -U %s -F p -f %s %s 2>&1',
                    escapeshellarg($pass),
                    escapeshellarg($host),
                    escapeshellarg($port),
                    escapeshellarg($user),
                    escapeshellarg($file),
                    escapeshellarg($db)
                );

                $pgdump = 'pg_dump';
                foreach ([
                    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
                    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
                    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
                    'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
                ] as $candidate) {
                    if (file_exists($candidate)) {
                        $pgdump = '"' . $candidate . '"';
                        break;
                    }
                }

                // Pass the password via PGPASSWORD env (cross-platform).
                putenv("PGPASSWORD={$pass}");

                $cmd = sprintf(
                    '%s -h %s -p %s -U %s -F p -f %s %s 2>&1',
                    $pgdump,
                    escapeshellarg($host),
                    escapeshellarg($port),
                    escapeshellarg($user),
                    escapeshellarg($file),
                    escapeshellarg($db)
                );

                $output = shell_exec($cmd);
                $ok = \Illuminate\Support\Facades\File::exists($file) && filesize($file) > 0;

                return response()->json([
                    'success' => (bool) $ok,
                    'file' => basename($file),
                    'message' => $ok
                        ? 'Database backup created successfully'
                        : ('Backup failed: ' . substr((string) $output, 0, 500)),
                ], $ok ? 200 : 500);
            });

            // Optimize: VACUUM ANALYZE to reclaim space / refresh stats
            Route::post('/optimize', function () {
                try {
                    \Illuminate\Support\Facades\DB::statement('VACUUM ANALYZE');
                    return response()->json(['success' => true, 'message' => 'Database optimized (VACUUM ANALYZE)']);
                } catch (\Throwable $e) {
                    return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
                }
            });

            // Download a backup file
            Route::get('/download/{file}', function ($file) {
                $path = storage_path('app/backups/' . basename($file));
                if (!\Illuminate\Support\Facades\File::exists($path)) {
                    abort(404);
                }
                return response()->download($path);
            });
        });

        // Storage management (admin only)
        Route::prefix('storage')->group(function () {
            Route::get('/summary', [StorageController::class, 'summary']);
            Route::get('/browse', [StorageController::class, 'browse']);
            Route::post('/delete', [StorageController::class, 'deletePath']);
            Route::post('/cleanup/versions', [StorageController::class, 'cleanupVersions']);
            Route::post('/cleanup/duplicates', [StorageController::class, 'cleanupDuplicates']);
            Route::post('/archive/expired', [StorageController::class, 'archiveExpired']);
            Route::post('/archive/purge', [StorageController::class, 'purgeArchived']);
            Route::get('/archive', [StorageController::class, 'listArchive']);
            Route::post('/archive/{attachment}/restore', [StorageController::class, 'restoreArchived']);
        });

        // System-wide audit trail (admin only)
        Route::get('/activity', function (\Illuminate\Http\Request $request) {
            $query = \App\Models\AuditTrail::with(['user', 'document'])
                ->orderBy('created_at', 'desc');

            if ($request->has('action')) {
                $query->where('action', $request->action);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhereHas('document', function ($q2) use ($search) {
                          $q2->where('tracking_number', 'like', "%{$search}%")
                              ->orWhere('subject', 'like', "%{$search}%");
                      });
                });
            }

            $trails = $query->paginate(min((int) $request->get('per_page', 50), 100));

            return response()->json($trails);
        });
    });
});
