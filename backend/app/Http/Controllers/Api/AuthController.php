<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordReset;
use App\Mail\VerifyEmail;
use App\Models\LoginAudit;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'accnt_no' => 'required_without:email|nullable|string',
            'email' => 'nullable|string',
            'password' => 'required',
        ]);

        $identifier = strtolower($request->input('accnt_no') ?? $request->input('email') ?? '');

        $user = User::whereRaw('LOWER(accnt_no) = ?', [$identifier])
            ->orWhereRaw('LOWER(email) = ?', [$identifier])
            ->first();

        // Lockout gate: reject before verifying the password so locked accounts
        // can't be used to probe credentials.
        if ($user) {
            $remaining = $this->lockoutRemainingMinutes($user);
            if ($remaining > 0) {
                $this->recordLoginAudit($user->id, $user->email, false, 'account_locked', $request);

                throw ValidationException::withMessages([
                    'accnt_no' => ["Too many failed attempts. Your account is locked. Try again in {$remaining} minute(s)."],
                ]);
            }
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            if ($user) {
                $this->registerFailedAttempt($user, $request, 'invalid_credentials');
            } else {
                $this->recordLoginAudit(null, $identifier, false, 'unknown_account', $request);
            }

            throw ValidationException::withMessages([
                'accnt_no' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            $this->recordLoginAudit($user->id, $user->email, false, 'account_deactivated', $request);

            throw ValidationException::withMessages([
                'accnt_no' => ['Your account has been deactivated.'],
            ]);
        }

        $this->clearLockout($user);
        $this->recordLoginAudit($user->id, $user->email, true, null, $request);

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
            $this->recordLoginAudit($user->id, $user->email, false, 'invalid_2fa_code', $request);

            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        $this->recordLoginAudit($user->id, $user->email, true, '2fa', $request);

        cache()->forget($request->two_fa_token);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('office'),
            'token' => $token,
        ]);
    }

    public function loginViaPincode(Request $request)
    {
        $request->validate([
            'accnt_no' => 'required|string',
            'pincode' => 'required|string|min:4|max:6',
        ]);

        $user = User::whereRaw('LOWER(accnt_no) = ?', [strtolower($request->accnt_no)])->first();

        if ($user) {
            $remaining = $this->lockoutRemainingMinutes($user);
            if ($remaining > 0) {
                $this->recordLoginAudit($user->id, $user->email, false, 'account_locked', $request);

                throw ValidationException::withMessages([
                    'accnt_no' => ["Too many failed attempts. Your account is locked. Try again in {$remaining} minute(s)."],
                ]);
            }
        }

        if (!$user || $user->pincode !== $request->pincode) {
            if ($user) {
                $this->registerFailedAttempt($user, $request, 'invalid_pincode');
            } else {
                $this->recordLoginAudit(null, strtolower($request->accnt_no), false, 'unknown_account', $request);
            }

            throw ValidationException::withMessages([
                'accnt_no' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            $this->recordLoginAudit($user->id, $user->email, false, 'account_deactivated', $request);

            throw ValidationException::withMessages([
                'accnt_no' => ['Your account has been deactivated.'],
            ]);
        }

        $this->clearLockout($user);
        $this->recordLoginAudit($user->id, $user->email, true, 'pincode', $request);

        $token = $user->createToken('auth-token-pincode')->plainTextToken;

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
            'office_id' => 'sometimes|nullable|exists:offices,id',
            'phone' => 'sometimes|nullable|string|max:20',
        ]);

        $user = $request->user();
        $data = $request->only([
            'name',
            'first_name',
            'last_name',
            'middle_name',
            'rank',
            'designation',
            'unit_assignment',
            'phone',
        ]);

        if ($request->has('office_id')) {
            $data['office_id'] = $request->input('office_id');
        } elseif (array_key_exists('unit_assignment', $data)) {
            $resolved = (new \App\Services\PersonnelOfficeResolver())->resolveForUnitId($data['unit_assignment']);
            if ($resolved !== null) {
                $data['office_id'] = $resolved;
            }
        }

        $user->update($data);

        return response()->json([
            'user' => $user->refresh()->load('office'),
        ]);
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        $file = $request->file('avatar');

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

        $path = 'avatars/' . Str::uuid() . '.jpg';

        $user = $request->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        Storage::disk('public')->put($path, $data);

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

        try {
            Mail::to($user->email)->send(new PasswordReset($user, $token));
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'If this email exists, a reset link has been sent',
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

    /**
     * Send a verification link to the authenticated user's email address.
     */
    public function sendEmailVerification(Request $request)
    {
        $user = $request->user();

        if (!$user->email) {
            return response()->json(['message' => 'No email address is set on your account.'], 422);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email is already verified.']);
        }

        $token = Str::random(64);

        $user->update([
            'email_verify_token' => $token,
            'email_verify_token_sent_at' => now(),
        ]);

        try {
            Mail::to($user->email)->send(new VerifyEmail($user, $token));
        } catch (\Exception $e) {
            \Log::error('Failed to send verification email: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Verification email sent. Please check your inbox.']);
    }

    /**
     * Verify an email address using the token from the emailed link.
     */
    public function verifyEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !$user->email_verify_token || !hash_equals($user->email_verify_token, $request->token)) {
            return response()->json(['message' => 'Invalid verification link.'], 422);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email is already verified.']);
        }

        $sentAt = $user->email_verify_token_sent_at;
        if ($sentAt && $sentAt->copy()->addHours(24)->isPast()) {
            return response()->json(['message' => 'Verification link has expired. Request a new one from Settings.'], 422);
        }

        $user->update([
            'email_verified_at' => now(),
            'email_verify_token' => null,
            'email_verify_token_sent_at' => null,
        ]);

        return response()->json(['message' => 'Email verified successfully.']);
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

        $user->update([
            'password' => Hash::make($request->password),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Password changed successfully']);
    }

    public function changePincode(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'pincode' => 'required|string|digits:4',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['pincode' => $request->pincode]);

        return response()->json(['message' => 'PIN code changed successfully']);
    }

    public function completeProfileSetup(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'rank' => 'nullable|string|max:50',
            'designation' => 'nullable|string|max:255',
            'unit_assignment' => 'nullable|string|max:255',
        ]);

        $user = $request->user();

        $data = $request->only([
            'first_name',
            'last_name',
            'middle_name',
            'suffix',
            'rank',
            'designation',
            'unit_assignment',
        ]);

        $data['profile_setup_complete'] = true;

        $user->update($data);

        return response()->json([
            'message' => 'Profile setup completed',
            'user' => $user->refresh()->load('office'),
        ]);
    }

    private function maxLoginAttempts(): int
    {
        return (int) env('LOGIN_MAX_ATTEMPTS', 5);
    }

    private function loginLockoutMinutes(): int
    {
        return (int) env('LOGIN_LOCKOUT_MINUTES', 15);
    }

    private function recordLoginAudit(?int $userId, ?string $email, bool $success, ?string $reason = null, ?Request $request = null): void
    {
        LoginAudit::create([
            'user_id' => $userId,
            'email' => $email,
            'success' => $success,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'reason' => $reason,
        ]);
    }

    private function registerFailedAttempt(User $user, Request $request, string $reason): void
    {
        $attempts = (int) $user->failed_login_attempts + 1;

        $update = ['failed_login_attempts' => $attempts];

        if ($attempts >= $this->maxLoginAttempts()) {
            $update['locked_until'] = now()->addMinutes($this->loginLockoutMinutes());
            $update['failed_login_attempts'] = 0;
        }

        $user->update($update);

        $this->recordLoginAudit($user->id, $user->email, false, $reason, $request);
    }

    private function clearLockout(User $user): void
    {
        if ((int) $user->failed_login_attempts > 0 || $user->locked_until) {
            $user->update(['failed_login_attempts' => 0, 'locked_until' => null]);
        }
    }

    private function lockoutRemainingMinutes(User $user): int
    {
        if (!$user->locked_until) {
            return 0;
        }

        $remaining = now()->diffInMinutes($user->locked_until, false);

        if ($remaining <= 0) {
            $user->update(['locked_until' => null]);
            return 0;
        }

        return (int) ceil($remaining);
    }
}
