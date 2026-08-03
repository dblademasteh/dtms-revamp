<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\UserRole;
use App\Models\Office;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

        $offices = $query->orderByRaw("CASE
                WHEN office_type = 'regional_office' THEN 1
                WHEN office_type = 'provincial_office' THEN 2
                WHEN office_type = 'fire_station' THEN 3
                WHEN office_type = 'division' THEN 4
                WHEN office_type = 'unit' THEN 5
                WHEN office_type = 'others' THEN 6
                ELSE 7
            END, name")->get();

        return response()->json($offices->map(fn ($office) => $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes())));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|unique:offices,code',
            'unit_code' => 'nullable|string|max:20',
            'parent_office_id' => 'nullable|exists:offices,id',
            'head_user_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'office_type' => 'nullable|string|max:50',
            'storage_quota_bytes' => 'nullable|integer|min:0',
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
            'code' => 'sometimes|string|max:10|unique:offices,code,' . $office->id,
            'unit_code' => 'nullable|string|max:20',
            'parent_office_id' => 'nullable|exists:offices,id',
            'head_user_id' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'office_type' => 'nullable|string|max:50',
            'status' => 'sometimes|in:active,inactive',
            'storage_quota_bytes' => 'nullable|integer|min:0',
        ]);

        $office->update($request->all());

        return response()->json([
            'message' => 'Office updated successfully',
            'office' => $office->refresh(),
        ]);
    }

    public function destroy(Office $office)
    {
        if ($office->children()->exists()) {
            return response()->json(['message' => 'Cannot delete office with sub-offices'], 422);
        }

        if ($office->documents()->exists()) {
            return response()->json(['message' => 'Cannot delete office with associated documents'], 422);
        }

        if ($office->users()->exists()) {
            return response()->json(['message' => 'Cannot delete office with assigned personnel'], 422);
        }

        $office->delete();

        return response()->json(['message' => 'Office deleted']);
    }

    /**
     * Offices a station account can claim: not yet assigned a chief.
     */
    public function claimable()
    {
        $offices = Office::with(['parent'])
            ->whereNull('head_user_id')
            ->orderByRaw("CASE
                WHEN office_type = 'regional_office' THEN 1
                WHEN office_type = 'provincial_office' THEN 2
                WHEN office_type = 'fire_station' THEN 3
                WHEN office_type = 'division' THEN 4
                WHEN office_type = 'unit' THEN 5
                WHEN office_type = 'others' THEN 6
                ELSE 7
            END, name")
            ->get();

        return response()->json($offices);
    }

    /**
     * Let a station account bind itself to an existing unclaimed office.
     * The claiming station becomes the office chief.
     */
    public function claim(Request $request)
    {
        $user = $request->user();

        if ($user->role !== UserRole::OFFICE_STATION) {
            return response()->json(['message' => 'Only station accounts can claim an office'], 403);
        }

        if ($this->resolveUserOffice($user)) {
            return response()->json(['message' => 'Your account is already linked to an office'], 422);
        }

        $request->validate([
            'office_id' => 'required|exists:offices,id',
        ]);

        $office = Office::findOrFail($request->office_id);

        if ($office->head_user_id) {
            return response()->json(['message' => 'This office has already been claimed'], 422);
        }

        $office->update(['head_user_id' => $user->id]);
        $user->update(['office_id' => $office->id]);

        $office->refresh()->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json([
            'message' => 'Office claimed successfully',
            'office' => $office,
        ]);
    }

    /**
     * Let a station account with no office create its own station profile.
     * The creating station becomes the office chief.
     */
    public function register(Request $request)
    {
        $user = $request->user();

        if ($user->role !== UserRole::OFFICE_STATION) {
            return response()->json(['message' => 'Only station accounts can register an office'], 403);
        }

        if ($this->resolveUserOffice($user)) {
            return response()->json(['message' => 'Your account is already linked to an office'], 422);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'unit_code' => 'nullable|string|max:20|unique:offices,unit_code',
            'office_type' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'parent_office_id' => 'nullable|exists:offices,id',
        ]);

        $office = Office::create([
            'name' => $request->name,
            'code' => $this->generateOfficeCode($request->unit_code),
            'unit_code' => $request->unit_code,
            'parent_office_id' => $request->parent_office_id,
            'description' => $request->description,
            'office_type' => $request->office_type ?: 'fire_station',
            'head_user_id' => $user->id,
            'status' => 'active',
        ]);

        $user->update(['office_id' => $office->id]);

        $office->refresh()->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json([
            'message' => 'Station profile created successfully',
            'office' => $office,
        ], 201);
    }

    private function generateOfficeCode(?string $unitCode): string
    {
        $base = $unitCode ? preg_replace('/[^A-Za-z0-9]/', '', $unitCode) : '';
        $base = strtoupper(substr($base, 0, 6)) ?: 'STN';

        $candidate = $base;
        $i = 1;

        while (Office::where('code', $candidate)->exists()) {
            $candidate = $base . '-' . ($i++);
        }

        return $candidate;
    }

    public function hierarchy()
    {
        $offices = Office::with(['head', 'children.head', 'children.children.head', 'children.children.children.head'])
            ->whereNull('parent_office_id')
            ->orderByRaw("CASE
                WHEN office_type = 'regional_office' THEN 1
                WHEN office_type = 'provincial_office' THEN 2
                WHEN office_type = 'fire_station' THEN 3
                WHEN office_type = 'division' THEN 4
                WHEN office_type = 'unit' THEN 5
                WHEN office_type = 'others' THEN 6
                ELSE 7
            END, name")
            ->get();

        return response()->json($this->withStorageUsage($offices));
    }

    private function withStorageUsage($offices)
    {
        return $offices->map(function ($office) {
            $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());
            if ($office->relationLoaded('children') && $office->children->isNotEmpty()) {
                $office->setRelation('children', $this->withStorageUsage($office->children));
            }
            return $office;
        });
    }

    /**
     * The office associated with the authenticated user's account
     * (their assigned office, falling back to the office they head).
     */
    public function myOffice(Request $request)
    {
        $office = $this->resolveUserOffice($request->user());

        if (!$office) {
            return response()->json(['message' => 'No office is assigned to your account'], 404);
        }

        $office->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json(['office' => $office]);
    }

    /**
     * Let an office account update its own office information,
     * including reassigning the office chief.
     */
    public function updateMyOffice(Request $request)
    {
        $user = $request->user();
        $office = $this->resolveUserOffice($user);

        if (!$office) {
            return response()->json(['message' => 'No office is assigned to your account'], 404);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'unit_code' => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'office_type' => 'nullable|string|max:50',
            'head_user_id' => 'nullable|exists:users,id',
        ]);

        $data = $request->only(['name', 'unit_code', 'description', 'office_type']);

        if ($request->exists('head_user_id')) {
            $canManageChief = $user->isAdmin()
                || $user->role === UserRole::OFFICE_STATION
                || ($office->head_user_id && $office->head_user_id === $user->id)
                || !$office->head_user_id;

            if (!$canManageChief) {
                return response()->json([
                    'message' => 'Only the assigned chief or an administrator can change the office chief',
                ], 403);
            }

            $newChiefId = $request->head_user_id;

            if ($newChiefId !== null) {
                $newChief = User::find($newChiefId);
                if (!$newChief) {
                    return response()->json([
                        'message' => 'The selected chief does not exist',
                    ], 422);
                }

                if ($newChief->office_id !== $office->id) {
                    $newChief->update(['office_id' => $office->id]);
                }
            }

            $data['head_user_id'] = $newChiefId;
        }

        $office->update(array_filter($data, fn ($v) => !is_null($v)));

        $office->refresh()->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json([
            'message' => 'Office updated',
            'office' => $office,
        ]);
    }

    public function uploadMyOfficeLogo(Request $request)
    {
        $office = $this->resolveUserOffice($request->user());

        if (!$office) {
            return response()->json(['message' => 'No office is assigned to your account'], 404);
        }

        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $file = $request->file('logo');

        $size = @getimagesize($file->getRealPath());
        if (!$size || $size[0] > 6000 || $size[1] > 6000) {
            return response()->json(['message' => 'Image dimensions are too large (max 6000x6000 px)'], 422);
        }

        @ini_set('memory_limit', '512M');

        $image = match ($file->getMimeType()) {
            'image/png' => @imagecreatefrompng($file->getRealPath()),
            'image/gif' => @imagecreatefromgif($file->getRealPath()),
            default => @imagecreatefromjpeg($file->getRealPath()),
        };

        if (!$image) {
            return response()->json(['message' => 'Could not read the uploaded image'], 422);
        }

        $maxDim = 512;
        $srcW = imagesx($image);
        $srcH = imagesy($image);

        if ($srcW > $maxDim || $srcH > $maxDim) {
            $ratio = min($maxDim / $srcW, $maxDim / $srcH);
            $dstW = (int) round($srcW * $ratio);
            $dstH = (int) round($srcH * $ratio);

            $resized = imagecreatetruecolor($dstW, $dstH);
            $alpha = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $alpha);
            imagesavealpha($resized, true);
            imagealphablending($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
            imagedestroy($image);
            $image = $resized;
        }

        $flat = imagecreatetruecolor(imagesx($image), imagesy($image));
        $white = imagecolorallocate($flat, 255, 255, 255);
        imagefill($flat, 0, 0, $white);
        imagecopy($flat, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));

        ob_start();
        imagejpeg($flat, null, 85);
        $data = ob_get_clean();

        imagedestroy($image);
        imagedestroy($flat);

        $path = 'office-logos/' . Str::uuid() . '.jpg';

        if ($office->logo) {
            Storage::disk('public')->delete($office->logo);
        }

        Storage::disk('public')->put($path, $data);

        $office->update(['logo' => $path]);

        $office->refresh()->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json([
            'message' => 'Office logo updated',
            'logo_url' => Storage::disk('public')->url($path),
            'office' => $office,
        ]);
    }

    public function deleteMyOfficeLogo(Request $request)
    {
        $office = $this->resolveUserOffice($request->user());

        if (!$office) {
            return response()->json(['message' => 'No office is assigned to your account'], 404);
        }

        if ($office->logo) {
            Storage::disk('public')->delete($office->logo);
        }

        $office->update(['logo' => null]);

        $office->refresh()->load(['parent', 'head']);
        $office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());

        return response()->json([
            'message' => 'Office logo removed',
            'office' => $office,
        ]);
    }

    private function resolveUserOffice(User $user): ?Office
    {
        if ($user->office_id) {
            return Office::find($user->office_id);
        }

        return Office::where('head_user_id', $user->id)->first();
    }
}
