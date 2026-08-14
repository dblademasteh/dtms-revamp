#!/bin/sh
set -e

if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || true
fi

if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    if [ -z "$(grep '^APP_KEY=' .env 2>/dev/null)" ]; then
        php artisan key:generate --force
    fi
fi

php artisan config:clear || true
php artisan route:clear || true
php artisan migrate --force || true

# The public/storage folder must be a symlink to storage/app/public so
# uploaded files (avatars, documents, branding logos) are served correctly.
# Older images shipped a real directory here; migrate any legacy files and
# replace it with the symlink.
if [ -e public/storage ] && [ ! -L public/storage ]; then
    echo "Migrating legacy public/storage contents..."
    mkdir -p storage/app/public
    cp -rn public/storage/. storage/app/public/ 2>/dev/null || true
    rm -rf public/storage
fi
php artisan storage:link || true

# Ensure the nginx worker (user "nginx") can read the storage tree;
# uploaded files are owned by www-data and storage/app may be 700.
chmod -R a+rX storage 2>/dev/null || true

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf