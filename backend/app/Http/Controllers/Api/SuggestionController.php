<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Suggestion;
use Illuminate\Http\Request;

class SuggestionController extends Controller
{
    public function index(Request $request)
    {
        $query = Suggestion::with('user:id,name,rank,first_name,last_name,middle_name,suffix');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate(min((int) $request->get('per_page', 20), 100))
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'category' => 'required|in:feature,improvement,bug,other',
        ]);

        $suggestion = Suggestion::create([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
        ]);

        return response()->json([
            'message' => 'Suggestion submitted successfully',
            'suggestion' => $suggestion->load('user:id,name,rank,first_name,last_name,middle_name,suffix'),
        ], 201);
    }

    public function show(Request $request, Suggestion $suggestion)
    {
        if (!$request->user()->isAdmin() && $suggestion->user_id !== $request->user()->id) {
            abort(403, 'You can only view your own suggestions.');
        }

        return response()->json($suggestion->load('user:id,name,rank,first_name,last_name,middle_name,suffix'));
    }

    public function update(Request $request, Suggestion $suggestion)
    {
        $request->validate([
            'status' => 'required|in:open,under_review,planned,implemented,closed',
            'admin_response' => 'nullable|string|max:5000',
        ]);

        $suggestion->update($request->only(['status', 'admin_response']));

        return response()->json([
            'message' => 'Suggestion updated',
            'suggestion' => $suggestion->refresh()->load('user:id,name,rank,first_name,last_name,middle_name,suffix'),
        ]);
    }

    public function destroy(Suggestion $suggestion)
    {
        $suggestion->delete();
        return response()->json(['message' => 'Suggestion deleted']);
    }
}
