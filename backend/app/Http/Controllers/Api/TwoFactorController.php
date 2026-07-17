<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    protected TotpService $totp;

    public function __construct(TotpService $totp)
    {
        $this->totp = $totp;
    }

    /**
     * Step 1 of enable: generate a secret + provisioning URI (QR).
     * The secret is stored but NOT yet active until confirmed.
     */
    public function enable(Request $request)
    {
        $user = $request->user();

        $secret = $this->totp->generateSecret();
        $label = $user->email ?: $user->accnt_no;
        $uri = $this->totp->provisioningUri($secret, $label, 'DTMS');
        $qr = \SimpleSoftwareIO\QrCode\Facades\QrCode::size(220)->margin(1)->generate($uri);

        $user->forceFill([
            'two_factor_secret' => encrypt($secret),
        ])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_uri' => $uri,
            'qr_svg' => (string) $qr,
        ]);
    }

    /**
     * Step 2 of enable: confirm a valid code to activate 2FA.
     */
    public function confirm(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $user = $request->user();

        if (!$user->two_factor_secret) {
            throw ValidationException::withMessages([
                'code' => ['No 2FA setup in progress. Please start again.'],
            ]);
        }

        $secret = decrypt($user->two_factor_secret);

        if (!$this->totp->verify($secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid verification code. Please try again.'],
            ]);
        }

        $recovery = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => encrypt(json_encode($recovery)),
        ])->save();

        return response()->json([
            'message' => 'Two-factor authentication enabled',
            'recovery_codes' => $recovery,
        ]);
    }

    /**
     * Show current 2FA status (no secret exposed).
     */
    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'enabled' => (bool) $user->two_factor_enabled,
            'confirmed_at' => $user->two_factor_confirmed_at,
        ]);
    }

    /**
     * Disable 2FA (requires password confirmation for safety).
     */
    public function disable(Request $request)
    {
        $request->validate(['password' => 'required']);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        $user->forceFill([
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        return response()->json(['message' => 'Two-factor authentication disabled']);
    }

    /**
     * View recovery codes (requires password).
     */
    public function recoveryCodes(Request $request)
    {
        $request->validate(['password' => 'required']);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        if (!$user->two_factor_recovery_codes) {
            return response()->json(['recovery_codes' => []]);
        }

        return response()->json([
            'recovery_codes' => json_decode(decrypt($user->two_factor_recovery_codes), true),
        ]);
    }

    /**
     * Regenerate recovery codes (requires password).
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate(['password' => 'required']);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        $recovery = $this->generateRecoveryCodes();
        $user->forceFill([
            'two_factor_recovery_codes' => encrypt(json_encode($recovery)),
        ])->save();

        return response()->json(['recovery_codes' => $recovery]);
    }

    private function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = strtoupper(substr(md5(random_bytes(8)), 0, 4) . '-' . substr(md5(random_bytes(8)), 0, 4));
        }

        return $codes;
    }
}
