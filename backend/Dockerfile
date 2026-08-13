FROM php:8.4-fpm-alpine

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
    supervisor

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo pdo_pgsql mbstring zip pcntl bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN COMPOSER_MEMORY_LIMIT=-1 composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts

COPY . .

RUN mkdir -p bootstrap/cache storage /run/nginx \
    && chown -R www-data:www-data /var/www/html storage bootstrap/cache \
    && chmod -R u+rwX,go+rX /var/www/html \
    && chmod -R 775 storage bootstrap/cache

RUN echo 'upload_max_filesize=50M' > /usr/local/etc/php/conf.d/uploads.ini \
    && echo 'post_max_size=100M' >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo 'memory_limit=256M' >> /usr/local/etc/php/conf.d/uploads.ini

RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/http.d/*
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000 8080

CMD ["/entrypoint.sh"]