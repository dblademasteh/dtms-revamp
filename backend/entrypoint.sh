#!/bin/sh
set -e

if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
    cp -n .env.example .env 2>/dev/null || true
    php artisan key:generate --force
fi

php artisan migrate --force

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf