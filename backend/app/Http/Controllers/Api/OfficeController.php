<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Office;
use Illuminate\Http\Request;

class OfficeController extends Controller
{
    public function index(Request $request)
    {
        $query = Office::with(['parent', 'head']);

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->has('parent_id')) {
            $query->where('parent_office_id', $request->parent_id);
        }

        $offices = $query->orderBy('name')->get();

        return response()->json($offices);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:offices,code',
            'parent_office_id' => 'nullable|exists:offices,id',
            'head_user_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'office_type' => 'nullable|string|max:50',
        ]);

        $office = Office::create($request->all());

        return response()->json([
            'message' => 'Office created successfully',
            'office' => $office,
        ], 201);
    }

    public function show(Office $office)
    {
        $office->load(['parent', 'head', 'children', 'users']);

        return response()->json($office);
    }

    public function update(Request $request, Office $office)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'parent_office_id' => 'nullable|exists:offices,id',
            'head_user_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'office_type' => 'nullable|string|max:50',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $office->update($request->all());

        return response()->json([
            'message' => 'Office updated successfully',
            'office' => $office->refresh(),
        ]);
    }

    public function hierarchy()
    {
        $offices = Office::with(['head', 'children.head', 'children.children.head', 'children.children.children.head'])
            ->whereNull('parent_office_id')
            ->orderBy('name')
            ->get();

        return response()->json($offices);
    }
}
