<?php

namespace App\Services;

/**
 * TOTP (RFC 6238) implementation compatible with Google Authenticator.
 * Uses only PHP built-ins (hash_hmac) — no external package required.
 */
class TotpService
{
    private const DIGITS = 6;
    private const PERIOD = 30;
    private const ALGO = 'sha1';
    private const SECRET_LENGTH = 20; // bytes -> 32 base32 chars

    private const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a random base32-encoded secret.
     */
    public function generateSecret(): string
    {
        $bytes = random_bytes(self::SECRET_LENGTH);
        return $this->base32Encode($bytes);
    }

    /**
     * Build the otpauth:// URI for QR code generation.
     */
    public function provisioningUri(string $secret, string $label, string $issuer = 'DTMS'): string
    {
        $label = rawurlencode($label);
        $issuer = rawurlencode($issuer);

        return "otpauth://totp/{$issuer}:{$label}"
            . "?secret={$secret}"
            . "&issuer={$issuer}"
            . "&algorithm=" . strtoupper(self::ALGO)
            . "&digits=" . self::DIGITS
            . "&period=" . self::PERIOD;
    }

    /**
     * Verify a 6-digit code. Allows ±1 time-step drift.
     */
    public function verify(string $secret, string $code): bool
    {
        $code = trim(preg_replace('/\s+/', '', $code));
        if (!ctype_digit($code) || strlen($code) !== self::DIGITS) {
            return false;
        }

        $key = $this->base32Decode($secret);
        $times = $this->timeCounter();
        for ($i = -1; $i <= 1; $i++) {
            if (hash_equals($this->hotp($key, $times + $i), $code)) {
                return true;
            }
        }

        return false;
    }

    private function timeCounter(int $at = null): int
    {
        $time = $at ?? time();

        return (int) floor($time / self::PERIOD);
    }

    /**
     * Compute the current expected code (used for testing / display parity).
     */
    public function currentCode(string $secret, int $at = null): string
    {
        $key = $this->base32Decode($secret);

        return $this->hotp($key, $this->timeCounter($at));
    }

    private function hotp(string $key, int $counter): string
    {
        $counterBytes = pack('J', $counter);
        $hash = hash_hmac(self::ALGO, $counterBytes, $key, true);
        $offset = ord($hash[strlen($hash) - 1]) & 0xF;
        $binary = (ord($hash[$offset]) & 0x7F) << 24
            | (ord($hash[$offset + 1]) & 0xFF) << 16
            | (ord($hash[$offset + 2]) & 0xFF) << 8
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($binary % (10 ** self::DIGITS)), self::DIGITS, '0', STR_PAD_LEFT);
    }

    private function base32Encode(string $bytes): string
    {
        $bits = '';
        foreach (str_split($bytes) as $b) {
            $bits .= str_pad(decbin(ord($b)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::B32_ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    private function base32Decode(string $secret): string
    {
        $secret = strtoupper(trim($secret));
        $bits = '';
        foreach (str_split($secret) as $c) {
            $idx = strpos(self::B32_ALPHABET, $c);
            if ($idx === false) {
                continue;
            }
            $bits .= str_pad(decbin($idx), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) < 8) {
                break;
            }
            $bytes .= chr(bindec($chunk));
        }

        return $bytes;
    }
}
