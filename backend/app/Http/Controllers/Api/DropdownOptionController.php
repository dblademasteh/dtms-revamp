<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DropdownOption;
use Database\Seeders\DropdownOptionSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DropdownOptionController extends Controller
{
    public const GROUPS = [
        'document_types',
        'classifications',
        'modes_of_transmittal',
        'action_requested',
        'routing_dispositions',
        'document_statuses',
        'office_types',
        'ranks',
        'designations',
        'priorities',
        'suggestion_categories',
        'suggestion_statuses',
    ];

    public function index(Request $request)
    {
        $this->ensureRanksSeeded();
        $this->ensureDesignationsSeeded();

        $groups = DropdownOption::orderBy('sort_order')
            ->get()
            ->groupBy('group')
            ->map(fn ($items) => $items
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'group' => $item->group,
                    'value' => $item->value,
                    'label' => $item->label,
                    'sort_order' => $item->sort_order,
                    'meta' => $item->meta,
                    'is_active' => $item->is_active,
                ])
                ->values());

        return response()->json(['groups' => $groups]);
    }

    /**
     * Public ranks endpoint, backed by the unified dropdown-options system.
     * Kept for backward compatibility (returns [{value, label}] like before).
     */
    public function ranks()
    {
        $this->ensureRanksSeeded();

        return response()->json(
            DropdownOption::forGroup('ranks')
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($r) => ['value' => $r->value, 'label' => $r->label])
                ->values()
        );
    }

    /**
     * Seed the 'ranks' group from the legacy SystemSetting.custom_ranks value
     * (or the BFP defaults) the first time it is accessed. Idempotent.
     */
    protected function ensureRanksSeeded(): void
    {
        if (DropdownOption::forGroup('ranks')->exists()) {
            return;
        }

        $legacy = \App\Models\SystemSetting::get('custom_ranks');
        $source = $legacy ? json_decode($legacy, true) : null;

        if (!is_array($source) || empty($source)) {
            $source = array_map(
                fn ($item) => ['value' => $item[0], 'label' => $item[1]],
                DropdownOptionSeeder::defaults()['ranks'] ?? []
            );
        }

        // Ensure the full standard BFP set is always seeded alongside any
        // legacy/custom ranks, so the dropdown is never missing default ranks.
        $defaults = DropdownOptionSeeder::defaults()['ranks'] ?? [];
        $present = array_map(fn ($r) => strtoupper(trim((string) ($r['value'] ?? ''))), $source);
        foreach ($defaults as $item) {
            $code = strtoupper(trim((string) $item[0]));
            if (!in_array($code, $present, true)) {
                $source[] = ['value' => $item[0], 'label' => $item[1]];
                $present[] = $code;
            }
        }

        // Apply historical label fixes so legacy data matches current standards.
        $labelFixes = [
            'FINSP' => 'FINSP - Inspector',
            'FSINSP' => 'FSINSP - Senior Inspector',
            'FSUPT' => 'FSUPT - Superintendent',
            'FSSUPT' => 'FSSUPT - Senior Superintendent',
        ];
        $changed = false;
        foreach ($source as &$r) {
            $code = strtoupper(trim((string) ($r['value'] ?? '')));
            if (isset($labelFixes[$code]) && ($r['label'] ?? '') !== $labelFixes[$code]) {
                $r['label'] = $labelFixes[$code];
                $changed = true;
            }
        }
        unset($r);
        if ($changed) {
            \App\Models\SystemSetting::set('custom_ranks', json_encode($source));
        }

        foreach ($source as $i => $r) {
            DropdownOption::updateOrCreate(
                ['group' => 'ranks', 'value' => strtoupper(trim((string) ($r['value'] ?? '')))],
                ['label' => (string) ($r['label'] ?? ''), 'sort_order' => $i, 'is_active' => true]
            );
        }
    }

    /**
     * Seed the 'designations' group from the distinct designation values already
     * stored on users (or the starter defaults) the first time it is accessed.
     * Idempotent. Values are kept as-is (not slugged) so they round-trip with
     * the free-text value saved on users.designation.
     */
    protected function ensureDesignationsSeeded(): void
    {
        if (DropdownOption::forGroup('designations')->exists()) {
            return;
        }

        $existing = \App\Models\User::query()
            ->whereNotNull('designation')
            ->where('designation', '!=', '')
            ->pluck('designation')
            ->map(fn ($v) => trim((string) $v))
            ->filter(fn ($v) => $v !== '')
            ->unique(fn ($v) => strtolower($v))
            ->sortBy(fn ($v) => strtolower($v))
            ->values();

        if ($existing->isEmpty()) {
            $source = array_map(
                fn ($item) => ['value' => $item[0], 'label' => $item[1]],
                DropdownOptionSeeder::defaults()['designations'] ?? []
            );

            foreach ($source as $i => $r) {
                DropdownOption::updateOrCreate(
                    ['group' => 'designations', 'value' => trim((string) ($r['value'] ?? ''))],
                    ['label' => (string) ($r['label'] ?? ''), 'sort_order' => $i, 'is_active' => true]
                );
            }

            return;
        }

        foreach ($existing as $i => $value) {
            DropdownOption::updateOrCreate(
                ['group' => 'designations', 'value' => $value],
                ['label' => $value, 'sort_order' => $i, 'is_active' => true]
            );
        }
    }

    /**
     * Rank codes are stored uppercase (e.g. FINSP, SUPT), unlike the slugged
     * lowercase values used by the other dropdown groups.
     */
    protected function normalizeValue(string $group, ?string $value, string $label): string
    {
        if ($group === 'ranks') {
            $value = strtoupper(trim((string) $value));
            if ($value === '') {
                $value = strtoupper(trim(explode(' ', $label)[0] ?? ''));
            }

            return $value;
        }

        if ($group === 'designations') {
            $value = trim((string) $value);
            if ($value === '') {
                $value = trim((string) $label);
            }

            return $value;
        }

        $value = $value ?? Str::slug($label, '_');

        return $value === '' ? Str::slug($label, '_') : Str::slug($value, '_');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'group' => ['required', 'string', 'in:' . implode(',', self::GROUPS)],
            'label' => 'required|string|max:255',
            'value' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'meta' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $group = $data['group'];
        $value = $this->normalizeValue($group, $data['value'] ?? null, $data['label']);

        if (DropdownOption::where('group', $group)->where('value', $value)->exists()) {
            return response()->json(['message' => 'A "' . $data['label'] . '" option already exists in this list.'], 422);
        }

        $option = DropdownOption::create([
            'group' => $group,
            'value' => $value,
            'label' => $data['label'],
            'sort_order' => $data['sort_order'] ?? DropdownOption::forGroup($group)->count(),
            'meta' => $data['meta'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['message' => 'Option added', 'option' => $option], 201);
    }

    public function update(Request $request, DropdownOption $option)
    {
        $data = $request->validate([
            'label' => 'required|string|max:255',
            'value' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'meta' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $value = $this->normalizeValue($option->group, $data['value'] ?? $option->value, $data['label'] ?? $option->label);

        $duplicate = DropdownOption::where('group', $option->group)
            ->where('value', $value)
            ->where('id', '!=', $option->id)
            ->exists();

        if ($duplicate) {
            return response()->json(['message' => 'Another option already uses that value in this list.'], 422);
        }

        $option->update([
            'value' => $value,
            'label' => $data['label'],
            'sort_order' => $data['sort_order'] ?? $option->sort_order,
            'meta' => array_key_exists('meta', $data) ? $data['meta'] : $option->meta,
            'is_active' => $data['is_active'] ?? $option->is_active,
        ]);

        return response()->json(['message' => 'Option updated', 'option' => $option->fresh()]);
    }

    public function destroy(DropdownOption $option)
    {
        $option->delete();
        return response()->json(['message' => 'Option deleted']);
    }

    public function reset(string $group)
    {
        if (!in_array($group, self::GROUPS, true)) {
            return response()->json(['message' => 'Unknown dropdown group.'], 422);
        }

        DropdownOption::forGroup($group)->delete();

        foreach (DropdownOptionSeeder::defaults()[$group] as $i => $item) {
            [$value, $label] = $item;
            $meta = $item[2] ?? null;
            DropdownOption::create([
                'group' => $group,
                'value' => $value,
                'label' => $label,
                'sort_order' => $i,
                'meta' => $meta,
                'is_active' => true,
            ]);
        }

        return response()->json(['message' => ucfirst(str_replace('_', ' ', $group)) . ' reset to defaults']);
    }
}
