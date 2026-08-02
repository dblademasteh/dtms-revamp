<?php

namespace App\Support;

class ImageProcessor
{
    public const MAX_DIMENSION = 2048;
    public const JPEG_QUALITY = 85;

    /**
     * Re-encode an image file as JPEG (strips EXIF, flattens transparency onto white).
     * Returns null when the file is not a GD-supported image or already small.
     *
     * @return array{content: string, size: int, mime: string}|null
     */
    public static function compressImage(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }

        $supported = [
            'image/jpeg' => 'imagecreatefromjpeg',
            'image/png' => 'imagecreatefrompng',
            'image/gif' => 'imagecreatefromgif',
        ];

        $mime = mime_content_type($path);
        $loader = $supported[$mime] ?? null;

        if (!$loader || !function_exists($loader)) {
            return null;
        }

        $image = @$loader($path);
        if (!$image) {
            return null;
        }

        $srcW = imagesx($image);
        $srcH = imagesy($image);
        $filesize = filesize($path);

        // Only re-encode when it actually saves space (large resolution or file).
        if ($srcW <= self::MAX_DIMENSION && $srcH <= self::MAX_DIMENSION && $filesize < 500 * 1024) {
            imagedestroy($image);
            return null;
        }

        $resized = $image;
        if ($srcW > self::MAX_DIMENSION || $srcH > self::MAX_DIMENSION) {
            $ratio = min(self::MAX_DIMENSION / $srcW, self::MAX_DIMENSION / $srcH);
            $dstW = (int) round($srcW * $ratio);
            $dstH = (int) round($srcH * $ratio);

            $resized = imagecreatetruecolor($dstW, $dstH);
            $alpha = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $alpha);
            imagesavealpha($resized, true);
            imagealphablending($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
            imagedestroy($image);
        }

        $flat = imagecreatetruecolor(imagesx($resized), imagesy($resized));
        $white = imagecolorallocate($flat, 255, 255, 255);
        imagefill($flat, 0, 0, $white);
        imagecopy($flat, $resized, 0, 0, 0, 0, imagesx($resized), imagesy($resized));

        ob_start();
        imagejpeg($flat, null, self::JPEG_QUALITY);
        $data = ob_get_clean();

        imagedestroy($resized);
        imagedestroy($flat);

        return ['content' => $data, 'size' => strlen($data), 'mime' => 'image/jpeg'];
    }
}
