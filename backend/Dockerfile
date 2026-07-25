FROM php:8.2-fpm-alpine

ARG APP_URL=https://your-backend-domain.coolify.app
ARG APP_DEBUG=false
ARG APP_KEY=base64:GENERATED_KEY_HERE
ARG DB_CONNECTION=pgsql
ARG DB_HOST=your-postgres-host
ARG APP_ENV=production
ARG DB_DATABASE=dts_database
ARG DB_USERNAME=dts_user
ARG DB_PASSWORD=YOUR_SECURE_PASSWORD
ARG REDIS_HOST=your-redis-host
ARG REDIS_PORT=6379
ARG CACHE_DRIVER=redis
ARG SESSION_DRIVER=redis
ARG QUEUE_CONNECTION=redis
ARG MEILISEARCH_HOST=http://your-meilisearch-host:7700
ARG DB_PORT=5432
ARG MEILISEARCH_KEY=your_meilisearch_key

RUN apk add --no-cache \
    nginx \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    unzip \
    git \
    curl \
    supervisor \
    spawn-fcgi \
    fcgiwrap

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_pgsql mbstring zip pcntl bcmath

RUN pecl install redis \
    && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction

COPY backend/ .

RUN php artisan key:generate --force \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

COPY backend/nginx.conf /etc/nginx/conf.d/default.conf
COPY backend/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

CMD ["/entrypoint.sh"]