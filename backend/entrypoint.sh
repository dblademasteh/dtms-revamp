#!/bin/sh
set -e

if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || true
fi

if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    if ! grep -q "^APP_KEY=" .env 2>/dev/null; then
        echo "APP_KEY=" >> .env
    fi
    php artisan key:generate --force || true
fi

php artisan config:clear || true
php artisan route:clear || true
php artisan migrate --force || true
php artisan storage:link || true

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf