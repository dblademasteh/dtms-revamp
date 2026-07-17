<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected static function boot()
    {
        parent::boot();

        static::saved(fn ($model) => Cache::forget("system_setting_{$model->key}"));
        static::deleted(fn ($model) => Cache::forget("system_setting_{$model->key}"));
    }

    public static function get(string $key, $default = null)
    {
        $setting = Cache::remember("system_setting_{$key}", 3600, function () use ($key) {
            return static::where('key', $key)->first();
        });

        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => (string) $value]);
        Cache::forget("system_setting_{$key}");
    }

    public static function getDefaultSlaHours(): int
    {
        return (int) self::get('default_sla_hours', 24);
    }
}
