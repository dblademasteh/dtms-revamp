<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsurePasswordChanged
{
    /**
     * Routes a user with a pending password change is still allowed to use.
     */
    private const EXEMPT_PREFIXES = [
        'api/auth/logout',
        'api/auth/password',
        'api/auth/pincode',
        'api/auth/profile',
        'api/auth/avatar',
        'api/auth/me',
        'api/auth/notification-preferences',
    ];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user && !empty($user->must_change_password)) {
            $path = $request->path();

            $exempt = collect(self::EXEMPT_PREFIXES)->contains(
                fn ($prefix) => $path === $prefix || str_starts_with($path, $prefix)
            );

            if (!$exempt) {
                return response()->json([
                    'message' => 'You must change your password before continuing.',
                    'code' => 'PASSWORD_CHANGE_REQUIRED',
                ], 403);
            }
        }

        return $next($request);
    }
}
