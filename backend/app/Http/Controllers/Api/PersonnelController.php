<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
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

    private function emailBase(string $first, string $last): string
    {
        $b = strtolower(trim($first) . '.' . trim($last));
        $b = preg_replace('/[^a-z0-9.]/', '', $b);
        $b = preg_replace('/\.+/', '.', $b);
        return trim($b, '.');
    }

    /**
     * Import personnel from an uploaded roster CSV.
     * Stores raw roster columns; does NOT map to offices (per request).
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

            $email = strtolower(trim($rec['email'] ?? ''));
            if ($email === '') {
                $email = $this->emailBase($firstName, $lastName) . '@bfp-r2.gov.ph';
            }
            $email = preg_replace('/\.+/', '.', $email);
            $email = trim($email, '.');

            $rank = strtoupper(trim($rec['rank'] ?? '')) ?: null;
            $records[$email] = [
                'email' => $email,
                'name' => trim("$firstName $middle $lastName"),
                'role' => $this->rankToRole($rec['rank'] ?? ''),
                'rank' => $rank,
                'last_name' => $lastName ?: null,
                'first_name' => $firstName ?: null,
                'middle_name' => $middle ?: null,
                'item_no' => trim($rec['item_no'] ?? '') ?: null,
                'accnt_no' => trim($rec['accnt_no'] ?? '') ?: null,
                'unit_assignment' => trim($rec['unit_assignment'] ?? '') ?: null,
                'designation' => trim($rec['designation'] ?? '') ?: null,
            ];
        }

        fclose($handle);

        $emails = array_keys($records);
        $existingEmails = User::whereIn('email', $emails)
            ->pluck('email')
            ->all();

        // Update existing records (idempotent by email)
        foreach ($existingEmails as $email) {
            User::where('email', $email)->update($records[$email]);
            $updated++;
        }

        // Bulk insert new records
        $newRecords = array_values(array_filter(
            $records,
            fn($r) => !in_array($r['email'], $existingEmails),
            ARRAY_FILTER_USE_BOTH
        ));

        foreach (array_chunk($newRecords, 500) as $chunk) {
            $rows = array_map(function ($r) {
                return array_merge($r, [
                    'password' => Hash::make('bfp12345'),
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }, $chunk);
            try {
                User::insert($rows);
                $created += count($rows);
            } catch (\Exception $e) {
                $skipped += count($rows);
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
