<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['middleware' => ['api', 'auth:api']],
    )
    ->withSchedule(function ($schedule) {
        $schedule->command('mailbox:sync-all')->everyFiveMinutes()->withoutOverlapping();
        $schedule->command('sla:check')->everySixHours()->withoutOverlapping();
        $schedule->command('retention:run')->dailyAt('02:00')->withoutOverlapping();
        $schedule->command('db:backup')->dailyAt('03:00')->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware) {
        // Behind CloudPanel / Cloudflare / Docker the app only ever sees
        // http on localhost. Trust the proxy so X-Forwarded-Proto is
        // honoured (correct https URLs + secure cookies).
        // Set TRUSTED_PROXIES to a comma-separated list to restrict,
        // or leave unset for the container-safe default (*).
        $trusted = env('TRUSTED_PROXIES', '*');
        if (is_string($trusted)) {
            $trusted = trim($trusted);
            $middleware->trustProxies(at: $trusted === '' || $trusted === '*' ? '*' : array_map('trim', explode(',', $trusted)));
        } elseif (is_array($trusted)) {
            $middleware->trustProxies(at: $trusted);
        }

        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
            'force-password-change' => \App\Http\Middleware\EnsurePasswordChanged::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function ($request, \Throwable $e) {
            return $request->is('api/*') || $request->expectsJson();
        });
    })->create();
