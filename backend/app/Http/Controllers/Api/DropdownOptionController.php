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
        'priorities',
        'suggestion_categories',
        'suggestion_statuses',
    ];

    public function index(Request $request)
    {
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
        $value = $data['value'] ?? Str::slug($data['label'], '_');
        $value = $value === '' ? Str::slug($data['label'], '_') : Str::slug($value, '_');

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

        $value = $data['value'] ?? $option->value;
        $value = $value === '' ? $value : Str::slug($value, '_');

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
