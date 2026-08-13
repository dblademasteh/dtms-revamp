<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Event;
use App\Events\NotificationCreated;
use App\Listeners\SendSmsNotification;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::unguard(false);

        Event::listen(NotificationCreated::class, SendSmsNotification::class);

        // Throttle public auth endpoints: block an IP after too many hits, and
        // additionally clamp per-account attempts so a single credential can't
        // be brute-forced across distributed requests.
        RateLimiter::for('auth-ip', function (Request $request) {
            return Limit::perMinute(15)->by($request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            $account = strtolower((string) $request->input('accnt_no', ''));
            return Limit::perMinute(5)->by(($account ?: $request->ip()) . '|' . $request->ip());
        });
    }
}
