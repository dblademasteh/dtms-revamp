<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PersonnelOfficeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class PersonnelController extends Controller
{
    private const HEADERS = [
        'rank',
        'last_name',
        'first_name',
        'middle_name',
        'item_no',
        'accnt_no',
        'unit_assignment',
        'designation',
        'email',
    ];

    public function __construct(private readonly PersonnelOfficeResolver $officeResolver)
    {
    }

    private function rankToRole(string $rank): string
    {
        $r = strtoupper(trim($rank));
        if (preg_match('/SUPT/', $r)) return 'officer';
        if (preg_match('/(F|FC)?INSP/', $r)) return 'officer';
        if (preg_match('/^SFO/', $r)) return 'non_officer';
        return 'non_officer';
    }

    private function cleanName(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9 ]/', '', $s);
        $s = preg_replace('/\s+/', ' ', $s);
        return ucwords($s);
    }

    /**
     * Import personnel from an uploaded roster CSV.
     * Stores raw roster columns; does NOT map to offices or create login
     * access (emails are left empty) per request.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $path = $request->file('file')->store('imports', 'local');
        $full = Storage::disk('local')->path($path);

        $handle = fopen($full, 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Unable to read uploaded file'], 422);
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'CSV is empty'], 422);
        }
        // normalize header to snake_case keys
        $headerKeys = array_map(fn($h) => strtolower(trim($h)), $header);

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $records = [];

        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($headerKeys)) {
                // skip malformed / embedded-newline lines
                if (implode('', $row) === '') continue;
                $skipped++;
                continue;
            }
            $rec = array_combine($headerKeys, $row);

            $firstName = $this->cleanName($rec['first_name'] ?? '');
            $lastName = $this->cleanName($rec['last_name'] ?? '');
            $middle = $this->cleanName($rec['middle_name'] ?? '');
            if ($firstName === '' || $lastName === '') {
                $skipped++;
                continue;
            }

            $rank = strtoupper(trim($rec['rank'] ?? '')) ?: null;
            $accntNo = trim($rec['accnt_no'] ?? '') ?: null;
            $email = strtolower(trim($rec['email'] ?? '')) ?: null;
            $itemNo = trim($rec['item_no'] ?? '') ?: null;
            $unitAssignment = trim($rec['unit_assignment'] ?? '') ?: null;
            $key = $accntNo ?? $email ?? "$firstName|$lastName|$itemNo";

            $record = [
                'name' => trim("$firstName $middle $lastName"),
                'role' => $this->rankToRole($rec['rank'] ?? ''),
                'rank' => $rank,
                'last_name' => $lastName ?: null,
                'first_name' => $firstName ?: null,
                'middle_name' => $middle ?: null,
                'item_no' => $itemNo,
                'accnt_no' => $accntNo,
                'unit_assignment' => $unitAssignment,
                'designation' => trim($rec['designation'] ?? '') ?: null,
                'email' => $email,
            ];

            // Map the roster's unit assignment to an office so personnel belong
            // to an assignable unit for routing purposes.
            $officeId = $this->officeResolver->resolveForUnitId($unitAssignment);
            if ($officeId) {
                $record['office_id'] = $officeId;
            }

            $records[$key] = $record;
        }

        fclose($handle);

        // Match existing records by accnt_no first, then by email.
        // Superadmin accounts are never touched or replaced by the roster.
        $superAdminAccnts = User::where('role', 'superadmin')->whereNotNull('accnt_no')->pluck('accnt_no')
            ->map(fn($v) => strtolower($v))->all();
        $superAdminEmails = User::where('role', 'superadmin')->whereNotNull('email')->pluck('email')
            ->map(fn($v) => strtolower($v))->all();

        $accntNos = array_values(array_filter(array_column($records, 'accnt_no')));
        $emails = array_values(array_filter(array_column($records, 'email')));

        $existingByAccnt = User::whereIn('accnt_no', $accntNos)->where('role', '!=', 'superadmin')->get()->keyBy('accnt_no');
        $existingByEmail = User::whereIn('email', $emails)->where('role', '!=', 'superadmin')->get()->keyBy('email');

        // Compute the shared placeholder hash once (records have no login access)
        $passwordHash = Hash::make('bfp12345');
        $newRecords = [];

        foreach ($records as $data) {
            $lowerAccnt = $data['accnt_no'] ? strtolower($data['accnt_no']) : null;
            $lowerEmail = $data['email'] ? strtolower($data['email']) : null;
            if (($lowerAccnt && in_array($lowerAccnt, $superAdminAccnts)) || ($lowerEmail && in_array($lowerEmail, $superAdminEmails))) {
                $skipped++;
                continue;
            }

            $existing = $data['accnt_no'] && $existingByAccnt->has($data['accnt_no'])
                ? $existingByAccnt[$data['accnt_no']]
                : ($data['email'] && $existingByEmail->has($data['email']) ? $existingByEmail[$data['email']] : null);

            if ($existing) {
                $existing->fill($data);
                $existing->save();
                $updated++;
            } else {
                $newRecords[] = array_merge($data, [
                    'password' => $passwordHash,
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        foreach (array_chunk($newRecords ?? [], 500) as $chunk) {
            try {
                User::insert($chunk);
                $created += count($chunk);
            } catch (\Exception $e) {
                $skipped += count($chunk);
                $errors[] = $e->getMessage();
            }
        }

        Storage::disk('local')->delete($path);

        return response()->json([
            'message' => "Import complete: $created created, $updated updated, $skipped skipped.",
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 10),
        ]);
    }

    /**
     * Create a personnel record.
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'rank' => 'nullable|string|max:50',
            'item_no' => 'nullable|string|max:50',
            'accnt_no' => 'nullable|string|unique:users,accnt_no',
            'unit_assignment' => 'nullable|string|max:255',
            'designation' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email',
        ]);

        $firstName = $this->cleanName($request->first_name);
        $lastName = $this->cleanName($request->last_name);
        $middle = $this->cleanName($request->middle_name ?? '');

        $user = User::create([
            'name' => trim("$firstName $middle $lastName"),
            'email' => $request->email,
            'password' => Hash::make('bfp12345'),
            'role' => $this->rankToRole($request->rank ?? ''),
            'rank' => strtoupper(trim($request->rank ?? '')) ?: null,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'middle_name' => $middle ?: null,
            'suffix' => $request->suffix,
            'item_no' => $request->item_no,
            'accnt_no' => $request->accnt_no,
            'unit_assignment' => $request->unit_assignment,
            'designation' => $request->designation,
            'office_id' => $this->officeResolver->resolveForUnitId($request->unit_assignment),
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Personnel created',
            'personnel' => $user->load('office'),
        ], 201);
    }

    /**
     * Export all personnel as a roster CSV with the standard headers.
     */
    public function export()
    {
        $users = User::orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, self::HEADERS);
        foreach ($users as $u) {
            fputcsv($csv, [
                $u->rank,
                $u->last_name,
                $u->first_name,
                $u->middle_name,
                $u->item_no,
                $u->accnt_no,
                $u->unit_assignment,
                $u->designation,
                $u->email,
            ]);
        }
        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        $filename = 'personnel_' . now()->format('Ymd_His') . '.csv';

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
