<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'accnt_no' => 'required|string',
            'password' => 'required',
        ]);

        $user = User::whereRaw('LOWER(accnt_no) = ?', [strtolower($request->accnt_no)])
            ->orWhereRaw('LOWER(email) = ?', [strtolower($request->accnt_no)])
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'accnt_no' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'accnt_no' => ['Your account has been deactivated.'],
            ]);
        }

        // Two-factor authentication gate.
        if ($user->two_factor_enabled) {
            $twoFaToken = sha1($user->id . '|' . $user->password . '|' . now()->timestamp);
            cache([$twoFaToken => $user->id], now()->addMinutes(10));

            return response()->json([
                'requires_2fa' => true,
                'two_fa_token' => $twoFaToken,
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('office'),
            'token' => $token,
        ]);
    }

    public function verify2fa(Request $request)
    {
        $request->validate([
            'two_fa_token' => 'required|string',
            'code' => 'required|string',
        ]);

        $userId = cache($request->two_fa_token);

        if (!$userId) {
            throw ValidationException::withMessages([
                'code' => ['Your session has expired. Please log in again.'],
            ]);
        }

        $user = User::find($userId);
        if (!$user) {
            throw ValidationException::withMessages([
                'code' => ['Invalid session.'],
            ]);
        }

        $secret = decrypt($user->two_factor_secret);
        $totp = new \App\Services\TotpService();

        if (!$totp->verify($secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        cache()->forget($request->two_fa_token);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('office'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('office'),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'middle_name' => 'sometimes|nullable|string|max:255',
            'rank' => 'sometimes|nullable|string|max:50',
            'designation' => 'sometimes|nullable|string|max:255',
            'unit_assignment' => 'sometimes|nullable|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
        ]);

        $user = $request->user();
        $user->update($request->only([
            'name',
            'first_name',
            'last_name',
            'middle_name',
            'rank',
            'designation',
            'unit_assignment',
            'phone',
        ]));

        return response()->json([
            'user' => $user->refresh()->load('office'),
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Avatar updated',
            'avatar_url' => Storage::disk('public')->url($path),
            'user' => $user->refresh()->load('office'),
        ]);
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->update(['avatar' => null]);

        return response()->json([
            'message' => 'Avatar removed',
            'user' => $user->refresh()->load('office'),
        ]);
    }

    public function updateNotificationPreferences(Request $request)
    {
        $request->validate([
            'preferences' => 'required|array',
        ]);

        $user = $request->user();
        $user->update(['notification_preferences' => $request->preferences]);

        return response()->json([
            'message' => 'Notification preferences updated',
            'notification_preferences' => $user->refresh()->notification_preferences,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'If this email exists, a reset link has been sent']);
        }

        $token = \Illuminate\Support\Str::random(64);

        \DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => $token, 'created_at' => now()]
        );

        \Log::info("Password reset token for {$user->email}: {$token}");

        return response()->json([
            'message' => 'If this email exists, a reset link has been sent',
            'dev_token' => $token,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|min:6|confirmed',
        ]);

        $record = \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->token)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired reset token'], 422);
        }

        if (\Carbon\Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            return response()->json(['message' => 'Reset token has expired'], 422);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        \DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password has been reset successfully']);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password changed successfully']);
    }
}
