<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandingController extends Controller
{
    public static function defaults(): array
    {
        return [
            'system_title' => 'DTMS',
            'system_description' => 'Document Tracking & Management',
        ];
    }

    public static function settingsArray(): array
    {
        $branding = new self;
        return [
            'retention_months' => (int) SystemSetting::get('retention_months', 12),
            'system_title' => SystemSetting::get('system_title', self::defaults()['system_title']),
            'system_description' => SystemSetting::get('system_description', self::defaults()['system_description']),
            'login_logo' => $branding->logoUrl('login'),
            'sidebar_logo' => $branding->logoUrl('sidebar'),
        ];
    }

    protected function logoPath(string $type): ?string
    {
        $key = $type === 'login' ? 'login_logo' : 'sidebar_logo';
        $path = SystemSetting::get($key);
        return $path ?: null;
    }

    public function publicIndex()
    {
        return response()->json([
            'branding' => [
                'system_title' => SystemSetting::get('system_title', self::defaults()['system_title']),
                'system_description' => SystemSetting::get('system_description', self::defaults()['system_description']),
                'login_logo' => $this->logoUrl('login'),
                'sidebar_logo' => $this->logoUrl('sidebar'),
            ],
        ]);
    }

    protected function logoUrl(string $type): ?string
    {
        $path = $this->logoPath($type);
        return $path ? '/storage/' . ltrim($path, '/') : null;
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'type' => 'required|in:login,sidebar',
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $type = $request->type;
        $file = $request->file('logo');

        @ini_set('memory_limit', '512M');

        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext === 'webp') {
            $image = @imagecreatefromwebp($file->getRealPath());
        } elseif ($ext === 'png') {
            $image = @imagecreatefrompng($file->getRealPath());
        } elseif ($ext === 'gif') {
            $image = @imagecreatefromgif($file->getRealPath());
        } else {
            $image = @imagecreatefromjpeg($file->getRealPath());
        }

        if (!$image) {
            return response()->json(['message' => 'Could not read the uploaded image'], 422);
        }

        $maxDim = 512;
        $srcW = imagesx($image);
        $srcH = imagesy($image);

        if ($srcW > $maxDim || $srcH > $maxDim) {
            $ratio = min($maxDim / $srcW, $maxDim / $srcH);
            $dstW = (int) round($srcW * $ratio);
            $dstH = (int) round($srcH * $ratio);

            $resized = imagecreatetruecolor($dstW, $dstH);
            $alpha = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $alpha);
            imagesavealpha($resized, true);
            imagealphablending($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
            imagedestroy($image);
            $image = $resized;
        }

        // Preserve transparency for PNG/WebP logos; flatten others onto white.
        $savePng = in_array($ext, ['png', 'webp']);
        if (!$savePng) {
            $flat = imagecreatetruecolor(imagesx($image), imagesy($image));
            $white = imagecolorallocate($flat, 255, 255, 255);
            imagefill($flat, 0, 0, $white);
            imagecopy($flat, $image, 0, 0, 0, 0, imagesx($image), imagesy($image));
            imagedestroy($image);
            $image = $flat;
        }

        ob_start();
        if ($savePng) {
            imagepng($image, null, 9);
        } else {
            imagejpeg($image, null, 90);
        }
        $data = ob_get_clean();

        imagedestroy($image);

        $key = $type === 'login' ? 'login_logo' : 'sidebar_logo';
        $oldPath = $this->logoPath($type);
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        $extFinal = $savePng ? 'png' : 'jpg';
        $path = 'branding/' . $type . '-' . Str::uuid() . '.' . $extFinal;
        Storage::disk('public')->put($path, $data);

        SystemSetting::set($key, $path);

        return response()->json([
            'message' => ucfirst($type) . ' logo updated',
            'logo_url' => $this->logoUrl($type),
        ]);
    }

    public function deleteLogo(Request $request)
    {
        $request->validate([
            'type' => 'required|in:login,sidebar',
        ]);

        $type = $request->type;
        $key = $type === 'login' ? 'login_logo' : 'sidebar_logo';
        $path = $this->logoPath($type);
        if ($path) {
            Storage::disk('public')->delete($path);
        }

        SystemSetting::set($key, '');

        return response()->json([
            'message' => ucfirst($type) . ' logo removed',
            'logo_url' => null,
        ]);
    }
}
